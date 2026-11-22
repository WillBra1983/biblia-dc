const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict')
const { transformSync } = require('esbuild')
const inicio = performance.now()
let grupos = 0
const flush = () => new Promise(resolve => setImmediate(resolve))
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
function modulo(arquivo, globals, resolver) {
  const m = { exports: {} }
  const code = transformSync(fs.readFileSync(arquivo, 'utf8'), { loader: arquivo.endsWith('.jsx') ? 'jsx' : 'js', jsx: 'automatic', format: 'cjs', define: { 'import.meta.env': '{"BASE_URL":"/"}' } }).code
  vm.runInNewContext(code, { console, module: m, exports: m.exports, require: resolver, ...globals })
  return m.exports
}
function guard(nativo, anterior) {
  const dados = new Map(anterior ? [['salvation:app-version', anterior]] : [])
  const contagem = { reload: 0, limpeza: 0, sw: 0 }
  const storage = { getItem: k => dados.get(k) || null, setItem: (k, v) => dados.set(k, v), removeItem: k => dados.delete(k) }
  const api = modulo('src/utils/appVersionGuard.js', {
    __APP_VERSION__: 'build-novo', localStorage: storage, sessionStorage: storage,
    window: { location: { reload: () => contagem.reload++ } },
    caches: { keys: async () => ['cache-offline'], delete: async () => { contagem.limpeza++; return true } },
    navigator: { serviceWorker: { getRegistrations: async () => [{ unregister: async () => { contagem.sw++ } }] } },
  }, n => { if (n === './isNativeApp') return { isNativeApp: () => nativo }; throw Error(n) })
  return { api, contagem, dados }
}
async function montagem(resultado) {
  let resolver, rejeitar
  const pendente = new Promise((resolve, reject) => { resolver = resolve; rejeitar = reject })
  const contagem = { router: 0, render: 0, preaquecer: 0 }
  const noOp = new Proxy({}, { get: () => () => {} })
  modulo('src/main.jsx', {
    // A identificação do SW não participa deste teste da decisão de montagem.
    window: { Capacitor: {} }, document: { documentElement: { setAttribute() {} }, getElementById: () => ({}) },
  }, n => {
    if (n === 'react') return { StrictMode: 'StrictMode' }
    if (n === 'react/jsx-runtime') return jsx
    if (n === 'react-dom/client') return { createRoot: () => ({ render: () => contagem.render++ }) }
    if (n === './App') return { default: () => null, createAppRouter: () => { contagem.router++; return {} } }
    if (n === './services/bibliaCapituloRapido') return { preaquecerCapituloInicial: async () => null }
    if (n === './services/bibliaService') return { initDB: async () => { contagem.preaquecer++ } }
    if (n === './utils/appVersionGuard') return { executarAppVersionGuard: () => pendente }
    if (n === './utils/isNativeApp') return { isNativeApp: () => true }
    return noOp
  })
  assert.equal(contagem.render, 0, 'Não mostra a Bíblia antes da decisão de recarregar')
  if (resultado instanceof Error) rejeitar(resultado); else resolver(resultado)
  await flush()
  return contagem
}
function achar(node, predicate) {
  if (!node || typeof node !== 'object') return null
  if (predicate(node)) return node
  for (const child of [node.props?.children].flat(Infinity)) { const r = achar(child, predicate); if (r) return r }
  return null
}
;(async () => {
  for (const nome of ['Android', 'iOS']) {
    const caso = guard(true, 'build-antigo')
    assert.equal(await caso.api.executarAppVersionGuard(), false)
    assert.equal(caso.contagem.reload, 0, nome + ': não recarrega o binário atualizado')
    assert.equal(caso.contagem.limpeza, 0, 'Não apaga cache offline do app nativo')
    assert.equal(caso.contagem.sw, 0)
    assert.equal(caso.dados.get('salvation:app-version'), 'build-novo')
    grupos++
  }
  const web = guard(false, 'build-antigo')
  assert.equal(await web.api.executarAppVersionGuard(), true)
  assert.deepEqual(web.contagem, { reload: 1, limpeza: 1, sw: 1 })
  assert.equal(await web.api.executarAppVersionGuard(), false)
  assert.equal(web.contagem.reload, 1, 'PWA mantém atualização e proteção contra loop')
  grupos++
  const primeira = guard(false)
  assert.equal(await primeira.api.executarAppVersionGuard(), false)
  assert.equal(primeira.contagem.reload, 0); grupos++
  assert.deepEqual(await montagem(false), { router: 1, render: 1, preaquecer: 1 }); grupos++
  assert.deepEqual(await montagem(true), { router: 0, render: 0, preaquecer: 0 }); grupos++
  assert.deepEqual(await montagem(new Error('Storage indisponível')), { router: 1, render: 1, preaquecer: 1 }); grupos++
  const fake = new Proxy({ __esModule: true }, { get: (_, k) => k === '__esModule' ? true : () => null })
  const destaque = modulo('src/components/LivrariaMenuDestaque.jsx', {}, n => n === 'react/jsx-runtime' ? jsx : n === '@mui/material' ? new Proxy({}, { get: (_, k) => k }) : fake)
  const item = { path: '/biblioteca', fundo: 'fundo.webp', text: 'Livraria Cristã', description: 'Adquira nossos livros e use nossa biblioteca.' }
  let destino
  const tree = destaque.default({ item, onNavigate: i => { destino = i.path } })
  const cta = achar(tree, n => n.type === 'Box' && n.props.component === 'span')
  assert.equal(cta.props.children[0], 'Compre seu livro ')
  assert.equal(cta.props.sx['@media (prefers-reduced-motion: reduce)']['&::after'].animation, 'none')
  assert.match(cta.props.sx['&::after'].animation, /espelhoLivraria/)
  achar(tree, n => n.type === 'CardActionArea').props.onClick()
  assert.equal(destino, '/biblioteca'); grupos++
  console.log(`Abertura e livraria: ${grupos}/${grupos} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now() - inicio) / 1000).toFixed(2)} s. Inicialização e interfaces simuladas, sem acesso às lojas.`)
})().catch(e => { console.error(e); process.exitCode = 1 })
