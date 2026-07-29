export const ESTROFES_SALMO_119 = [
  'Alefe',
  'Bete',
  'Guimel',
  'Dalete',
  'He',
  'Vau',
  'Zaine',
  'Hete',
  'Tete',
  'Iode',
  'Cafe',
  'Lamed',
  'Mem',
  'Num',
  'Sameque',
  'Aim',
  'Pe',
  'Tsade',
  'Cofe',
  'Res',
  'Chim',
  'Tau',
]

/** Estruturas objetivas que podem limitar o contexto sem criar cortes arbitrarios. */
export function localizarEstruturaSalmo(salmo, versiculo) {
  const numeroSalmo = Number(salmo)
  const numeroVersiculo = Number(versiculo)
  if (numeroSalmo !== 119 || numeroVersiculo < 1 || numeroVersiculo > 176) return null

  const indice = Math.floor((numeroVersiculo - 1) / 8)
  const inicio = indice * 8 + 1
  return {
    titulo: `${ESTROFES_SALMO_119[indice]} - estrofe alfabetica`,
    inicio,
    fim: inicio + 7,
  }
}
