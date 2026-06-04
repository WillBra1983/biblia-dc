import initSqlJs from 'sql.js'
import { Capacitor } from '@capacitor/core'

let db = null
let SQL = null
let lastStepBibleFetchKey = null

let httpvfsWorker = null
let httpvfsInitPromise = null

function isNativeApp() {
  return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.() === true
}

function httpvfsHabilitado() {
  // Só ativa quando não estamos no APK (Capacitor) E a flag está ligada — porque
  // o WebView do Android nem sempre suporta Range requests em assets file://.
  if (isNativeApp()) return false
  const flag = String(import.meta.env?.VITE_USE_SQLITE_HTTPVFS || '').trim()
  return flag === '1' || flag.toLowerCase() === 'true'
}

/**
 * Inicializa `sql.js-httpvfs`: carrega o banco por **páginas** via HTTP Range,
 * sem nunca baixar os 62 MB do `stepbible_lexicon.sqlite` inteiros.
 * Requer `npm run setup:httpvfs` (copia o worker para public/) e servidor com
 * `Accept-Ranges: bytes` (nginx tem por padrão).
 */
async function initStepBibleHttpvfs() {
  if (httpvfsWorker) return httpvfsWorker
  if (httpvfsInitPromise) return httpvfsInitPromise

  httpvfsInitPromise = (async () => {
    try {
      const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
      const rev = String(import.meta.env?.VITE_SQLITE_ASSET_REV || '').trim()
      const dbUrl = `${base}stepbible_lexicon.sqlite${rev ? `?v=${encodeURIComponent(rev)}` : ''}`

      const { createDbWorker } = await import('sql.js-httpvfs')
      httpvfsWorker = await createDbWorker(
        [
          {
            from: 'inline',
            config: {
              serverMode: 'full',
              url: dbUrl,
              requestChunkSize: 4096
            }
          }
        ],
        `${base}sql.js-httpvfs/sqlite.worker.js`,
        `${base}sql.js/sql-wasm.wasm`
      )
      return httpvfsWorker
    } catch (e) {
      httpvfsInitPromise = null
      console.warn('[stepBible] Falha em sql.js-httpvfs, caindo no modo clássico:', e?.message || e)
      throw e
    }
  })()

  return httpvfsInitPromise
}

async function initStepBibleDB() {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
  const rev = String(import.meta.env?.VITE_SQLITE_ASSET_REV || '').trim()
  const dbUrl = `${base}stepbible_lexicon.sqlite${rev ? `?v=${encodeURIComponent(rev)}` : ''}`
  if (db && lastStepBibleFetchKey === dbUrl) return db
  if (db && lastStepBibleFetchKey !== dbUrl) {
    try {
      db.close()
    } catch {
      /* ignore */
    }
    db = null
  }
  SQL = await initSqlJs({
    locateFile: (file) => `${base}sql.js/${file}`
  })
  const response = await fetch(dbUrl)
  if (!response.ok) throw new Error('Falha ao carregar stepbible_lexicon.sqlite')
  const arrayBuffer = await response.arrayBuffer()
  db = new SQL.Database(new Uint8Array(arrayBuffer))
  lastStepBibleFetchKey = dbUrl
  return db
}

/**
 * Executa uma query, escolhendo o backend (httpvfs paginado vs sql.js inteiro).
 * Em caso de falha do httpvfs, faz fallback automático para o backend clássico.
 */
async function executarQuery(sql, params) {
  if (httpvfsHabilitado()) {
    try {
      const w = await initStepBibleHttpvfs()
      return await w.db.query(sql, params)
    } catch {
      /* cai para o método clássico */
    }
  }
  const dbi = await initStepBibleDB()
  const stmt = dbi.prepare(sql)
  stmt.bind(params)
  const out = []
  while (stmt.step()) out.push(stmt.getAsObject())
  stmt.free()
  return out
}

function normalizarStrong(code) {
  const normalized = String(code || '').trim().toUpperCase()
  const m = normalized.match(/^([HG])0*(\d+)$/)
  if (!m) return ''
  return `${m[1]}${Number(m[2])}`
}

function variantesStrong(code) {
  const normalized = normalizarStrong(code)
  if (!normalized) return []
  const prefix = normalized[0]
  const digits = String(Number(normalized.slice(1)))
  const variants = new Set([normalized])
  ;[digits.padStart(4, '0'), digits.padStart(5, '0')].forEach((pad) => {
    variants.add(`${prefix}${pad}`)
  })
  return [...variants]
}

export async function verificarBancoStepBible() {
  try {
    const rows = await executarQuery('SELECT COUNT(*) AS total FROM stepbible_lexicon', [])
    return Number(rows?.[0]?.total || 0) > 0
  } catch {
    return false
  }
}

/**
 * No TBESH, `strongs_unified` costuma trazer sufixo (ex.: H2320G), enquanto o utilizador
 * e o restante da app usam o número “simples” (H2320). Esse valor coincide com `strongs_extended`.
 */
const QUERIES_BUSCAR_POR_STRONG = [
  // 1) Esquema completo
  `
    SELECT source, lang, strongs_extended, strongs_disambiguated, strongs_unified,
           lemma, transliteration, morphology,
           gloss_original, gloss_pt,
           definition_clean,
           definition_original,
           definition_pt,
           definition_clean_pt,
           COALESCE(gloss_clean, gloss) AS gloss,
           COALESCE(definition_clean, definition) AS definition
    FROM stepbible_lexicon
    WHERE (strongs_unified IN (?1, ?2, ?3) OR strongs_extended IN (?1, ?2, ?3) OR strongs_disambiguated IN (?1, ?2, ?3))
    ORDER BY source, strongs_extended
    LIMIT ?4
  `,
  // 2) Sem *_original/*_pt
  `
    SELECT source, lang, strongs_extended, strongs_disambiguated, strongs_unified,
           lemma, transliteration, morphology,
           COALESCE(gloss_clean, gloss) AS gloss,
           COALESCE(definition_clean, definition) AS definition
    FROM stepbible_lexicon
    WHERE (strongs_unified IN (?1, ?2, ?3) OR strongs_extended IN (?1, ?2, ?3) OR strongs_disambiguated IN (?1, ?2, ?3))
    ORDER BY source, strongs_extended
    LIMIT ?4
  `,
  // 3) Sem *_clean
  `
    SELECT source, lang, strongs_extended, strongs_disambiguated, strongs_unified,
           lemma, transliteration, morphology, gloss, definition
    FROM stepbible_lexicon
    WHERE (strongs_unified IN (?1, ?2, ?3) OR strongs_extended IN (?1, ?2, ?3) OR strongs_disambiguated IN (?1, ?2, ?3))
    ORDER BY source, strongs_extended
    LIMIT ?4
  `
]

export async function buscarStepBiblePorStrong(strongCode, limit = 12) {
  const variants = variantesStrong(strongCode)
  if (!variants.length) return []
  const [v1 = '', v2 = '', v3 = ''] = variants
  for (const sql of QUERIES_BUSCAR_POR_STRONG) {
    try {
      return await executarQuery(sql, [v1, v2, v3, Number(limit)])
    } catch {
      /* tenta a query seguinte (banco antigo) */
    }
  }
  return []
}
