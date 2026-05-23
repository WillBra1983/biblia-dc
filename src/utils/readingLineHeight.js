/** Valor padrão guardado em `leituraPorPagina` (160 → line-height CSS 1.6). */
export const DEFAULT_LINE_HEIGHT_STORE = 160

/**
 * Converte o valor guardado (120–220, múltiplos de 5) em `line-height` CSS (1.20–2.20).
 */
export function readingLineHeightToCss(storeValue) {
  const n = Number(storeValue)
  if (!Number.isFinite(n)) return DEFAULT_LINE_HEIGHT_STORE / 100
  const clamped = Math.min(220, Math.max(120, Math.round(n / 5) * 5))
  return clamped / 100
}
