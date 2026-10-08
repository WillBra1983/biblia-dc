import assert from 'node:assert/strict'
import { origemZoomPdf, posicaoPdfValida } from '../src/utils/pdfViewerPosicao.js'

const container = { offsetLeft: 0, offsetTop: 0, getBoundingClientRect: () => ({ left: 8, top: 187 }) }
assert.deepEqual(origemZoomPdf(container, 200, 400), [192, 213])
const horizontal = { offsetLeft: 12, offsetTop: 15, getBoundingClientRect: () => ({ left: 30, top: 100 }) }
assert.deepEqual(origemZoomPdf(horizontal, 200, 300), [182, 215])
const posicao = { pageNumber: 158, left: 226, top: 790 }
for (let i = 0; i < 20; i++) assert.ok(posicaoPdfValida(JSON.parse(JSON.stringify(posicao)), 158, 494))
assert.equal(posicaoPdfValida(posicao, 1, 494), false)
assert.equal(posicaoPdfValida(posicao, 158, 49), false)
assert.equal(posicaoPdfValida({ ...posicao, top: NaN }, 158, 494), false)
assert.equal(posicaoPdfValida(null, 158, 494), false)
console.log('PDFViewer: origem local do zoom, posição persistida e limites de amostra validados.')
