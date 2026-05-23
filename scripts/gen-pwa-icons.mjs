/**
 * Gera ícones PWA placeholder (cor sólida #004d40) **só quando os ficheiros ainda não existem**.
 *
 * Antes este script corria em todo `npm run build` (hook `prebuild`) e apagava ícones personalizados
 * (capa da Bíblia, etc.) substituindo-os por quadrados verdes.
 *
 * Uso:
 *   node scripts/gen-pwa-icons.mjs           → cria só o que faltar
 *   node scripts/gen-pwa-icons.mjs --force   → sobrescreve icon-192.png e icon-512.png
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PNG } from 'pngjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const force =
  process.argv.includes('--force') || String(process.env.FORCE_PWA_ICONS || '').trim() === '1'

/** #004d40 — só para placeholder quando não há ícone */
const GREEN = { r: 0, g: 77, b: 64, a: 255 }

function solidPng(size) {
  const png = new PNG({ width: size, height: size })
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2
      png.data[idx] = GREEN.r
      png.data[idx + 1] = GREEN.g
      png.data[idx + 2] = GREEN.b
      png.data[idx + 3] = GREEN.a
    }
  }
  return PNG.sync.write(png)
}

const outDir = path.join(root, 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })
for (const size of [192, 512]) {
  const p = path.join(outDir, `icon-${size}.png`)
  if (!force && fs.existsSync(p)) {
    console.log(`[gen-pwa-icons] Mantendo ícone existente: ${path.relative(root, p)}`)
    continue
  }
  fs.writeFileSync(p, solidPng(size))
  console.log(`[gen-pwa-icons] Escrito placeholder: ${path.relative(root, p)} (${force ? '--force' : 'novo'})`)
}
