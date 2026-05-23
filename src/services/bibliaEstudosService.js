import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  runTransaction,
  child,
  query,
  orderByChild,
  equalTo
} from 'firebase/database'
import { Capacitor } from '@capacitor/core'
import { getFirebaseDatabase, getFirebaseFunctions } from '../config/firebase'
import { round2, sanitizarPontosQuestaoProva } from '../utils/provaPontos'

const BASE = 'bibliaEstudos'

/** Site público padrão (mesmo domínio dos App Links em android/app/build.gradle). Sobrescreva com VITE_PUBLIC_APP_URL. */
const CANONICAL_PUBLIC_SITE_BASE = 'https://foundcine.com/biblia'

function modulosRef(uid) {
  return ref(db(), `users/${uid}/estudosBiblicosModulos`)
}

/** ID de módulo (push key) ou null = sem módulo */
export function sanitizarModuleId(raw) {
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  if (!s) return null
  return s.slice(0, 80)
}

/**
 * URL base pública do app (site onde o PWA está hospedado).
 * No APK/Capacitor, `window.location.origin` costuma ser `http://localhost` ou `capacitor://…`,
 * por isso o link compartilhado deve vir de VITE_PUBLIC_APP_URL no build (ex.: https://foundcine.com/biblia).
 * Na web, se não estiver definido, usa origin + BASE_URL do Vite.
 */
export function getPublicAppBaseUrl() {
  const explicit = typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL
  if (explicit && String(explicit).trim()) {
    return String(explicit).replace(/\/$/, '')
  }
  if (typeof window === 'undefined') return ''
  try {
    const basePath = import.meta.env?.BASE_URL || '/'
    const u = new URL(basePath, window.location.origin)
    return u.href.replace(/\/$/, '')
  } catch {
    return window.location.origin
  }
}

/**
 * Base HTTPS dos links de compartilhamento.
 * `VITE_PUBLIC_APP_URL` tem prioridade; se vazio, usa o site oficial (App Links no Android).
 */
export function getSharePublicSiteBase() {
  const explicit = typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL
  if (explicit && String(explicit).trim()) {
    return String(explicit).replace(/\/$/, '')
  }
  return CANONICAL_PUBLIC_SITE_BASE
}

/**
 * Path do PWA no site público (ex.: `/biblia`), sem barra final.
 * No APK `BASE_URL` do Vite é `/`, mas App Links abrem `https://domínio/biblia/...` — é preciso mapear para as rotas internas (`/`).
 */
export function getPublicWebPathPrefix() {
  try {
    const base = getSharePublicSiteBase()
    const withProto = /^https?:\/\//i.test(base)
      ? base
      : `https://placeholder.invalid${base.startsWith('/') ? base : `/${base}`}`
    const u = new URL(withProto)
    let p = u.pathname || ''
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
    return !p || p === '/' ? '' : p
  } catch {
    return ''
  }
}

/**
 * Se o SO entregar o link de compartilhamento `intent://…#Intent;scheme=…`, converte para o deep link
 * que o `parseNativeAppDeepLinkUrl` já entende.
 */
export function normalizeAndroidAppOpenUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return urlString
  if (!/^intent:/i.test(urlString)) return urlString
  const hashIdx = urlString.indexOf('#Intent')
  const inner = hashIdx >= 0 ? urlString.slice(0, hashIdx) : urlString
  const intentPart = hashIdx >= 0 ? urlString.slice(hashIdx) : ''
  const schemeMatch = intentPart.match(/;scheme=([^;]+)/i)
  const scheme = schemeMatch ? schemeMatch[1].trim() : ''
  if (!scheme) return urlString
  const rest = inner.replace(/^intent:\/\//i, '')
  const qIdx = rest.indexOf('?')
  const slashIdx = rest.indexOf('/')
  let host = ''
  let pathAndQuery = '/'
  if (slashIdx >= 0) {
    host = rest.slice(0, slashIdx)
    pathAndQuery = rest.slice(slashIdx)
  } else if (qIdx >= 0) {
    host = rest.slice(0, qIdx)
    pathAndQuery = `/${rest.slice(qIdx)}`
  } else {
    host = rest || 'open'
    pathAndQuery = '/'
  }
  return `${scheme}://${host}${pathAndQuery}`
}

/** Scheme do app nativo (Android + iOS). Opcional: VITE_NATIVE_APP_SCHEME ou VITE_ANDROID_APP_SCHEME. */
export function getNativeAppScheme() {
  const fromNative =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_NATIVE_APP_SCHEME
  if (fromNative && String(fromNative).trim()) {
    return String(fromNative).trim().replace(/\/$/, '')
  }
  const fromAndroid =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANDROID_APP_SCHEME
  if (fromAndroid && String(fromAndroid).trim()) {
    return String(fromAndroid).trim().replace(/\/$/, '')
  }
  return 'com.bibliadc.app'
}

/**
 * Base do deep link nativo (Capacitor): `com.bibliadc.app://open` — igual ao bundle ID; não usa localhost.
 */
export function getNativeAppDeepLinkBase() {
  return `${getNativeAppScheme()}://open`
}

/** @deprecated Use {@link getNativeAppDeepLinkBase} */
export function getNativeAndroidDeepLinkBase() {
  return getNativeAppDeepLinkBase()
}

function getAndroidApplicationId() {
  const id = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANDROID_APPLICATION_ID
  if (id && String(id).trim()) return String(id).trim()
  return 'com.bibliadc.app'
}

/** `intent://…#Intent;scheme=…;package=…` — tenta abrir o APK sem depender de site (WhatsApp pode partir o link). */
function androidDeepLinkToIntentShareUrl(deepLinkUrl) {
  if (!deepLinkUrl || typeof deepLinkUrl !== 'string') return deepLinkUrl
  try {
    const u = new URL(deepLinkUrl)
    const scheme = u.protocol.replace(/:$/, '')
    const host = u.hostname || u.host || 'open'
    let path = u.pathname || '/'
    if (!path.startsWith('/')) path = `/${path}`
    const pathAndQuery = `${path}${u.search || ''}`
    const pkg = getAndroidApplicationId()
    return `intent://${host}${pathAndQuery}#Intent;scheme=${scheme};package=${pkg};end`
  } catch {
    return deepLinkUrl
  }
}

function shareAndroidUseIntentLink() {
  const v = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SHARE_ANDROID_USE_INTENT
  return v === 'true' || v === '1' || v === 'TRUE'
}

/**
 * Link para compartilhar fora do chat (WhatsApp, etc.).
 * - Por defeito: HTTPS (`getSharePublicSiteBase`) — com App Links verificados no domínio abre o APK; senão abre o site.
 * - APK só, sem site: defina `VITE_SHARE_ANDROID_USE_INTENT=true` no `.env` do build — usa `intent://…` no Android (abre o app sem browser; apps de mensagem podem não destacar o link inteiro).
 * @param {string} pathname — ex. `/` ou `/estudos-biblicos/abrir`
 * @param {string} [search] — ex. `?livro=1`
 */
export function buildAppShareLink(pathname, search = '') {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  const q =
    search === '' || search == null
      ? ''
      : String(search).startsWith('?')
        ? String(search)
        : `?${String(search)}`
  if (
    shareAndroidUseIntentLink() &&
    typeof Capacitor !== 'undefined' &&
    Capacitor.isNativePlatform?.() &&
    Capacitor.getPlatform?.() === 'android'
  ) {
    const deep = `${getNativeAppDeepLinkBase()}${path}${q}`
    return androidDeepLinkToIntentShareUrl(deep)
  }
  const base = getSharePublicSiteBase().replace(/\/$/, '')
  return `${base}${path}${q}`
}

/** Base do link de compartilhamento (igual a {@link getSharePublicSiteBase}). */
export function getShareBaseUrlForApp() {
  return getSharePublicSiteBase().replace(/\/$/, '')
}

/**
 * Interpreta `com.bibliadc.app://open/estudos-biblicos/abrir?estudo=…` para o React Router (Android e iOS).
 */
export function parseNativeAppDeepLinkUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return null
  const prefix = `${getNativeAppScheme()}://`
  if (!urlString.startsWith(prefix)) return null
  try {
    const u = new URL(urlString)
    let pathname = u.pathname || '/'
    const search = u.search || ''
    const hash = u.hash || ''
    const basePath = import.meta.env.BASE_URL || '/'
    const baseNorm = basePath === '/' ? '' : basePath.replace(/\/$/, '')
    if (baseNorm && pathname.startsWith(baseNorm)) {
      pathname = pathname.slice(baseNorm.length) || '/'
    }
    if (!pathname.startsWith('/')) pathname = `/${pathname}`
    return { pathname, search, hash }
  } catch {
    return null
  }
}

/** @deprecated Use {@link parseNativeAppDeepLinkUrl} */
export function parseNativeAndroidDeepLinkUrl(urlString) {
  return parseNativeAppDeepLinkUrl(urlString)
}

/**
 * True quando o URL base não é acessível em outros dispositivos (localhost, IP local, etc.).
 */
export function isPublicAppUrlUnreachableForOthers() {
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) return false
  const raw = getPublicAppBaseUrl()
  if (!raw) return true
  try {
    const { hostname } = new URL(raw)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') return true
    if (/^192\.168\./.test(hostname)) return true
    if (/^10\./.test(hostname)) return true
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true
    return false
  } catch {
    return true
  }
}

function db() {
  const d = getFirebaseDatabase()
  if (!d) throw new Error('Firebase Database não configurado.')
  return d
}

/**
 * ID vindo de `/estudos-biblicos/:id` (path tem prioridade) ou de `?estudo=` em `/estudos-biblicos/abrir`.
 * Compartilhamento: `…/abrir?estudo=id` — o ID não vai no path (chaves Firebase podem começar por "-" e quebram links em apps).
 */
export function normalizarStudyIdEstudoArg(routeParam, searchParamEstudo) {
  if (routeParam != null && String(routeParam).trim() !== '') {
    try {
      return decodeURIComponent(String(routeParam)).trim()
    } catch {
      return String(routeParam).trim()
    }
  }
  const q = searchParamEstudo
  if (q != null && String(q).trim() !== '') return String(q).trim()
  return ''
}

/** Link para abrir o estudo (compartilhamento): path fixo + `estudo=id`; opcional contexto Bíblia na query. */
export function estudoBiblicoLeituraUrl(studyId, { livroId, capitulo, versiculos } = {}) {
  const sid = String(studyId || '').trim()
  const params = new URLSearchParams()
  params.set('estudo', sid)
  const li = Number(livroId)
  if (Number.isInteger(li) && li > 0) params.set('livro', String(li))
  const cap = Number(capitulo)
  if (Number.isInteger(cap) && cap > 0) params.set('capitulo', String(cap))
  if (Array.isArray(versiculos) && versiculos.length) params.set('versiculos', versiculos.join(','))
  return buildAppShareLink('/estudos-biblicos/abrir', `?${params.toString()}`)
}

/** Normaliza perguntas vindas do RTDB (array ou objeto indexado). */
export function normalizarPerguntas(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  return Object.keys(raw)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => raw[k])
    .filter(Boolean)
}

/** Em modo avaliação, alunos não recebem gabarito no estado do app (Inspecionar / React). */
export function sanitizarEstudoLeituraAluno(study, viewerUid) {
  if (!study?.modoProva) return study
  if (viewerUid && study.authorUid === viewerUid) return study
  const perguntas = normalizarPerguntas(study.perguntas).map((q) => ({
    tipo: q.tipo,
    pergunta: q.pergunta,
    pontos: q.pontos
  }))
  return { ...study, perguntas }
}

export async function criarEstudoBiblico(uid, payload) {
  const r = ref(db(), BASE)
  const novo = push(r)
  const studyId = novo.key
  const now = Date.now()
  const moduleId = sanitizarModuleId(payload.moduleId)
  const data = {
    authorUid: uid,
    authorName: String(payload.authorName || '').slice(0, 120),
    authorEmail: String(payload.authorEmail || '').slice(0, 320),
    tema: String(payload.tema || '').slice(0, 400),
    introducao: String(payload.introducao || '').slice(0, 12000),
    citacoes: String(payload.citacoes || '').slice(0, 12000),
    perguntas: sanitizarPerguntas(payload.perguntas),
    livroId: Number(payload.livroId) || 0,
    capitulo: Number(payload.capitulo) || 1,
    versiculos: Array.isArray(payload.versiculos)
      ? payload.versiculos.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)
      : [],
    referenciaCompacta: String(payload.referenciaCompacta || '').slice(0, 120),
    meditacao: sanitizarMeditacaoLista(payload.meditacao),
    devocionalId: Math.min(99999, Math.max(0, Math.floor(Number(payload.devocionalId) || 0))),
    /** Público = aparece em pesquisas de temas. */
    publico: Boolean(payload.publico),
    /**
     * Nome herdado: na prática significa “só aparece se alguém tiver o URL” (unlisted).
     * true = não entra na busca por tema | false = pode entrar na busca se `publico` estiver true.
     * Não impede abrir o estudo pela URL — só controla listagem na pesquisa (com `publico`).
     */
    acessoPorLink: !Boolean(payload.publico),
    /** Modo prova: respostas só ao final; notas por questão; envio ao professor pelo chat. */
    modoProva: Boolean(payload.modoProva),
    savesCount: 0,
    readsCount: 0,
    createdAt: now,
    updatedAt: now,
    ...(moduleId ? { moduleId } : {})
  }
  await set(novo, data)
  const idxMeus = {
    tema: data.tema,
    referenciaCompacta: data.referenciaCompacta,
    updatedAt: now,
    publico: data.publico,
    ...(moduleId ? { moduleId } : {})
  }
  await set(ref(db(), `users/${uid}/estudosBiblicosMeus/${studyId}`), idxMeus)
  return studyId
}

function sanitizarPerguntas(arr) {
  const list = Array.isArray(arr) ? arr : []
  return list
    .map((q) => {
      const err = Array.isArray(q?.respostasErradas) ? q.respostasErradas : []
      const errLimpas = err.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 4)
      const tipoRaw = String(q?.tipo || '').toLowerCase()
      const tipo = ['multipla_escolha', 'verdadeiro_falso', 'ver_resposta'].includes(tipoRaw)
        ? tipoRaw
        : 'multipla_escolha'
      return {
        tipo,
        pergunta: String(q?.pergunta || '').slice(0, 2000),
        respostaCerta: String(q?.respostaCerta || '').slice(0, 2000),
        respostasErradas: tipo === 'multipla_escolha' ? errLimpas : [],
        explicacao: String(q?.explicacao || '').slice(0, 8000),
        pontos: sanitizarPontosQuestaoProva(q?.pontos)
      }
    })
    .filter((q) => q.pergunta.length > 0)
}

function sanitizarMeditacaoLista(raw) {
  const src = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.values(raw)
      : []
  return src
    .map((item, idx) => ({
      dia: idx + 1,
      titulo: String(item?.titulo || '').slice(0, 180),
      leitura: String(item?.leitura || '').slice(0, 240),
      texto: String(item?.texto || '').slice(0, 12000),
      reflexao: String(item?.reflexao || '').slice(0, 8000),
      oracao: String(item?.oracao || '').slice(0, 4000),
      conselho_pastoral: String(item?.conselho_pastoral || '').slice(0, 4000),
      desafio: String(item?.desafio || '').slice(0, 4000)
    }))
    .slice(0, 30)
}

export async function atualizarEstudoBiblico(studyId, uid, payload) {
  const snap = await get(ref(db(), `${BASE}/${studyId}`))
  if (!snap.exists()) throw new Error('Estudo não encontrado.')
  const cur = snap.val()
  if (cur.authorUid !== uid) throw new Error('Sem permissão para editar.')
  const now = Date.now()
  const moduleId = sanitizarModuleId(payload.moduleId)
  const data = {
    tema: String(payload.tema || '').slice(0, 400),
    introducao: String(payload.introducao || '').slice(0, 12000),
    citacoes: String(payload.citacoes || '').slice(0, 12000),
    perguntas: sanitizarPerguntas(payload.perguntas),
    livroId: Number(payload.livroId) || cur.livroId,
    capitulo: Number(payload.capitulo) || cur.capitulo,
    versiculos: Array.isArray(payload.versiculos)
      ? payload.versiculos.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)
      : cur.versiculos || [],
    referenciaCompacta: String(payload.referenciaCompacta || '').slice(0, 120),
    meditacao: sanitizarMeditacaoLista(payload.meditacao),
    devocionalId: Math.min(99999, Math.max(0, Math.floor(Number(payload.devocionalId) || 0))),
    updatedAt: now,
    moduleId: moduleId || null,
    publico: Boolean(payload.publico),
    /** Ver comentário em `criarEstudoBiblico`: é “unlisted” / só descoberta direta, não “bloqueia URL”. */
    acessoPorLink: !Boolean(payload.publico),
    modoProva: Boolean(payload.modoProva)
  }
  await update(ref(db(), `${BASE}/${studyId}`), data)
  await set(ref(db(), `users/${uid}/estudosBiblicosMeus/${studyId}`), {
    tema: data.tema,
    referenciaCompacta: data.referenciaCompacta,
    updatedAt: now,
    publico: data.publico,
    ...(moduleId ? { moduleId } : {})
  })
}


export async function obterEstudoBiblico(studyId) {
  const id = String(studyId || '').trim()
  if (!id) return null
  const snap = await get(ref(db(), `${BASE}/${id}`))
  if (!snap.exists()) return null
  return { id, ...snap.val() }
}

export async function listarMeusEstudos(uid) {
  const snap = await get(ref(db(), `users/${uid}/estudosBiblicosMeus`))
  if (!snap.exists()) return []
  const o = snap.val()
  return Object.entries(o).map(([id, v]) => ({
    id,
    tema: v?.tema || '',
    referenciaCompacta: v?.referenciaCompacta || '',
    updatedAt: v?.updatedAt || 0,
    moduleId: v?.moduleId || null,
    /** Espelha `bibliaEstudos/{id}/publico` após criar/atualizar; entradas antigas podem omitir. */
    publico: v?.publico
  })).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function listarModulos(uid) {
  const snap = await get(modulosRef(uid))
  if (!snap.exists()) return []
  const o = snap.val()
  return Object.entries(o)
    .map(([id, v]) => ({
      id,
      nome: String(v?.nome || '').slice(0, 200),
      ordem: Number(v?.ordem) || 0,
      updatedAt: v?.updatedAt || 0
    }))
    .sort((a, b) => b.ordem - a.ordem || a.nome.localeCompare(b.nome, 'pt-BR'))
}

export async function criarModulo(uid, nome) {
  const r = modulosRef(uid)
  const novo = push(r)
  const id = novo.key
  const now = Date.now()
  await set(novo, {
    nome: String(nome || '').trim().slice(0, 200),
    ordem: now,
    updatedAt: now
  })
  return id
}

export async function renomearModulo(uid, moduleId, nome) {
  await update(ref(db(), `users/${uid}/estudosBiblicosModulos/${moduleId}`), {
    nome: String(nome || '').trim().slice(0, 200),
    updatedAt: Date.now()
  })
}

export async function apagarModulo(uid, moduleId) {
  const mid = String(moduleId || '').trim()
  if (!mid) return
  const rows = await listarMeusEstudos(uid)
  for (const row of rows) {
    if (row.moduleId === mid) {
      await update(ref(db(), `${BASE}/${row.id}`), { moduleId: null, updatedAt: Date.now() })
      await update(ref(db(), `users/${uid}/estudosBiblicosMeus/${row.id}`), {
        tema: row.tema,
        referenciaCompacta: row.referenciaCompacta || '',
        updatedAt: Date.now(),
        moduleId: null,
        ...(row.publico !== undefined ? { publico: row.publico } : {})
      })
    }
  }
  await remove(ref(db(), `users/${uid}/estudosBiblicosModulos/${mid}`))
}

export async function listarEstudosSalvos(uid) {
  const snap = await get(ref(db(), `users/${uid}/estudosBiblicosSalvos`))
  if (!snap.exists()) return []
  const o = snap.val()
  return Object.entries(o).map(([id, v]) => ({
    id,
    tema: v?.tema || '',
    authorName: v?.authorName || '',
    referenciaCompacta: v?.referenciaCompacta || '',
    savedAt: v?.savedAt || 0
  })).sort((a, b) => b.savedAt - a.savedAt)
}

/**
 * Estudo visível na pesquisa pública.
 * RTDB pode guardar `publico` como boolean, 1/0 ou string.
 * Legado: sem `publico`, usávamos `acessoPorLink`: **false** = listado na busca; **true** = fora da busca (“só link”).
 * O nome `acessoPorLink` é ambíguo (qualquer estudo abre pela URL); não confundir com bloqueio de partilha.
 */
/**
 * O nó `bibliaEstudos` também guarda outros conteúdos (ex.: `kind: 'strongResumo'`) por compatibilidade com as regras.
 * Esses registos não devem aparecer na pesquisa por tema do hub de estudos bíblicos.
 */
export function deveAparecerNaBuscaTemaEstudosBiblicos(s) {
  if (!s || typeof s !== 'object') return false
  return String(s.kind || '').trim() !== 'strongResumo'
}

export function estudoEstaMarcadoComoPublico(s) {
  if (!s || typeof s !== 'object') return false
  const p = s.publico
  if (p === true || p === 1) return true
  if (typeof p === 'string') {
    const low = p.toLowerCase().trim()
    if (low === 'true' || low === '1') return true
    if (low === 'false' || low === '0') return false
  }
  if (p === false || p === 0) return false
  return s.acessoPorLink === false
}

function haystackEstudoPublico(s) {
  const tema = String(s.tema || '')
  const referencia = String(s.referenciaCompacta || '')
  const authorName = String(s.authorName || '')
  const intro = String(s.introducao || '').slice(0, 3500)
  const cit = String(s.citacoes || '').slice(0, 1500)
  return `${tema} ${referencia} ${authorName} ${intro} ${cit}`
    .replace(/\u200b/g, '')
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Evita que um token faça match dentro de outra palavra (ex.: "teste" em "testemunho").
 * Limites: não há letra imediatamente antes nem depois do token (Unicode \p{L}).
 */
function hayContemTokenComoPalavra(hay, tok) {
  if (!tok || tok.length < 2 || !hay) return false
  let from = 0
  while (from <= hay.length) {
    const i = hay.indexOf(tok, from)
    if (i < 0) return false
    const antes = i > 0 ? hay[i - 1] : ''
    const depois = i + tok.length < hay.length ? hay[i + tok.length] : ''
    const okAntes = !antes || !/\p{L}/u.test(antes)
    const okDepois = !depois || !/\p{L}/u.test(depois)
    if (okAntes && okDepois) return true
    from = i + 1
  }
  return false
}

/**
 * Correspondência: todas as “palavras” com ≥2 caracteres devem aparecer no haystack (AND).
 * Tokens são comparados como palavras inteiras. Frases com várias palavras curtas usam substring da frase.
 */
function haystackCorrespondeTermo(hay, termNorm) {
  const collapsed = String(termNorm || '')
    .replace(/\s+/g, ' ')
    .trim()
  const partes = collapsed.split(/\s+/).map((t) => t.trim()).filter(Boolean)
  const tokens = partes.filter((t) => t.length >= 2)
  if (tokens.length > 0) {
    return tokens.every((tok) => hayContemTokenComoPalavra(hay, tok))
  }
  if (collapsed.length >= 2) {
    if (collapsed.includes(' ')) return hay.includes(collapsed)
    return hayContemTokenComoPalavra(hay, collapsed)
  }
  return false
}

/** Mesma regra da pesquisa pública — útil para filtrar “Meus estudos” / salvos de forma coerente. */
export function correspondeBuscaTemaEstudos(textoCompleto, termoNormalizado) {
  const hay = String(textoCompleto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return haystackCorrespondeTermo(hay, termoNormalizado)
}

/** Mesma regra que `buscarEstudosPublicosPorTema` (tema, ref, autor, intro, citações); tokens = palavras inteiras. */
export function estudoBiblicoCorrespondeBuscaPublica(s, termoNormalizado) {
  if (!s) return false
  const t = String(termoNormalizado || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  if (t.length < 2) return false
  const hay = haystackEstudoPublico(s)
  return haystackCorrespondeTermo(hay, t)
}

function indicePrimeiraOcorrenciaPalavra(hay, tok) {
  if (!tok || !hay) return -1
  let from = 0
  while (from <= hay.length) {
    const i = hay.indexOf(tok, from)
    if (i < 0) return -1
    const antes = i > 0 ? hay[i - 1] : ''
    const depois = i + tok.length < hay.length ? hay[i + tok.length] : ''
    if ((!antes || !/\p{L}/u.test(antes)) && (!depois || !/\p{L}/u.test(depois))) return i
    from = i + 1
  }
  return -1
}

function primeiroIndiceMatch(hay, termNorm) {
  const collapsed = String(termNorm || '')
    .replace(/\s+/g, ' ')
    .trim()
  const partes = collapsed.split(/\s+/).filter(Boolean)
  const tokens = partes.filter((t) => t.length >= 2)
  if (tokens.length > 0) {
    const menorPrimeiro = [...tokens].sort((a, b) => a.length - b.length)
    for (const tok of menorPrimeiro) {
      const idx = indicePrimeiraOcorrenciaPalavra(hay, tok)
      if (idx >= 0) return idx
    }
    return -1
  }
  if (collapsed.length >= 2) {
    if (collapsed.includes(' ')) return hay.indexOf(collapsed)
    return indicePrimeiraOcorrenciaPalavra(hay, collapsed)
  }
  return -1
}

/**
 * Pesquisa estudos públicos por tema (mínimo 2 letras).
 * Procura em tema, referência e autor.
 * Junta consultas por `publico` (índice em `database.rules.json`) com leitura completa para legado (`publico` ausente, etc.).
 */
export async function buscarEstudosPublicosPorTema(rawTerm, limit = 40) {
  const term = String(rawTerm || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  if (term.length < 2) return []

  const baseRef = ref(db(), BASE)
  const byId = new Map()

  const ingestSnapshot = (snap) => {
    if (!snap?.exists()) return
    const val = snap.val()
    if (!val || typeof val !== 'object') return
    for (const [id, v] of Object.entries(val)) {
      const s = { id, ...(v || {}) }
      if (!deveAparecerNaBuscaTemaEstudosBiblicos(s)) continue
      if (!estudoEstaMarcadoComoPublico(s)) continue
      byId.set(id, s)
    }
  }

  try {
    ingestSnapshot(await get(baseRef))
  } catch (e) {
    try {
      ingestSnapshot(await get(query(baseRef, orderByChild('publico'), equalTo(true))))
    } catch {
      /* índice `.indexOn` ["publico"] em `database.rules.json` + deploy */
    }
    try {
      ingestSnapshot(await get(query(baseRef, orderByChild('publico'), equalTo(1))))
    } catch {
      /* `publico` guardado como 1 */
    }
    if (byId.size === 0) {
      throw new Error(
        e?.message ||
          'Não foi possível ler os estudos públicos. Verifique a ligação e as regras do Realtime Database.'
      )
    }
  }

  const rows = Array.from(byId.values())

  const out = rows
    .map((s) => {
      const hay = haystackEstudoPublico(s)
      const ok = haystackCorrespondeTermo(hay, term)
      const tema = String(s.tema || '')
      const referencia = String(s.referenciaCompacta || '')
      const authorName = String(s.authorName || '')
      let idx = ok ? primeiroIndiceMatch(hay, term) : -1
      if (ok && idx < 0) idx = 0
      return { s, tema, referencia, authorName, idx }
    })
    .filter((x) => x.idx >= 0)
    .sort((a, b) => {
      if (a.idx !== b.idx) return a.idx - b.idx
      return Number(b.s.updatedAt || 0) - Number(a.s.updatedAt || 0)
    })
    .slice(0, Math.max(1, Math.min(200, Number(limit) || 40)))
    .map(({ s, tema, referencia, authorName }) => ({
      id: s.id,
      tema,
      referenciaCompacta: referencia,
      authorName,
      updatedAt: Number(s.updatedAt || 0),
      _tipo: 'publico'
    }))

  return out
}

/** Primeira visualização por usuário incrementa readsCount (MVP). */
export async function registarLeituraEstudo(studyId, uid) {
  const readerRef = ref(db(), `${BASE}/${studyId}/readers/${uid}`)
  const prev = await get(readerRef)
  if (prev.exists()) return
  await set(readerRef, Date.now())
  const cntRef = ref(db(), `${BASE}/${studyId}/readsCount`)
  await runTransaction(cntRef, (c) => (typeof c === 'number' ? c : 0) + 1)
}

export async function salvarEstudoParaUtilizador(studyId, uid, meta) {
  const study = await obterEstudoBiblico(studyId)
  if (!study) throw new Error('Estudo não encontrado.')
  const saverRef = ref(db(), `${BASE}/${studyId}/savers/${uid}`)
  const ja = await get(saverRef)
  const now = Date.now()
  await set(ref(db(), `users/${uid}/estudosBiblicosSalvos/${studyId}`), {
    tema: meta?.tema || study.tema,
    authorName: study.authorName || '',
    referenciaCompacta: study.referenciaCompacta || '',
    savedAt: now
  })
  if (!ja.exists()) {
    await set(saverRef, now)
    const cntRef = ref(db(), `${BASE}/${studyId}/savesCount`)
    await runTransaction(cntRef, (c) => (typeof c === 'number' ? c : 0) + 1)
  }
}

export async function removerEstudoSalvo(studyId, uid) {
  await remove(ref(db(), `users/${uid}/estudosBiblicosSalvos/${studyId}`))
  await remove(ref(db(), `${BASE}/${studyId}/savers/${uid}`))
  const cntRef = ref(db(), `${BASE}/${studyId}/savesCount`)
  await runTransaction(cntRef, (c) => Math.max(0, (typeof c === 'number' ? c : 0) - 1))
}

export async function apagarEstudoAutor(studyId, uid) {
  const id = String(studyId || '').trim()
  if (!id) throw new Error('Estudo inválido.')
  const s = await obterEstudoBiblico(id)
  if (s && s.authorUid !== uid) throw new Error('Sem permissão.')
  /** Sempre remove o índice local (resolve fantasmas se `bibliaEstudos` já foi apagado antes). */
  await remove(ref(db(), `users/${uid}/estudosBiblicosMeus/${id}`))
  if (s && s.authorUid === uid) {
    await remove(ref(db(), `${BASE}/${id}`))
  }
}

const PROVA_ENTREGAS = 'bibliaEstudosProvaEntregas'

/** Link público de leitura do resultado da prova (professor ou aluno autenticado). */
export function buildProvaEntregaPublicUrl(submissionId) {
  const sid = String(submissionId || '').trim()
  if (!sid) return ''
  return buildAppShareLink('/estudos-biblicos/avaliacao-resultado', `?id=${encodeURIComponent(sid)}`)
}

function sanitizarItensProva(itens) {
  const arr = Array.isArray(itens) ? itens : []
  return arr.slice(0, 80).map((it, i) => {
    const pq = sanitizarPontosQuestaoProva(it?.pontosQuestao)
    const poRaw = Number(it?.pontosObtidos)
    const po = round2(Math.min(pq, Math.max(0, Number.isFinite(poRaw) ? poRaw : 0)))
    return {
      i: Number(i),
      pergunta: String(it?.pergunta || '').slice(0, 2000),
      tipo: String(it?.tipo || '').slice(0, 32),
      pontosQuestao: pq,
      pontosObtidos: po,
      respostaAluno: String(it?.respostaAluno || '').slice(0, 4000),
      respostaCorreta: String(it?.respostaCorreta || '').slice(0, 4000),
      acertou: Boolean(it?.acertou)
    }
  })
}

/**
 * Grava o resultado da prova (aluno). Retorna o `submissionId` (chave push).
 */
export async function publicarEntregaProvaBiblica(alunoUid, body) {
  const uid = String(alunoUid || '').trim()
  if (!uid) throw new Error('Utilizador inválido.')
  const studyId = String(body?.studyId || '').trim()
  const professorUid = String(body?.professorUid || '').trim()
  if (!studyId || !professorUid) throw new Error('Dados da avaliação incompletos.')

  const r = push(ref(db(), PROVA_ENTREGAS))
  const submissionId = r.key
  const urlFinal = buildProvaEntregaPublicUrl(submissionId)

  const row = {
    studyId: studyId.slice(0, 120),
    tema: String(body?.tema || '').slice(0, 400),
    professorUid,
    professorName: String(body?.professorName || '').slice(0, 120),
    alunoUid: uid,
    alunoName: String(body?.alunoName || '').slice(0, 120),
    alunoEmail: String(body?.alunoEmail || '').slice(0, 320),
    pontuacaoObtida: round2(Math.min(100000, Math.max(0, Number(body?.pontuacaoObtida) || 0))),
    pontuacaoMax: round2(Math.min(100000, Math.max(0, Number(body?.pontuacaoMax) || 0))),
    itens: sanitizarItensProva(body?.itens),
    createdAt: Date.now(),
    resultUrl: urlFinal.slice(0, 800)
  }

  await set(r, row)
  return submissionId
}

export async function obterEntregaProvaBiblica(submissionId) {
  const id = String(submissionId || '').trim()
  if (!id) return null
  const snap = await get(ref(db(), `${PROVA_ENTREGAS}/${id}`))
  if (!snap.exists()) return null
  return { id, ...snap.val() }
}

/** Inicia prova no servidor (gabarito não vai ao cliente). */
export async function iniciarSessaoProvaBiblicaAluno(studyId) {
  const fns = getFirebaseFunctions()
  if (!fns) throw new Error('Firebase Functions indisponível.')
  const { httpsCallable } = await import('firebase/functions')
  const res = await httpsCallable(fns, 'iniciarProvaBiblicaAluno')({ studyId })
  return res.data
}

/** Corrige a prova no servidor; devolve itens, obtida e max. */
export async function avaliarProvaBiblicaAluno(sessionId, escolhas) {
  const fns = getFirebaseFunctions()
  if (!fns) throw new Error('Firebase Functions indisponível.')
  const { httpsCallable } = await import('firebase/functions')
  const res = await httpsCallable(fns, 'avaliarProvaBiblicaAluno')({ sessionId, escolhas })
  return res.data
}
