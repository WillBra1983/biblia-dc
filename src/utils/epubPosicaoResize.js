// A posição publicada pelo EPUB pode estar atrasada durante uma rolagem.
// Consulte as páginas visíveis antes que resize() descarte essas páginas.
export function posicaoAtualEpub(manager, destino) {
  if (destino) return destino
  try {
    return manager.currentLocation()?.[0]?.mapping?.start || undefined
  } catch {
    // Ainda não há páginas montadas na primeira abertura.
    return undefined
  }
}
