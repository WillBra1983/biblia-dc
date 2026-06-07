/**
 * Audita transliteração com vogais — Gn 1.
 * Uso: node scripts/_audit_gn1_translit.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import initSqlJs from 'sql.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function stripDiacritics(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function normalizarFormaLexical(s) {
  return stripDiacritics(s)
    .replace(/[\u0313\u0314\u0342\u0345]/g, '')
    .toLowerCase()
    .trim()
}

function formasLexicaisEquivalentes(a, b) {
  const x = normalizarFormaLexical(a)
  const y = normalizarFormaLexical(b)
  return !!x && x === y
}

function formatarTextoMorphHb(texto) {
  return String(texto || '')
    .split(/\s+/)
    .map((parte) => parte.replace(/\/+/g, '').trim())
    .filter(Boolean)
    .join(' ')
    .normalize('NFC')
    .trim()
}

function textoHebraicoVocalizado(texto) {
  const nfd = String(texto || '').normalize('NFD')
  for (const ch of nfd) {
    const cp = ch.codePointAt(0)
    if (cp >= 0x05b0 && cp <= 0x05bc) return true
    if (cp === 0x05b9 || cp === 0x05bb) return true
  }
  return false
}

function aplicarVocalizacaoSeNecessario(forma, headwordVocalizado) {
  const f = String(forma || '').trim()
  const hw = String(headwordVocalizado || '').trim()
  if (!f) return hw
  if (textoHebraicoVocalizado(f)) return f
  if (hw && formasLexicaisEquivalentes(f, hw)) return hw
  return f
}

function vocalizarPrefixoMorphHb(prefixo) {
  const p = String(prefixo || '').trim()
  if (!p || textoHebraicoVocalizado(p) || p.length !== 1) return p
  const comSheva = {
    '\u05D1': '\u05D1\u05B0',
    '\u05DB': '\u05DB\u05B0',
    '\u05DC': '\u05DC\u05B0',
    '\u05D5': '\u05D5\u05B0',
  }
  return comSheva[p] || p
}

function formatarTextoMorphHbVocalizado(texto, headwordVocalizado) {
  const raw = String(texto || '').trim()
  const hw = String(headwordVocalizado || '').trim()
  if (!raw) return hw
  if (!raw.includes('/')) {
    return aplicarVocalizacaoSeNecessario(formatarTextoMorphHb(raw), hw)
  }
  const partesRaw = raw.split('/')
  const partes = partesRaw.map((parte, idx) => {
    const p = parte.trim()
    if (!p) return ''
    if (idx === partesRaw.length - 1 && hw) {
      return aplicarVocalizacaoSeNecessario(p, hw)
    }
    return p
  })
  for (let i = 0; i < partes.length - 1; i++) {
    if (partes[i] && partes[i + 1] && textoHebraicoVocalizado(partes[i + 1])) {
      partes[i] = vocalizarPrefixoMorphHb(partes[i])
    }
  }
  return partes.join('').normalize('NFC')
}

const CANTILACAO_MIN = 0x0591
const CANTILACAO_MAX = 0x05af

function ehCantilacao(ch) {
  const cp = ch.codePointAt(0)
  return cp >= CANTILACAO_MIN && cp <= CANTILACAO_MAX
}

function transliterarHebraicoVocalizado(palavra) {
  const w = formatarTextoMorphHb(palavra)
  if (!w) return ''
  const mapConsoantes = {
    א: "'",
    ב: 'b',
    ג: 'g',
    ד: 'd',
    ה: 'h',
    ו: 'v',
    ז: 'z',
    ח: 'ch',
    ט: 't',
    י: 'y',
    כ: 'k',
    ך: 'k',
    ל: 'l',
    מ: 'm',
    ם: 'm',
    נ: 'n',
    ן: 'n',
    ס: 's',
    ע: "'",
    פ: 'p',
    ף: 'p',
    צ: 'ts',
    ץ: 'ts',
    ק: 'q',
    ר: 'r',
    ש: 'sh',
    ת: 't',
  }
  const mapVogais = {
    '\u05B0': 'e',
    '\u05B1': 'e',
    '\u05B2': 'a',
    '\u05B3': 'o',
    '\u05B4': 'i',
    '\u05B5': 'e',
    '\u05B6': 'e',
    '\u05B7': 'a',
    '\u05B8': 'a',
    '\u05B9': 'o',
    '\u05BB': 'u',
    '\u05BC': '',
    '\u05C1': '',
    '\u05C2': '',
  }
  let out = ''
  for (const ch of w.normalize('NFD')) {
    if (ehCantilacao(ch)) continue
    out += mapConsoantes[ch] ?? mapVogais[ch] ?? ''
  }
  return out.replace(/vv/g, 'v').replace(/shh/g, 'sh').replace(/''+/g, "'").trim()
}

function guiaLeituraToken(tokenTranslit) {
  return String(tokenTranslit || '')
    .trim()
    .toLowerCase()
    .replace(/^[\u2018\u2019\u05F3'`"]+|[\u2018\u2019\u05F3'`"]+$/g, '')
    .replace(/[ʻʼ''`´]/g, '')
    .replace(/[ēėê]/g, 'e')
    .replace(/[ōô]/g, 'o')
    .replace(/[āăâ]/g, 'a')
    .replace(/[īíî]/g, 'i')
    .replace(/[ūúû]/g, 'u')
}

function transliteracaoTemVogalLatinas(s) {
  return /[aeiou]/i.test(guiaLeituraToken(s))
}

function transliterarPrefixosMorphHb(partesPrefixo) {
  let out = ''
  for (const px of partesPrefixo) {
    const p = String(px || '').trim()
    if (!p) continue
    if (p === 'ו') { out += 've'; continue }
    if (p === 'ב') { out += 'be'; continue }
    if (p === 'כ') { out += 'ke'; continue }
    if (p === 'ל') { out += 'le'; continue }
    if (p === 'ה') { out += 'ha'; continue }
    if (p === 'מ') { out += 'me'; continue }
    out += transliterarHebraicoVocalizado(vocalizarPrefixoMorphHb(p)) || p
  }
  return out
}

function montarTranslitFallbackLema(raw, xlit) {
  const raiz = guiaLeituraToken(xlit)
  if (!raiz || !transliteracaoTemVogalLatinas(raiz)) return ''
  if (!raw.includes('/')) return raiz
  const prefixLat = transliterarPrefixosMorphHb(raw.split('/').slice(0, -1))
  return prefixLat ? `${prefixLat}${raiz}` : raiz
}

function transliterarUltimoSegmentoMorphHb(segmento) {
  const map = { ו: 'o', ה: 'a', הו: 'hu', הם: 'hem', הן: 'hen', ך: 'kha', כם: 'khem', כן: 'khen', נו: 'nu', ם: 'm', ן: 'n', י: 'i' }
  const s = String(segmento || '').trim()
  return map[s] ?? transliterarHebraicoVocalizado(s)
}

function montarTranslitApenasMorphHb(raw) {
  if (!raw.includes('/')) return ''
  const parts = raw.split('/').map((p) => p.trim()).filter(Boolean)
  if (!parts.length) return ''
  if (parts.length === 1) {
    const t = guiaLeituraToken(transliterarHebraicoVocalizado(parts[0]))
    return transliteracaoTemVogalLatinas(t) ? t : ''
  }
  const prefixLat = transliterarPrefixosMorphHb(parts.slice(0, -1))
  const suffixLat = guiaLeituraToken(transliterarUltimoSegmentoMorphHb(parts[parts.length - 1]))
  const out = `${prefixLat}${suffixLat}`
  return transliteracaoTemVogalLatinas(out) ? out : ''
}

function montarTranslitFormaIsolada(raw) {
  const map = { ה: 'ha', לך: 'lekha', כה: 'kha', בה: 'ba', ממך: 'memekha' }
  const key = formatarTextoMorphHb(raw)
  const v = map[key]
  return v && transliteracaoTemVogalLatinas(v) ? v : ''
}

function montarTranslitTokenHebraico(texto, opts = {}) {
  const lemmaUnicode = String(opts.lemmaUnicode || '').trim()
  const xlit = String(opts.lemmaTranslit || '').trim()
  const pron = String(opts.lemmaPron || '').trim()
  const raw = String(texto || '').trim()
  const heConsonantal = formatarTextoMorphHb(raw)
  if (!heConsonantal) return { translit: '', mesmaFormaQueLema: false }
  const mesmaForma = !!lemmaUnicode && formasLexicaisEquivalentes(heConsonantal, lemmaUnicode)
  const he = formatarTextoMorphHbVocalizado(raw, lemmaUnicode)
  const daForma = transliterarHebraicoVocalizado(he)
  const daFormaComVogais = daForma && transliteracaoTemVogalLatinas(daForma)
  if (daFormaComVogais) {
    return { translit: guiaLeituraToken(daForma), mesmaFormaQueLema: mesmaForma }
  }
  if (mesmaForma && xlit) {
    return { translit: guiaLeituraToken(xlit), mesmaFormaQueLema: true }
  }
  const fallbackLema = xlit ? montarTranslitFallbackLema(raw, xlit) : ''
  if (fallbackLema) return { translit: fallbackLema, mesmaFormaQueLema: false }
  const morphOnly = montarTranslitApenasMorphHb(raw)
  if (morphOnly) return { translit: morphOnly, mesmaFormaQueLema: false }
  const isolada = montarTranslitFormaIsolada(raw)
  if (isolada) return { translit: isolada, mesmaFormaQueLema: false }
  if (daForma) return { translit: guiaLeituraToken(daForma), mesmaFormaQueLema: mesmaForma }
  return { translit: '', mesmaFormaQueLema: false }
}

const SQL = await initSqlJs({
  locateFile: (file) => join(root, 'public', 'sql.js', file),
})
const db = new SQL.Database(readFileSync(join(root, 'public', 'ot_strong.sqlite')))

function q(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

const VOWEL = /[aeiou]/i
const arg1 = process.argv[2] || '1'
const arg2 = process.argv[3] || '1'
const fullOt = arg1 === 'ot'
const fullBook = arg2 === 'book'
const bookId = fullOt ? 1 : Number(arg1) || 1
const chapterNum = fullBook || fullOt ? 1 : Number(arg2) || 1

let tokens
if (fullOt) {
  tokens = q(
    `SELECT verse, token_idx, text, strong_code, chapter, book_id FROM ot_tokens ORDER BY book_id, chapter, verse, token_idx`
  )
} else if (fullBook) {
  tokens = q(
    `SELECT verse, token_idx, text, strong_code, chapter FROM ot_tokens WHERE book_id = ? ORDER BY chapter, verse, token_idx`,
    [bookId]
  )
} else {
  tokens = q(
    `SELECT verse, token_idx, text, strong_code, chapter FROM ot_tokens
     WHERE book_id = ? AND chapter = ? ORDER BY verse, token_idx`,
    [bookId, chapterNum]
  )
}

const codes = [...new Set(tokens.map((t) => t.strong_code).filter(Boolean))]
const hwRows = q(
  `SELECT strong_code, headword, xlit FROM strong_hebrew WHERE strong_code IN (${codes.map(() => '?').join(',')})`,
  codes
)
const hwMap = Object.fromEntries(hwRows.map((r) => [r.strong_code, r]))

const byVerse = new Map()
const problemas = []
let total = 0
let comVogal = 0

for (const t of tokens) {
  total++
  const code = String(t.strong_code || '').trim()
  const lex = hwMap[code] || {}
  const raw = String(t.text || '')
  const { translit, mesmaFormaQueLema } = montarTranslitTokenHebraico(raw, {
    lemmaUnicode: lex.headword,
    lemmaTranslit: lex.xlit,
  })
  const temVogal = VOWEL.test(translit)
  if (temVogal) comVogal++
  else {
    problemas.push({ verse: t.verse, code, raw, translit, xlit: lex.xlit, mesmaFormaQueLema })
  }
  const v = Number(t.verse)
  if (!byVerse.has(v)) byVerse.set(v, { ok: 0, n: 0 })
  const b = byVerse.get(v)
  b.n++
  if (temVogal) b.ok++
}

const lines = [
  fullOt
    ? `AT inteiro: ${comVogal}/${total} com vogal (${((100 * comVogal) / total).toFixed(1)}%)`
    : fullBook
      ? `Livro ${bookId} (todo): ${comVogal}/${total} com vogal (${((100 * comVogal) / total).toFixed(1)}%)`
      : `Livro ${bookId} cap ${chapterNum}: ${comVogal}/${total} com vogal (${((100 * comVogal) / total).toFixed(1)}%)`,
  '',
]
if (!fullBook && !fullOt) {
  for (const [v, { ok, n }] of [...byVerse.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push(`  v${v}: ${ok}/${n}`)
  }
  lines.push('')
}
lines.push(`Sem vogal (${problemas.length}):`)
for (const p of problemas.slice(0, fullOt ? 15 : 50)) {
  lines.push(
    `  v${p.verse} ${p.code} translit=${p.translit || '(vazio)'} xlit=${p.xlit || '-'} mesmaForma=${p.mesmaFormaQueLema} raw=${JSON.stringify(p.raw)}`
  )
}
if (problemas.length > (fullOt ? 15 : 50)) {
  lines.push(`  ... +${problemas.length - (fullOt ? 15 : 50)} mais`)
}

const out = join(root, 'scripts', '_gn1_translit_audit.txt')
writeFileSync(out, lines.join('\n'), 'utf8')
console.log(lines.join('\n'))
