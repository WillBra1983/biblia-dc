import assert from 'node:assert/strict'
import { posicaoAtualEpub } from '../src/utils/epubPosicaoResize.js'

const manager = { currentLocation: () => [{ mapping: { start: 'pagina-atual-2' } }] }
assert.equal(posicaoAtualEpub(manager), 'pagina-atual-2')
assert.equal(posicaoAtualEpub(manager, 'destino-escolhido-1'), 'destino-escolhido-1')
assert.equal(posicaoAtualEpub({ currentLocation: () => [] }), undefined)
assert.equal(posicaoAtualEpub({ currentLocation: () => { throw new Error('Ainda não montado') } }), undefined)
console.log('EPUB: 4 testes de posição durante redimensionamento passaram.')
