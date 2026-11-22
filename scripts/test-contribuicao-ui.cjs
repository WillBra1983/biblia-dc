const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict')
const { transformSync } = require('esbuild')
const inicio = performance.now(), flush = () => new Promise(r => setImmediate(r))
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
function achar(no, teste) {
  if (!no || typeof no !== 'object') return null
  if (teste(no)) return no
  for (const filho of [no.props?.children, no.props?.action].flat(Infinity)) { const r = achar(filho, teste); if (r) return r }
  return null
}
function montar(arquivo, extras = {}, resolver = () => null) {
  let cursor = 0, fila = []
  const slots = [], timers = new Map()
  const react = {
    useState(valor) { const i = cursor++; if (!(i in slots)) slots[i] = typeof valor === 'function' ? valor() : valor; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v }] },
    useRef(valor) { const i = cursor++; return slots[i] ||= { current: valor } },
    cloneElement: (el, props) => ({ ...el, props: { ...el.props, ...props } }),
    useEffect(fn, deps) { const i = cursor++, antigo = slots[i]; if (!antigo || deps.some((v, j) => v !== antigo.deps[j])) fila.push(() => { antigo?.cleanup?.(); slots[i] = { deps, cleanup: fn() } }) },
  }
  const m = { exports: {} }
  const fallback = new Proxy({ __esModule: true }, { get: (_, k) => k === '__esModule' ? true : () => null })
  vm.runInNewContext(transformSync(fs.readFileSync(arquivo, 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'cjs' }).code, {
    module: m, exports: m.exports, console, Date, document: { hidden: false },
    setInterval: (fn, ms) => { const id = {}; timers.set(id, { fn, ms }); return id }, clearInterval: id => timers.delete(id),
    ...extras, require: n => {
      if (n === 'react') return react
      if (n === 'react/jsx-runtime') return jsx
      if (n === '@mui/material') return new Proxy({}, { get: (_, k) => k })
      return resolver(n) || fallback
    },
  })
  return { render(props) { cursor = 0; fila = []; const tree = m.exports.default(props); fila.forEach(fn => fn()); return tree }, timers,
    limpar() { slots.forEach(s => s?.cleanup?.()) } }
}
const botao = (tree, texto) => achar(tree, n => n.type === 'Button' && String(n.props.children).includes(texto))
;(async () => {
  let grupos = 0, chamadas = 0, copiado
  const pix = { pixCopiaCola: 'codigo-completo-cofrinho', qrCodeDataUrl: 'data:image/png;base64,teste', nome: 'Recebedor', valorCentavos: 1000 }
  const props = { aberto: false, onClose() {}, carregarPix: async () => { chamadas++; return pix } }
  const app = montar('src/components/ContribuicaoProjetoDialog.jsx', { navigator: { clipboard: { writeText: async v => { copiado = v } } } })
  app.render(props); await flush(); assert.equal(chamadas, 0, 'Não consulta o Pix até o usuário abrir'); grupos++
  props.aberto = true; app.render(props); await flush()
  let tree = app.render(props)
  assert.equal(chamadas, 1)
  assert.equal(achar(tree, n => n.props?.component === 'img').props.src, pix.qrCodeDataUrl)
  assert.ok(achar(tree, n => String(n.props?.children).includes('Escolha o valor'))); grupos++
  await botao(tree, 'Copiar Pix').props.onClick(); tree = app.render(props)
  assert.equal(copiado, pix.pixCopiaCola); assert.ok(botao(tree, 'Pix copiado')); grupos++
  props.aberto = false; app.render(props); props.aberto = true; app.render(props); await flush(); app.render(props)
  assert.equal(chamadas, 2, 'Reabrir consulta a configuração atual'); grupos++

  const falha = montar('src/components/ContribuicaoProjetoDialog.jsx')
  let falhar = true
  const pf = { aberto: true, onClose() {}, carregarPix: async () => { if (falhar) throw Error('offline'); return pix } }
  falha.render(pf); await flush(); tree = falha.render(pf)
  assert.ok(botao(tree, 'Tentar novamente')); falhar = false
  botao(tree, 'Tentar novamente').props.onClick(); falha.render(pf); await flush(); tree = falha.render(pf)
  assert.ok(botao(tree, 'Copiar Pix')); grupos++

  const clipboard = montar('src/components/ContribuicaoProjetoDialog.jsx', { navigator: { clipboard: { writeText: async () => { throw Error('recusado') } } } })
  clipboard.render({ ...props, aberto: true }); await flush(); tree = clipboard.render({ ...props, aberto: true })
  await botao(tree, 'Copiar Pix').props.onClick(); tree = clipboard.render({ ...props, aberto: true })
  assert.ok(achar(tree, n => n.type === 'TextField' && n.props.value === pix.pixCopiaCola))
  assert.match(achar(tree, n => n.type === 'Alert').props.children, /Selecione o código/); grupos++

  const tardio = montar('src/components/ContribuicaoProjetoDialog.jsx')
  let resolver
  const pt = { aberto: true, carregarPix: () => new Promise(r => { resolver = r }), onClose() {} }
  tardio.render(pt); await flush(); pt.aberto = false; tardio.render(pt); resolver(pix); await flush(); tree = tardio.render(pt)
  assert.equal(achar(tree, n => n.props?.component === 'img'), null); grupos++

  const destaques = montar('src/components/DestaquesMenu.jsx', {}, n => {
    if (n.includes('react-router-dom')) return { useNavigate: () => () => {} }
    if (n.includes('FirebaseAuthContext')) return { useFirebaseAuth: () => ({ user: null }) }
    if (n.includes('destaquesMenuService')) return { destaquesAtivos: () => [], conectarDestaques: async () => ({ api: { onValue: () => () => {} }, referencia: {} }) }
    if (n.includes('bibliotecaLivrosService')) return { assinarAcessosBiblioteca: () => () => {}, assinarCatalogoLivros: () => () => {} }
    if (n.includes('ContribuicaoProjetoDialog')) return { __esModule: true, default: 'ContribuicaoProjetoDialog' }
    return null
  })
  const pd = { children: { type: 'Versiculo', props: {} }, livraria: { type: 'Livraria', props: {} } }
  tree = destaques.render(pd)
  const apoio = achar(tree, n => n.props?.['aria-label'] === 'Contribuir com o projeto')
  assert.equal(apoio.props.sx.width, 44); assert.equal(apoio.props.sx.right, 48)
  assert.equal([...destaques.timers.values()].filter(t => t.ms === 15000).length, 1)
  let parou = false
  apoio.props.onClick({ stopPropagation() { parou = true } }); tree = destaques.render(pd)
  assert.equal(parou, true)
  assert.equal(achar(tree, n => n.type === 'ContribuicaoProjetoDialog').props.aberto, true)
  assert.equal([...destaques.timers.values()].filter(t => t.ms === 15000).length, 0, 'Pausa carrossel enquanto contribui'); grupos++
  achar(tree, n => n.type === 'ContribuicaoProjetoDialog').props.onClose(); destaques.render(pd)
  assert.equal([...destaques.timers.values()].filter(t => t.ms === 15000).length, 1, 'Retoma carrossel ao fechar'); grupos++
  tree = destaques.render(pd)
  const compartilhar = achar(tree, n => n.props?.['aria-label'] === 'Compartilhar este projeto')
  assert.equal(compartilhar.props.sx.right, 4)
  compartilhar.props.onClick({ stopPropagation() {} }); destaques.render(pd)
  assert.equal([...destaques.timers.values()].filter(t => t.ms === 15000).length, 0, 'Compartilhamento também pausa a troca dos destaques'); grupos++
  const valores = [], novo = montar('src/components/ContribuicaoProjetoDialog.jsx')
  const pn = { aberto: true, onClose() {}, carregarPix: async dados => { valores.push(dados.valorCentavos); return { ...pix, valorCentavos: dados.valorCentavos } } }
  novo.render(pn); await flush(); tree = novo.render(pn)
  assert.ok(achar(tree, n => n.props?.id === 'contribuicao-titulo' && String(n.props.children).includes('Abrace este projeto')))
  const escolha = achar(tree, n => n.type === 'ToggleButtonGroup')
  assert.deepEqual(Array.from(escolha.props.children[0], n => n.props.value), [200, 500, 1000, 2000, 5000, 10000, 50000, 100000])
  escolha.props.onChange(null, 50000); novo.render(pn); await flush(); tree = novo.render(pn)
  assert.equal(valores.at(-1), 50000); grupos++
  achar(tree, n => n.type === 'ToggleButtonGroup').props.onChange(null, 'outro'); tree = novo.render(pn)
  achar(tree, n => n.props?.label === 'Outro valor (R$)').props.onChange({ target: { value: '12,34' } }); tree = novo.render(pn)
  botao(tree, 'Gerar Pix').props.onClick(); novo.render(pn); await flush(); tree = novo.render(pn)
  assert.equal(valores.at(-1), 1234)
  achar(tree, n => n.props?.label === 'Outro valor (R$)').props.onChange({ target: { value: '-5' } }); tree = novo.render(pn)
  botao(tree, 'Gerar Pix').props.onClick(); tree = novo.render(pn)
  assert.ok(achar(tree, n => n.props?.label === 'Outro valor (R$)').props.error); grupos++
  novo.limpar()
  let campanha = { codigo: 'convite-pessoal', total: 5, meta: 5, creditos: 1, livros: [{ id: 'livro', titulo: 'Livro de teste' }], beneficios: [] }
  let usuario = { uid: 'leitor' }, consultas = 0, envios = 0, resgates = 0, destino, fechou = false
  const divulgar = montar('src/components/CompartilharProjetoDialog.jsx', {}, n => {
    if (n.includes('react-router-dom')) return { useNavigate: () => path => { destino = path } }
    if (n.includes('FirebaseAuthContext')) return { useFirebaseAuth: () => ({ user: usuario }) }
    if (n.includes('projetoCompartilhamentoService')) return {
      carregarCampanhaProjeto: async () => { consultas++; return campanha },
      compartilharProjeto: async codigo => { assert.equal(codigo, 'convite-pessoal'); envios++; return 'compartilhado' },
      linkConviteProjeto: codigo => `https://app.test/${codigo || ''}`,
      resgatarLivroProjeto: async id => { resgates++; campanha = { ...campanha, creditos: 0, beneficios: [{ livroId: id, titulo: 'Livro de teste', acessoAte: Date.now() + 7 * 86400000 }] }; return campanha.beneficios[0] },
    }
    return null
  })
  const pc = { aberto: true, onClose() { fechou = true } }
  divulgar.render(pc); await flush(); tree = divulgar.render(pc)
  assert.equal(achar(tree, n => n.props?.label === 'Link do convite').props.value, 'https://app.test/convite-pessoal')
  await botao(tree, 'Compartilhar este projeto').props.onClick(); tree = divulgar.render(pc)
  assert.equal(envios, 1); assert.equal(resgates, 0, 'Compartilhar sozinho não concede livros'); grupos++
  assert.equal(botao(tree, 'Liberar sete dias').props.disabled, true)
  achar(tree, n => n.props?.label === 'Escolha seu livro').props.onChange({ target: { value: 'livro' } }); tree = divulgar.render(pc)
  await botao(tree, 'Liberar sete dias').props.onClick(); tree = divulgar.render(pc)
  assert.equal(resgates, 1); assert.ok(botao(tree, 'Abrir leitura'))
  botao(tree, 'Abrir leitura').props.onClick(); assert.equal(destino, '/biblioteca/livro/ler?conviteLeitura=1'); assert.equal(fechou, true); grupos++
  usuario = null; tree = divulgar.render(pc); tree = divulgar.render(pc)
  assert.equal(botao(tree, 'Liberar sete dias'), null)
  assert.equal(achar(tree, n => n.props?.label === 'Link do convite').props.value, 'https://app.test/')
  const anteriores = consultas; divulgar.render(pc); await flush(); assert.equal(consultas, anteriores, 'Visitantes compartilham sem consultar benefícios de outra conta'); grupos++
  divulgar.limpar()
  destaques.limpar(); app.limpar(); falha.limpar(); clipboard.limpar(); tardio.limpar()
  console.log(`Contribuição UI: ${grupos}/${grupos} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now() - inicio) / 1000).toFixed(2)} s. Componentes e eventos simulados.`)
})().catch(e => { console.error(e); process.exitCode = 1 })
