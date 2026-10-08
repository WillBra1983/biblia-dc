// A origem do zoom deve estar no sistema de coordenadas usado pelo PDFViewer.
export function origemZoomPdf(container, x, y) {
  const rect = container.getBoundingClientRect()
  return [x - rect.left + container.offsetLeft, y - rect.top + container.offsetTop]
}

export function posicaoPdfValida(posicao, pagina, limite) {
  return Boolean(posicao && Number.isInteger(posicao.pageNumber) && posicao.pageNumber === pagina && pagina >= 1 && pagina <= limite && Number.isFinite(posicao.left) && Number.isFinite(posicao.top))
}
