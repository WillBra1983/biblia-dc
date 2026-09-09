import timings from '../data/hebrewAudioTimings.json'

export function marcacoesVersiculosHebraicos(livroId, faixa) {
  if (!faixa) return []
  const chapter = timings?.[String(Number(livroId))]?.[String(Number(faixa.capituloFonte))]
  if (!chapter) return []

  const min = Number(faixa.versiculoFonteInicio) || 1
  const max = Number(faixa.versiculoFonteFim) || Number.POSITIVE_INFINITY
  const offset = Number(faixa.versiculoOffset) || 0

  return Object.entries(chapter)
    .map(([verse, range]) => ({
      versiculo: Number(verse) + offset,
      inicio: Number(range?.[0]),
      fim: Number(range?.[1]),
      versiculoFonte: Number(verse),
    }))
    .filter(
      (mark) =>
        mark.versiculoFonte >= min &&
        mark.versiculoFonte <= max &&
        Number.isFinite(mark.inicio) &&
        Number.isFinite(mark.fim)
    )
}
