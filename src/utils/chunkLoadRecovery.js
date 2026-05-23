/**
 * Recuperação após deploy: o `index.html` ou o bundle principal pode ser novo,
 * mas o SW / cache HTTP ainda devolve um JS antigo que referencia chunks com
 * hash antigo (404 → "Failed to fetch dynamically imported module").
 *
 * Estratégia: uma tentativa por sessão de limpar caches + desregistar SW +
 * `location.reload()`. Complementa o `appVersionGuard` (que compara
 * `__APP_VERSION__` no boot — não cobre o caso em que o JS em execução já
 * carregou mas o chunk lazy falha depois).
 */

import { forcarAtualizacaoAssetsPwa } from './appVersionGuard'

export const CHUNK_RECOVER_SESSION_KEY = 'salvation:deploy-chunk-recover-once'

/** Detecta falhas típicas de import dinâmico (Vite / webpack / Safari). */
export function isErroCarregamentoChunkOuModulo(reason) {
  if (!reason) return false
  const name = reason.name
  const msg = String(reason.message || reason)
  if (name === 'ChunkLoadError') return true
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Unable to preload CSS') ||
    // Firefox / WebKit às vezes expõem só o URL falhado
    (msg.includes('Failed to fetch') && msg.includes('/assets/'))
  )
}

export function deployChunkRecoverJaExecutado() {
  try {
    return sessionStorage.getItem(CHUNK_RECOVER_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function marcarTentativaRecuperacao() {
  try {
    sessionStorage.setItem(CHUNK_RECOVER_SESSION_KEY, '1')
  } catch {
    /* ignore */
  }
}

let recuperacaoEmCurso = false

/**
 * Limpa caches PWA e recarrega. Idempotente: ignora se já houve tentativa
 * nesta sessão ou se outra chamada está em curso.
 */
export async function recuperarAssetsDesatualizadosERecarregar() {
  if (typeof window === 'undefined') return
  if (!import.meta.env.PROD) return
  if (deployChunkRecoverJaExecutado()) return
  if (recuperacaoEmCurso) return
  recuperacaoEmCurso = true
  marcarTentativaRecuperacao()
  try {
    await forcarAtualizacaoAssetsPwa()
  } catch {
    /* segue para reload mesmo se limpeza falhar */
  }
  try {
    window.location.reload()
  } catch {
    recuperacaoEmCurso = false
  }
}

/**
 * Regista listeners no `window`. Chamar uma vez no início de `main.jsx`
 * (antes do React). Só ativo em produção para não atrapalhar o HMR em dev.
 */
export function instalarRecuperacaoChunkPerdido() {
  if (typeof window === 'undefined') return
  if (!import.meta.env.PROD) return

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    if (!isErroCarregamentoChunkOuModulo(reason)) return
    if (deployChunkRecoverJaExecutado() || recuperacaoEmCurso) return
    event.preventDefault()
    void recuperarAssetsDesatualizadosERecarregar()
  })

  window.addEventListener('error', (event) => {
    const err = event.error
    const msg = String(event.message || '')
    if (!isErroCarregamentoChunkOuModulo(err) && !isErroCarregamentoChunkOuModulo({ message: msg })) return
    if (deployChunkRecoverJaExecutado() || recuperacaoEmCurso) return
    void recuperarAssetsDesatualizadosERecarregar()
  })
}
