import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { transformSync } from 'esbuild'
import { conterRolagemMenu } from '../src/utils/conterRolagemMenu.js'
import { sxSafeAreaTop, sxSafeAreaBottom } from '../src/utils/viewportHeight.js'

const inicio = performance.now(), require = createRequire(import.meta.url)
const modulo = { exports: {} }
vm.runInNewContext(transformSync(fs.readFileSync('src/theme/theme.js', 'utf8'), { format: 'cjs' }).code, { module: modulo, exports: modulo.exports, require })
let grupos = 0
const verificar = (nome, fn) => { fn(); grupos++; console.log('OK: ' + nome) }
verificar('Proteção comum em temas claro e escuro, sem ampliar diálogos de desktop', () => {
  for (const modo of ['light', 'dark']) {
    const tema = modulo.exports.default(modo)
    const container = tema.components.MuiDialog.styleOverrides.container
    assert.match(container.paddingTop, /safe-area-inset-top/)
    assert.match(container.paddingBottom, /safe-area-inset-bottom/)
    assert.match(container.paddingLeft, /safe-area-inset-left/)
    assert.match(container.paddingRight, /safe-area-inset-right/)
    assert.equal(container['& > .MuiDialog-paper'].maxHeight, 'calc(100% - 64px) !important')
    assert.equal(container['& > .MuiDialog-paper'].maxWidth, undefined)
    assert.equal(container['& > .MuiDialog-paperFullScreen'].height, '100% !important')
    assert.equal(container['@media (max-width:599.95px)']['& > .MuiDialog-paper'].maxHeight, 'calc(100% - 32px) !important')
  }
})
verificar('Títulos antigos com helpers não somam a área segura duas vezes', () => {
  assert.match(sxSafeAreaTop().pt, /var\(--app-safe-area-top/)
  assert.match(sxSafeAreaBottom().pb, /var\(--app-safe-area-bottom/)
  assert.match(sxSafeAreaTop('8px').pt, /8px/)
  assert.equal(modulo.exports.default('light').components.MuiDialog.styleOverrides.container['--app-safe-area-top'], '0px')
})
const listeners = new Map()
const menu = { scrollHeight: 1000, clientHeight: 300, scrollTop: 0, parentElement: null,
  addEventListener: (nome, fn) => listeners.set(nome, fn), removeEventListener: nome => listeners.delete(nome) }
const limpar = conterRolagemMenu(menu)
function gesto(x, y, alvo = menu, cancelable = true, toques = 1) {
  let impedido = false
  const touch = (x, y) => Array.from({ length: toques }, () => ({ clientX: x, clientY: y }))
  listeners.get('touchstart')({ touches: touch(50, 50) })
  listeners.get('touchmove')({ touches: touch(x, y), target: alvo, cancelable, preventDefault: () => { impedido = true } })
  return impedido
}
verificar('Menu não arrasta nas bordas superior e inferior', () => {
  assert.equal(gesto(50, 80), true)
  assert.equal(gesto(50, 20), false)
  menu.scrollTop = 700
  assert.equal(gesto(50, 20), true)
  assert.equal(gesto(50, 80), false)
})
verificar('Mantém rolagem vertical e contém movimento horizontal', () => {
  menu.scrollTop = 200
  assert.equal(gesto(50, 20), false)
  assert.equal(gesto(50, 80), false)
  assert.equal(gesto(90, 51), true)
  assert.equal(gesto(10, 49), true)
})
verificar('Listas internas, gestos múltiplos e eventos não canceláveis preservados', () => {
  menu.scrollTop = 0
  const lista = { scrollHeight: 400, clientHeight: 100, scrollTop: 50, parentElement: menu }
  assert.equal(gesto(50, 80, lista), false)
  assert.equal(gesto(50, 20, menu, true, 2), false)
  assert.equal(gesto(90, 50, menu, false), false)
  limpar(); assert.equal(listeners.size, 0)
})
verificar('Auditoria de sintaxe e inventário de todas as páginas e componentes', () => {
  let paginas = 0, componentes = 0, dialogos = 0
  for (const pasta of ['src/pages', 'src/components']) for (const arquivo of fs.readdirSync(pasta)) {
    if (!arquivo.endsWith('.jsx')) continue
    const texto = fs.readFileSync(`${pasta}/${arquivo}`, 'utf8')
    transformSync(texto, { loader: 'jsx' })
    if (pasta === 'src/pages') paginas++; else componentes++
    dialogos += [...texto.matchAll(/<Dialog\b/g)].length
  }
  assert.ok(paginas >= 41 && componentes >= 113 && dialogos >= 81)
  console.log(`Inventário: ${paginas} páginas, ${componentes} componentes, ${dialogos} usos de Dialog.`)
})
verificar('Comparação mantém fechamento acessível e botão do tamanho do seletor', () => {
  const comparacao = fs.readFileSync('src/components/BibliaComparacaoDialog.jsx', 'utf8')
  assert.match(comparacao, /position: 'relative', minHeight: 56/)
  assert.match(comparacao, /aria-label="Fechar comparação"[^\n]*width: 44, height: 44/)
  const biblia = fs.readFileSync('src/pages/Biblia.jsx', 'utf8')
  assert.match(biblia, /<Button size="small" aria-label="Comparar traduções"/)
  assert.match(biblia, />\s*Compare\s*<\/Button>/)
  assert.doesNotMatch(biblia, /images\/biblias-vs-comparacao\.webp/)
  const moldura = fs.readFileSync('src/utils/bibliaHeaderButton.js', 'utf8')
  assert.match(moldura, /minHeight: 32/)
  assert.match(moldura, /height: 32/)
})
verificar('Moldura nativa e tipografia comum sem bloquear a pinça de leitura', () => {
  const css = fs.readFileSync('src/index.css', 'utf8')
  assert.match(css, /-webkit-text-size-adjust: 100%/)
  assert.match(css, /html\[data-native-app\] #root/)
  assert.match(css, /overscroll-behavior: none/)
  assert.match(fs.readFileSync('src/main.jsx', 'utf8'), /if \(isNativeApp\(\)\) document.documentElement.setAttribute\('data-native-app'/)
  assert.match(fs.readFileSync('src/pages/Biblia.jsx', 'utf8'), /usePinchNumeric\(pinchLeituraRef/)
})
console.log(`Layout móvel: ${grupos}/${grupos} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now() - inicio) / 1000).toFixed(2)} s. Gestos simulados e auditoria de código; não substituem teste em aparelhos físicos.`)
