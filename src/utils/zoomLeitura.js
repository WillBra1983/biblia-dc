export const ZOOM_LEITURA_MIN = 100
export const ZOOM_LEITURA_MAX = 200
export const ZOOM_LEITURA_PASSO = 10

/** Configuração, pinça e preferências antigas usam exatamente a mesma escala. */
export function normalizarZoomLeitura(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return ZOOM_LEITURA_MIN
  return Math.min(ZOOM_LEITURA_MAX, Math.max(ZOOM_LEITURA_MIN,
    Math.round(number / ZOOM_LEITURA_PASSO) * ZOOM_LEITURA_PASSO))
}
