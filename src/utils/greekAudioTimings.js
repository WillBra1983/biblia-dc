import timings from '../data/greekAudioTimings.json'

/** Marcações geradas por alinhamento do áudio humano ao TR Scrivener 1894. */
export function marcacoesVersiculosGregos(livroId, capitulo) {
  const chapter = timings?.[String(Number(livroId))]?.[String(Number(capitulo))]
  if (!chapter) return []

  return Object.entries(chapter)
    .map(([verse, range]) => ({
      versiculo: Number(verse),
      inicio: Number(range?.[0]),
      // No último versículo, a própria duração do elemento de áudio encerra a marcação.
      fim: range?.[1] == null ? Number.POSITIVE_INFINITY : Number(range[1]),
    }))
    .filter(
      (mark) =>
        Number.isInteger(mark.versiculo) &&
        mark.versiculo > 0 &&
        Number.isFinite(mark.inicio) &&
        (Number.isFinite(mark.fim) || mark.fim === Number.POSITIVE_INFINITY) &&
        mark.fim > mark.inicio
    )
}
