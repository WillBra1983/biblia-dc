#!/usr/bin/env node
/**
 * Gera versões pré-comprimidas (.gz e .br) dos arquivos .sqlite em `public/`.
 *
 * Servidores como nginx (`gzip_static on; brotli_static on;`) servem o
 * ficheiro pré-comprimido quando existir, evitando o custo de comprimir em runtime.
 * Para um SQLite tipicamente esparso, gzip 9 reduz ~60% e brotli 11 ~70%.
 *
 * Uso:
 *   npm run sqlite:precompress
 *   ou: node scripts/sqlite-precompress.mjs
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import { promisify } from 'node:util'

const gzip = promisify(zlib.gzip)
const brotli = promisify(zlib.brotliCompress)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.join(ROOT, 'public')

const ALVOS = [
  'ara.sqlite',
  'nt_prova.sqlite',
  'ot_strong.sqlite',
  'hinario.db',
  'hinario_cifrado.db',
  'stepbible_lexicon.sqlite'
]

function fmtMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function comprimir(arquivo) {
  const caminho = path.join(PUBLIC_DIR, arquivo)
  let stat
  try {
    stat = await fs.stat(caminho)
  } catch {
    console.log(`[skip] ${arquivo} (não encontrado)`)
    return
  }
  if (!stat.isFile()) return

  const bruto = await fs.readFile(caminho)

  const gz = await gzip(bruto, { level: 9 })
  await fs.writeFile(`${caminho}.gz`, gz)

  const br = await brotli(bruto, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: bruto.length
    }
  })
  await fs.writeFile(`${caminho}.br`, br)

  const ratioGz = (1 - gz.length / bruto.length) * 100
  const ratioBr = (1 - br.length / bruto.length) * 100
  console.log(
    `[ok]   ${arquivo}: ${fmtMB(bruto.length)} → ` +
      `gz ${fmtMB(gz.length)} (-${ratioGz.toFixed(1)}%) · br ${fmtMB(br.length)} (-${ratioBr.toFixed(1)}%)`
  )
}

async function main() {
  for (const alvo of ALVOS) {
    try {
      await comprimir(alvo)
    } catch (e) {
      console.error(`[erro] ${alvo}: ${e?.message || e}`)
    }
  }
}

main()
