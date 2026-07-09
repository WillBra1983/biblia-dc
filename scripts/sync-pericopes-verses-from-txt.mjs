/**
 * Alinha `versiculo` em `public/pericopes_ara.backup.json` com a extração do TXT
 * paralelo ARA (`scripts/pericopes-extracted-from-txt-full.tsv`), validando contra
 * `public/ara.sqlite`.
 *
 * Regras (por ordem):
 * 1. Salmos: um único título por capítulo com versiculo > 1 → 1 (sobrescrito ARA
 *    não existe no SQLite; o título temático deve preceder o v.1).
 * 2. Versículo inexistente no SQLite → corrige pelo TSV ou mantém o maior v. válido.
 * 3. Título idêntico no TSV (único) com versículo válido no SQLite → usa o TSV,
 *    exceto Salmos temáticos já em v.1 quando o TSV diz v.2 (offset de sobrescrito).
 *
 * Pipeline completo:
 *   node scripts/compare-pericopes-txt-vs-json.mjs
 *   node scripts/sync-pericopes-verses-from-txt.mjs          # simulação
 *   node scripts/sync-pericopes-verses-from-txt.mjs --apply
 *   node scripts/merge-pericopes-refs-from-tsv.mjs           # refs cruzadas (opcional)
 *   node scripts/rebuild-pericopes-from-ara-backup.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import initSqlJs from 'sql.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const tsvPath = path.join(root, 'scripts', 'pericopes-extracted-from-txt-full.tsv')
const jsonPath = path.join(root, 'public', 'pericopes_ara.backup.json')
const dbPath = path.join(root, 'public', 'ara.sqlite')
const reportPath = path.join(root, 'scripts', 'pericopes-verse-sync-report.txt')

const apply = process.argv.includes('--apply')

/** Confirmado na bibliaonline.com.br (ARA) + utilizador. */
const ARA_CONFIRMED_VERSE = new Map([
  ['GEN|32|Jacó reconcilia-se com Esaú', 3],
  ['EXO|8|Segunda praga: rãs', 1],
  ['EXO|8|Terceira praga: piolhos', 16],
  ['EXO|8|Quarta praga: moscas', 20],
  ['EXO|22|Leis civis e religiosas', 16],
])

/** JSON validado — não alterar. */
const KEEP_JSON_KEYS = new Set([
  'GEN|11|Descendentes de Sem',
  'GEN|25|Descendentes de Ismael',
  'GEN|31|Labão segue no encalço de Jacó',
  'GEN|35|Descendentes de Jacó',
  'GEN|36|Descendentes de Seir',
  'GEN|36|Reis e príncipes de Edom',
  'GEN|50|A morte de José',
  'EXO|22|Leis acerca da propriedade',
  'EXO|28|As vestes sacerdotais',
])

function confirmedKey(code, cap, titulo) {
  return `${code}|${cap}|${String(titulo).trim()}`
}

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function isSuperscription(t) {
  const n = norm(t)
  return (
    /^(salmo|ao mestre|cântico|hino|oração|vs\.|corá|asafe|de davi|davi,|salmo didático)/.test(n) ||
    /salmo de|quando fugiu|quando no deserto|em memória|para ensinar|ezraíta/.test(n)
  )
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

function loadTsvMap() {
  const raw = fs.readFileSync(tsvPath, 'utf8').trim().split(/\r?\n/).slice(1)
  const map = new Map()
  for (const line of raw) {
    const [code, cap, ver, , titulo] = line.split('\t')
    const key = `${code}|${cap}|${norm(titulo)}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push({ verse: parseInt(ver, 10), titulo })
  }
  return map
}

function chapterVerseSet(db, livroId, capitulo) {
  const rows = db.exec(
    `SELECT text FROM verse WHERE book_id = ${livroId} AND chapter = ${capitulo} ORDER BY id`
  )
  const nums = new Set()
  for (const [text] of rows[0]?.values || []) {
    const n = verseNumFromText(text)
    if (n) nums.add(n)
  }
  return nums
}

async function main() {
  if (!fs.existsSync(tsvPath)) {
    console.error('TSV ausente. Rode: node scripts/compare-pericopes-txt-vs-json.mjs')
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const bookCodes = Object.keys(data)
  const tsvMap = loadTsvMap()

  const wasmPath = path.join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(wasmPath) })
  const db = new SQL.Database(fs.readFileSync(dbPath))

  const changes = []
  const skipped = []
  const verseCache = new Map()
  const disorderKeys = new Set()

  function versesFor(code, cap) {
    const livroId = bookCodes.indexOf(code) + 1
    const key = `${livroId}|${cap}`
    if (!verseCache.has(key)) verseCache.set(key, chapterVerseSet(db, livroId, cap))
    return verseCache.get(key)
  }

  for (const code of bookCodes) {
    const chapters = data[code]
    for (const ck of Object.keys(chapters)) {
      const rows = chapters[ck]
      if (!Array.isArray(rows) || rows.length < 2) continue
      const vers = rows.map((r) => parseInt(String(r.versiculo), 10)).filter((n) => n > 0)
      for (let j = 1; j < vers.length; j++) {
        if (vers[j] < vers[j - 1]) {
          disorderKeys.add(`${code}|${ck}`)
          break
        }
      }
    }
  }

  for (const code of bookCodes) {
    const chapters = data[code]
    for (const ck of Object.keys(chapters)) {
      const cap = parseInt(ck, 10)
      const rows = chapters[ck]
      if (!Array.isArray(rows)) continue

      const verseNums = versesFor(code, cap)
      const maxV = Math.max(0, ...verseNums)

      // Regra 1 — Salmos: título único deve abrir o salmo (v.1).
      if (code === 'PSA' && rows.length === 1) {
        const row = rows[0]
        const titulo = String(row.pericope ?? '').trim()
        const jv = parseInt(String(row.versiculo), 10)
        if (titulo && jv > 1) {
          changes.push({
            code,
            cap: ck,
            titulo,
            from: jv,
            to: 1,
            rule: 'psa_single_to_v1',
          })
          row.versiculo = '1'
        }
        continue
      }

      for (const row of rows) {
        const titulo = String(row.pericope ?? '').trim()
        if (!titulo) continue
        let jv = parseInt(String(row.versiculo), 10)
        const key = `${code}|${ck}|${norm(titulo)}`
        const keepKey = confirmedKey(code, ck, titulo)
        const araKey = keepKey

        if (KEEP_JSON_KEYS.has(araKey)) continue

        const araVerse = ARA_CONFIRMED_VERSE.get(araKey)
        if (araVerse != null && araVerse !== jv && verseNums.has(araVerse)) {
          changes.push({
            code,
            cap: ck,
            titulo,
            from: jv,
            to: araVerse,
            rule: 'ara_online_confirmed',
          })
          row.versiculo = String(araVerse)
          continue
        }

        const tsvHits = tsvMap.get(key)

        // Regra 2 — versículo inválido no SQLite.
        if (!verseNums.has(jv)) {
          const tsvV =
            tsvHits?.length === 1 && verseNums.has(tsvHits[0].verse)
              ? tsvHits[0].verse
              : maxV || jv
          changes.push({
            code,
            cap: ck,
            titulo,
            from: jv,
            to: tsvV,
            rule: 'invalid_sqlite_verse',
          })
          row.versiculo = String(tsvV)
          jv = tsvV
          continue
        }

        // Regra 3 — alinhar ao TSV quando há correspondência única.
        if (!tsvHits || tsvHits.length !== 1) continue
        const tv = tsvHits[0].verse
        if (tv === jv || !verseNums.has(tv)) continue

        if (code === 'PSA' && !isSuperscription(titulo) && jv === 1 && tv === 2) {
          skipped.push({
            code,
            cap: ck,
            titulo,
            jsonVer: jv,
            tsvVer: tv,
            reason: 'psa_keep_v1_over_tsv_v2',
          })
          continue
        }

        // Não mover título para versículo anterior só pelo TSV (ex.: Gn 11.10
        // «Descendentes de Sem» está correto no JSON; o TSV falha e aponta v.1).
        // Exceção: capítulos com perícopes fora de ordem (ex.: Êx 8).
        const chapterKey = `${code}|${ck}`
        if (tv < jv && !disorderKeys.has(chapterKey) && !KEEP_JSON_KEYS.has(araKey)) {
          skipped.push({
            code,
            cap: ck,
            titulo,
            jsonVer: jv,
            tsvVer: tv,
            reason: 'tsv_earlier_than_json_skipped',
          })
          continue
        }

        changes.push({
          code,
          cap: ck,
          titulo,
          from: jv,
          to: tv,
          rule: disorderKeys.has(chapterKey) ? 'tsv_disordered_chapter' : 'tsv_unique_match',
        })
        row.versiculo = String(tv)
      }
    }
  }

  db.close()

  const byRule = changes.reduce((acc, c) => {
    acc[c.rule] = (acc[c.rule] || 0) + 1
    return acc
  }, {})

  const lines = [
    `Gerado: ${new Date().toISOString()}`,
    `Modo: ${apply ? 'APLICADO' : 'simulação (--apply para gravar)'}`,
    `Alterações propostas: ${changes.length}`,
    `Ignoradas (regra PSA v1): ${skipped.length}`,
    '',
    'Por regra:',
    ...Object.entries(byRule).map(([k, v]) => `  ${k}: ${v}`),
    '',
    '=== Alterações ===',
    ...changes.map(
      (c) =>
        `${c.code}\t${c.cap}\tv${c.from}->v${c.to}\t[${c.rule}]\t${c.titulo}`
    ),
  ]

  if (skipped.length) {
    lines.push('', '=== Ignoradas ===')
    for (const s of skipped) {
      lines.push(
        `${s.code}\t${s.cap}\tjson v${s.jsonVer} / tsv v${s.tsvVer}\t${s.reason}\t${s.titulo}`
      )
    }
  }

  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8')

  if (apply) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8')
    console.log('OK: pericopes_ara.backup.json atualizado')
  } else {
    console.log('Simulação (sem gravar JSON). Use --apply para aplicar.')
  }

  console.log('Alterações:', changes.length, byRule)
  console.log('Ignoradas:', skipped.length)
  console.log('Relatório:', reportPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
