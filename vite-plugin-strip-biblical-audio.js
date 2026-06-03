import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname)

/** Pastas em `public/` omitidas do build quando áudio bíblico está desligado. */
const PUBLIC_AUDIO_DIRS = [
  ['public', 'sounds', 'strong-pron'],
  ['public', 'data', 'ot-hebrew-audio'],
]

function biblicalAudioBuildEnabled() {
  return String(process.env.VITE_BIBLICAL_AUDIO || '').toLowerCase() === 'true'
}

function hiddenSibling(...parts) {
  const dir = path.join(root, ...parts)
  const parent = path.dirname(dir)
  const base = path.basename(dir)
  return path.join(parent, `_build_hidden_${base}`)
}

function rmDirIfExists(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

function stripStrongPronMp3(distRoot) {
  const dir = path.join(distRoot, 'sounds', 'strong-pron')
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    if (name.toLowerCase().endsWith('.mp3')) {
      fs.unlinkSync(path.join(dir, name))
    }
  }
}

function hidePublicAudioDirs() {
  for (const parts of PUBLIC_AUDIO_DIRS) {
    const src = path.join(root, ...parts)
    const hidden = hiddenSibling(...parts)
    if (fs.existsSync(src) && !fs.existsSync(hidden)) {
      fs.renameSync(src, hidden)
    }
  }
}

function restorePublicAudioDirs() {
  for (const parts of PUBLIC_AUDIO_DIRS) {
    const src = path.join(root, ...parts)
    const hidden = hiddenSibling(...parts)
    if (fs.existsSync(hidden) && !fs.existsSync(src)) {
      fs.renameSync(hidden, src)
    }
  }
}

/**
 * Quando VITE_BIBLICAL_AUDIO não está ativo:
 * - renomeia pastas pesadas em `public/` antes do Vite copiar para `dist/`;
 * - remove resíduos de áudio em `dist/` no fim do build.
 */
export function stripBiblicalAudioFromDist() {
  const enabled = biblicalAudioBuildEnabled()
  let publicHidden = false

  return {
    name: 'strip-biblical-audio-dist',
    apply: 'build',
    buildStart() {
      if (enabled) return
      hidePublicAudioDirs()
      publicHidden = true
    },
    buildEnd(err) {
      if (!publicHidden || enabled) return
      restorePublicAudioDirs()
      publicHidden = false
      if (err) return
    },
    closeBundle() {
      if (enabled) return
      const distRoot = path.join(root, 'dist')
      rmDirIfExists(path.join(distRoot, 'data', 'ot-hebrew-audio'))
      stripStrongPronMp3(distRoot)
      if (publicHidden) {
        restorePublicAudioDirs()
        publicHidden = false
      }
    },
  }
}
