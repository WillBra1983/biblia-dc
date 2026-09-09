import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const input = path.resolve(process.argv[2] || '')
const output = path.join(ROOT, 'src', 'data', 'greekAudioTimings.json')

if (!process.argv[2] || !fs.existsSync(input)) {
  throw new Error('Informe o caminho do arquivo koine.aix.')
}

const lines = fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)
const version = lines.find((line) => line.startsWith('AIX_Version='))?.split('=')[1]
const books = Number(lines.find((line) => line.startsWith('AIX_Books='))?.split('=')[1])
const files = Number(lines.find((line) => line.startsWith('AIX_Files='))?.split('=')[1])
const indexStart = lines.findIndex((line) => line.trim() === 'AIX_IndexList')

if (version !== '4' || books !== 27 || files !== 260 || indexStart < 0) {
  throw new Error('Este arquivo não é o índice Davar4 completo do NT grego.')
}

// O conjunto original de Theo Karvounakis usado pelo Davar tem MP3 CBR de
// 48 kbps: 48.000 bits/s ÷ 8 = 6.000 bytes/s. Os offsets do AIX são bytes.
const BYTES_PER_SECOND = 6000
const rows = []
for (const raw of lines.slice(indexStart + 1)) {
  const line = raw.trim()
  if (!line || line.startsWith(';')) continue
  const match = line.match(/^(\d+):(\d+):(\d+),(\d+),(\d+)(?:,(\d+))?$/)
  if (!match) throw new Error(`Linha de índice inválida: ${line}`)
  const [, book, chapter, verse, file, start, explicitEnd] = match.map(Number)
  rows.push({ book, chapter, verse, file, start, explicitEnd })
}

const seen = new Set()
const result = {
  _meta: {
    source: 'Davar4 koine.aix',
    reader: 'Theo Karvounakis',
    text: 'Textus Receptus (Scrivener 1894)',
    sourceBitrateKbps: 48,
    references: rows.length,
  },
}

for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index]
  const key = `${row.book}:${row.chapter}:${row.verse}`
  if (seen.has(key)) throw new Error(`Referência duplicada: ${key}`)
  seen.add(key)
  if (row.book < 1 || row.book > 27 || row.file < 1 || row.file > 260) {
    throw new Error(`Livro ou arquivo fora da faixa em ${key}`)
  }

  const next = rows[index + 1]
  const endOffset = row.explicitEnd || (next?.file === row.file ? next.start : null)
  if (endOffset != null && endOffset <= row.start) {
    throw new Error(`Offsets fora de ordem em ${key}`)
  }

  // Davar numera o NT de 1 a 27; o aplicativo usa os IDs bíblicos 40 a 66.
  const appBook = String(row.book + 39)
  const chapter = String(row.chapter)
  const verse = String(row.verse)
  const range = [Number((row.start / BYTES_PER_SECOND).toFixed(3))]
  if (endOffset != null) range.push(Number((endOffset / BYTES_PER_SECOND).toFixed(3)))
  result[appBook] ||= {}
  result[appBook][chapter] ||= {}
  result[appBook][chapter][verse] = range
}

const chapterCount = Object.entries(result)
  .filter(([book]) => book !== '_meta')
  .reduce((total, [, chapters]) => total + Object.keys(chapters).length, 0)

if (rows.length !== 7957 || chapterCount !== 260) {
  throw new Error(`Índice incompleto: ${rows.length} referências em ${chapterCount} capítulos.`)
}

fs.writeFileSync(output, `${JSON.stringify(result)}\n`, 'utf8')
console.log(`Importadas ${rows.length} referências de ${chapterCount} capítulos para ${output}`)
