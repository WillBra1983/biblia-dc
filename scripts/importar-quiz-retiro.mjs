import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { parse } = require('acorn')
const postcss = require('postcss')
process.on('uncaughtException', error => { console.error(error.message); process.exit(1) })
const origem = path.resolve(process.argv[2] || 'C:/Quiz Retiro/www')
const destino = path.resolve('public/quiz-biblico')
fs.mkdirSync(path.join(destino, 'js'), { recursive: true })
fs.mkdirSync(path.join(destino, 'css'), { recursive: true })
function trocarFuncao(source, nome, substituta) {
  const ast = parse(source, { ecmaVersion: 'latest' }), encontrados = []
  const visitar = node => {
    if (!node || typeof node !== 'object') return
    if ((node.type === 'MethodDefinition' && node.key.name === nome) || (node.type === 'FunctionDeclaration' && node.id?.name === nome)) encontrados.push(node)
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visitar); else if (value && typeof value === 'object') visitar(value)
  }
  visitar(ast)
  if (encontrados.length !== 1) throw Error(`Função ${nome}: ${encontrados.length} ocorrências`)
  const node = encontrados[0]
  return source.slice(0, node.start) + substituta + source.slice(node.end)
}
let html = fs.readFileSync(path.join(origem, 'index.html'), 'utf8')
const scripts = [...html.matchAll(/<script src="([^"?]+)(?:[^"]*)"><\/script>/g)].map(m => m[1])
const excluir = /\/(ads|firebase-auth|firebase-config|sw-register|native-deeplink)\.js$/
const arquivos = scripts.filter(s => !excluir.test(s))
const contexto = vm.createContext({ window: {}, console, localStorage: { getItem: () => null } })
for (const file of scripts.filter(s => /\/(config|question-id|questions[^/]*)\.js$/.test(s))) vm.runInContext(fs.readFileSync(path.join(origem, file), 'utf8'), contexto, { filename: file })
const perguntas = contexto.window.questionsUnified
if (!perguntas?.length) throw Error('Acervo não foi montado')
const problemas = perguntas.flatMap(q => {
  const e = []
  if (!q.question?.trim()) e.push('enunciado vazio')
  if (!Array.isArray(q.options) || q.options.length < 2) e.push('alternativas ausentes')
  if (!Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer >= q.options?.length) e.push('gabarito fora das alternativas')
  if (new Set(q.options?.map(x => String(x).trim().toLowerCase())).size !== q.options?.length) e.push('alternativas repetidas')
  return e.map(erro => ({ numero: q.number, erro, pergunta: q.question }))
})
fs.mkdirSync('.cache', { recursive: true })
fs.writeFileSync('.cache/quiz-auditoria-importacao.json', JSON.stringify({ total: perguntas.length, fases: contexto.window.questionsPhases.map(p => p.length), problemas, revisaoPrioritaria: perguntas.filter(q => /Westminster|mártir|batismo|eleição|livre.arb|predestina|sacramento|milênio|armin|cânon/i.test(q.question)) }, null, 2))
if (problemas.length) throw Error(`${problemas.length} problemas estruturais; consulte .cache/quiz-auditoria-importacao.json`)
for (const file of arquivos) {
  if (['js/firebase-cloud-sync.js', 'js/quiz-scoring.js'].includes(file)) continue
  let source = fs.readFileSync(path.join(origem, file), 'utf8').replaceAll('quizRetiro_', 'quizBibliaV2_')
  if (/\/questions[^/]*\.js$/.test(file)) source = source
    .replaceAll('Quantos capítulos possui a Confissão de Fé de Westminster?', 'Quantos capítulos possui a redação original da Confissão de Fé de Westminster, de 1647?')
    .replaceAll('A Confissão de Fé de Westminster organiza a doutrina reformada em 33 capítulos', 'A redação original da Confissão de Fé de Westminster, de 1647, organiza a doutrina reformada em 33 capítulos')
  if (file === 'js/question-id.js') source = source.replace("String(q.question || '')", "String(q.question || '').replace('Quantos capítulos possui a redação original da Confissão de Fé de Westminster, de 1647?', 'Quantos capítulos possui a Confissão de Fé de Westminster?')")
  if (file === 'js/config.js') source = source.replace(/\n  ADS: \{[^}]*\},\n/, '\n')
  if (file.endsWith('/config.js')) {
    source = source.replace(/\n  ADS: \{[\s\S]*?\n  \},\n/, '\n').replace("PUBLIC_APP_URL: ''", "PUBLIC_APP_URL: window.BibliaQuiz.publicUrl")
  }
  if (file.endsWith('/app.js')) {
    source = source.replaceAll('    this.setupBannerAd()\n', '')
    source = trocarFuncao(source, 'setupBannerAd', '')
    source = trocarFuncao(source, 'googleMarkSvg', '')
    source = trocarFuncao(source, 'bindCloudAuthFormEvents', '')
    source = source.replace('  finalizar() {', '  finalizar() {\n    this._saidaConfirmada = true')
    source = source.replace(/\n    if \(QuizAds.shouldShowInterstitial[\s\S]*?\n    \}\n/, '\n')
    source = source.replace('    const ok = await QuizAds.showRewarded()\n    if (!ok) return\n', '')
    source = trocarFuncao(source, 'renderCloudAuthPanel', `renderCloudAuthPanel(containerId = 'home-firebase-auth-panel') {
      const panel = document.getElementById(containerId); if (!panel) return;
      const user = QuizFirebaseAuth.getUser();
      panel.innerHTML = user ? '<p>Conectado como ' + this.escapeHtml(QuizFirebaseAuth.displayName(user)) + '</p><button class="btn-secondary" id="quiz-conta">Minha conta</button>' : '<button class="btn-primary" id="quiz-conta">Entrar na minha conta</button>';
      panel.querySelector('#quiz-conta').onclick = () => window.BibliaQuiz.openProfile();
    }`)
    source = trocarFuncao(source, 'compartilhar', `compartilhar() {
      const r = this._lastResult || { acertos: 0, total: 0, pontos: 0 };
      void window.BibliaQuiz.share({title:'Quiz Bíblico',text:'Acertei '+r.acertos+'/'+r.total+' perguntas e fiz '+r.pontos+' pontos no Quiz Bíblico.',url:window.BibliaQuiz.shareUrl});
      this.salvarRanking();
    }`)
    source = source.replace('  const app = new QuizApp()', '  const app = new QuizApp()\n  window.__quizApp = app')
    source = source.replaceAll('no Salvation', 'na Bíblia do Discípulo Cristão')
    source = source.replace("          await navigator.share({ title: 'Quiz Bíblico - Competição', text: texto })", "          await window.BibliaQuiz.share({ title: 'Quiz Bíblico - Competição', text: texto })")
    source = source.replace("if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {", 'if (window.BibliaQuiz) {')
    source = source.replace("      window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer')", "      void window.BibliaQuiz.share({ title: 'Quiz Bíblico - Competição', text: texto }).catch(() => {});")
    source = source.replace("url:window.BibliaQuiz.shareUrl});", "url:window.BibliaQuiz.shareUrl}).catch(() => {});")
  }
  if (file.endsWith('/firebase-ranking.js')) {
    source = trocarFuncao(source, 'isConfigured', 'function isConfigured() { return window.BibliaQuiz.isConfigured(); }')
    source = trocarFuncao(source, 'loadScript', '')
    source = source.replace(/        await loadScript[^\n]+\n/g, '').replace("        if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG)\n        db = firebase.database()", '        await window.BibliaQuiz.ready()\n        db = window.BibliaQuiz.database()')
    source = trocarFuncao(source, 'gravarSeMelhor', `async function gravarSeMelhor(ref, novo) {
      await ref.transaction(atual => !atual || novo.pontos > (atual.pontos || 0) || (novo.pontos === (atual.pontos || 0) && novo.acertos > (atual.acertos || 0)) ? {...atual,...novo} : undefined);
    }`)
    source = source.replace('        if (completo) {', '        if (completo && window.BibliaQuiz.rankingOptIn()) {')
    source = source.replace('perguntasRespondidas: Math.max(0, Number(entry.acertos) || 0)', 'perguntasRespondidas: Math.max(0, Number(entry.totalPerguntas) || 0)')
  }
  if (file.endsWith('/firebase-cloud-sync.js')) {
    source = source.replace('return `users/${uid}/quizRetiro`', 'return `users/${uid}/quizRetiro/novoQuiz`')
    source = source.replace('        if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG)\n        db = firebase.database()', '        db = window.BibliaQuiz.database()')
    source = source.replace("    void gravarNuvem(uid).then((at) => {\n        if (at) lastLocalWriteAt = at\n      })", "    void gravarNuvem(uid).then((at) => {\n        if (at) lastLocalWriteAt = at\n      }).catch(() => {})")
  }
  if (file.endsWith('/competition.js')) {
    source = source.replaceAll('com.quizbiblico.app', 'com.bibliadc.app')
    source = trocarFuncao(source, 'textoCompartilhamento', `function textoCompartilhamento() {
      const p = payloadCompartilhavel();
      return 'Quiz Bíblico — ' + (p.nomeEvento || p.torneioLabel || 'Competição') + '\\nBíblia do Discípulo Cristão\\n\\nCódigo do torneio: ' + p.codigo + '\\nRodada: ' + p.quantidadePerguntas + ' perguntas\\n\\nNo aplicativo, abra Quiz Bíblico > Competição e informe o código do torneio.\\n' + window.BibliaQuiz.shareUrl;
    }`)
    source = trocarFuncao(source, 'linkConvite', `function linkConvite() {
    const url = new URL(window.BibliaQuiz.publicUrl);
    url.searchParams.set(URL_PARAM, encodePayload(payloadCompartilhavel()));
    return url.toString();
  }`)
  }
  if (source.includes('QuizAds') || source.includes('firebasejs/')) throw Error('Integração incompleta: ' + file)
  fs.writeFileSync(path.join(destino, file), source)
}
html = html.replace(/\s*<details class="monetization-info">[\s\S]*?<\/details>/, '')
  .replace(/\s*<!-- Anúncio entre fases -->[\s\S]*?(?=\s*<!-- Resultado -->)/, '')
  .replace(/\s*<[^>]+id="ad-banner-slot"[^>]*>[\s\S]*?<\/div>/g, '')
  .replace('Dica (anúncio)', 'Dica')
  .replace(/\s*<link rel="manifest"[^>]+>/, '')
  .replace(/<script src="([^"?]+)(?:[^"]*)"><\/script>/g, (tag, file) => excluir.test(file) ? '' : `<script src="${file}"></script>`)
  .replace('<script src="js/config.js">', '<script src="js/integracao-biblia.js"></script>\n<script src="js/config.js">')
html = html.replace('<head>', '<head>\n<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' https: data:; connect-src \'none\'; object-src \'none\'; base-uri \'self\'">')
fs.writeFileSync(path.join(destino, 'index.html'), html)
for (const file of ['style.css', 'path-map.css']) {
  // O original contém uma chave a mais após competition-join-error.
  const original = fs.readFileSync(path.join(origem, 'css', file), 'utf8')
    .replace(/(\.competition-join-error\s*\{[^}]*\}\s*)\}/, '$1')
    .replace(/(\.jogadores-time-vazio\s*\{[^}]*\})\s*padding: 20px;\s*margin-bottom: 20px;\s*text-align: center;\s*\}/, '$1')
  const css = postcss.parse(original)
  css.walkRules(rule => {
    const seletores = rule.selectors.filter(s => !/\.ad-|#ad-|\.monetization-info/.test(s))
    if (!seletores.length) rule.remove(); else rule.selectors = seletores
  })
  fs.writeFileSync(path.join(destino, 'css', file), css.toString())
}
fs.cpSync(path.join(origem, 'img'), path.join(destino, 'img'), { recursive: true })
await import('./adaptar-quiz-interface.mjs')
console.log(`Quiz importado sem publicidade: ${perguntas.length} perguntas, ${contexto.window.questionsPhases.length} fases; verificações estruturais sem falhas.`)
