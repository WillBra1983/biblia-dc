/**
 * Arte estática em `public/medalhas-plano/` (PNG enviados pelo projeto).
 */
const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')

export const SRC_ESCADA = {
  bronze: `${base}medalhas-plano/medalha-bronze.webp`,
  prata: `${base}medalhas-plano/medalha-prata.webp`,
  ouro: `${base}medalhas-plano/medalha-ouro.webp`,
  trofeu: `${base}medalhas-plano/trofeu.webp`,
  superTrofeu: `${base}medalhas-plano/super-trofeu.webp`,
}

/** Ícone do ranking na tela do plano (`public/medalhas-plano/plano-ranking-icon.png`). */
export const SRC_PLANO_RANKING = `${base}medalhas-plano/plano-ranking-icon.png`

let rankingIconPreloadPromise = null
let rankingIconPreloadOk = false

/**
 * Aquece o PNG no cache HTTP / memória do navegador (idempotente).
 * Chamado ao prefetch das rotas do plano e ao montar a tela do plano.
 */
function injetarLinkPreloadRanking() {
  if (typeof document === 'undefined') return
  const id = 'prefetch-plano-ranking-icon'
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  // `prefetch` evita o warning de "preload não utilizado" quando a rota do
  // plano ainda não foi aberta logo após o carregamento inicial.
  link.rel = 'prefetch'
  link.as = 'image'
  link.href = SRC_PLANO_RANKING
  document.head.appendChild(link)
}

export function preloadPlanoRankingIcon() {
  if (rankingIconPreloadOk) return Promise.resolve(true)
  if (rankingIconPreloadPromise) return rankingIconPreloadPromise
  if (typeof window === 'undefined') return Promise.resolve(false)

  injetarLinkPreloadRanking()

  rankingIconPreloadPromise = fetch(SRC_PLANO_RANKING, { cache: 'force-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.blob()
    })
    .then(() => {
      rankingIconPreloadOk = true
      return true
    })
    .catch(() =>
      new Promise((resolve, reject) => {
        const img = new Image()
        img.decoding = 'async'
        img.onload = () => {
          rankingIconPreloadOk = true
          resolve(true)
        }
        img.onerror = reject
        img.src = SRC_PLANO_RANKING
      })
    )
    .catch(() => {
      rankingIconPreloadPromise = null
      return false
    })

  return rankingIconPreloadPromise
}

export function planoRankingIconEstaEmCache() {
  return rankingIconPreloadOk
}

export function srcEscadaPorVariante(variante) {
  const v = variante === 'superTrofeu' ? 'superTrofeu' : variante
  return SRC_ESCADA[v] || SRC_ESCADA.bronze
}

export function ehMedalhaCircularNaEscada(variante) {
  return variante === 'bronze' || variante === 'prata' || variante === 'ouro'
}
