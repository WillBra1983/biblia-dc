/** Sons curtos para quiz — tenta MP3 em `public/sounds/` (Vite), senão Web Audio. */

const STORAGE_SOM_OFF = 'som_feedback_desligado'

export function somFeedbackEstaDesligado() {
  try {
    return localStorage.getItem(STORAGE_SOM_OFF) === '1'
  } catch {
    return false
  }
}

export function definirSomFeedbackDesligado(desligado) {
  try {
    if (desligado) localStorage.setItem(STORAGE_SOM_OFF, '1')
    else localStorage.removeItem(STORAGE_SOM_OFF)
  } catch {
    /* ignore */
  }
}

let audioAcerto = null
let audioErro = null

function basePublicUrl() {
  const b = import.meta.env.BASE_URL || '/'
  return b.endsWith('/') ? b : `${b}/`
}

function mp3Acerto() {
  if (!audioAcerto) {
    audioAcerto = new Audio(`${basePublicUrl()}sounds/quiz-acerto.mp3`)
    audioAcerto.preload = 'auto'
  }
  return audioAcerto
}

function mp3Erro() {
  if (!audioErro) {
    audioErro = new Audio(`${basePublicUrl()}sounds/quiz-erro.mp3`)
    audioErro.preload = 'auto'
  }
  return audioErro
}

let ctxCache = null

function audioCtx() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctxCache) ctxCache = new AC()
  if (ctxCache.state === 'suspended') {
    void ctxCache.resume()
  }
  return ctxCache
}

function beep(freq, durMs, vol = 0.08, type = 'sine') {
  if (somFeedbackEstaDesligado()) return
  const ctx = audioCtx()
  if (!ctx) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.value = vol
  o.connect(g)
  g.connect(ctx.destination)
  const t = ctx.currentTime
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + durMs / 1000)
  o.start(t)
  o.stop(t + durMs / 1000 + 0.02)
}

export function playQuizAcertoBeep() {
  beep(523.25, 70, 0.07, 'sine')
  window.setTimeout(() => beep(659.25, 85, 0.075, 'sine'), 75)
}

export function playQuizErroBeep() {
  beep(180, 140, 0.09, 'triangle')
  window.setTimeout(() => beep(140, 120, 0.07, 'triangle'), 95)
}

/** Acerto: MP3 se existir; senão tons sintéticos leves. */
export function playQuizAcerto() {
  if (somFeedbackEstaDesligado()) return
  const a = mp3Acerto()
  a.currentTime = 0
  const p = a.play()
  if (p !== undefined) {
    p.catch(() => playQuizAcertoBeep())
  }
}

/** Erro: MP3 se existir; senão tom curto sem agressividade. */
export function playQuizErro() {
  if (somFeedbackEstaDesligado()) return
  const a = mp3Erro()
  a.currentTime = 0
  const p = a.play()
  if (p !== undefined) {
    p.catch(() => playQuizErroBeep())
  }
}
