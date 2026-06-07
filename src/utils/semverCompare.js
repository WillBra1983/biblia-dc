/**
 * Compara versões semver simples (ex.: "1.0.0", "1.5", "2").
 * Retorna -1 se a < b, 0 se iguais, 1 se a > b.
 * Strings inválidas são tratadas como 0.0.0.
 */
export function parseSemver(raw) {
  const s = String(raw ?? '').trim().replace(/^v/i, '')
  if (!s) return [0, 0, 0]
  const parts = s.split('.').map((p) => {
    const n = parseInt(String(p).replace(/[^0-9].*$/, ''), 10)
    return Number.isFinite(n) ? n : 0
  })
  while (parts.length < 3) parts.push(0)
  return parts.slice(0, 3)
}

export function compararVersoes(a, b) {
  const va = parseSemver(a)
  const vb = parseSemver(b)
  for (let i = 0; i < 3; i += 1) {
    if (va[i] < vb[i]) return -1
    if (va[i] > vb[i]) return 1
  }
  return 0
}
