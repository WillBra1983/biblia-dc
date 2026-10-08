import assert from 'node:assert/strict'
import fs from 'node:fs'
import { medirPaginasPdf, escalaBitmapPdf } from '../src/utils/pdfLeituraRecursos.js'
import { paginaDestinoPdf } from '../src/utils/sumarioLivro.js'
const chamadas = []
const documento = { getPage: async (numero) => { chamadas.push(numero); return { getViewport: () => ({ width: 600, height: numero % 2 ? 800 : 1000 }) } } }
const medidas = await medirPaginasPdf(documento, 147)
assert.equal(Object.keys(medidas).length, 147)
assert.equal(medidas[146], 1000 / 600)
await medirPaginasPdf(documento, 147, medidas)
assert.equal(chamadas.length, 147)
assert.ok(escalaBitmapPdf(343, 444, 3, 3) > escalaBitmapPdf(343, 444, 1, 3))
assert.ok(343 * 444 * escalaBitmapPdf(343, 444, 4, 3) ** 2 <= 6000001)
if (process.argv[2]) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const pdf = await getDocument({ data: new Uint8Array(fs.readFileSync(process.argv[2])), disableFontFace: true }).promise
  const capitulo = (await pdf.getOutline()).find((item) => /^6\./.test(item.title))
  assert.equal(await paginaDestinoPdf(pdf, capitulo.dest), 147)
  const geometria = await medirPaginasPdf(pdf, 147)
  const texto = (await (await pdf.getPage(147)).getTextContent()).items.map((item) => item.str).join(' ')
  assert.match(texto, /Capítulo 6/)
  assert.match(texto, /O Crescimento/)
  assert.equal(Object.keys(geometria).length, 147)
  console.log('Santidade: capítulo 6 confirmado na página 147; geometria das 147 páginas medida sem renderização.')
  await pdf.destroy()
}
console.log('PDF: tamanhos diferentes, reaproveitamento das medidas, resolução do zoom e limite de memória verificados.')
