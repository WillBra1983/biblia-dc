/**
 * Confere posição das perícopes do CSV contra bibliaonline.com.br (ARA).
 *
 * Uso:
 *   node scripts/verify-pericopes-bibliaonline.mjs
 *   node scripts/verify-pericopes-bibliaonline.mjs --limit=30
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const csvPath = path.join(root, 'scripts', 'pericopes-review-needed.csv')
const cachePath = path.join(root, 'scripts', 'pericopes-bibliaonline-cache.json')
const reportPath = path.join(root, 'scripts', 'pericopes-bibliaonline-verdict.csv')

const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity

const CODE_TO_SLUG = {
  GEN: 'gn', EXO: 'ex', LEV: 'lv', NUM: 'nm', DEU: 'dt', JOS: 'js', JDG: 'jz', RUT: 'rt',
  '1SA': '1sm', '2SA': '2sm', '1KI': '1rs', '2KI': '2rs', '1CH': '1cr', '2CH': '2cr',
  EZR: 'ed', NEH: 'ne', EST: 'et', JOB: 'jo', PSA: 'sl', PRO: 'pv', ECC: 'ec', SNG: 'ct',
  ISA: 'is', JER: 'jr', LAM: 'lm', EZK: 'ez', DAN: 'dn', HOS: 'os', JOL: 'jl', AMO: 'am',
  OBA: 'ob', JON: 'jn', MIC: 'mq', NAM: 'na', HAB: 'hc', ZEP: 'sf', HAG: 'ag', ZEC: 'zc',
  MAL: 'ml', MAT: 'mt', MRK: 'mc', LUK: 'lc', JHN: 'jo', ACT: 'at', ROM: 'rm',
  '1CO': '1co', '2CO': '2co', GAL: 'gl', EPH: 'ef', PHP: 'fp', COL: 'cl',
  '1TH': '1ts', '2TH': '2ts', '1TI': '1tm', '2TI': '2tm', TIT: 'tt', PHM: 'fm',
  HEB: 'hb', JAS: 'tg', '1PE': '1pe', '2PE': '2pe', '1JN': '1jo', '2JN': '2jo',
  '3JN': '3jo', JUD: 'jd', REV: 'ap',
}

/** Confirmações manuais do utilizador + heurística genealógica. */
const FORCE_JSON = new Set([
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function parseChapterPericopes(htmlOrMd) {
  const text = String(htmlOrMd)
    .replace(/<[^>]+>/g, '\n')
    .replace(/\r/g, '')
  const lines = text.split('\n')
  const out = []
  let pending = null

  const isNoise = (t) =>
    !t ||
    t.length < 4 ||
    /^publicidade$/i.test(t) ||
    /^almeida/i.test(t) ||
    /^veja também/i.test(t) ||
    /^bíblia online/i.test(t) ||
    /©|sbb\.org/i.test(t) ||
    /^tradução$/i.test(t) ||
    /^composição$/i.test(t) ||
    /^versão ara$/i.test(t) ||
    /^\d+\s+\d+\s+\d+/.test(t) ||
    /^[1-3]?\s?[A-Za-zÀ-ú]+\s+\d+(\s+\d+)*$/.test(t)

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim()
    if (isNoise(raw)) continue

    const verseStart = raw.match(/^(\d{1,3})\s+/)
    if (verseStart) {
      if (pending) {
        out.push({ titulo: pending, versiculo: parseInt(verseStart[1], 10) })
        pending = null
      }
      continue
    }

    if (
      raw.length >= 6 &&
      raw.length <= 130 &&
      /^[A-ZÀ-Ú"'(]/.test(raw) &&
      !/^[a-zà-ú]/.test(raw) &&
      !isNoise(raw)
    ) {
      pending = raw
    }
  }
  return out
}

async function fetchChapter(code, chapter) {
  const slug = CODE_TO_SLUG[code]
  if (!slug) return null
  const url = `https://www.bibliaonline.com.br/ara/${slug}/${chapter}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Salvation-pericope-audit/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.text()
}

async function main() {
  const csvLines = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/).slice(1)
  const rows = csvLines.map((line) => {
    const parts = line.split(',')
    const [code, chapter, jsonVerse, txtVerse, ...rest] = parts
    const reason = rest.pop()
    const title = rest.join(',').replace(/^"|"$/g, '')
    return {
      code,
      chapter,
      jsonVerse: parseInt(jsonVerse, 10),
      txtVerse: parseInt(txtVerse, 10),
      title,
    }
  })

  let cache = {}
  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'))
    } catch {
      cache = {}
    }
  }

  const chapterKeys = [...new Set(rows.map((r) => `${r.code}|${r.chapter}`))]
  const toFetch = chapterKeys.slice(0, Number.isFinite(limit) ? limit : chapterKeys.length)

  console.log(`Capítulos a consultar: ${toFetch.length} de ${chapterKeys.length}`)

  for (const key of toFetch) {
    if (cache[key]) continue
    const [code, chapter] = key.split('|')
    try {
      const html = await fetchChapter(code, chapter)
      const peris = parseChapterPericopes(html)
      cache[key] = { fetchedAt: new Date().toISOString(), pericopes: peris }
      process.stdout.write('.')
      await sleep(350)
    } catch (err) {
      cache[key] = { error: String(err.message || err), pericopes: [] }
      process.stdout.write('x')
      await sleep(500)
    }
  }
  console.log('')
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8')

  const verdictLines = [
    'code,chapter,title,jsonVerse,txtVerse,onlineVerse,verdict,note',
  ]

  const stats = { json_ok: 0, fix_to_online: 0, fix_to_txt: 0, review: 0, no_online: 0 }

  for (const row of rows) {
    const key = `${row.code}|${row.chapter}`
    const forceKey = `${row.code}|${row.chapter}|${row.title}`
    const cached = cache[key]
    let onlineVerse = ''
    let verdict = 'review'
    let note = ''

    if (FORCE_JSON.has(forceKey)) {
      verdict = 'json_ok'
      note = 'confirmado manualmente (JSON)'
      stats.json_ok++
    } else if (!cached || cached.error) {
      verdict = 'no_online'
      note = cached?.error || 'capítulo não em cache'
      stats.no_online++
    } else {
      const hit = cached.pericopes.find((p) => norm(p.titulo) === norm(row.title))
      if (!hit) {
        const partial = cached.pericopes.find(
          (p) => norm(p.titulo).includes(norm(row.title).slice(0, 20)) ||
            norm(row.title).includes(norm(p.titulo).slice(0, 20))
        )
        if (partial) {
          onlineVerse = partial.versiculo
          note = `match parcial: «${partial.titulo}»`
        } else {
          note = 'título não encontrado na página ARA'
          stats.review++
        }
      } else {
        onlineVerse = hit.versiculo
      }

      if (onlineVerse) {
        if (row.jsonVerse === onlineVerse) {
          verdict = 'json_ok'
          stats.json_ok++
        } else if (row.txtVerse === onlineVerse) {
          verdict = 'fix_to_txt'
          note = note || 'TXT coincide com bibliaonline'
          stats.fix_to_txt++
        } else {
          verdict = 'fix_to_online'
          note = note || `online v${onlineVerse}`
          stats.fix_to_online++
        }
      } else if (verdict !== 'json_ok') {
        verdict = 'review'
      }
    }

    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`
    verdictLines.push(
      [
        row.code,
        row.chapter,
        esc(row.title),
        row.jsonVerse,
        row.txtVerse,
        onlineVerse || '',
        verdict,
        esc(note),
      ].join(',')
    )
  }

  fs.writeFileSync(reportPath, verdictLines.join('\n'), 'utf8')
  console.log('Estatísticas:', stats)
  console.log('Relatório:', reportPath)
  console.log('Cache:', cachePath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
