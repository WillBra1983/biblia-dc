import assert from 'node:assert/strict'
import { normalizarSumarioLivro, destinoEpubSeguro, paginaDestinoPdf } from '../src/utils/sumarioLivro.js'

const epub = normalizarSumarioLivro([
  { label: ' Parte 1 ', href: 'part1.xhtml', subitems: [{ label: 'Capítulo\n1', href: 'cap1.xhtml#inicio' }] },
  { label: 'Sem destino', subitems: [{ label: 'Capítulo 2', href: 'cap2.xhtml' }] },
  { label: 'Externo', href: 'https://example.com' },
], 'epub')
assert.deepEqual(epub.map((item) => [item.titulo, item.nivel]), [['Parte 1', 0], ['Capítulo 1', 1], ['Sem destino', 0], ['Capítulo 2', 1], ['Externo', 0]])
assert.equal(epub[1].destino, 'cap1.xhtml#inicio')
assert.equal(epub[4].destino, null)
for (const destino of ['javascript:alert(1)', 'data:text/html,x', '//example.com', 'mailto:user@example.com']) assert.equal(destinoEpubSeguro(destino), null)
assert.deepEqual(normalizarSumarioLivro(null, 'pdf'), [])
const ciclo = { title: 'Parte', dest: [0], items: [] }
ciclo.items.push(ciclo)
assert.equal(normalizarSumarioLivro([ciclo], 'pdf').length, 1)
assert.equal(normalizarSumarioLivro(Array.from({ length: 3000 }, (_, i) => ({ title: `Capítulo ${i}`, dest: [i] })), 'pdf').length, 2000)
const doc = {
  numPages: 20,
  getDestination: async (nome) => nome === 'capitulo' ? [{ num: 50, gen: 0 }, { name: 'XYZ' }, 0, 0, null] : null,
  getPageIndex: async (ref) => ref.num === 50 ? 7 : 999,
}
assert.equal(await paginaDestinoPdf(doc, 'capitulo'), 8)
assert.equal(await paginaDestinoPdf(doc, [0, { name: 'Fit' }]), 1)
assert.equal(await paginaDestinoPdf(doc, [19]), 20)
await assert.rejects(paginaDestinoPdf(doc, 'inexistente'))
await assert.rejects(paginaDestinoPdf(doc, [-1]))
await assert.rejects(paginaDestinoPdf(doc, [20]))
await assert.rejects(paginaDestinoPdf(doc, [{ num: 999 }]))
assert.equal(normalizarSumarioLivro([{ title: 'Parte', items: [{ title: 'Capítulo', dest: 'capitulo' }] }], 'pdf')[1].destino, 'capitulo')
console.log('Sumário: capítulos/subcapítulos, destinos PDF e EPUB, arquivos sem índice e links externos validados.')
