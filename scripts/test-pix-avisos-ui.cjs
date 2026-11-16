const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict')
const { transformSync } = require('esbuild')
const inicio = performance.now()
let usuario = { uid: 'cliente' }, dadosLista, consultas = 0, copiado, retornou, informou = 0
const listeners = new Map(), timers = new Set()
const armazenamento = new Map()
const localStorageFake = { getItem: chave => armazenamento.get(chave) || null, setItem: (chave, valor) => armazenamento.set(chave, valor) }
const documento = { visibilityState: 'visible', addEventListener: (n, f) => listeners.set('doc:' + n, f), removeEventListener: n => listeners.delete('doc:' + n) }
const janela = { addEventListener: (n, f) => listeners.set(n, f), removeEventListener: n => listeners.delete(n), dispatchEvent: e => listeners.get(e.type)?.() }
const navegador = { onLine: true, clipboard: { writeText: async s => { copiado = s } } }
const original = { pedidoId: 'pedido', livroId: 'livro', livroTitulo: 'Meu livro', valorCentavos: 1990, codigo: 'BDC123', status: 'recusado', pixCopiaCola: 'pix-antigo', qrCodeDataUrl: 'qr-antigo', observacaoAdmin: 'Confira o comprovante.' }
const novo = { ...original, status: 'aguardando_pagamento', informado: false, pixCopiaCola: 'pix-correto', qrCodeDataUrl: 'qr-correto', respostaCliente: 'Ainda não fiz o pagamento.' }
dadosLista = { pedidos: [original] }
const servico = {
  listarMeusPedidosPixBiblioteca: async () => { consultas++; return dadosLista },
  consultarPedidoPixBiblioteca: async (_, incluir) => incluir ? original : { status: 'recusado' },
  responderPagamentoNaoLocalizadoBiblioteca: async () => novo,
  informarPagamentoPixBiblioteca: async () => { informou++; return {} },
}
function carregar(arquivo) {
  let cursor = 0, novos = [], estados = [], efeitos = [], contexto
  const react = {
    createContext: () => ({ Provider: 'PedidosPixProvider' }), useContext: () => contexto,
    lazy: () => 'OpcoesCompra', Suspense: 'Suspense',
    useState(initial) { const n = cursor++; if (!(n in estados)) estados[n] = typeof initial === 'function' ? initial() : initial; return [estados[n], v => { estados[n] = typeof v === 'function' ? v(estados[n]) : v }] },
    useEffect(fn, deps) { const n = cursor++, anterior = efeitos[n]; if (!anterior || deps.some((d,i) => d !== anterior.deps[i])) novos.push(() => { anterior?.limpar?.(); efeitos[n] = { deps, limpar: fn() } }) },
  }
  const generico = new Proxy({ __esModule: true }, { get: (_, k) => k === '__esModule' ? true : () => null })
  const modulo = { exports: {} }
  vm.runInNewContext(transformSync(fs.readFileSync(arquivo, 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'cjs' }).code, {
    module: modulo, exports: modulo.exports, console, Event, document: documento, window: janela, navigator: navegador, localStorage: localStorageFake,
    setInterval: f => { timers.add(f); return f }, clearInterval: f => timers.delete(f),
    require(n) {
      if (n === 'react') return react
      if (n === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
      if (n === '@mui/material') return new Proxy({}, { get: (_, k) => k })
      if (n === '@capacitor/core') return { Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' } }
      if (n.includes('FirebaseAuthContext')) return { useFirebaseAuth: () => ({ user: usuario }) }
      if (n.includes('config/firebase')) return { isFirebaseConfigured: () => true }
      if (n.includes('bibliotecaLivrosService')) return servico
      if (n.includes('react-router-dom')) return { useNavigate: () => () => {} }
      if (n.includes('retornoPagamentoPix')) return { observarRetornoPagamentoPix: ({ onRetorno }) => { retornou = onRetorno; return () => {} } }
      return generico
    },
  })
  return {
    render(nome, props) { cursor = 0; novos = []; const tree = modulo.exports[nome](props); if (tree?.type === 'PedidosPixProvider') contexto = tree.props.value; novos.forEach(f => f()); return tree },
    limpar() { efeitos.forEach(e => e?.limpar?.()) },
  }
}
function achar(node, predicado) {
  if (!node || typeof node !== 'object') return null
  if (predicado(node)) return node
  for (const filho of [node.props?.children, node.props?.action].flat(Infinity)) { const resultado = achar(filho, predicado); if (resultado) return resultado }
  return null
}
const botao = (tree, texto) => achar(tree, n => n.type === 'Button' && String(n.props.children).includes(texto))
const flush = () => new Promise(resolve => setImmediate(resolve))
;(async () => {
  const aviso = carregar('src/components/AvisosPedidosPix.jsx')
  const render = () => aviso.render('default')
  render(); await flush()
  let tree = render()
  assert.equal(achar(tree, n => n.type === 'Snackbar').props.open, true, 'Aviso aparece fora da livraria sem push')
  achar(tree, n => n.type === 'IconButton' && n.props['aria-label'] === 'Fechar aviso de compra').props.onClick()
  tree = render()
  assert.equal(achar(tree, n => n.type === 'Snackbar').props.open, false, 'Usuário pode dispensar o aviso')
  await listeners.get('focus')(); tree = render()
  assert.equal(achar(tree, n => n.type === 'Snackbar').props.open, false, 'Consulta e retorno ao app não fazem o aviso reaparecer')
  const lembrete = aviso.render('LembretePedidosPix')
  assert.ok(botao(lembrete, 'Terminar compra'), 'Livraria mantém acesso à compra dispensada')
  botao(lembrete, 'Terminar compra').props.onClick(); tree = render()
  assert.equal(achar(tree, n => n.type === 'Dialog').props.open, true)
  await botao(tree, 'continuar compra').props.onClick(); tree = render()
  assert.equal(achar(tree, n => n.type === 'OpcoesCompra').props.pedidoInicial.pedidoId, 'pedido', 'Abre o pagamento sem procurar o livro')
  usuario = { uid: 'outra-conta' }; dadosLista = { pedidos: [] }; tree = render()
  assert.equal(achar(tree, n => n.type === 'Snackbar').props.open, false, 'Outra conta nunca vê aviso anterior')
  assert.equal(achar(tree, n => n.type === 'OpcoesCompra'), null)
  await flush(); render()
  const antes = consultas
  navegador.onLine = false; await listeners.get('online')(); assert.equal(consultas, antes)
  navegador.onLine = true; dadosLista = { pedidos: [original] }; await listeners.get('focus')(); tree = render()
  assert.equal(achar(tree, n => n.type === 'Snackbar').props.open, true, 'Retorno ao app consulta a situação novamente')
  aviso.limpar(); assert.equal(timers.size, 0); assert.equal(listeners.size, 0, 'Encerra observadores')

  usuario = { uid: 'cliente' }
  const reaberto = carregar('src/components/AvisosPedidosPix.jsx')
  reaberto.render('default'); await flush(); tree = reaberto.render('default')
  assert.equal(achar(tree, n => n.type === 'Snackbar').props.open, false, 'Dispensa persiste após reabrir o aplicativo')
  dadosLista = { pedidos: [{ ...original, observacaoAdmin: 'Nova mensagem da livraria.' }] }
  await listeners.get('focus')(); tree = reaberto.render('default')
  assert.equal(achar(tree, n => n.type === 'Snackbar').props.open, true, 'Nova mensagem relevante pode avisar novamente')
  botao(tree, 'Ver pedido').props.onClick(); tree = reaberto.render('default')
  botao(tree, 'Fechar').props.onClick(); tree = reaberto.render('default')
  assert.equal(achar(tree, n => n.type === 'Snackbar').props.open, false, 'Fechar lista também dispensa o aviso flutuante')
  reaberto.limpar()

  usuario = { uid: 'cliente' }
  const tela = carregar('src/pages/BibliotecaLivros.jsx')
  const props = { livro: { id: 'livro', titulo: 'Meu livro' }, comprasConfirmadas: new Set(), pedidoInicial: original, onClose() {} }
  const renderCompra = () => tela.render('OpcoesDialog', props)
  renderCompra(); await flush(); tree = renderCompra()
  assert.ok(botao(tree, 'Ainda não fiz'))
  assert.equal(achar(tree, n => n.type === 'Box' && n.props.component === 'img'), null, 'Nunca oferece o QR antigo da compra recusada')
  await botao(tree, 'Ainda não fiz').props.onClick(); tree = renderCompra()
  assert.equal(achar(tree, n => n.type === 'Box' && n.props.component === 'img').props.src, 'qr-correto')
  await botao(tree, 'Copiar código Pix').props.onClick(); assert.equal(copiado, 'pix-correto', 'Copia o Pix atualizado sem reabrir a compra')
  assert.equal(botao(tree, 'Já fiz o Pix'), null, 'Aguarda ida ao banco')
  retornou(); tree = renderCompra(); await botao(tree, 'Já fiz o Pix').props.onClick(); assert.equal(informou, 1)
  tela.limpar()
  console.log('Avisos e retomada Pix: 16/16 grupos aprovados (100%); falhas: 0%; tempo: ' + ((performance.now() - inicio) / 1000).toFixed(2) + ' s. Componentes executados com serviços simulados, sem pagamentos reais.')
})().catch(e => { console.error(e); process.exitCode = 1 })
