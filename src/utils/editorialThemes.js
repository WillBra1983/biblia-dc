export const EDITORIAL_IMAGES = Object.freeze({
  biblia: '/menu-fundos/biblia.webp',
  discipulado: '/menu-fundos/discipulado.webp',
  estudosCompartilhados: '/menu-fundos/estudos-compartilhados.webp',
  bibliaComentada: '/menu-fundos/biblia-comentada.webp',
  devocional: '/menu-fundos/devocional.webp',
  westminster: '/menu-fundos/westminster-abbey.webp',
  maisDeDeus: '/menu-fundos/mais-de-deus.webp',
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
