#!/usr/bin/env node
/**
 * Copia o `sqlite.worker.js` do `sql.js-httpvfs` para `public/sql.js-httpvfs/`
 * — só assim o ficheiro é servido em runtime.
 *
 * `sql.js-httpvfs` usa o WASM padrão do `sql.js` que já está em
 * `public/sql.js/sql-wasm.wasm`, então só falta o worker.
 *
 * Use: `npm run setup:httpvfs`
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'node_modules', 'sql.js-httpvfs', 'dist', 'sqlite.worker.js')
const DEST_DIR = path.join(ROOT, 'public', 'sql.js-httpvfs')
const DEST = path.join(DEST_DIR, 'sqlite.worker.js')

async function main() {
  try {
    await fs.access(SRC)
  } catch {
    console.error(`[erro] ${SRC} não existe — execute "npm install" primeiro.`)
    process.exit(1)
  }
  await fs.mkdir(DEST_DIR, { recursive: true })
  await fs.copyFile(SRC, DEST)
  const stat = await fs.stat(DEST)
  console.log(`[ok]   ${path.relative(ROOT, DEST)} (${stat.size} bytes)`)
}

main().catch((e) => {
  console.error(`[erro] ${e?.message || e}`)
  process.exit(1)
})
