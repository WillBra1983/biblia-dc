export function posicaoTrocaModoEpub(rendition, ultimaPosicao) {
  try {
    const atual = rendition?.currentLocation?.()?.start?.cfi
    if (atual) return atual
  } catch {
    // Uma mudança de tamanho pode deixar a localização indisponível por instantes.
  }
  return ultimaPosicao || rendition?.location?.start?.cfi || undefined
}
