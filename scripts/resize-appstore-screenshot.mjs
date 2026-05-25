/**
 * Redimensiona um print para 1284×2778 (iPhone 6,5" App Store).
 * Uso: node scripts/resize-appstore-screenshot.mjs entrada.png saida.png
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const W = 1284
const H = 2778

const [, , input, output] = process.argv
if (!input || !output) {
  console.error('Uso: node scripts/resize-appstore-screenshot.mjs <entrada.png> <saida.png>')
  process.exit(1)
}

const sharp = (await import('sharp')).default
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.isAbsolute(output) ? output : path.join(process.cwd(), output)
fs.mkdirSync(path.dirname(outPath), { recursive: true })

await sharp(input)
  .resize(W, H, { fit: 'contain', background: { r: 0, g: 77, b: 64, alpha: 1 } })
  .png()
  .toFile(outPath)

console.log(`[ok] ${outPath} (${W}×${H})`)
