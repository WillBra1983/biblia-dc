/**
 * Cache em memória da última vista da Bíblia (capítulo + scroll parcial).
 * Sobrevive à desmontagem ao navegar para Discipulado, Chat, etc.
 */

let snapshot = null

export function gravarBibliaSessaoCache(data) {
  if (!data?.resultados?.length || !data?.livroId) {
    return
  }
  snapshot = {
    livroId: data.livroId,
    capitulo: data.capitulo,
    livroAtual: data.livroAtual ?? null,
    resultados: data.resultados,
    opcoesLivros: data.opcoesLivros ?? [],
    pericopesCapitulo: data.pericopesCapitulo ?? [],
    versiculosRenderizados: data.versiculosRenderizados ?? 80,
    scrollTop: typeof data.scrollTop === 'number' ? data.scrollTop : 0,
    savedAt: Date.now(),
  }
}

export function lerBibliaSessaoCache() {
  return snapshot
}

export function limparBibliaSessaoCache() {
  snapshot = null
}

/** Cache válido se bate livro/capítulo alvo. */
export function bibliaSessaoCacheCasa(livroId, capitulo) {
  if (!snapshot?.resultados?.length) return false
  return snapshot.livroId === livroId && snapshot.capitulo === capitulo
}
