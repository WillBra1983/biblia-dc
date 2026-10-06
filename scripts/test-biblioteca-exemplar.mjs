import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createCanvas } from '@napi-rs/canvas'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
const require = createRequire(new URL('../functions/package.json', import.meta.url))
const { PDFDocument } = require('pdf-lib')
const JSZip = require('jszip')
const { personalizarExemplar, AVISO } = require('./src/bibliotecaExemplarPersonalizado')
const { decidirArquivo } = require('./src/bibliotecaDegustacao')
const codigo = 'BDC-1234567890ABCDEF1234'
const original = await PDFDocument.create()
original.addPage([420, 300]).drawText('Texto original preservado', { x: 30, y: 40, size: 14 })
const bytes = await original.save()
const copia = await personalizarExemplar(bytes, 'pdf', codigo, 'Maria Silva')
assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1)
assert.equal((await PDFDocument.load(copia)).getPageCount(), 2)
const politica = { publicado: true, downloadPermitido: true }
assert.ok(decidirArquivo({ livro: politica, finalidade: 'completo', comprado: false, download: true }).erro)
assert.equal(decidirArquivo({ livro: politica, finalidade: 'completo', comprado: true, download: true }).finalidade, 'completo')
assert.ok(decidirArquivo({ livro: { ...politica, downloadPermitido: false }, finalidade: 'completo', comprado: true, download: true }).erro)
mkdirSync('tmp/pdfs', { recursive: true })
const doc = await getDocument({ data: new Uint8Array(copia), disableFontFace: true, useSystemFonts: false, standardFontDataUrl: fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url)) }).promise
for (let numero = 1; numero <= 2; numero++) {
  const page = await doc.getPage(numero)
  const texto = (await page.getTextContent()).items.map((i) => i.str).join(' ')
  assert.ok(texto.includes(codigo))
  if (numero === 1) { assert.ok(texto.includes('Exemplar licenciado para Maria Silva')); assert.ok(texto.includes('Compra:')); assert.ok(texto.includes('não permite redistribuição.')) }
  if (numero === 2) assert.ok(texto.includes('Texto original preservado'))
  const viewport = page.getViewport({ scale: 1.5 })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  writeFileSync(`tmp/pdfs/exemplar-teste-${numero}.png`, canvas.toBuffer('image/png'))
}
await doc.destroy()
const zip = new JSZip()
zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>')
zip.file('OEBPS/content.opf', '<package xmlns="http://www.idpf.org/2007/opf"><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/></spine></package>')
zip.file('OEBPS/a.xhtml', '<html><body>Original EPUB</body></html>')
const epub = await personalizarExemplar(await zip.generateAsync({ type: 'nodebuffer' }), 'epub', codigo, 'Maria Silva')
const resultado = await JSZip.loadAsync(epub)
assert.equal(await resultado.file('OEBPS/a.xhtml').async('string'), '<html><body>Original EPUB</body></html>')
assert.ok((await resultado.file('OEBPS/bdc-licenca.xhtml').async('string')).includes(AVISO))
assert.ok((await resultado.file('OEBPS/bdc-licenca.xhtml').async('string')).includes('Exemplar licenciado para Maria Silva'))
assert.ok((await resultado.file('OEBPS/content.opf').async('string')).includes('idref="bdc-licenca"'))
await assert.rejects(personalizarExemplar(bytes, 'pdf', '<codigo-invalido>'))
console.log('PDF/EPUB personalizados, original preservado, código, aviso e autorização de download verificados.')
