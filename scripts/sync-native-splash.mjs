/**
 * Uma única arte de splash para web + Android + iOS.
 * Fonte: assets/SplashB.png (preferida) ou public/splash-b.png.
 * Uso: npm run splash:native
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const candidatos = [
  path.join(root, 'assets', 'SplashB.png'),
  path.join(root, 'public', 'splash-b.png'),
]

const src = candidatos.find((p) => fs.existsSync(p))
if (!src) {
  console.error('[splash:native] Falta assets/SplashB.png ou public/splash-b.png')
  process.exit(1)
}

const BG = { r: 255, g: 255, b: 255, alpha: 1 }
const publicPng = path.join(root, 'public', 'splash-b.png')
const publicWebp = path.join(root, 'public', 'splash-b.webp')

/** Web/PWA: quadrado até 1080px (leve o suficiente para o bundle). */
const WEB_SIDE = 1080

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

async function gerarContido(w, h, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  await sharp(src)
    .resize(w, h, { fit: 'contain', background: BG })
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .toFile(dest)
}

async function gerarWeb() {
  const pipeline = sharp(src)
    .resize(WEB_SIDE, WEB_SIDE, { fit: 'contain', background: BG })
    .flatten({ background: BG })

  await pipeline.clone().png({ compressionLevel: 9 }).toFile(publicPng)
  await pipeline.clone().webp({ quality: 88 }).toFile(publicWebp)
  console.log('[splash:native] Web public/splash-b.png + splash-b.webp', `${WEB_SIDE}×${WEB_SIDE}`)
}

console.log('[splash:native] Fonte:', path.relative(root, src))
await gerarWeb()

for (const [folder, { w, h }] of Object.entries(androidSplashes)) {
  const dest = path.join(resBase, folder, 'splash.png')
  await gerarContido(w, h, dest)
  console.log('[splash:native] Android', folder, `${w}×${h}`)
}

/** Fallback quando nenhum qualificador port/land bate (evita arte errada ou vazia). */
const fallbackSplash = path.join(resBase, 'drawable', 'splash.png')
await gerarContido(720, 1280, fallbackSplash)
console.log('[splash:native] Android drawable/splash.png fallback 720×1280')

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
    await gerarContido(side, side, dest)
    console.log('[splash:native] iOS', iosTargets[i], `${side}×${side}`)
  }
}

console.log('[splash:native] Concluído — mesma arte em web, Android e iOS.')
