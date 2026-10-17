// A versão depende do conteúdo editorial, e permanece estável entre builds.
export function versaoCompartilhamentoLivro(livro) {
  const conteudo = JSON.stringify([livro?.titulo, livro?.autor, livro?.descricao, livro?.capa])
  let hash = 2166136261
  for (let i = 0; i < conteudo.length; i += 1) {
    hash = Math.imul(hash ^ conteudo.charCodeAt(i), 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
