import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { transformSync } from 'esbuild'
import * as catalogo from '../src/data/bibliaVersoes.js'
import * as rolagem from '../src/utils/bibliaComparacaoScroll.js'

const inicio = performance.now()
const codigo = transformSync(readFileSync('src/components/BibliaComparacaoDialog.jsx', 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'cjs' }).code
function host() {
  const hooks = []; let cursor = 0, tree
  const react = {
    useState(valor) {
      const i = cursor++
      if (!(i in hooks)) hooks[i] = typeof valor === 'function' ? valor() : valor
      return [hooks[i], novo => { hooks[i] = typeof novo === 'function' ? novo(hooks[i]) : novo }]
    },
    useRef(valor) { const i = cursor++; return hooks[i] ||= { current: valor } },
    // Este teste exercita os controles reais. Consultas e geometria têm testes separados.
    useEffect() {}, useLayoutEffect() {},
  }
  const mod = { exports: {} }
  const elemento = (type, props) => ({ type, props })
  vm.runInNewContext(codigo, { module: mod, exports: mod.exports, require(nome) {
    if (nome === 'react') return react
    if (nome === 'react/jsx-runtime') return { jsx: elemento, jsxs: elemento }
    if (nome === '@mui/material') return Object.fromEntries(['Alert','Box','Button','CircularProgress','Dialog','DialogTitle','IconButton','TextField','Tooltip','Typography'].map(n => [n,n]))
    if (nome.startsWith('@mui/icons-material/')) return { default: nome }
    if (nome === '../data/biblia') return { livros: [{ id: 1, nome: 'Gênesis', capitulos: 50 }] }
    if (nome === '../data/bibliaVersoes') return catalogo
    if (nome === '../services/bibliaService') return {}
    if (nome === '../utils/bibliaComparacaoScroll') return rolagem
    if (nome === './TextoFalasJesus') return {default: 'TextoFalasJesus'}
    throw Error(nome)
  } })
  function render() { cursor = 0; tree = mod.exports.default({ livroId: 1, capituloInicial: 6, versaoInicial: 'ara', onClose() {} }) }
  function todos(no) {
    if (!arguments.length) no = tree
    if (!no || typeof no !== 'object') return []
    if (Array.isArray(no)) return no.flatMap(todos)
    return [no, ...todos(no.props?.children)]
  }
  render()
  return { render, todos, controle: label => todos().find(n => n.props?.['aria-label'] === label), paineis: () => todos().filter(n => n.props?.role === 'region'), grade: () => todos().find(n => n.props?.sx?.display === 'grid') }
}
let grupos = 0
function teste(nome, fn) { fn(); grupos++; console.log(`OK: ${nome}`) }
teste('Abre com três painéis e permite fechar qualquer um deles', () => {
  for (let indice = 1; indice <= 3; indice++) {
    const h = host()
    assert.equal(h.paineis().length, 3)
    h.controle(`Fechar painel ${indice} da comparação`).props.onClick(); h.render()
    assert.equal(h.paineis().length, 2)
    assert.ok(!h.todos().some(n => n.props?.inputProps?.['aria-label'] === `Tradução do painel ${indice}`))
    assert.equal(h.grade().props.sx.gridTemplateRows, 'repeat(2, minmax(0, 1fr))')
  }
})
teste('Mantém pelo menos dois painéis e reabre o terceiro com espaço igual', () => {
  const h = host()
  h.controle('Fechar painel 2 da comparação').props.onClick(); h.render()
  assert.ok(!h.todos().some(n => /^Fechar painel /.test(n.props?.['aria-label'] || '')))
  h.controle('Reabrir terceira versão').props.onClick(); h.render()
  assert.equal(h.paineis().length, 3)
  assert.equal(h.grade().props.sx.gridTemplateRows, 'repeat(3, minmax(0, 1fr))')
  assert.ok(!h.controle('Reabrir terceira versão'))
})
teste('Fechar e reabrir preserva as traduções escolhidas e a passagem', () => {
  const h = host()
  const seletor = () => h.todos().find(n => n.props?.inputProps?.['aria-label'] === 'Tradução do painel 2')
  seletor().props.onChange({ target: { value: 'ara' } }); h.render()
  h.controle('Fechar painel 2 da comparação').props.onClick(); h.render()
  assert.ok(h.paineis().every(n => n.props['aria-label'].endsWith('Gênesis 6')))
  h.controle('Reabrir terceira versão').props.onClick(); h.render()
  assert.equal(seletor().props.value, 'ara')
  assert.ok(h.paineis().every(n => n.props['aria-label'].endsWith('Gênesis 6')))
})
console.log(`${grupos}/${grupos} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now()-inicio)/1000).toFixed(2)} s.`)
