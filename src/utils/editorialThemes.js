const BASE_PUBLICA = String(import.meta.env.BASE_URL || '/').replace(/\/+$/, '')

export function urlEditorialPublica(arquivo) {
  return `${BASE_PUBLICA}/${String(arquivo || '').replace(/^\/+/, '')}`
}

export const EDITORIAL_IMAGES = Object.freeze({
  biblia: urlEditorialPublica('menu-fundos/biblia.webp'),
  discipulado: urlEditorialPublica('menu-fundos/discipulado.webp'),
  estudosCompartilhados: urlEditorialPublica('menu-fundos/estudos-compartilhados.webp'),
  bibliaComentada: urlEditorialPublica('menu-fundos/biblia-comentada.webp'),
  devocional: urlEditorialPublica('menu-fundos/devocional.webp'),
  westminster: urlEditorialPublica('menu-fundos/westminster-abbey.webp'),
  maisDeDeus: urlEditorialPublica('menu-fundos/mais-de-deus.webp'),
})

const DISCIPULADO_POR_TEMA = Object.freeze({
  1: { image: EDITORIAL_IMAGES.biblia, imagePosition: 'center 52%' },
  2: { image: EDITORIAL_IMAGES.discipulado, imagePosition: 'center 42%' },
  3: { image: EDITORIAL_IMAGES.maisDeDeus, imagePosition: 'center 48%' },
  4: { image: EDITORIAL_IMAGES.discipulado, imagePosition: 'center 42%' },
})

export function editorialDiscipulado(temaId) {
  return DISCIPULADO_POR_TEMA[Number(temaId)] || {
    image: EDITORIAL_IMAGES.discipulado,
    imagePosition: 'center',
  }
}
