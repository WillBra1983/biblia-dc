/**
 * Auditoria de posicionamento das perícopes (JSON vs TSV vs SQLite).
 *
 * Uso: node scripts/audit-pericopes-placement.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import initSqlJs from 'sql.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const jsonPath = path.join(root, 'public', 'pericopes_ara.backup.json')
const tsvPath = path.join(root, 'scripts', 'pericopes-extracted-from-txt-full.tsv')
const dbPath = path.join(root, 'public', 'ara.sqlite')
const reportPath = path.join(root, 'scripts', 'pericopes-placement-audit.txt')

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function verseNumFromText(text) {
  const m = String(text).match(/^[\s]*([⁰¹²³⁴⁵⁶⁷⁸⁹]+|\d{1,3})\s/)
  if (!m) return null
  const s = m[1]
  const map = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 }
  if (/^\d+$/.test(s)) return parseInt(s, 10)
  let n = 0
  for (const c of s) n = n * 10 + (map[c] ?? 0)
  return n || null
}

async function main() {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const bookCodes = Object.keys(data)

  const tsvRaw = fs.readFileSync(tsvPath, 'utf8').trim().split(/\r?\n/).slice(1)
  const tsvTitles = new Set()
  const tsvByKey = new Map()
  for (const line of tsvRaw) {
    const [code, cap, ver, , titulo] = line.split('\t')
    const key = `${code}|${cap}|${norm(titulo)}`
    tsvTitles.add(key)
    if (!tsvByKey.has(key)) tsvByKey.set(key, [])
    tsvByKey.get(key).push(parseInt(ver, 10))
  }

  const wasmPath = path.join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(wasmPath) })
  const db = new SQL.Database(fs.readFileSync(dbPath))

  const psaNotV1 = []
  const invalidVerse = []
  const tsvMismatch = []
  const notInTsv = []
  const disorderChapters = []

  for (let i = 0; i < bookCodes.length; i++) {
    const code = bookCodes[i]
    const livroId = i + 1
    for (const ck of Object.keys(data[code])) {
      const rows = data[code][ck]
      if (!Array.isArray(rows)) continue

      const verseRows = db.exec(
        `SELECT text FROM verse WHERE book_id = ${livroId} AND chapter = ${parseInt(ck, 10)} ORDER BY id`
      )
      const verseNums = new Set(
        (verseRows[0]?.values || []).map(([t]) => verseNumFromText(t)).filter(Boolean)
      )

      const vers = rows.map((r) => parseInt(String(r.versiculo), 10)).filter((n) => n > 0)
      if (vers.length > 1) {
        for (let j = 1; j < vers.length; j++) {
          if (vers[j] < vers[j - 1]) {
            disorderChapters.push({ code, cap: ck, vers })
            break
          }
        }
      }

      for (const row of rows) {
        const titulo = String(row.pericope ?? '').trim()
        if (!titulo) continue
        const jv = parseInt(String(row.versiculo), 10)
        const key = `${code}|${ck}|${norm(titulo)}`

        if (code === 'PSA' && rows.length === 1 && jv > 1) {
          psaNotV1.push({ cap: ck, jv, titulo })
        }

        if (!verseNums.has(jv)) {
          invalidVerse.push({ code, cap: ck, jv, titulo })
        }

        if (!tsvTitles.has(key)) {
          notInTsv.push({ code, cap: ck, jv, titulo })
          continue
        }

        const tsvVerses = [...new Set(tsvByKey.get(key) || [])]
        if (tsvVerses.length === 1 && tsvVerses[0] !== jv) {
          tsvMismatch.push({ code, cap: ck, jv, tsvVer: tsvVerses[0], titulo })
        }
      }
    }
  }

  db.close()

  const lines = [
    `Gerado: ${new Date().toISOString()}`,
    '',
    '=== Resumo ===',
    `Salmos com título fora do v.1 (único título no capítulo): ${psaNotV1.length}`,
    `Versículo inexistente no SQLite: ${invalidVerse.length}`,
    `Capítulos com perícopes fora de ordem crescente: ${disorderChapters.length}`,
    `Título no JSON com versículo diferente do TSV: ${tsvMismatch.length}`,
    `Títulos no JSON sem correspondência no TXT: ${notInTsv.length}`,
    '',
    '=== Salmos (título deveria estar no v.1) ===',
    ...psaNotV1.map((p) => `Sl ${p.cap}\tv${p.jv}\t${p.titulo}`),
    '',
    '=== Versículo inválido no SQLite ===',
    ...invalidVerse.map((p) => `${p.code} ${p.cap}\tv${p.jv}\t${p.titulo}`),
    '',
    '=== Capítulos desordenados ===',
    ...disorderChapters.map((p) => `${p.code} ${p.cap}\t${p.vers.join(', ')}`),
    '',
    '=== JSON vs TSV (amostra de 40) ===',
    ...tsvMismatch
      .slice(0, 40)
      .map((p) => `${p.code} ${p.cap}\tjson v${p.jv} / tsv v${p.tsvVer}\t${p.titulo}`),
    tsvMismatch.length > 40 ? `… e mais ${tsvMismatch.length - 40}` : '',
  ]

  fs.writeFileSync(reportPath, lines.filter(Boolean).join('\n'), 'utf8')
  console.log('Auditoria gravada em:', reportPath)
  console.log({
    psaNotV1: psaNotV1.length,
    invalidVerse: invalidVerse.length,
    disorderChapters: disorderChapters.length,
    tsvMismatch: tsvMismatch.length,
    notInTsv: notInTsv.length,
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
