export const FORMATOS_LIVRO = ['epub', 'pdf']

export function arquivoLivroPorFormato(livro, formato) {
  const alternativo = livro?.arquivos?.formatos?.[formato]
  if (alternativo?.chave && alternativo.formato === formato) return alternativo
  const principal = livro?.arquivos?.completo
  return principal?.chave && principal.formato === formato ? principal : null
}

export function formatosLivro(livro) {
  return FORMATOS_LIVRO.filter((formato) => arquivoLivroPorFormato(livro, formato))
}
