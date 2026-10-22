// A publicação no acervo independe dos meios de pagamento oferecidos na plataforma.
export function livroVisivelNoAcervo(livro) {
  if (!livro || livro.publicado === false || livro.excluido) return false
  return Boolean(livro.androidUrl || livro.appleUrl || livro.amazonUrl || (
    livro.pixAtivo && Number(livro.precoPixCentavos) > 0 && livro.arquivos?.completo
  ))
}
