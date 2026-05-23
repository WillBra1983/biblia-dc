/**
 * Rotas com conteúdo principalmente no aparelho (SQLite, bundle, localStorage).
 * Acessíveis sem conta — inclusive offline — para não anular o propósito do app pesado local.
 */

const PREFIXOS_CONTA_OU_NUVEM = [
  '/chat',
  '/admin',
  '/configuracoes',
  '/estudos-biblicos',
  '/biblioteca-estudos',
  '/hinario-editor',
]

const PREFIXOS_CONTEUDO_LOCAL = [
  '/biblia',
  '/discipulado',
  '/quiz-retiro',
  '/hinario',
  '/confissao',
  '/catecismo-maior',
  '/catecismo-breve',
  '/devocional',
  '/plano',
  '/plano-leitura',
  '/versiculos-marcados',
  '/estudo-strong',
  '/sobre',
  '/mais-de-deus',
  '/youtube',
]

export function estaSemRede() {
  if (typeof navigator === 'undefined') return false
  return navigator.onLine === false
}

function normalizarPath(pathname) {
  const raw = String(pathname || '/')
  if (raw !== '/' && raw.endsWith('/')) return raw.slice(0, -1)
  return raw || '/'
}

/** Estudo bíblico na nuvem, chat, admin, etc. */
export function rotaExigeContaOuNuvem(pathname) {
  const p = normalizarPath(pathname)
  return PREFIXOS_CONTA_OU_NUVEM.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  )
}

/**
 * Bíblia, discipulado, quiz, hinário, catecismos… — uso sem login.
 */
export function rotaConteudoLocalOffline(pathname) {
  const p = normalizarPath(pathname)
  if (p === '/') return true
  if (rotaExigeContaOuNuvem(p)) return false
  return PREFIXOS_CONTEUDO_LOCAL.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  )
}

/** Pode abrir a rota atual sem estar logado. */
export function podeAcessarSemConta(pathname) {
  return rotaConteudoLocalOffline(pathname)
}

/** Offline numa rota só da nuvem: não redirecionar ao chat (inútil). */
export function bloqueioOfflineSemConta(pathname) {
  return estaSemRede() && rotaExigeContaOuNuvem(pathname)
}

/** sessionStorage: exibir faixa de acesso limitado (sem login + sem rede). */
export const MODO_LIMITADO_OFFLINE_KEY = 'salvation-modo-limitado-offline'

export function marcarModoLimitadoOffline() {
  try {
    sessionStorage.setItem(MODO_LIMITADO_OFFLINE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function lerModoLimitadoOffline() {
  try {
    return sessionStorage.getItem(MODO_LIMITADO_OFFLINE_KEY) === '1'
  } catch {
    return false
  }
}

export function limparModoLimitadoOffline() {
  try {
    sessionStorage.removeItem(MODO_LIMITADO_OFFLINE_KEY)
  } catch {
    /* ignore */
  }
}

/** Sem login, sem internet: só conteúdo local (acesso limitado). */
export function modoAcessoLimitadoOffline(sessaoOk) {
  return estaSemRede() && !sessaoOk
}

/** Logado, sem internet, rota que depende da nuvem. */
export function exibirFaixaSemInternetLogado(sessaoOk, pathname) {
  return estaSemRede() && sessaoOk && rotaExigeContaOuNuvem(pathname)
}
