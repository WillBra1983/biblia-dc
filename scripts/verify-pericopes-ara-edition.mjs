/**
 * Confere perícopes do CSV contra a edição ARA impressa
 * (Portugues-ARA-NVI-All-Bible.txt — mesma base da bibliaonline.com.br).
 *
 * Uso: node scripts/verify-pericopes-ara-edition.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import initSqlJs from 'sql.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const csvPath = path.join(root, 'scripts', 'pericopes-review-needed.csv')
const txtPath = path.join(root, 'Portugues-ARA-NVI-All-Bible.txt')
const jsonPath = path.join(root, 'public', 'pericopes_ara.backup.json')
const dbPath = path.join(root, 'public', 'ara.sqlite')
const reportPath = path.join(root, 'scripts', 'pericopes-ara-edition-verdict.csv')

/** Confirmado na bibliaonline.com.br (ARA) + utilizador. */
const ONLINE_ARA_VERSE = new Map([
  ['EXO|8|Segunda praga: rãs', 1],
  ['EXO|8|Terceira praga: piolhos', 16],
  ['EXO|8|Quarta praga: moscas', 20],
  ['EXO|22|Leis acerca da propriedade', 1],
  ['EXO|22|Leis civis e religiosas', 16],
  ['EXO|28|As vestes sacerdotais', 3],
  ['GEN|32|Jacó reconcilia-se com Esaú', 3],
  ['GEN|31|Labão segue no encalço de Jacó', 22],
  ['GEN|50|A morte de José', 22],
])

/** JSON confirmado pelo utilizador — não alterar. */
const KEEP_JSON = new Set([
  'GEN|11|Descendentes de Sem',
  'GEN|25|Descendentes de Ismael',
  'GEN|35|Descendentes de Jacó',
  'GEN|36|Descendentes de Seir',
  'GEN|36|Reis e príncipes de Edom',
])

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function verseNumFromLine(line) {
  const m = String(line).trim().match(/^(\d{1,3})\s+/)
  return m ? parseInt(m[1], 10) : null
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

/** Próximo versículo ARA após a linha do título no TXT paralelo. */
function araVerseAfterTitle(txtLines, titleLineIdx) {
  for (let i = titleLineIdx; i < Math.min(titleLineIdx + 25, txtLines.length); i++) {
    const vn = verseNumFromLine(txtLines[i])
    if (vn != null) return vn
  }
  return null
}

function isGenealogyTitle(title) {
  const n = norm(title)
  return (
    n.startsWith('descendentes') ||
    n.startsWith('reis e principes') ||
    n.includes('geracoes de') ||
    n.startsWith('lista de') ||
    n.startsWith('registro da descendencia')
  )
}

async function main() {
  const txtLines = fs.readFileSync(txtPath, 'utf8').split(/\r?\n/)
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const bookCodes = Object.keys(data)

  const wasmPath = path.join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(wasmPath) })
  const db = new SQL.Database(fs.readFileSync(dbPath))

  const csvRaw = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/).slice(1)
  const rows = csvRaw.map((line) => {
    const m = line.match(/^([^,]+),([^,]+),([^,]+),([^,]+),(.+),(\d+),"(.+)"$/)
    if (!m) {
      const parts = line.split(',')
      return {
        code: parts[0],
        chapter: parts[1],
        jsonVerse: parseInt(parts[2], 10),
        txtVerse: parseInt(parts[3], 10),
        title: parts.slice(4, -2).join(',').replace(/^"|"$/g, ''),
        txtLine: parseInt(parts[parts.length - 2], 10),
      }
    }
    return {
      code: m[1],
      chapter: m[2],
      jsonVerse: parseInt(m[3], 10),
      txtVerse: parseInt(m[4], 10),
      title: m[5],
      txtLine: parseInt(m[6], 10),
    }
  })

  const stats = {
    json_ok: 0,
    fix_needed: 0,
    keep_json_genealogy: 0,
    online_confirmed_fix: 0,
  }

  const fixes = []
  const out = ['code,chapter,title,jsonVerse,txtVerse,araVerse,recommendedVerse,verdict,source,url']

  const URL_SLUG = {
    GEN: 'gn', EXO: 'ex', LEV: 'lv', NUM: 'nm', DEU: 'dt', PSA: 'sl', MAT: 'mt',
  }

  for (const row of rows) {
    const key = `${row.code}|${row.chapter}|${row.title}`
    const keepKey = key
    const onlineKey = key
    const titleLineIdx = row.txtLine - 1
    const araFromTxt = araVerseAfterTitle(txtLines, titleLineIdx)

    let recommended = row.jsonVerse
    let verdict = 'json_ok'
    let source = 'json_atual'

    const livroId = bookCodes.indexOf(row.code) + 1
    const verseRows = db.exec(
      `SELECT text FROM verse WHERE book_id=${livroId} AND chapter=${parseInt(row.chapter, 10)} ORDER BY id`
    )
    const sqliteVerses = new Set(
      (verseRows[0]?.values || []).map(([t]) => verseNumFromText(t)).filter(Boolean)
    )

    if (KEEP_JSON.has(keepKey)) {
      recommended = row.jsonVerse
      verdict = 'json_ok'
      source = 'confirmado_utilizador'
      stats.keep_json_genealogy++
      stats.json_ok++
    } else if (ONLINE_ARA_VERSE.has(onlineKey)) {
      recommended = ONLINE_ARA_VERSE.get(onlineKey)
      verdict = recommended === row.jsonVerse ? 'json_ok' : 'fix_needed'
      source = 'bibliaonline_ara'
      if (verdict === 'fix_needed') {
        stats.online_confirmed_fix++
        stats.fix_needed++
        fixes.push({ ...row, recommended, source })
      } else stats.json_ok++
    } else if (isGenealogyTitle(row.title) && row.txtVerse === 1 && row.jsonVerse > 1) {
      recommended = row.jsonVerse
      verdict = 'json_ok'
      source = 'genealogia_meio_capitulo'
      stats.keep_json_genealogy++
      stats.json_ok++
    } else if (araFromTxt && sqliteVerses.has(araFromTxt)) {
      recommended = araFromTxt
      if (recommended === row.jsonVerse) {
        verdict = 'json_ok'
        source = 'txt_ara'
        stats.json_ok++
      } else {
        verdict = 'fix_needed'
        source = 'txt_ara'
        stats.fix_needed++
        fixes.push({ ...row, recommended, source })
      }
    } else if (row.txtVerse && sqliteVerses.has(row.txtVerse) && row.txtVerse !== row.jsonVerse) {
      recommended = row.txtVerse
      verdict = 'fix_needed'
      source = 'tsv_extraido'
      stats.fix_needed++
      fixes.push({ ...row, recommended, source })
    } else {
      verdict = 'review'
      source = 'inconclusivo'
    }

    const slug = URL_SLUG[row.code] || row.code.toLowerCase()
    const url = `https://www.bibliaonline.com.br/ara/${slug}/${row.chapter}`

    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`
    out.push(
      [
        row.code,
        row.chapter,
        esc(row.title),
        row.jsonVerse,
        row.txtVerse,
        araFromTxt || '',
        recommended,
        verdict,
        source,
        url,
      ].join(',')
    )
  }

  db.close()
  fs.writeFileSync(reportPath, out.join('\n'), 'utf8')

  const summaryPath = path.join(root, 'scripts', 'pericopes-fixes-recommended.json')
  fs.writeFileSync(summaryPath, JSON.stringify(fixes, null, 2), 'utf8')

  console.log('Total linhas:', rows.length)
  console.log('Estatísticas:', stats)
  console.log('Correções recomendadas:', fixes.length)
  console.log('Relatório:', reportPath)
  console.log('JSON de fixes:', summaryPath)

  console.log('\n=== GEN / EXO (confirmados) ===')
  for (const line of out.filter((l) => /^(GEN|EXO),/.test(l))) {
    console.log(line)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
