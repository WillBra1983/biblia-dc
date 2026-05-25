/**
 * Sincroniza o ícone da Bíblia (public/icons/icon.png) para iOS e Android.
 * iOS App Store: PNG 1024×1024 **sem alpha** (obrigatório desde Xcode 15+).
 *
 * Uso: npm run icons:native
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const src = path.join(root, 'public', 'icons', 'icon.png')

if (!fs.existsSync(src)) {
  console.error('[icons:native] Falta public/icons/icon.png (1024×1024)')
  process.exit(1)
}

/** Fundo preto da capa — remove canal alpha exigido pela Apple */
const IOS_BG = { r: 0, g: 0, b: 0 }

const iosIcon = path.join(
  root,
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
)
fs.mkdirSync(path.dirname(iosIcon), { recursive: true })

await sharp(src)
  .resize(1024, 1024)
  .flatten({ background: IOS_BG })
  .png({ compressionLevel: 9, force: true })
  .toFile(iosIcon)

const meta = await sharp(iosIcon).metadata()
console.log(
  `[icons:native] iOS AppIcon: ${path.relative(root, iosIcon)} (${meta.width}×${meta.height}, channels=${meta.channels}, hasAlpha=${meta.hasAlpha})`
)
if (meta.hasAlpha) {
  console.error('[icons:native] ERRO: ícone iOS ainda tem alpha')
  process.exit(1)
}

const androidSizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
}
const resBase = path.join(root, 'android/app/src/main/res')

for (const [density, size] of Object.entries(androidSizes)) {
  const dir = path.join(resBase, `mipmap-${density}`)
  fs.mkdirSync(dir, { recursive: true })
  const webp = await sharp(src).resize(size, size).webp({ quality: 90 }).toBuffer()
  fs.writeFileSync(path.join(dir, 'ic_launcher.webp'), webp)
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.webp'), webp)
  const fgSize = Math.round(size * 2.25)
  const fg = await sharp(src)
    .resize(fgSize, fgSize, { fit: 'contain', background: { r: 0, g: 77, b: 64, alpha: 1 } })
    .png()
    .toBuffer()
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fg)
  const bg = await sharp({
    create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 77, b: 64, alpha: 1 } },
  })
    .png()
    .toBuffer()
  fs.writeFileSync(path.join(dir, 'ic_launcher_background.png'), bg)
  console.log('[icons:native] Android', density, size)
}

console.log('[icons:native] Concluído. Incremente CURRENT_PROJECT_VERSION no Xcode e rode o workflow iOS.')
