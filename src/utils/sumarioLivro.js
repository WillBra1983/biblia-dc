export function normalizarSumarioLivro(itens, formato) {
  const resultado = []
  const visitados = new Set()
  const visitar = (lista, nivel = 0) => {
    if (!Array.isArray(lista) || nivel > 12) return
    for (const item of lista) {
      if (!item || visitados.has(item) || resultado.length >= 2000) continue
      visitados.add(item)
      const titulo = String(formato === 'pdf' ? item.title || '' : item.label || '').replace(/\s+/g, ' ').trim()
      const destino = formato === 'pdf' ? item.dest : destinoEpubSeguro(item.href)
      if (titulo) resultado.push({ titulo, destino, nivel })
      visitar(formato === 'pdf' ? item.items : item.subitems, nivel + 1)
    }
  }
  visitar(itens)
  return resultado
}

export function destinoEpubSeguro(href) {
  const valor = String(href || '').trim()
  return valor && !/^[a-z][a-z\d+.-]*:|^\/\//i.test(valor) ? valor : null
}

export async function paginaDestinoPdf(documento, destino) {
  const referencias = typeof destino === 'string' ? await documento.getDestination(destino) : destino
  if (!Array.isArray(referencias) || !referencias.length) throw new Error('Este item não possui um destino de leitura válido.')
  const primeiro = referencias[0]
  const indice = Number.isInteger(primeiro) ? primeiro : primeiro && typeof primeiro === 'object' ? await documento.getPageIndex(primeiro) : -1
  if (!Number.isInteger(indice) || indice < 0 || indice >= documento.numPages) throw new Error('A página indicada pelo sumário não foi encontrada.')
  return indice + 1
}
