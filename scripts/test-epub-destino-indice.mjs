import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { transformSync } from 'esbuild'
const contexto = { module: { exports: {} }, exports: {}, cancelarLimpezaEpub: () => {}, requestAnimationFrame: (callback) => callback() }
const fonte = fs.readFileSync('src/utils/epubDestinoIndice.js', 'utf8').replace(/^import .*$/gm, '')
vm.runInNewContext(transformSync(fonte, { format: 'cjs' }).code, contexto)
const { alinharDestinoEpub, navegarDestinoEpub } = contexto.module.exports
let posicao, reportado = 0, exibido
const root = { scrollTop: 400, scrollLeft: 0, clientTop: 2, getBoundingClientRect: () => ({ top: 100 }) }
const view = { displayed: true, section: { index: 3 }, iframe: { getBoundingClientRect: () => ({ top: 250 }) }, contents: { document: { getElementById: (id) => id === 'capítulo' ? { getBoundingClientRect: () => ({ top: 80 }) } : null } }, locationOf: () => ({ top: 90 }) }
const rendition = { book: { spine: { get: () => ({ index: 3 }) } }, manager: { container: root, isPaginated: false, views: { all: () => [view] }, scrollTo: (left, top) => { posicao = top } }, display: async (destino) => { exibido = destino }, reportLocation: () => { reportado++ } }
await navegarDestinoEpub(rendition, 'cap3.xhtml#cap%C3%ADtulo', 'rolagem')
assert.equal(posicao, 628)
assert.equal(exibido, 'cap3.xhtml#cap%C3%ADtulo')
assert.equal(reportado, 1)
assert.equal(alinharDestinoEpub(rendition, 'epubcfi(/6/8)'), true)
assert.equal(posicao, 638)
assert.equal(alinharDestinoEpub(rendition, 'cap3.xhtml'), true)
assert.equal(posicao, 548)
assert.equal(alinharDestinoEpub(rendition, 'cap3.xhtml#ausente'), false)
posicao = null
await navegarDestinoEpub(rendition, 'cap3.xhtml#capítulo', 'paginas')
assert.equal(posicao, null)
for (const arquivo of ['src/components/CapaDestaqueLivro.jsx', 'src/components/DestaquesMenu.jsx', 'src/components/BibliotecaArquivoReader.jsx']) transformSync(fs.readFileSync(arquivo, 'utf8'), { loader: 'jsx' })
const capa = fs.readFileSync('src/components/CapaDestaqueLivro.jsx', 'utf8')
assert.match(capa, /urlCapaLivro\(livro.capa\)/)
assert.match(capa, /onError/)
console.log('OK: índice vertical com offset do iframe, âncora codificada, CFI e capítulo; modo páginas preservado; capa com endereço correto e substituta.')
