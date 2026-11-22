import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { parse } = require('acorn')
const base = 'public/quiz-biblico/'
const read = file => fs.readFileSync(base + file, 'utf8')
const write = (file, source) => fs.writeFileSync(base + file, source)
function method(source, name, replacement) {
  const nodes = []
  const visit = node => {
    if (!node || typeof node !== 'object') return
    if (((node.type === 'MethodDefinition' || (node.type === 'Property' && node.method)) && node.key.name === name) || (node.type === 'FunctionDeclaration' && node.id?.name === name)) nodes.push(node)
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value)
  }
  visit(parse(source, { ecmaVersion: 'latest' }))
  if (nodes.length !== 1) throw Error('Adaptação do Quiz: função não encontrada: ' + name)
  return source.slice(0, nodes[0].start) + replacement + source.slice(nodes[0].end)
}
const icon = (paths, color = '') => `<span class="quiz-option-icon ${color}" aria-hidden="true"><svg viewBox="0 0 24 24">${paths}</svg></span>`
const book = icon('<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z"/><path d="M12 6v14"/>')
const sun = icon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>', 'amber')
const people = icon('<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2"/>', 'blue')
const cup = icon('<path d="M7 3h10v6a5 5 0 0 1-10 0V3Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 14v6m-4 1h8"/>', 'amber')
const medal = icon('<circle cx="12" cy="9" r="6"/><path d="m8 14-2 8 6-3 6 3-2-8m-6-5 1.5 1.5L15 7"/>', 'violet')
const card = (id, art, title, text, primary = '') => `<button type="button" id="${id}" class="quiz-option ${primary}">${art}<span><strong>${title}</strong><small>${text}</small></span><span class="quiz-option-arrow" aria-hidden="true">›</span></button>`
let html = read('index.html')
const home = `<!-- Tela Inicial -->
        <div id="start-screen" class="screen active">
          <header class="quiz-hero">
            <div class="quiz-kicker">Aprenda. Pratique. Cresça.</div>
            <h1>Quanto você conhece<br>da Palavra?</h1>
            <p>Explore as Escrituras, descubra novas respostas e avance no seu ritmo.</p>
            <div class="quiz-stats"><span><strong id="home-question-count">799</strong>perguntas</span><span><strong id="home-phase-count">16</strong>fases para explorar</span><span><strong>10 pts</strong>por acerto</span></div>
          </header>
          <div id="saved-game-banner" class="saved-banner hidden"></div>
          <h2 class="quiz-section-heading">Como você quer jogar hoje?</h2>
          <div class="home-actions">
            ${card('btn-play', book, 'Explorar trilhas', 'Escolha um tema ou livro da Bíblia. Seu progresso fica salvo.', 'quiz-option-primary')}
            ${card('btn-daily', sun, 'Desafio do dia', '10 perguntas para exercitar seu conhecimento.')}
            ${card('btn-home-competition', people, 'Competição em grupo', 'Organize um torneio ou entre com sua equipe.')}
            ${card('btn-ranking', cup, 'Ranking', 'Veja os melhores resultados e acompanhe sua posição.')}
            ${card('btn-achievements', medal, 'Minhas conquistas', 'Suas medalhas e os desafios que você já superou.')}
          </div>
          <div class="quiz-scoring-note"><span class="score-mark">+10</span><div><strong>Cada acerto vale o mesmo.</strong><br>10 pontos por resposta certa. Um erro não tira os pontos conquistados.</div></div>
          <p id="home-medalhas" class="home-medalhas"></p>
          <section id="home-cloud-section" class="home-cloud-section">
            <h2 class="home-cloud-title">Sua jornada na Palavra</h2>
            <p class="home-cloud-hint">Jogue livremente. Com sua conta, você também participa do ranking e pode continuar em outro aparelho.</p>
            <div id="home-firebase-auth-panel" class="firebase-auth-panel"></div><p id="home-cloud-status" class="firebase-status"></p>
          </section>
          <footer class="app-footer"><button type="button" id="btn-info" class="btn-info">Como jogar</button><span class="signature">Desenvolvido por Pr. Wilson Lucas Ferreira</span></footer>
        </div>

        `
html = html.replace(/<!-- Tela Inicial -->[\s\S]*?(?=<!-- Desafio Diário -->)/, home)
if (!html.includes('css/interface-biblia.css')) html = html.replace('</head>', '    <link rel="stylesheet" href="css/interface-biblia.css">\n</head>')
html = html.replace('Forma de pontuação:', 'Pontuação simples:').replace(/Ranking por trilha e quadro \(local e online com conta Salvation\)/g, 'Ranking por trilha e quadro com sua conta da Bíblia')
html = html.replace(/<li>Pontuação: <strong>por sequência<\/strong>[\s\S]*?<\/li>/, '<li>Pontuação: <strong>10 pontos por acerto</strong>. Sem acumuladores ou desconto por erro.</li>')
html = html.replace(/(<div id="ranking-torneio-tab"[^>]*>\s*<p )id="firebase-status"/, '$1id="firebase-status-torneio"')
write('index.html', html)
let config = method(read('js/config.js'), 'pontosMaximos', 'pontosMaximos(n) { return Math.max(0, Number(n) || 0) * 10 }')
write('js/config.js', config)
let app = read('js/app.js')
app = method(app, 'renderScoringToggle', `renderScoringToggle() {
  const wrap = document.getElementById('scoring-toggle');
  if (wrap) { wrap.textContent = '10 pontos por acerto. Sem multiplicadores.'; wrap.classList.remove('hidden'); }
  const button = document.getElementById('btn-competition-toggle');
  if (button && typeof QuizCompetition !== 'undefined') { const on = QuizCompetition.ativo(); button.classList.toggle('active', on); button.setAttribute('aria-pressed', String(on)); }
}`)
app = method(app, 'refreshHomeMedalhas', `refreshHomeMedalhas() {
  const el = document.getElementById('home-medalhas'); if (!el) return;
  el.textContent = QuizNivel.obterNivel().label + ' · ' + QuizAchievements.contarDesbloqueadas() + '/' + Object.keys(QuizAchievements.CATALOGO).length + ' conquistas';
}`)
app = app.replace(/      scoring: \{[\s\S]*?(?=      competition: \{)/, `      scoring: {
        title: 'Como os pontos funcionam',
        html: '<ul class="tip-list"><li>Cada resposta certa vale <strong>10 pontos</strong>, em todos os modos.</li><li>Erros valem zero e não retiram pontos anteriores.</li><li>Não há bônus por sequência ou velocidade.</li><li>Exemplos: 7 acertos = 70 pontos; 50 acertos = 500 pontos.</li><li>O ranking compara acertos na mesma escala, inclusive nos resultados antigos.</li></ul>',
      },
`)
app = app.replace("modoPontuacao === 'questoes'", "modoPontuacao === 'fixo10'")
app = app.replace("const status = document.getElementById('firebase-status')\n    const org", "const status = document.getElementById('firebase-status-torneio')\n    const org")
app = app.replace("const status = document.getElementById('firebase-status')\n    if (!QuizFirebaseRanking.isConfigured())", "const status = document.getElementById(compOn ? 'firebase-status-torneio' : 'firebase-status')\n    if (!QuizFirebaseRanking.isConfigured())")
app = app.replace('Configure firebase-config.js para ver o ranking online.', 'O ranking está indisponível neste momento. Você pode continuar jogando.')
app = app.replace('Sem conexão - o jogo funciona offline neste aparelho.', 'Entre na sua conta para sincronizar seu progresso entre aparelhos.')
app = app.replace("    this.bindEvents()", `    this.bindEvents()
    document.getElementById('btn-home-competition')?.addEventListener('click', () => { this.entrarJogoNormal(); document.getElementById('btn-competition-toggle')?.click(); })
    const count = document.getElementById('home-question-count'); if (count) count.textContent = window.questionsUnified.length;
    const phases = document.getElementById('home-phase-count'); if (phases) phases.textContent = window.questionsPhases.length;`)
// A importação pode ser reaplicada: não duplicar os listeners extras.
app = app.replace(/(    document.getElementById\('btn-home-competition'\)[^\n]*\n    const count[^\n]*\n    const phases[^\n]*\n)\1/g, '$1')
write('js/app.js', app)
let competition = read('js/competition.js').replaceAll("'questoes'", "'fixo10'").replaceAll("'sequencia'", "'fixo10'")
competition = competition.replace('(sequencia|questoes)', '(sequencia|questoes|fixo10)').replaceAll("'por questões' : 'sequência'", "'10 pontos por acerto' : '10 pontos por acerto'")
write('js/competition.js', competition)
let ranking = read('js/firebase-ranking.js')
ranking = method(ranking, 'gravarSeMelhor', `async function gravarSeMelhor(ref, novo) {
  const normalized = { ...novo, pontos: Math.max(0, Number(novo.acertos) || 0) * 10 };
  await ref.transaction(atual => !atual || normalized.pontos > Math.max(0, Number(atual.acertos) || 0) * 10 ? { ...atual, ...normalized } : undefined);
}`)
ranking = ranking.replace('pontos: Math.max(0, Number(entry.pontos) || 0)', 'pontos: Math.max(0, Number(entry.acertos) || 0) * 10')
ranking = ranking.replace('.map(([id, data]) => ({ uid: id, ...data }))', '.map(([id, data]) => ({ uid: id, ...data, pontos: Math.max(0, Number(data.acertos) || 0) * 10 }))')
ranking = ranking.replace('.map(([uidKey, data]) => ({ uid: uidKey, ...data }))', '.map(([uidKey, data]) => ({ uid: uidKey, ...data, pontos: Math.max(0, Number(data.acertos) || 0) * 10 }))')
write('js/firebase-ranking.js', ranking)
let levels = read('js/levels.js').replace('    return lv\n', '    return lv ? { ...lv, points: Math.max(0, Number(lv.acertos) || 0) * 10 } : null\n')
levels = levels.replace('Math.max(prev.points || 0, points)', 'Math.max((prev.acertos || 0) * 10, points)')
write('js/levels.js', levels)
let linear = read('js/trilha-linear.js')
linear = method(linear, 'getProgress', `function getProgress(fase, categoriaId) {
  const data = ler(); const p = data[progressKey(fase, categoriaId)] || { ordem: null, currentIndex: 0, completed: false, bestStars: 0, bestAcertos: 0, plays: 0 };
  return { ...p, bestPoints: Math.max(0, Number(p.bestAcertos) || 0) * 10 };
}`)
linear = linear.replace('Math.max(prev.bestPoints || 0, Number(points) || 0)', 'Math.max((prev.bestAcertos || 0) * 10, Number(points) || 0)').replace('Number(prev.bestPoints) || 0', '(Number(prev.bestAcertos) || 0) * 10')
write('js/trilha-linear.js', linear)
let storage = read('js/storage.js').replaceAll('points: Number(j.points) || 0', 'points: (Number(j.correct) || 0) * 10')
write('js/storage.js', storage)
console.log('Interface do Quiz atualizada; pontuação fixa de 10 por acerto e histórico comparado pela mesma escala.')
