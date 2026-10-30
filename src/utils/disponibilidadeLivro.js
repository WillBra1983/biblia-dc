// A publicação no acervo independe dos meios de pagamento oferecidos na plataforma.
export function livroVisivelNoAcervo(livro) {
  if (!livro || livro.publicado === false || livro.excluido) return false
  return Boolean(livro.androidUrl || livro.appleUrl || livro.amazonUrl || (
    livro.pixAtivo && Number(livro.precoPixCentavos) > 0 && livro.arquivos?.completo
  ))
}

// A disponibilidade do Pix é a mesma no site, Android e iOS.
export function compraPixDisponivel(livro) {
  return Boolean(
    livro && livro.publicado !== false && !livro.excluido &&
    livro.pixAtivo && Number(livro.precoPixCentavos) > 0 && livro.arquivos?.completo
  )
}
