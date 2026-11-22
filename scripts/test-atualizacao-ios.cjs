const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict')
const { transformSync } = require('esbuild')
const inicio = performance.now()
const storage = new Map(), eventos = new Map(), timers = new Set()
let pronto = false, plataforma = 'ios', user = { uid: 'leitor' }, instalacao = { version: '1.0.0', build: '1' }
let configuracao = { ios: { versaoAtual: '2.0.0' } }, historico = {}, entregues = {}, consultou = 0, abriu
const capacitor = { Capacitor: { isNativePlatform: () => true, getPlatform: () => plataforma } }
const localStorageFake = { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) }
const snap = value => ({ val: () => value, forEach: f => Object.entries(value || {}).forEach(([key, value]) => f({ key, val: () => value })) })
const api = {
  ref: (_, p) => p, query: p => p, orderByChild: x => x, limitToLast: x => x, serverTimestamp: () => 1,
  get: async p => { assert.equal(pronto, true, 'Espera Firebase antes de consultar'); consultou++; return snap(p === 'appConfig/lojaVersao' ? configuracao : p === 'avisosAdmin' ? historico : entregues) },
  set: async () => {}, update: async () => {},
}
const firebase = { getFirebaseDatabase: () => pronto ? {} : null, loadFirebaseModules: async () => { await Promise.resolve(); pronto = true } }
const capApp = { App: { getInfo: async () => instalacao, addListener: async (_, f) => { eventos.set('native', f); return { remove: () => eventos.delete('native') } } } }
const imports = {
  '@capacitor/core': capacitor, '@capacitor/app': capApp, 'firebase/database': api,
  '../config/firebase': firebase,
  '../utils/semverCompare': { compararVersoes: (a, b) => a.localeCompare(b, undefined, { numeric: true }) },
  '../utils/abrirUrlExterna': { abrirUrlExterna: async url => { abriu = url } },
}
const janela = { addEventListener: (n, f) => eventos.set(n, f), removeEventListener: n => eventos.delete(n), dispatchEvent: e => eventos.get(e.type)?.(e), setInterval: f => { timers.add(f); return f }, clearInterval: f => timers.delete(f) }
const documento = { visibilityState: 'visible', addEventListener: (n, f) => eventos.set(n, f), removeEventListener: n => eventos.delete(n) }
function carregar(arquivo, overrides = {}) {
  const modulo = { exports: {} }
  let fonte = fs.readFileSync(arquivo, 'utf8').replace(/import\('([^']+)'\)/g, "Promise.resolve(require('$1'))")
  const code = transformSync(fonte, { loader: arquivo.endsWith('jsx') ? 'jsx' : 'js', jsx: 'automatic', format: 'cjs', define: { 'import.meta.env': '{}' } }).code
  vm.runInNewContext(code, { module: modulo, exports: modulo.exports, console, localStorage: localStorageFake, window: janela, document: documento, Event, require: n => {
    if (Object.hasOwn(overrides, n)) return overrides[n]
    if (Object.hasOwn(imports, n)) return imports[n]
    throw Error('Import não previsto: ' + n)
  } })
  return modulo.exports
}
imports['../utils/appStoreLinks'] = carregar('src/utils/appStoreLinks.js')
const loja = carregar('src/services/appLojaVersaoService.js')
const avisos = carregar('src/services/avisosAdminService.js')
const flush = () => new Promise(r => setImmediate(r))
;(async () => {
  const ios = await loja.avaliarAtualizacaoLoja()
  assert.equal(ios.plataforma, 'ios')
  assert.match(ios.urlLoja, /^https:\/\/apps.apple.com\//, 'Usa link real sem exigir variável de ambiente ou URL remota')
  instalacao = { version: '2.0.0', build: '2' }
  assert.equal(await loja.avaliarAtualizacaoLoja(), null, 'Não anuncia versão já instalada')
  instalacao = { version: '1.0.0', build: '1' }
  loja.marcarAvisoVersaoDispensado(ios.chaveAviso)
  assert.equal(await loja.avaliarAtualizacaoLoja(), null)
  loja.reiniciarAvisosVersaoSessao()
  storage.set('salvation:update-dismiss:' + ios.chaveAviso, '1')
  assert.equal((await loja.avaliarAtualizacaoLoja()).versaoAtual, '2.0.0', 'Nova entrada ignora dispensa permanente antiga')
  storage.clear(); plataforma = 'android'; configuracao.android = { versaoAtual: '2.0.0', versionCode: 3 }
  assert.match((await loja.avaliarAtualizacaoLoja()).urlLoja, /play.google.com/)
  plataforma = 'ios'; pronto = false
  historico = { update: { titulo: 'Atualização', mensagem: 'Nova versão!', acao: 'atualizar_app', criadoEm: 1 }, geral: { mensagem: 'Aviso geral', acao: 'abrir_destino', criadoEm: 2 } }
  entregues = { update: 1, geral: 1 }
  assert.deepEqual(Array.from(await avisos.listarAvisosAdminPendentes('leitor'), a => a.id), ['update'], 'Push entregue não suprime comunicado de atualização no app')
  avisos.registrarAtualizacoesVistas('leitor', ['update'])
  assert.equal((await avisos.listarAvisosAdminPendentes('leitor')).length, 0)
  assert.equal((await avisos.listarAvisosAdminPendentes('outra-conta')).length, 1, 'Leitura isolada por conta e aparelho')
  storage.clear(); configuracao = {}; avisos.reiniciarComunicadosAtualizacaoSessao()

  let cursor = 0, effects = [], novos = [], estados = []
  const react = {
    useState(initial) { const n = cursor++; if (!(n in estados)) estados[n] = initial; return [estados[n], v => { estados[n] = typeof v === 'function' ? v(estados[n]) : v }] },
    useRef(initial) { const n = cursor++; if (!(n in estados)) estados[n] = { current: initial }; return estados[n] },
    useCallback(f, deps) { const n = cursor++; const old = estados[n]; if (!old || deps.some((d, i) => d !== old.deps[i])) estados[n] = { deps, f }; return estados[n].f },
    useEffect(f, deps) { const n = cursor++; const old = effects[n]; if (!old || deps.some((d, i) => d !== old.deps[i])) novos.push(() => { old?.cleanup?.(); effects[n] = { deps, cleanup: f() } }) },
  }
  const componentes = carregar('src/components/AvisoAtualizacaoLoja.jsx', {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    '@mui/material': new Proxy({}, { get: (_, k) => k }),
    '@mui/icons-material/SystemUpdateAlt': () => null,
    '../contexts/FirebaseAuthContext': { useFirebaseAuth: () => ({ user }) },
    '../utils/posSplash': { aguardarPosSplash: f => { f(); return () => {} } },
    '../services/appLojaVersaoService': loja,
    '../services/avisosAdminService': avisos,
  })
  function render() { cursor = 0; novos = []; const tree = componentes.default(); novos.forEach(f => f()); return tree }
  function achar(node, pred) { if (!node || typeof node !== 'object') return null; if (pred(node)) return node; for (const child of [node.props?.children].flat(Infinity)) { const r = achar(child, pred); if (r) return r } return null }
  render(); await flush(); let tree = render()
  assert.equal(tree?.type, 'Dialog', 'Mostra atualização no boot mesmo sem config de versão ou push autorizado')
  const depois = achar(tree, n => n.type === 'Button' && String(n.props.children).includes('Depois'))
  depois.props.onClick(); await flush(); assert.equal(render(), null)
  await eventos.get('native')({ isActive: true }); await flush(); assert.equal(render(), null, 'Não repete comunicado reconhecido')
  await eventos.get('native')({ isActive: false })
  await eventos.get('native')({ isActive: true }); await flush(); tree = render()
  assert.equal(tree, null, 'Voltar do segundo plano preserva o adiamento')
  documento.visibilityState = 'hidden'; eventos.get('visibilitychange')()
  documento.visibilityState = 'visible'; eventos.get('visibilitychange')()
  await flush(); assert.equal(render(), null, 'Visibilidade não reinicia a dispensa')
  for (const timer of timers) timer()
  await flush(); assert.equal(render(), null, 'Consulta periódica não insiste durante a mesma entrada')
  // Simula novo processo: módulos e hooks iniciam sem as dispensas em memória,
  // mas o armazenamento persistente continua intacto.
  effects.forEach(e => e?.cleanup?.()); effects = []; estados = []
  loja.reiniciarAvisosVersaoSessao(); avisos.reiniciarComunicadosAtualizacaoSessao()
  render(); await flush(); tree = render()
  assert.equal(tree?.type, 'Dialog', 'Nova abertura sem atualizar reapresenta o aviso')
  achar(tree, n => n.type === 'Button' && String(n.props.children).includes('Depois')).props.onClick()
  await flush(); assert.equal(render(), null)
  historico.update2 = { mensagem: 'Outra atualização', acao: 'atualizar_app', criadoEm: 3 }
  eventos.get('native')({ isActive: true }); await flush(); tree = render()
  assert.equal(tree?.type, 'Dialog', 'Busca novos avisos no retorno ao app sem exigir novo login')
  await achar(tree, n => n.type === 'Button' && String(n.props.children).includes('Atualizar no')).props.onClick()
  assert.match(abriu, /apps.apple.com/)
  await flush(); assert.equal(render(), null)
  const pushRecebido = { detail: { notification: { body: 'Atualize seu aplicativo' }, data: { acao: 'atualizar_app', avisoId: 'push-ao-vivo' }, exibidaNoSistema: true } }
  eventos.get('salvation-update-announcement')(pushRecebido); tree = render()
  assert.equal(tree?.type, 'Dialog', 'Push em primeiro plano também mostra diálogo, mesmo se o sistema já o recebeu')
  achar(tree, n => n.type === 'Button' && String(n.props.children).includes('Depois')).props.onClick()
  eventos.get('salvation-update-announcement')(pushRecebido)
  assert.equal(render(), null, 'Evento duplicado não repete o aviso reconhecido')
  assert.ok(eventos.has('online') && timers.size === 1, 'Reconsulta após reconexão e enquanto aberto')
  effects.forEach(e => e?.cleanup?.()); assert.equal(timers.size, 0)
  avisos.reiniciarComunicadosAtualizacaoSessao()
  instalacao = { version: '2.0.0', build: '2' }
  assert.equal((await avisos.listarAvisosAdminPendentes('leitor', 20)).length, 0, 'Após atualizar, comunicados da instalação anterior deixam de aparecer')
  configuracao = { ios: { versaoAtual: '2.0.0' } }
  loja.reiniciarAvisosVersaoSessao()
  assert.equal(await loja.avaliarAtualizacaoLoja(), null, 'App atualizado não recebe novo lembrete na próxima entrada')
  console.log(`Atualização iOS: 19/19 grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now() - inicio) / 1000).toFixed(2)} s. Firebase e Capacitor simulados, sem notificações reais.`)
})().catch(e => { console.error(e); process.exitCode = 1 })
