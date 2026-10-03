export function normalizarTrechoLivro(texto) {
  return String(texto || '').replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function textoSelecaoLivro(range, fallback = '') {
  if (!range?.cloneContents) return normalizarTrechoLivro(fallback)
  const blocos = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'TR'])
  const ler = (node) => {
    if (node.nodeType === 3) return node.nodeValue || ''
    const tag = node.nodeName?.toUpperCase()
    if (['SCRIPT', 'STYLE'].includes(tag)) return ''
    if (tag === 'BR') return '\n'
    const texto = Array.from(node.childNodes || [], ler).join('')
    return blocos.has(tag) ? `\n\n${texto}\n\n` : texto
  }
  return normalizarTrechoLivro(ler(range.cloneContents())) || normalizarTrechoLivro(fallback)
}
