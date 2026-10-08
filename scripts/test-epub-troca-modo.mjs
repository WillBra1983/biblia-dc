import assert from 'node:assert/strict'
import { posicaoTrocaModoEpub, restaurarLinhaTopoEpub } from '../src/utils/epubTrocaModo.js'

const paginaAtual = 'epubcfi(/6/8!/4/2/10:25)'
const paginaAnterior = 'epubcfi(/6/2!/4/2:0)'
assert.equal(posicaoTrocaModoEpub({ currentLocation: () => ({ start: { cfi: paginaAtual } }) }, paginaAnterior), paginaAtual)
assert.equal(posicaoTrocaModoEpub({ currentLocation: () => undefined }, paginaAtual), paginaAtual)
assert.equal(posicaoTrocaModoEpub({ currentLocation: () => { throw new Error('Remontando') } }, paginaAtual), paginaAtual)
assert.equal(posicaoTrocaModoEpub({ location: { start: { cfi: paginaAtual } } }), paginaAtual)
assert.equal(posicaoTrocaModoEpub(null), undefined)
// O destino capturado não deve acompanhar a posição transitória de um leitor novo.
let atual = paginaAtual
const leitor = { currentLocation: () => ({ start: { cfi: atual } }) }
const destinoCapturado = posicaoTrocaModoEpub(leitor)
atual = paginaAnterior
assert.equal(destinoCapturado, paginaAtual)
console.log('EPUB: 6 verificações de captura e preservação da posição na troca de modo passaram.')

// A localização reportada está atrasada: o texto real do topo deve prevalecer.
const node = { textContent: 'abcdef', length: 6 }
let offset = null
const doc = {
  body: {},
  createTreeWalker: () => { let lido = false; return { nextNode: () => lido ? null : (lido = true, node) } },
  createRange: () => ({
    selectNodeContents: () => { offset = null },
    setStart: (_, valor) => { offset = valor }, setEnd: () => {}, collapse: () => {},
    getClientRects: () => [{ top: offset === null ? -20 : offset * 10 - 20, bottom: offset === null ? 50 : offset * 10 - 10, left: 0, right: 30 }],
  }),
}
const view = { displayed: true, contents: { document: doc, cfiFromRange: () => `topo:${offset}` }, iframe: { getBoundingClientRect: () => ({ top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100 }) } }
const rendition = { manager: { container: { getBoundingClientRect: () => ({ top: 0, bottom: 100, left: 0, right: 100 }) }, views: { all: () => [view] } }, currentLocation: () => ({ start: { cfi: paginaAnterior } }) }
assert.equal(posicaoTrocaModoEpub(rendition), 'topo:2')

globalThis.requestAnimationFrame = (callback) => callback()
let marcador, destino
view.section = { index: 1 }
view.contents.range = () => ({ startContainer: { nodeType: 3 }, collapse: () => {}, insertNode: (valor) => { marcador = valor } })
doc.createElement = () => ({ style: {}, setAttribute: () => {} })
rendition.book = { spine: { get: () => ({ index: 1, href: 'capitulo.xhtml' }) } }
rendition.display = async (valor) => { destino = valor }
await restaurarLinhaTopoEpub(rendition, paginaAtual, 'paginas')
assert.match(marcador.style.cssText, /break-before:column/)
assert.equal(marcador.className, 'leitor-ancora-topo')
assert.equal(destino, 'capitulo.xhtml#leitor-inicio-modo')
console.log('EPUB: linha real do topo e início da nova coluna verificados (simulados).')
