/**
 * Codifica cada segmento do path para compartilhamento (área de transferência / WhatsApp).
 * IDs do Firebase podem começar com "-" (hífen); paths como "/…/-Oabc" costumam quebrar a detecção de links.
 */
export function pathnameParaCompartilhamento(pathname) {
  const parts = String(pathname || '')
    .split('/')
    .filter(Boolean)
  if (!parts.length) return '/'
  return `/${parts.map((p) => encodeURIComponent(p)).join('/')}`
}

/** @deprecated Use {@link pathnameParaCompartilhamento} (nome antigo em pt-PT). */
export const pathnameParaPartilha = pathnameParaCompartilhamento
