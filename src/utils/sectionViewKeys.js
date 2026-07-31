/**
 * Chaves de secção para métricas de visualização (admin).
 * Devem estar alinhadas com a validação em `functions/src/registrarVisualizacaoSecao.js`.
 */

const SESSION_KEYS_JSON = 'salvation:sectionViewsRegistadosEntrada'

function sanitizarSegmento(s) {
  if (s == null || s === '') return ''
  const t = String(s).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  return t || ''
}

/** Data YYYY-MM-DD em fuso de São Paulo (alinhada ao servidor). */
export function dataMetricaHojeBr() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

/**
 * Converte o pathname da app (sem host) numa chave de métrica, ou null se não
 * for uma rota que queremos contabilizar.
 */
export function pathnameParaSectionKey(pathname) {
  let p = pathname || '/'
  if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1)

  if (p === '/' || p === '/biblia') return 'biblia'

  if (p === '/plano-leitura-biblia') return 'plano_leitura_biblia'
  if (p === '/plano' || p.startsWith('/plano/')) return 'plano_leitura'

  const d3 = p.match(/^\/discipulado\/([^/]+)\/([^/]+)$/)
  if (d3) {
    const a = sanitizarSegmento(d3[1])
    const b = sanitizarSegmento(d3[2])
    if (a && b) return `discipulado:${a}:${b}`
  }
  const d2 = p.match(/^\/discipulado\/([^/]+)$/)
  if (d2) {
    const a = sanitizarSegmento(d2[1])
    if (a) return `discipulado:${a}`
  }
  if (p === '/discipulado') return 'discipulado'

  if (p.startsWith('/hinario/letra')) return 'hinario_letra'
  if (p.startsWith('/hinario/cifras')) return 'hinario_cifras'
  if (p === '/hinario') return 'hinario_letra'

  if (p.startsWith('/confissao')) return 'confissao'
  if (p.startsWith('/catecismo-maior')) return 'catecismo_maior'
  if (p.startsWith('/catecismo-breve')) return 'catecismo_breve'

  if (p.startsWith('/devocional/')) {
    const id = sanitizarSegmento(p.slice('/devocional/'.length).split('/')[0])
    if (id) return `devocional:${id}`
  }
  if (p === '/devocional') return 'devocional'

  if (p.startsWith('/mais-de-deus')) return 'mais_de_deus'
  if (p === '/youtube') return 'youtube'
  if (p.startsWith('/quiz-retiro')) return 'quiz_retiro'
  if (p.startsWith('/versiculos-marcados')) return 'versiculos_marcados'
  if (p.startsWith('/versiculos-compartilhados')) return 'versiculos_compartilhados'
  if (p.startsWith('/biblioteca-estudos')) return 'biblioteca_estudos'
  if (p.startsWith('/chat')) return 'chat'

  if (p.startsWith('/configuracoes/notificacoes')) return 'config_notificacoes'
  if (p.startsWith('/admin/usuarios')) return 'admin_usuarios'
  if (p.startsWith('/admin/notificar')) return 'admin_notificar'

  if (p.startsWith('/estudos-biblicos/ia-passagem')) return 'estudos_ia_passagem'
  if (p.startsWith('/estudos-biblicos/ia-pericope')) return 'estudos_ia_pericope'
  if (p === '/estudos-biblicos/novo') return 'estudos_biblicos_novo'
  if (p === '/estudos-biblicos/gerir') return 'estudos_biblicos_gerir'
  if (p.startsWith('/estudos-biblicos/abrir')) return 'estudos_biblicos_abrir'
  if (
    p.startsWith('/estudos-biblicos/avaliacao-resultado') ||
    p.startsWith('/estudos-biblicos/prova-resultado')
  ) {
    return 'estudos_biblicos_resultado'
  }

  const mEst = p.match(/^\/estudos-biblicos\/([^/]+)$/)
  if (mEst) {
    const seg = mEst[1]
    const reservados = new Set([
      'novo',
      'gerir',
      'abrir',
      'ia-passagem',
      'ia-pericope',
      'avaliacao-resultado',
      'prova-resultado',
    ])
    if (!reservados.has(seg)) {
      const id = sanitizarSegmento(seg)
      if (id) return `estudos_biblicos:${id}`
    }
  }
  if (p === '/estudos-biblicos') return 'estudos_biblicos'

  const mStrong = p.match(/^\/estudo-strong\/([^/]+)\/resumo$/)
  if (mStrong) {
    const c = sanitizarSegmento(mStrong[1])
    if (c) return `estudo_strong_resumo:${c}`
  }
  const mStrong2 = p.match(/^\/estudo-strong\/([^/]+)$/)
  if (mStrong2) {
    const c = sanitizarSegmento(mStrong2[1])
    if (c) return `estudo_strong:${c}`
  }

  if (p.startsWith('/hinario-editor')) return 'hinario_editor'
  if (p === '/sobre') return 'sobre'

  return null
}

function lerSetRegistados() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEYS_JSON)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr) : new Set()
  } catch {
    return new Set()
  }
}

function gravarSetRegistados(set) {
  try {
    sessionStorage.setItem(SESSION_KEYS_JSON, JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}

export function jaRegistouVisualizacaoNestaEntrada(sectionKey) {
  return lerSetRegistados().has(sectionKey)
}

export function marcarVisualizacaoRegistadaNestaEntrada(sectionKey) {
  const s = lerSetRegistados()
  s.add(sectionKey)
  gravarSetRegistados(s)
}

const inflightRegisto = new Set()

/** Cache curto de `users/{uid}/admin` — evita RTDB a cada mudança de rota. */
let adminFlagCache = { uid: null, ehAdmin: false, ts: 0 }
const ADMIN_FLAG_CACHE_TTL_MS = 5 * 60 * 1000

async function utilizadorEhAdmin(uid) {
  if (!uid) return false
  const now = Date.now()
  if (
    adminFlagCache.uid === uid &&
    now - adminFlagCache.ts < ADMIN_FLAG_CACHE_TTL_MS
  ) {
    return adminFlagCache.ehAdmin
  }
  try {
    const { loadFirebaseModules, getFirebaseDatabase } = await import('../config/firebase')
    await loadFirebaseModules()
    const db = getFirebaseDatabase()
    if (!db) return false
    const { ref, get } = await import('firebase/database')
    const snap = await get(ref(db, `users/${uid}/admin`))
    const ehAdmin = snap.val() === true
    adminFlagCache = { uid, ehAdmin, ts: now }
    return ehAdmin
  } catch {
    return false
  }
}

/**
 * Chama a Cloud Function uma vez por `sectionKey` nesta entrada (aba/app),
 * após login. Só marca sessão após sucesso. Falhas silenciosas.
 * Contas admin (`users/{uid}/admin`) não registam visualização.
 */
export async function registarVisualizacaoSecaoSeNecessario(sectionKey, uid) {
  if (!sectionKey || !uid || typeof window === 'undefined') return
  if (jaRegistouVisualizacaoNestaEntrada(sectionKey)) return
  if (inflightRegisto.has(sectionKey)) return
  inflightRegisto.add(sectionKey)

  try {
    if (await utilizadorEhAdmin(uid)) {
      marcarVisualizacaoRegistadaNestaEntrada(sectionKey)
      return
    }
    const { loadFirebaseModules } = await import('../config/firebase')
    await loadFirebaseModules()
    const { getFirebaseFunctions } = await import('../config/firebaseRuntime')
    const { httpsCallable } = await import('firebase/functions')
    const fns = getFirebaseFunctions()
    if (!fns) return
    const fn = httpsCallable(fns, 'registrarVisualizacaoSecao')
    await fn({ sectionKey })
    marcarVisualizacaoRegistadaNestaEntrada(sectionKey)
  } catch {
    /* rede / função indisponível — permite nova tentativa nesta entrada */
  } finally {
    inflightRegisto.delete(sectionKey)
  }
}

/** Chaves de métrica para um `path` de menu (ex.: `/biblia` → biblia). */
export function chavesMetricaParaPathMenu(path) {
  if (!path) return []
  const key = pathnameParaSectionKey(path === '/biblia' ? '/' : path)
  return key ? [key] : []
}
