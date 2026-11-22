/**
 * Medalhas oficiais (mesma arte do plano de leitura do Salvation).
 */
const QuizMedalhas = (() => {
  const BASE = 'img/medalhas/'

  const SRC = {
    bronze: `${BASE}medalha-bronze.png`,
    prata: `${BASE}medalha-prata.png`,
    ouro: `${BASE}medalha-ouro.png`,
    trofeu: `${BASE}trofeu.png`,
  }

  const META = {
    bronze: { id: 'bronze', label: 'Bronze', src: SRC.bronze },
    prata: { id: 'prata', label: 'Prata', src: SRC.prata },
    ouro: { id: 'ouro', label: 'Ouro', src: SRC.ouro },
    nenhuma: { id: 'nenhuma', label: 'Sem medalha', src: '' },
  }

  function deEstrelas(stars) {
    const s = Math.max(0, Math.min(3, Number(stars) || 0))
    if (s >= 3) return { ...META.ouro, stars: s }
    if (s === 2) return { ...META.prata, stars: s }
    if (s === 1) return { ...META.bronze, stars: s }
    return { ...META.nenhuma, stars: 0 }
  }

  function dePosicaoPodio(posicao) {
    if (posicao === 1) return META.ouro
    if (posicao === 2) return META.prata
    if (posicao === 3) return META.bronze
    return null
  }

  function imgHtml(medal, { size = 'md', className = '', alt } = {}) {
    if (!medal?.src) return ''
    const label = alt || `Medalha ${medal.label}`
    return `<img class="quiz-medal-img quiz-medal-${size} ${className}" src="${medal.src}" alt="${label}" width="128" height="128" loading="lazy" decoding="async" />`
  }

  function badgeHtml(stars, { size = 'sm', showStars = true, showLabel = false } = {}) {
    const medal = deEstrelas(stars)
    if (!medal.src) {
      if (!showStars) return ''
      return `<span class="stars-medal stars-medal-none" aria-label="0 estrelas">☆☆☆</span>`
    }
    const starsTxt = showStars ? `<span class="stars-medal-text">${'★'.repeat(medal.stars)}${'☆'.repeat(3 - medal.stars)}</span>` : ''
    const labelTxt = showLabel ? `<span class="stars-medal-label">${medal.label}</span>` : ''
    return `<span class="stars-medal stars-medal-${medal.id}" aria-label="${medal.stars} estrela${medal.stars > 1 ? 's' : ''} — ${medal.label}">${imgHtml(medal, { size })}${starsTxt}${labelTxt}</span>`
  }

  function preload() {
    Object.values(SRC).forEach((src) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = src
    })
  }

  return { SRC, META, deEstrelas, dePosicaoPodio, imgHtml, badgeHtml, preload }
})()

window.QuizMedalhas = QuizMedalhas
