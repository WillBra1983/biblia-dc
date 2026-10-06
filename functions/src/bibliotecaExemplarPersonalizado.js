const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')
const JSZip = require('jszip')
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const AVISO = 'Uso pessoal. Os direitos autorais do livro não permite redistribuição.'
const VERSAO_EXEMPLAR = 2
async function personalizarExemplar(bytes, formato, codigo, nomeComprador = 'Comprador identificado pela licença') {
  const nome = String(nomeComprador).replace(/[\r\n\t]/g, ' ').trim().slice(0, 100) || 'Comprador identificado pela licença'
  if (!/^BDC-[A-F0-9]{20}$/.test(codigo)) throw new Error('Código de exemplar inválido.')
  if (formato === 'pdf') {
    const doc = await PDFDocument.load(bytes)
    const fonte = await doc.embedFont(StandardFonts.Helvetica)
    // O rodapé recebe espaço novo: não cobre o conteúdo original.
    for (const pagina of doc.getPages()) {
      if (pagina.getRotation().angle % 360 !== 0) continue
      const media = pagina.getMediaBox(), crop = pagina.getCropBox()
      pagina.setMediaBox(media.x, media.y - 22, media.width, media.height + 22)
      pagina.setCropBox(crop.x, crop.y - 22, crop.width, crop.height + 22)
      pagina.drawText(`Exemplar ${codigo} - Uso pessoal`, { x: crop.x + 8, y: crop.y - 14, size: Math.min(7, (crop.width - 16) / fonte.widthOfTextAtSize(`Exemplar ${codigo} - Uso pessoal`, 1)), font: fonte, color: rgb(.3, .3, .3) })
    }
    const identificacao = doc.insertPage(0, [420, 300])
    identificacao.drawText('Exemplar de uso pessoal', { x: 30, y: 240, size: 18, font: fonte })
    const nomePdf = Array.from(nome).map((char) => { try { fonte.encodeText(char); return char } catch { return '?' } }).join('')
    identificacao.drawText(`Exemplar licenciado para ${nomePdf}`, { x: 30, y: 205, size: 11, font: fonte, maxWidth: 360, lineHeight: 16 })
    identificacao.drawText(`Compra: ${codigo}`, { x: 30, y: 150, size: 11, font: fonte })
    identificacao.drawText('Uso pessoal. Os direitos autorais do livro', { x: 30, y: 110, size: 12, font: fonte })
    identificacao.drawText('não permite redistribuição.', { x: 30, y: 90, size: 12, font: fonte })
    return Buffer.from(await doc.save())
  }
  if (formato !== 'epub') throw new Error('Formato indisponível.')
  const zip = await JSZip.loadAsync(bytes)
  if (Object.values(zip.files).reduce((n, f) => n + (f._data?.uncompressedSize || 0), 0) > 200 * 1024 * 1024) throw new Error('EPUB muito grande.')
  const parse = (s) => {
    if (/<!ENTITY|<!DOCTYPE[^>]+(?:SYSTEM|PUBLIC)/i.test(s)) throw new Error('XML não suportado.')
    return new DOMParser({ onError: (level) => { if (level !== 'warning') throw new Error('EPUB inválido.') } }).parseFromString(s, 'application/xml')
  }
  const encontrar = (doc, nome) => Array.from(doc.getElementsByTagName('*')).find((n) => (n.localName || n.nodeName) === nome)
  const container = parse(await zip.file('META-INF/container.xml').async('string'))
  const pacote = encontrar(container, 'rootfile')?.getAttribute('full-path')
  if (!pacote || pacote.includes('..') || pacote.startsWith('/')) throw new Error('Pacote EPUB inválido.')
  const doc = parse(await zip.file(pacote).async('string'))
  const manifest = encontrar(doc, 'manifest'), spine = encontrar(doc, 'spine')
  if (!manifest || !spine) throw new Error('EPUB sem sequência de leitura.')
  let id = 'bdc-licenca'
  while (Array.from(doc.getElementsByTagName('*')).some((n) => n.getAttribute('id') === id)) id += '-1'
  const base = pacote.includes('/') ? pacote.slice(0, pacote.lastIndexOf('/') + 1) : ''
  let arquivo = `${id}.xhtml`
  while (zip.file(base + arquivo)) arquivo = `_${arquivo}`
  const item = doc.createElementNS(manifest.namespaceURI, 'item')
  item.setAttribute('id', id); item.setAttribute('href', arquivo); item.setAttribute('media-type', 'application/xhtml+xml'); manifest.appendChild(item)
  const ref = doc.createElementNS(spine.namespaceURI, 'itemref')
  ref.setAttribute('idref', id); spine.insertBefore(ref, spine.firstChild)
  const nomeXml = nome.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  zip.file(base + arquivo, `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Exemplar de uso pessoal</title></head><body><h1>Exemplar de uso pessoal</h1><p>Exemplar licenciado para ${nomeXml}</p><p>Compra: ${codigo}</p><p>${AVISO}</p></body></html>`)
  zip.file(pacote, new XMLSerializer().serializeToString(doc))
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}
module.exports = { personalizarExemplar, AVISO, VERSAO_EXEMPLAR }
