import initSqlJs from 'sql.js'
import { normalizarBuscaStrong, codigosBuscaStrong } from '../utils/strongBusca'

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

/** Pesquisa o banco que já acompanha o aplicativo; não chama IA. */
export async function pesquisarLexiconStrong(termo, idioma = '') {
  const busca = normalizarBuscaStrong(termo)
  if (!busca) return []
  const dbi = await initLexiconPtBrDB()
  const codigos = codigosBuscaStrong(termo, idioma)
  dbi.create_function('normalizar_busca_strong', normalizarBuscaStrong)
  const literal = busca.replace(/[\\%_]/g, '\\$&')
  const stmt = dbi.prepare(`SELECT strong_code AS code, palavra, transliteracao,
    definicao_expandida AS descricao FROM lexicon_ptbr
    WHERE (? = '' OR substr(strong_code, 1, 1) = ?)
    AND ${codigos.length ? `strong_code IN (${codigos.map(() => '?').join(',')})` : `(
      normalizar_busca_strong(palavra) LIKE ? ESCAPE '\\' OR
      normalizar_busca_strong(transliteracao) LIKE ? ESCAPE '\\' OR
      normalizar_busca_strong(definicoes_json) LIKE ? ESCAPE '\\' OR
      normalizar_busca_strong(definicao_expandida) LIKE ? ESCAPE '\\')`}
    ORDER BY CASE WHEN normalizar_busca_strong(palavra) = ? THEN 0
      WHEN normalizar_busca_strong(transliteracao) = ? THEN 1 ELSE 2 END, strong_code
    LIMIT 40`)
  try {
    stmt.bind([idioma, idioma, ...(codigos.length ? codigos : Array(4).fill(`%${literal}%`)), busca, busca])
    const rows = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    return rows
  } finally { stmt.free() }
}
