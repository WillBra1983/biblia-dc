import initSqlJs from 'sql.js'
import { obterSqliteAssetBytes } from '../utils/sqliteAssetCache'

let db = null
let SQL = null
let initPromise = null
/** Chave da última URL usada para carregar `ot_strong.sqlite` (inclui `?v=` quando `VITE_SQLITE_ASSET_REV` está definido). */
let lastOtStrongFetchKey = null

/** Libera o SQLite em memória para o próximo fetch carregar `public/ot_strong.sqlite` de novo (útil após editar o ficheiro). */
export function invalidarCacheOtStrong() {
  try {
    if (db) db.close()
  } catch {
    /* ignore */
  }
  db = null
  lastOtStrongFetchKey = null
}

/** sql.js pode expor nomes de colunas em maiúsculas nalguns builds; unifica para a UI (Biblia.jsx). */
function normalizarLinhaLexicalIndex(row) {
  if (!row || typeof row !== 'object') return row
  return {
    ...row,
    short_def: row.short_def ?? row.SHORT_DEF,
    short_def_pt: row.short_def_pt ?? row.SHORT_DEF_PT,
    short_def_original: row.short_def_original ?? row.SHORT_DEF_ORIGINAL
  }
}

function normalizarChaveBdb(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function extrairCodigoBdbPrincipal(value) {
  const raw = String(value || '')
    .replace(/^bdb\s+/i, '')
    .trim()
  if (!raw) return ''
  const partes = raw.split(/[;,/|]/).map((p) => p.trim()).filter(Boolean)
  return (partes[0] || raw).replace(/[;,:.\s]+$/g, '').trim()
}

async function initOtStrongDB() {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
  const rev = String(import.meta.env.VITE_SQLITE_ASSET_REV || '').trim()
  const fetchKey = `${base}ot_strong.sqlite${rev ? `?v=${encodeURIComponent(rev)}` : ''}`

  if (db && lastOtStrongFetchKey === fetchKey) return db
  if (initPromise && lastOtStrongFetchKey === fetchKey) return initPromise

  if (db) {
    try {
      db.close()
    } catch {
      /* ignore */
    }
    db = null
  }

  lastOtStrongFetchKey = fetchKey

  initPromise = (async () => {
    try {
      SQL =
        SQL ||
        (await initSqlJs({
          locateFile: (file) => `${base}sql.js/${file}`
        }))

      const bytes = await obterSqliteAssetBytes('ot_strong.sqlite', rev, async () => {
        const response = await fetch(fetchKey)
        if (!response.ok) throw new Error('Falha ao carregar ot_strong.sqlite')
        const arrayBuffer = await response.arrayBuffer()
        return new Uint8Array(arrayBuffer)
      })
      db = new SQL.Database(bytes)
      return db
    } catch (error) {
      initPromise = null
      throw error
    }
  })()

  return initPromise
}

let disponibilidadeOtCache = null

/**
 * Verifica disponibilidade SEM baixar o banco inteiro (~29 MB).
 * Faz um GET com `Range: 0-0` (1 byte). Se já abrimos antes, retorna `true`.
 */
export async function verificarBancoOtStrong() {
  if (db) return true
  if (disponibilidadeOtCache !== null) return disponibilidadeOtCache
  try {
    const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
    const rev = String(import.meta.env.VITE_SQLITE_ASSET_REV || '').trim()
    const url = `${base}ot_strong.sqlite${rev ? `?v=${encodeURIComponent(rev)}` : ''}`
    const r = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' }
    })
    const ok = r.ok || r.status === 206
    disponibilidadeOtCache = ok
    return ok
  } catch {
    disponibilidadeOtCache = false
    return false
  }
}

export async function buscarTokensOtCapitulo(bookId, chapter) {
  const dbi = await initOtStrongDB()
  const stmt = dbi.prepare(
    `
      SELECT verse, token_idx, text, lemma_raw, morph, strong_code
      FROM ot_tokens
      WHERE book_id = ? AND chapter = ?
      ORDER BY verse, token_idx
    `
  )
  stmt.bind([Number(bookId), Number(chapter)])
  const byVerse = {}
  while (stmt.step()) {
    const row = stmt.getAsObject()
    const v = Number(row.verse)
    if (!byVerse[v]) byVerse[v] = []
    byVerse[v].push(row)
  }
  stmt.free()
  return byVerse
}

export async function buscarTokensOt(bookId, chapter, verse) {
  const dbi = await initOtStrongDB()
  const stmt = dbi.prepare(
    `
      SELECT token_idx, text, lemma_raw, morph, strong_code
      FROM ot_tokens
      WHERE book_id = ? AND chapter = ? AND verse = ?
      ORDER BY token_idx
    `
  )
  stmt.bind([Number(bookId), Number(chapter), Number(verse)])
  const out = []
  while (stmt.step()) out.push(stmt.getAsObject())
  stmt.free()
  return out
}

export async function buscarOcorrenciasStrongHebraico(strongCode, limit = 20) {
  const normalized = String(strongCode || '').trim().toUpperCase().replace(/^H?(\d+)$/, 'H$1')
  if (!/^H\d+$/.test(normalized)) return []
  const dbi = await initOtStrongDB()
  const stmt = dbi.prepare(
    `
      SELECT book_id, chapter, verse, token_idx, text, lemma_raw, strong_code
      FROM ot_tokens
      WHERE strong_code = ?
      ORDER BY book_id, chapter, verse, token_idx
      LIMIT ?
    `
  )
  stmt.bind([normalized, Math.max(30, Number(limit) * 8)])
  const out = []
  const seen = new Set()
  while (stmt.step()) {
    const row = stmt.getAsObject()
    const key = `${row.book_id}:${row.chapter}:${row.verse}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      livroId: Number(row.book_id),
      capitulo: Number(row.chapter),
      versiculo: Number(row.verse),
      tokenOriginal: row.text || '',
      lemmaRaw: row.lemma_raw || '',
      strongCode: row.strong_code || normalized
    })
    if (out.length >= Number(limit)) break
  }
  stmt.free()
  return out
}

export async function contarOcorrenciasStrongHebraico(strongCode) {
  const normalized = String(strongCode || '').trim().toUpperCase().replace(/^H?(\d+)$/, 'H$1')
  if (!/^H\d+$/.test(normalized)) return 0
  const dbi = await initOtStrongDB()
  const stmt = dbi.prepare(
    `
      SELECT COUNT(DISTINCT book_id || ':' || chapter || ':' || verse) AS total
      FROM ot_tokens
      WHERE strong_code = ?
    `
  )
  stmt.bind([normalized])
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return Number(row?.total || 0)
}

export async function buscarStrongHebraico(strongCode) {
  const normalized = String(strongCode || '').trim().toUpperCase().replace(/^H?(\d+)$/, 'H$1')
  if (!/^H\d+$/.test(normalized)) return null
  const dbi = await initOtStrongDB()
  const stmt = dbi.prepare(
    `
      SELECT strong_code, headword, xlit, pron, pos, source, meaning, usage
      FROM strong_hebrew
      WHERE strong_code = ?
      LIMIT 1
    `
  )
  stmt.bind([normalized])
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return row
}

export async function buscarLexicalIndexHebraico(strongCode) {
  const normalized = String(strongCode || '').trim().toUpperCase().replace(/^H?(\d+)$/, 'H$1')
  if (!/^H\d+$/.test(normalized)) return []
  const dbi = await initOtStrongDB()
  try {
    let stmt
    try {
      stmt = dbi.prepare(
        `
          SELECT strong_code, entry_id, headword, xlit, pos,
                 short_def, short_def_pt, short_def_original,
                 bdb, twot, etym_type, etym_value, etym_root
          FROM lexical_index
          WHERE strong_code = ?
          ORDER BY entry_id
          LIMIT 20
        `
      )
    } catch {
      try {
        /* Bases com short_def_original mas sem coluna short_def_pt (ex.: import só do inglês + PT em short_def). */
        stmt = dbi.prepare(
          `
            SELECT strong_code, entry_id, headword, xlit, pos,
                   short_def, short_def_original,
                   bdb, twot, etym_type, etym_value, etym_root
            FROM lexical_index
            WHERE strong_code = ?
            ORDER BY entry_id
            LIMIT 20
          `
        )
      } catch {
        stmt = dbi.prepare(
          `
            SELECT strong_code, entry_id, headword, xlit, pos, short_def, bdb, twot, etym_type, etym_value, etym_root
            FROM lexical_index
            WHERE strong_code = ?
            ORDER BY entry_id
            LIMIT 20
          `
        )
      }
    }
    stmt.bind([normalized])
    const out = []
    while (stmt.step()) out.push(normalizarLinhaLexicalIndex(stmt.getAsObject()))
    stmt.free()
    return out
  } catch {
    // Compatibilidade com bancos antigos sem a tabela lexical_index.
    return []
  }
}

export async function buscarBdbHebraico(bdbCode) {
  const principal = extrairCodigoBdbPrincipal(bdbCode)
  const normalized = String(principal || '').trim().toLowerCase()
  if (!normalized) return null
  const normalizedCompact = normalizarChaveBdb(normalized)
  const dbi = await initOtStrongDB()
  const toOutput = (row) => ({
    ...row,
    content_text_pt: String(row.content_text_pt || '').trim(),
    content_text_original: String(row.content_text || '').trim(),
    // Compatibilidade com chamadas antigas que esperavam "content_text".
    content_text: String(row.content_text_pt || row.content_text || '').trim()
  })
  const selectComPt = `
    SELECT entry_id, headword, content_text, content_text_pt
    FROM bdb_entries
    WHERE lower(entry_id) = ?
       OR lower(trim(entry_id, '.')) = lower(trim(?, '.'))
       OR replace(replace(replace(lower(entry_id), '.', ''), '-', ''), ' ', '') = ?
    LIMIT 1
  `
  const selectSemPt = `
    SELECT entry_id, headword, content_text
    FROM bdb_entries
    WHERE lower(entry_id) = ?
       OR lower(trim(entry_id, '.')) = lower(trim(?, '.'))
       OR replace(replace(replace(lower(entry_id), '.', ''), '-', ''), ' ', '') = ?
    LIMIT 1
  `
  const scanComPt = `
    SELECT entry_id, headword, content_text, content_text_pt
    FROM bdb_entries
  `
  const scanSemPt = `
    SELECT entry_id, headword, content_text
    FROM bdb_entries
  `
  const executeLookup = (sqlLookup, sqlScan) => {
    let stmt = dbi.prepare(sqlLookup)
    stmt.bind([normalized, normalized, normalizedCompact])
    const row = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    if (row) return row
    stmt = dbi.prepare(sqlScan)
    let match = null
    while (stmt.step()) {
      const candidate = stmt.getAsObject()
      const candidateCompact = normalizarChaveBdb(candidate.entry_id)
      const similar =
        candidateCompact === normalizedCompact ||
        (normalizedCompact.length >= 4 && candidateCompact.includes(normalizedCompact)) ||
        (candidateCompact.length >= 4 && normalizedCompact.includes(candidateCompact))
      if (similar) {
        match = candidate
        break
      }
    }
    stmt.free()
    return match
  }
  try {
    let found = null
    try {
      found = executeLookup(selectComPt, scanComPt)
    } catch {
      // Compatibilidade com bancos que ainda não possuem content_text_pt.
      found = executeLookup(selectSemPt, scanSemPt)
    }
    if (!found) return null
    return toOutput(found)
  } catch {
    return null
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    invalidarCacheOtStrong()
  })
}

if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.__invalidarCacheOtStrong = invalidarCacheOtStrong
}
