import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import initSqlJs from 'sql.js'
import { localizarEstruturaSalmo } from '../src/data/salmosEstrutura.js'

const root = process.cwd()
const dbPath = path.join(root, 'public', 'ara.sqlite')
const outDir = path.join(root, 'functions', 'src', 'data')
const outPath = path.join(outDir, 'versiculos-dia.json.gz')

const SQL = await initSqlJs({
  locateFile: (file) => path.join(root, 'node_modules', 'sql.js', 'dist', file),
})
const db = new SQL.Database(fs.readFileSync(dbPath))
const result = db.exec(`
  SELECT b.id AS bookId, b.name AS bookName, v.chapter,
         ROW_NUMBER() OVER (PARTITION BY v.book_id, v.chapter ORDER BY v.id) AS verse,
         v.text
  FROM verse v
  JOIN book b ON b.id = v.book_id
  ORDER BY b.id, v.chapter, v.id
`)[0]
const pericopesResult = db.exec(`
  SELECT livro_id AS bookId, capitulo AS chapter, versiculo AS verse, titulo AS title
  FROM pericopes
  ORDER BY livro_id, capitulo, versiculo
`)[0]

if (!result?.values?.length) throw new Error('Nenhum versiculo encontrado em public/ara.sqlite')

const pericopesByChapter = new Map()
for (const [bookId, chapter, verse, title] of pericopesResult?.values || []) {
  const key = `${bookId}_${chapter}`
  if (!pericopesByChapter.has(key)) pericopesByChapter.set(key, [])
  pericopesByChapter.get(key).push({ start: Number(verse), title: String(title || '') })
}

const catalogBase = result.values.map(([bookId, bookName, chapter, verse, text]) => ({
  bookId: Number(bookId),
  bookName: String(bookName),
  chapter: Number(chapter),
  verse: Number(verse),
  text: String(text),
}))

const chapterTotals = new Map()
for (const item of catalogBase) {
  const key = `${item.bookId}_${item.chapter}`
  chapterTotals.set(key, Math.max(chapterTotals.get(key) || 0, item.verse))
}

const catalog = catalogBase.map((item) => {
  if (item.bookId === 19) {
    const estrutura = localizarEstruturaSalmo(item.chapter, item.verse)
    if (estrutura) {
      return {
        ...item,
        pericopeStart: estrutura.inicio,
        pericopeEnd: estrutura.fim,
        pericopeTitle: estrutura.titulo,
      }
    }
  }

  const key = `${item.bookId}_${item.chapter}`
  const starts = pericopesByChapter.get(key) || []
  let current = null
  let currentIndex = -1
  for (let index = 0; index < starts.length; index += 1) {
    if (starts[index].start > item.verse) break
    current = starts[index]
    currentIndex = index
  }
  if (!current) return item
  const next = starts[currentIndex + 1]
  return {
    ...item,
    pericopeStart: current.start,
    pericopeEnd: next ? next.start - 1 : chapterTotals.get(key),
    pericopeTitle: current.title,
  }
})

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outPath, zlib.gzipSync(JSON.stringify(catalog), { level: 9 }))
console.log(`Catalogo diario: ${catalog.length} versiculos -> ${path.relative(root, outPath)}`)
