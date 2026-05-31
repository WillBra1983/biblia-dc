import initSqlJs from 'sql.js'
import { obterSqliteAssetBytes } from '../utils/sqliteAssetCache'

let db = null
let SQL = null
let disponibilidadeCache = null
let initPromise = null

function urlBase() {
  return (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
}

async function initNtProvaDB() {
  if (db) return db
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const base = urlBase()
      const rev = String(import.meta.env?.VITE_SQLITE_ASSET_REV || '').trim()
      const url = `${base}nt_prova.sqlite${rev ? `?v=${encodeURIComponent(rev)}` : ''}`

      SQL =
        SQL ||
        (await initSqlJs({
          locateFile: (file) => `${base}sql.js/${file}`
        }))

      const bytes = await obterSqliteAssetBytes('nt_prova.sqlite', rev, async () => {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Falha ao carregar nt_prova.sqlite')
        }
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

/**
 * Verifica disponibilidade SEM baixar o banco inteiro (~20 MB).
 * Faz um GET com `Range: 0-0` (1 byte) — funciona no APK Capacitor e no PWA.
 * Se já abrimos o banco antes, retorna `true` sem fazer rede.
 */
export async function verificarBancoNtProva() {
  if (db) return true
  if (disponibilidadeCache !== null) return disponibilidadeCache
  try {
    const base = urlBase()
    const r = await fetch(`${base}nt_prova.sqlite`, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' }
    })
    const ok = r.ok || r.status === 206
    disponibilidadeCache = ok
    return ok
  } catch (error) {
    console.warn('NT prova indisponivel:', error)
    disponibilidadeCache = false
    return false
  }
}

export async function buscarTokensNt(bookNum, chapter, verse) {
  const dbi = await initNtProvaDB()
  const stmt = dbi.prepare(
    `
      SELECT token_idx, pos, parsing, text, word, normalized_word, lemma, lemma_norm
      FROM nt_tokens
      WHERE book_num = ? AND chapter = ? AND verse = ?
      ORDER BY token_idx
    `
  )
  stmt.bind([Number(bookNum), Number(chapter), Number(verse)])
  const out = []
  while (stmt.step()) out.push(stmt.getAsObject())
  stmt.free()
  return out
}

export async function buscarTokensNtCapitulo(bookNum, chapter) {
  const dbi = await initNtProvaDB()
  const stmt = dbi.prepare(
    `
      SELECT verse, token_idx, pos, parsing, text, word, normalized_word, lemma, lemma_norm
      FROM nt_tokens
      WHERE book_num = ? AND chapter = ?
      ORDER BY verse, token_idx
    `
  )
  stmt.bind([Number(bookNum), Number(chapter)])
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

export async function buscarOcorrenciasStrongGrego(strongCode, limit = 20, offset = 0) {
  const normalized = String(strongCode || '').trim().toUpperCase().replace(/^G?(\d+)$/, 'G$1')
  if (!/^G\d+$/.test(normalized)) return []
  const lim = Math.max(1, Number(limit) || 20)
  const off = Math.max(0, Number(offset) || 0)
  const dbi = await initNtProvaDB()
  const stmt = dbi.prepare(
    `
      SELECT t.book_num, t.chapter, t.verse, t.token_idx, t.text, t.lemma, t.lemma_norm
      FROM nt_tokens t
      JOIN strong_greek_lemma_index i ON i.lemma_norm = t.lemma_norm
      WHERE i.strong = ?
      ORDER BY t.book_num, t.chapter, t.verse, t.token_idx
      LIMIT ?
    `
  )
  stmt.bind([normalized, Math.max(50, (off + lim) * 12)])
  const out = []
  const seen = new Set()
  let pulados = 0
  while (stmt.step()) {
    const row = stmt.getAsObject()
    const key = `${row.book_num}:${row.chapter}:${row.verse}`
    if (seen.has(key)) continue
    seen.add(key)
    if (pulados < off) {
      pulados++
      continue
    }
    out.push({
      livroId: Number(row.book_num) + 39,
      bookNum: Number(row.book_num),
      capitulo: Number(row.chapter),
      versiculo: Number(row.verse),
      tokenOriginal: row.text || '',
      lemmaRaw: row.lemma || '',
      lemmaNorm: row.lemma_norm || ''
    })
    if (out.length >= lim) break
  }
  stmt.free()
  return out
}

export async function contarOcorrenciasStrongGrego(strongCode) {
  const normalized = String(strongCode || '').trim().toUpperCase().replace(/^G?(\d+)$/, 'G$1')
  if (!/^G\d+$/.test(normalized)) return 0
  const dbi = await initNtProvaDB()
  const stmt = dbi.prepare(
    `
      SELECT COUNT(DISTINCT t.book_num || ':' || t.chapter || ':' || t.verse) AS total
      FROM nt_tokens t
      JOIN strong_greek_lemma_index i ON i.lemma_norm = t.lemma_norm
      WHERE i.strong = ?
    `
  )
  stmt.bind([normalized])
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return Number(row?.total || 0)
}

export async function buscarStrongGrego(strongCode) {
  const normalized = String(strongCode || '')
    .trim()
    .toUpperCase()
    .replace(/^G?(\d+)$/, 'G$1')
  if (!/^G\d+$/.test(normalized)) return null

  const dbi = await initNtProvaDB()
  const stmt = dbi.prepare(
    `
      SELECT strong, greek_unicode, greek_translit, pronunciation, derivation, definition, kjv_def
      FROM strong_greek
      WHERE strong = ?
      LIMIT 1
    `
  )
  stmt.bind([normalized])
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return row
}

export async function buscarStrongGregoPorLemma(lemma, limit = 12) {
  const norm = String(lemma || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  if (!norm) return []
  const dbi = await initNtProvaDB()
  const stmt = dbi.prepare(
    `
      SELECT i.strong, i.lemma_raw, s.greek_unicode, s.greek_translit, s.definition
      FROM strong_greek_lemma_index i
      JOIN strong_greek s ON s.strong = i.strong
      WHERE i.lemma_norm = ?
      ORDER BY i.strong
      LIMIT ?
    `
  )
  stmt.bind([norm, Number(limit)])
  const out = []
  while (stmt.step()) out.push(stmt.getAsObject())
  stmt.free()
  return out
}
