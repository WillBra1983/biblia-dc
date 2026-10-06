export function direcaoGestoDestaque(inicio, fim) {
  if (!inicio || !fim) return 0
  const dx = fim.x - inicio.x
  const dy = fim.y - inicio.y
  if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0
  return dx < 0 ? 1 : -1
}
