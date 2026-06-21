/** Normaliza lista de IDs de devocionais lidos (números únicos, ordenados). */
export function normalizarDevocionaisConcluidos(lista) {
  if (!Array.isArray(lista)) return []
  return [...new Set(lista.map((x) => Number(x)).filter((x) => !Number.isNaN(x)))].sort(
    (a, b) => a - b
  )
}

export function devocionaisConcluidosIguais(a, b) {
  const na = normalizarDevocionaisConcluidos(a)
  const nb = normalizarDevocionaisConcluidos(b)
  return na.length === nb.length && na.every((v, i) => v === nb[i])
}
