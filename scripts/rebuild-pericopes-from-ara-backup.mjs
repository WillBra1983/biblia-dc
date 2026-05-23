/**
 * Repõe TODAS as linhas da tabela `pericopes` em `public/ara.sqlite`
 * a partir de `public/pericopes_ara.backup.json` (fonte ARA original da app).
 *
 * Uso: node scripts/rebuild-pericopes-from-ara-backup.mjs
 */
import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const wasmPath = join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
const wasmBinary = readFileSync(wasmPath)

const SQL = await initSqlJs({ wasmBinary })

const backupPath = join(root, 'public', 'pericopes_ara.backup.json')
const dbPath = join(root, 'public', 'ara.sqlite')

const data = JSON.parse(readFileSync(backupPath, 'utf8'))
const bookCodes = Object.keys(data)

if (bookCodes.length !== 66) {
  console.error('Esperados 66 livros no JSON, encontrado:', bookCodes.length)
  process.exit(1)
}

const db = new SQL.Database(readFileSync(dbPath))

db.run('DELETE FROM pericopes')

const ins = db.prepare(
  'INSERT INTO pericopes (livro_id, capitulo, versiculo, titulo, referencias) VALUES (?, ?, ?, ?, ?)'
)

let inserted = 0
for (let i = 0; i < bookCodes.length; i++) {
  const livroId = i + 1
  const chapters = data[bookCodes[i]]
  for (const capKey of Object.keys(chapters)) {
    const capitulo = parseInt(capKey, 10)
    if (!Number.isFinite(capitulo)) continue
    const rows = chapters[capKey]
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      const versiculo = parseInt(String(row.versiculo ?? ''), 10)
      const titulo = String(row.pericope ?? '').trim()
      const referencias = row.referencias != null ? String(row.referencias).trim() : ''
      if (!titulo || !Number.isFinite(versiculo)) continue
      ins.run([livroId, capitulo, versiculo, titulo, referencias || null])
      inserted++
    }
  }
}

ins.free()

const exported = db.export()
writeFileSync(dbPath, Buffer.from(exported))
db.close()

console.log('OK: pericopes repostas no ara.sqlite a partir de pericopes_ara.backup.json')
console.log('    Registos inseridos:', inserted)
