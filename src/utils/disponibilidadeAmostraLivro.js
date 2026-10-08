export function amostraLivroDisponivel(livro, agora = Date.now()) {
  if (!livro?.arquivos?.completo) return false
  if (livro.degustacao?.modo !== 'tempo') return true
  const inicio = Number(livro.degustacao.inicioEm)
  const fim = Number(livro.degustacao.fimEm)
  return Number.isFinite(inicio) && Number.isFinite(fim)
    && fim > inicio && agora >= inicio && agora < fim
}
