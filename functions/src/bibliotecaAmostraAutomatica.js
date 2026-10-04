const path = require('node:path').posix
const { PDFDocument, PDFName, PDFArray, PDFDict, PDFRef, PDFStream, PDFRawStream, decodePDFRawStream } = require('pdf-lib')
const JSZip = require('jszip')
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')

const VERSAO_AMOSTRA = 1
const MAX_EXPANDIDO = 200 * 1024 * 1024
const serializar = (doc) => new XMLSerializer().serializeToString(doc)
const nome = (node) => node.localName || node.nodeName?.split(':').pop()
const elementos = (doc, tag) => Array.from(doc.getElementsByTagName('*')).filter((node) => tag === '*' || nome(node) === tag)
function xml(texto) {
  if (/<!ENTITY|<!DOCTYPE[^>]+(?:SYSTEM|PUBLIC)/i.test(texto)) throw new Error('EPUB com entidades externas não é compatível.')
  return new DOMParser({ onError: (level) => { if (level !== 'warning') throw new Error('XML inválido no EPUB.') } }).parseFromString(texto, 'application/xml')
}
function resolver(base, href) {
  if (!href || /^[a-z][a-z\d+.-]*:|^\/\//i.test(href)) return null
  let arquivo
  try { arquivo = decodeURIComponent(href.split('#')[0].split('?')[0]) } catch { return null }
  const resultado = arquivo ? path.normalize(path.join(path.dirname(base), arquivo)) : base
  return resultado.startsWith('../') || resultado.startsWith('/') ? null : resultado
}
function totalPermitido(total, percentual) {
  if (!Number.isFinite(percentual) || percentual < 1 || percentual > 99) throw new Error('Percentual inválido.')
  return Math.max(1, Math.floor(total * percentual / 100))
}

// Remove recursos gráficos não usados para não transportar objetos de outras páginas.
function limparRecursosPdf(context, recursos, conteudo, visitados = new Set()) {
  if (!(recursos instanceof PDFDict)) return
  const objetos = recursos.lookupMaybe(PDFName.of('XObject'), PDFDict)
  if (!objetos) return
  const usados = new Set([...conteudo.matchAll(/\/([^\s/()[\]<>%]+)\s+Do\b/g)].map((match) => match[1]))
  for (const [chave, valor] of objetos.entries()) {
    if (!usados.has(chave.asString().slice(1))) { objetos.delete(chave); continue }
    const objeto = context.lookup(valor)
    if (objeto instanceof PDFRawStream && objeto.dict.get(PDFName.of('Subtype'))?.toString() === '/Form' && !visitados.has(objeto)) {
      visitados.add(objeto)
      limparRecursosPdf(context, objeto.dict.lookupMaybe(PDFName.of('Resources'), PDFDict), Buffer.from(decodePDFRawStream(objeto).decode()).toString('latin1'), visitados)
    }
  }
}
function removerObjetosOrfaosPdf(doc) {
  const refs = new Set()
  const objetos = new Set()
  const visitar = (objeto) => {
    if (objeto instanceof PDFRef) {
      if (refs.has(objeto.toString())) return
      refs.add(objeto.toString()); visitar(doc.context.lookup(objeto)); return
    }
    if (!objeto || objetos.has(objeto)) return
    objetos.add(objeto)
    if (objeto instanceof PDFStream) visitar(objeto.dict)
    else if (objeto instanceof PDFDict) objeto.entries().forEach(([, valor]) => visitar(valor))
    else if (objeto instanceof PDFArray) objeto.asArray().forEach(visitar)
  }
  Object.values(doc.context.trailerInfo).forEach(visitar)
  for (const [ref] of doc.context.enumerateIndirectObjects()) if (!refs.has(ref.toString())) doc.context.delete(ref)
}
async function amostraPdf(bytes, percentual) {
  const original = await PDFDocument.load(bytes)
  const total = original.getPageCount()
  const limite = totalPermitido(total, percentual)
  const amostra = await PDFDocument.create()
  // Links/anexos podem apontar para páginas excluídas. Não os transporte.
  for (const page of original.getPages()) page.node.delete(PDFName.of('Annots'))
  for (const pagina of original.getPages().slice(0, limite)) {
    const contents = pagina.node.Contents()
    const streams = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : []
    const conteudo = streams.map((item) => {
      const stream = original.context.lookup(item)
      if (!(stream instanceof PDFRawStream)) throw new Error('Conteúdo PDF não compatível com amostra segura.')
      return Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1')
    }).join('\n')
    const recursos = pagina.node.Resources()?.clone()
    if (recursos) {
      const objetos = recursos.lookupMaybe(PDFName.of('XObject'), PDFDict)
      if (objetos) recursos.set(PDFName.of('XObject'), objetos.clone())
      pagina.node.set(PDFName.of('Resources'), recursos)
      limparRecursosPdf(original.context, recursos, conteudo)
    }
  }
  const paginas = await amostra.copyPages(original, Array.from({ length: limite }, (_, i) => i))
  paginas.forEach((pagina) => amostra.addPage(pagina))
  removerObjetosOrfaosPdf(amostra)
  return { bytes: Buffer.from(await amostra.save()), totalOriginal: total, limite, unidade: 'paginas', percentual }
}

function textoBody(node) {
  if (nome(node) === 'style') return 0
  if (node.nodeType === 3 || node.nodeType === 4) return Array.from(node.nodeValue.replace(/\s/g, '')).length
  return Array.from(node.childNodes || []).reduce((total, child) => total + textoBody(child), 0)
}
function recortarBody(node, orcamento) {
  for (const child of Array.from(node.childNodes || [])) {
    if (orcamento.restante <= 0) { node.removeChild(child); continue }
    if (child.nodeType === 3 || child.nodeType === 4) {
      let fim = 0
      for (const char of child.nodeValue) {
        if (!/\s/.test(char)) { if (!orcamento.restante) break; orcamento.restante-- }
        fim += char.length
      }
      child.nodeValue = child.nodeValue.slice(0, fim)
    } else if (nome(child) !== 'style') recortarBody(child, orcamento)
  }
}
function limparHtml(doc) {
  const removerComentarios = (node) => { for (const child of Array.from(node.childNodes || [])) { if (child.nodeType === 8) node.removeChild(child); else removerComentarios(child) } }
  removerComentarios(doc)
  for (const tag of ['script', 'iframe', 'object', 'embed', 'audio', 'video', 'noscript']) for (const node of elementos(doc, tag)) node.parentNode?.removeChild(node)
  for (const node of elementos(doc, '*')) for (const attr of Array.from(node.attributes || [])) if (/^on/i.test(attr.name)) node.removeAttribute(attr.name)
}
async function amostraEpub(bytes, percentual) {
  const zip = await JSZip.loadAsync(bytes)
  const arquivosZip = Object.values(zip.files).filter((file) => !file.dir)
  if (arquivosZip.reduce((sum, file) => sum + (file._data?.uncompressedSize || 0), 0) > MAX_EXPANDIDO) throw new Error('EPUB expandido ultrapassa o limite de segurança.')
  const ler = async (arquivo) => {
    const file = zip.file(arquivo)
    if (!file || (file._data?.uncompressedSize || 0) > 12 * 1024 * 1024) throw new Error('Arquivo interno do EPUB indisponível ou muito grande.')
    return file.async('string')
  }
  const container = xml(await ler('META-INF/container.xml'))
  const opfPath = elementos(container, 'rootfile')[0]?.getAttribute('full-path')
  if (!opfPath || opfPath.startsWith('/') || opfPath.includes('..')) throw new Error('Pacote EPUB inválido.')
  const opf = xml(await ler(opfPath))
  const manifest = elementos(opf, 'manifest')[0]
  const spine = elementos(opf, 'spine')[0]
  if (!manifest || !spine) throw new Error('EPUB sem sequência de leitura.')
  const itens = elementos(manifest, 'item').map((node) => ({ node, id: node.getAttribute('id'), arquivo: resolver(opfPath, node.getAttribute('href')), tipo: node.getAttribute('media-type'), props: node.getAttribute('properties') || '' }))
  const porId = new Map(itens.map((item) => [item.id, item]))
  const capitulos = []
  for (const ref of elementos(spine, 'itemref')) {
    const item = porId.get(ref.getAttribute('idref'))
    if (!item || !['application/xhtml+xml', 'text/html'].includes(item.tipo)) throw new Error('Este EPUB contém capítulos incompatíveis com o recorte automático.')
    const doc = xml(await ler(item.arquivo))
    limparHtml(doc)
    const body = elementos(doc, 'body')[0]
    if (!body) throw new Error('Capítulo EPUB sem texto de leitura.')
    capitulos.push({ ref, item, doc, body, total: textoBody(body) })
  }
  const total = capitulos.reduce((sum, cap) => sum + cap.total, 0)
  if (!total) throw new Error('EPUB sem texto selecionável. Use um PDF para esta modalidade.')
  const limite = totalPermitido(total, percentual)
  const orcamento = { restante: limite }
  const mantidos = new Map()
  for (const cap of capitulos) {
    if (orcamento.restante <= 0) { spine.removeChild(cap.ref); continue }
    recortarBody(cap.body, orcamento)
    mantidos.set(cap.item.arquivo, cap)
  }
  const permitidoFragmento = (base, href) => {
    const destino = resolver(base, href)
    const cap = mantidos.get(destino)
    if (!cap) return false
    const id = href.split('#')[1]
    return !id || elementos(cap.doc, '*').some((node) => node.getAttribute('id') === decodeURIComponent(id))
  }
  const novo = new JSZip()
  novo.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  novo.file('META-INF/container.xml', serializar(container))
  const recursos = new Set()
  const porArquivo = new Map(itens.filter((item) => item.arquivo).map((item) => [item.arquivo, item]))
  const incluirRecurso = async (arquivo) => {
    const item = porArquivo.get(arquivo)
    if (!item || recursos.has(arquivo) || !/^(image\/(png|jpeg|gif|webp|svg\+xml)|font\/|application\/(vnd\.ms-opentype|font-woff|x-font-)|text\/css)/.test(item.tipo)) return
    recursos.add(arquivo)
    const file = zip.file(arquivo)
    if (!file) throw new Error('Recurso do EPUB ausente.')
    if (item.tipo === 'text/css') {
      const css = await ler(arquivo)
      for (const match of css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)|@import\s+["']([^"']+)["']/g)) {
        const destino = resolver(arquivo, match[1] || match[2])
        if (destino) await incluirRecurso(destino)
      }
      novo.file(arquivo, css)
    } else novo.file(arquivo, await file.async('nodebuffer'))
  }
  for (const [arquivo, cap] of mantidos) {
    for (const node of elementos(cap.doc, '*')) {
      node.removeAttribute('srcset')
      for (const attr of ['src', 'href', 'xlink:href']) {
        const href = node.getAttribute(attr)
        if (!href) continue
        const destino = resolver(arquivo, href)
        if (nome(node) === 'a') {
          if (!permitidoFragmento(arquivo, href)) node.removeAttribute(attr)
        } else if (destino) await incluirRecurso(destino)
        else node.removeAttribute(attr)
      }
      const style = nome(node) === 'style' ? node.textContent : node.getAttribute('style') || ''
      for (const match of style.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) { const destino = resolver(arquivo, match[1]); if (destino) await incluirRecurso(destino) }
    }
    novo.file(arquivo, serializar(cap.doc))
  }
  // Reconstrói o índice: nenhuma entrada aponta para texto removido.
  const navItem = itens.find((item) => /\bnav\b/.test(item.props))
  const ncxItem = itens.find((item) => item.tipo === 'application/x-dtbncx+xml')
  const navArquivo = navItem?.arquivo || path.join(path.dirname(opfPath), 'amostra-nav.xhtml')
  const links = []
  if (navItem || ncxItem) {
    const origem = navItem || ncxItem
    const navigation = xml(await ler(origem.arquivo))
    for (const node of elementos(navigation, navItem ? 'a' : 'navPoint')) {
      const href = navItem ? node.getAttribute('href') : elementos(node, 'content')[0]?.getAttribute('src')
      const label = navItem ? node.textContent : elementos(node, 'navLabel')[0]?.textContent
      if (href && label && permitidoFragmento(origem.arquivo, href)) links.push({ href: path.relative(path.dirname(navArquivo), resolver(origem.arquivo, href)) + (href.includes('#') ? `#${href.split('#')[1]}` : ''), label: label.trim() })
    }
  }
  const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  const navigation = `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Sumário</title></head><body><nav epub:type="toc"><ol>${links.map((item) => `<li><a href="${escape(item.href)}">${escape(item.label)}</a></li>`).join('')}</ol></nav></body></html>`
  novo.file(navArquivo, navigation)
  for (const item of itens) if (!mantidos.has(item.arquivo) && !recursos.has(item.arquivo)) manifest.removeChild(item.node)
  const nav = navItem?.node.parentNode === manifest ? navItem.node : opf.createElementNS(manifest.namespaceURI, 'item')
  let navId = 'amostra-nav'
  while (itens.some((item) => item.node.getAttribute('id') === navId)) navId += '-1'
  if (!nav.getAttribute('id')) nav.setAttribute('id', navId)
  nav.setAttribute('href', path.relative(path.dirname(opfPath), navArquivo)); nav.setAttribute('media-type', 'application/xhtml+xml'); nav.setAttribute('properties', 'nav')
  if (nav.parentNode !== manifest) manifest.appendChild(nav)
  spine.removeAttribute('toc')
  const metadata = elementos(opf, 'metadata')[0]
  if (metadata) for (const child of Array.from(metadata.childNodes)) if (!['identifier', 'title', 'creator', 'language'].includes(nome(child))) metadata.removeChild(child)
  for (const tag of ['guide', 'bindings', 'collection']) for (const node of elementos(opf, tag)) node.parentNode?.removeChild(node)
  opf.documentElement.setAttribute('version', '3.0')
  novo.file(opfPath, serializar(opf))
  return { bytes: await novo.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }), totalOriginal: total, limite, unidade: 'caracteres', percentual }
}

async function gerarAmostraAutomatica(bytes, formato, percentual) {
  if (formato === 'pdf') return amostraPdf(bytes, percentual)
  if (formato === 'epub') return amostraEpub(bytes, percentual)
  throw new Error('Formato não compatível com amostra automática.')
}
module.exports = { gerarAmostraAutomatica, totalPermitido, VERSAO_AMOSTRA }
