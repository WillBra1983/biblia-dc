import assert from 'node:assert/strict'
import { posicaoTrocaModoEpub } from '../src/utils/epubTrocaModo.js'

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
