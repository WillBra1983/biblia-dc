import initSqlJs from 'sql.js'

let db = null
let lastLexiconFetchKey = null

async function initLexiconPtBrDB() {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
  const rev = String(import.meta.env?.VITE_SQLITE_ASSET_REV || '').trim()

  let dbFile = 'lexicon_ptbr_v2.sqlite'
  try {
    const p = await fetch(`${base}lexicon_ptbr_current.txt`)
    if (p.ok) {
      const txt = String(await p.text()).trim()
      if (txt) dbFile = txt
    }
  } catch {
    // fallback para arquivo fixo
  }

  const fetchKey = `${dbFile}@${rev || 'noversion'}`
  if (db && lastLexiconFetchKey === fetchKey) return db

  if (db) {
    try {
      db.close()
    } catch {
      /* ignore */
    }
    db = null
  }

  const SQL = await initSqlJs({
    locateFile: (file) => `${base}sql.js/${file}`
  })
  const url = `${base}${dbFile}${rev ? `?v=${encodeURIComponent(rev)}` : ''}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Falha ao carregar ${dbFile}`)
  const arrayBuffer = await response.arrayBuffer()
  db = new SQL.Database(new Uint8Array(arrayBuffer))
  lastLexiconFetchKey = fetchKey
  return db
}

function normalizeStrong(code) {
  const raw = String(code || '').trim().toUpperCase()
  const m = raw.match(/^([HG])0*(\d+)$/)
  if (!m) return raw
  return `${m[1]}${Number(m[2])}`
}

export async function verificarBancoLexiconPtBr() {
  try {
    const dbi = await initLexiconPtBrDB()
    const stmt = dbi.prepare('SELECT COUNT(*) AS total FROM lexicon_ptbr')
    const ok = stmt.step() ? Number(stmt.getAsObject().total || 0) > 0 : false
    stmt.free()
    return ok
  } catch {
    return false
  }
}

export async function buscarLexiconPtBr(strongCode) {
  const normalized = normalizeStrong(strongCode)
  if (!/^([HG])\d+$/.test(normalized)) return null
  try {
    const dbi = await initLexiconPtBrDB()
    const stmt = dbi.prepare(
      `
        SELECT strong_code, palavra, transliteracao, idioma, definicoes_json, definicao_expandida, categoria, raiz, fonte
        FROM lexicon_ptbr
        WHERE strong_code = ?
        LIMIT 1
      `
    )
    stmt.bind([normalized])
    const row = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    if (!row) return null
    let defs = []
    try {
      defs = JSON.parse(String(row.definicoes_json || '[]'))
    } catch {
      defs = []
    }
    return {
      ...row,
      definicoes: Array.isArray(defs) ? defs : []
    }
  } catch {
    return null
  }
}
