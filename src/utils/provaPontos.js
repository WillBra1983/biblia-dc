/** Arredonda para 2 casas decimais (notas tipo 10,0 ou 3,33). */
export function round2(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.round((x + Number.EPSILON) * 100) / 100
}

/**
 * Aceita vírgula ou ponto (ex.: "10,0", "10.5").
 * @returns {number} NaN se inválido
 */
export function parseDecimalProvaInput(raw) {
  const s = String(raw ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.')
  if (s === '' || s === '-') return NaN
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : NaN
}

/**
 * Divide o valor total em N partes iguais com soma exata em centésimos
 * (ex.: 10 / 3 → 3,33 + 3,33 + 3,34).
 */
export function splitTotalProvaEntreQuestoes(n, total) {
  if (!Number.isInteger(n) || n < 1) return []
  const t = Math.max(0.01, round2(total))
  const cents = Math.round(t * 100)
  const base = Math.floor(cents / n)
  const rem = cents - base * n
  const out = []
  for (let i = 0; i < n; i++) {
    const c = base + (i < rem ? 1 : 0)
    out.push(c / 100)
  }
  return out
}

/** Limites ao gravar cada questão (modo prova). */
export function sanitizarPontosQuestaoProva(p) {
  const n = Number(p)
  if (!Number.isFinite(n)) return 0.01
  const r = round2(n)
  return Math.min(500, Math.max(0.01, r))
}

export function formatarNotaProvaPtBr(n) {
  const x = round2(n)
  return x.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
