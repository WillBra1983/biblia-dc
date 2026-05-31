/**
 * Gera splash nativo (Android/iOS) a partir de public/splash-b.png — mesma arte do site.
 * Uso: npm run splash:native
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'public', 'splash-b.png')

if (!fs.existsSync(src)) {
  console.error('[splash:native] Falta public/splash-b.png')
  process.exit(1)
}

const BG = { r: 255, g: 255, b: 255, alpha: 1 }

/** Tamanhos Capacitor / Android portrait + landscape xxxhdpi */
const androidSplashes = {
  'drawable-port-mdpi': { w: 320, h: 480 },
  'drawable-port-hdpi': { w: 480, h: 800 },
  'drawable-port-xhdpi': { w: 720, h: 1280 },
  'drawable-port-xxhdpi': { w: 960, h: 1600 },
  'drawable-port-xxxhdpi': { w: 1280, h: 1920 },
  'drawable-land-xxxhdpi': { w: 1920, h: 1280 },
}

const resBase = path.join(root, 'android/app/src/main/res')

async function gerarSplash(w, h, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  await sharp(src)
    .resize(w, h, { fit: 'contain', background: BG })
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .toFile(dest)
}

for (const [folder, { w, h }] of Object.entries(androidSplashes)) {
  const dest = path.join(resBase, folder, 'splash.png')
  await gerarSplash(w, h, dest)
  console.log('[splash:native] Android', folder, `${w}×${h}`)
}

const iosSplashDir = path.join(root, 'ios/App/App/Assets.xcassets/Splash.imageset')
const iosTargets = [
  'Default@1x~universal~anyany.png',
  'Default@2x~universal~anyany.png',
  'Default@3x~universal~anyany.png',
]
const iosSizes = [1284, 1920, 2732]

if (fs.existsSync(iosSplashDir)) {
  fs.mkdirSync(iosSplashDir, { recursive: true })
  for (let i = 0; i < iosTargets.length; i++) {
    const side = iosSizes[i]
    const dest = path.join(iosSplashDir, iosTargets[i])
    await gerarSplash(side, side, dest)
    console.log('[splash:native] iOS', iosTargets[i], `${side}×${side}`)
  }
}

console.log('[splash:native] Concluído — arte alinhada ao splash-b do site.')
