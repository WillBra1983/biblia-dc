const PREFIXO = 'menu-mais-vistos-v1:'
export const MINIMO_VISITAS = 3
export const LIMITE_MAIS_VISTOS = 4
const caminhos = [
  '/biblia', '/biblioteca', '/plano-leitura-biblia', '/discipulado',
  '/estudos-biblicos', '/biblioteca-estudos', '/devocional', '/mais-de-deus',
  '/versiculos-marcados', '/versiculos-compartilhados', '/youtube', '/quiz-retiro',
  '/hinario/letra', '/hinario/salmos', '/hinario/outras-cancoes',
  '/confissao', '/catecismo-maior', '/catecismo-breve',
]
const permitidos = new Set(caminhos)
const ouvintes = new Set(), memoria = new Map()
const semPersistencia = new Set()
let ultimaEntrada = null
const perfil = uid => uid ? `conta:${encodeURIComponent(uid)}` : 'visitante'
const chave = uid => PREFIXO + perfil(uid)

/** Agrupa páginas internas da mesma opção e ignora parâmetros da leitura. */
export function caminhoMaisVisto(pathname) {
  const path = String(pathname || '/').split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  if (path === '/' || path === '/biblia' || path.startsWith('/biblia/') || path.startsWith('/estudo-strong/')) return '/biblia'
  if (/^\/estudos-biblicos\/ia-(passagem|pericope)(?:\/|$)/.test(path)) return '/biblioteca-estudos'
  if (path === '/hinario' || path.startsWith('/hinario/cifras')) return '/hinario/letra'
  if (path.startsWith('/hinario/canticos')) return '/hinario/salmos'
  return caminhos.find(p => path === p || path.startsWith(p + '/')) || null
}

export function lerSnapshotMaisVistos(uid) {
  if (semPersistencia.has(chave(uid))) return memoria.get(chave(uid)) || '{}'
  try { return globalThis.localStorage?.getItem(chave(uid)) || memoria.get(chave(uid)) || '{}' }
  catch { return memoria.get(chave(uid)) || '{}' }
}

export function lerHistoricoMaisVistos(raw) {
  try {
    const dados = JSON.parse(raw || '{}')
    const usos = Object.fromEntries(Object.entries(dados.usos || {}).filter(([path, uso]) =>
      permitidos.has(path) && Number.isSafeInteger(uso?.visitas) && uso.visitas > 0
      && Number.isSafeInteger(uso.ultimo) && uso.ultimo > 0))
    return { usos, sequencia: Math.max(0, ...Object.values(usos).map(u => u.ultimo)) }
  } catch { return { usos: {}, sequencia: 0 } }
}

export function selecionarMaisVistos(raw) {
  const { usos } = lerHistoricoMaisVistos(raw)
  return Object.entries(usos).filter(([, uso]) => uso.visitas >= MINIMO_VISITAS)
    .sort(([a, x], [b, y]) => y.visitas - x.visitas || y.ultimo - x.ultimo || a.localeCompare(b))
    .slice(0, LIMITE_MAIS_VISTOS).map(([path]) => path)
}

/** Uma escolha explícita no menu conta mesmo se a opção já estiver aberta. */
export function registrarUsoMaisVistos(pathname, uid) {
  const path = caminhoMaisVisto(pathname)
  ultimaEntrada = { perfil: perfil(uid), path }
  if (!path) return false
  const dados = lerHistoricoMaisVistos(lerSnapshotMaisVistos(uid))
  dados.sequencia++
  dados.usos[path] = { visitas: Math.min(Number.MAX_SAFE_INTEGER, (dados.usos[path]?.visitas || 0) + 1), ultimo: dados.sequencia }
  const raw = JSON.stringify(dados)
  memoria.set(chave(uid), raw)
  try { globalThis.localStorage?.setItem(chave(uid), raw); semPersistencia.delete(chave(uid)) }
  catch { semPersistencia.add(chave(uid)) }
  ouvintes.forEach(fn => fn())
  return true
}

/** Evita contar novamente StrictMode, remontagens e páginas da mesma seção. */
export function registrarNavegacaoMaisVistos(pathname, uid) {
  const path = caminhoMaisVisto(pathname)
  if (ultimaEntrada?.perfil === perfil(uid) && ultimaEntrada.path === path) return false
  return registrarUsoMaisVistos(pathname, uid)
}

export function assinarMaisVistos(callback) {
  ouvintes.add(callback)
  const storage = evento => {
    if (!evento.key) { memoria.clear(); semPersistencia.clear(); callback() }
    else if (evento.key.startsWith(PREFIXO)) { memoria.delete(evento.key); semPersistencia.delete(evento.key); callback() }
  }
  globalThis.addEventListener?.('storage', storage)
  return () => { ouvintes.delete(callback); globalThis.removeEventListener?.('storage', storage) }
}
