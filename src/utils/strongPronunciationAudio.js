/**
 * Reproduz pronúncia do verbete Strong.
 *
 * 1) MP3 local (grego monotônico / guia fonética — ver generate_strong_pron_mp3.py).
 * 2) TTS com texto preparado (nunca polítono letra a letra).
 */

import { isNativeApp } from './isNativeApp'
import { biblicalAudioEnabled } from '../config/biblicalAudio'
import { prepararFalaLemmaStrong, prepararFalaTokenPassagem } from './strongPronunciationSpeak'

let audioAtual = null

function cancelarAudioAnterior() {
  try {
    if (audioAtual) {
      audioAtual.pause()
      audioAtual.currentTime = 0
      audioAtual = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    if (isNativeApp()) {
      void import('@capacitor-community/text-to-speech')
        .then(({ TextToSpeech }) => TextToSpeech.stop())
        .catch(() => {})
    }
  } catch {
    /* ignore */
  }
}

function listarVozes() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  return window.speechSynthesis.getVoices() || []
}

function escolherVozIdioma(prefixo) {
  const p = String(prefixo || '').toLowerCase()
  const voices = listarVozes()
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith(p) && v.localService) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(p)) ||
    null
  )
}

function aguardarVozes(timeoutMs = 2000) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([])
      return
    }
    const existentes = listarVozes()
    if (existentes.length) {
      resolve(existentes)
      return
    }
    let feito = false
    const onVoices = () => {
      if (feito) return
      feito = true
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
      resolve(listarVozes())
    }
    window.speechSynthesis.addEventListener('voiceschanged', onVoices)
    window.setTimeout(() => {
      if (!feito) onVoices()
    }, timeoutMs)
  })
}

function urlMp3Local(strongCode) {
  const code = String(strongCode || '').trim().toUpperCase()
  if (!/^[HG]\d+$/.test(code)) return null
  const base = import.meta.env.BASE_URL || '/'
  return `${base}sounds/strong-pron/${code}.mp3`.replace(/\/{2,}/g, '/')
}

async function mp3Disponivel(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'force-cache' })
    if (r.ok) return true
  } catch {
    /* ignore */
  }
  try {
    const r = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-3' } })
    return r.ok || r.status === 206
  } catch {
    return false
  }
}

function reproduzirMp3(url) {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audioAtual = audio
    audio.preload = 'auto'
    let settled = false
    const finish = (ok) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      audio.removeEventListener('ended', onOk)
      audio.removeEventListener('error', onErr)
      if (ok) resolve('mp3')
      else reject(new Error('mp3-unavailable'))
    }
    const onOk = () => finish(true)
    const onErr = () => finish(false)
    audio.addEventListener('ended', onOk)
    audio.addEventListener('error', onErr)
    audio.src = url
    const timer = window.setTimeout(() => finish(false), 8000)
    audio.play().catch(onErr)
  })
}

function falarComVoz(texto, { voz, lang, rate = 0.88 }) {
  const synth = window.speechSynthesis
  return new Promise((resolve, reject) => {
    const raw = String(texto || '').trim()
    if (!raw) {
      reject(new Error('tts-empty'))
      return
    }

    synth.cancel()
    try {
      synth.resume()
    } catch {
      /* ignore */
    }

    const utter = new SpeechSynthesisUtterance(raw)
    utter.lang = lang
    utter.rate = rate
    utter.pitch = 1
    utter.volume = 1
    if (voz) utter.voice = voz

    let settled = false
    let ouviu = false
    const finish = (ok, err) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      if (ok) resolve('tts')
      else reject(err || new Error('tts-error'))
    }

    utter.onstart = () => {
      ouviu = true
    }
    utter.onend = () => finish(true)
    utter.onerror = (e) => finish(false, e?.error || new Error('tts-error'))

    const timer = window.setTimeout(() => {
      if (ouviu || synth.speaking) finish(true)
      else finish(false, new Error('tts-timeout'))
    }, 12000)

    synth.speak(utter)
    window.setTimeout(() => {
      try {
        if (synth.paused) synth.resume()
      } catch {
        /* ignore */
      }
    }, 50)
  })
}

async function falarTtsNativo(texto, lang, rate = 0.82) {
  const { TextToSpeech } = await import('@capacitor-community/text-to-speech')
  await TextToSpeech.stop()
  const raw = String(texto || '').trim()
  if (!raw) throw new Error('tts-native-empty')
  await TextToSpeech.speak({
    text: raw,
    lang: lang || 'en-US',
    rate,
    pitch: 1,
    volume: 1,
  })
  return 'tts-native'
}

async function reproduzirTtsNativo({ unicode, translit, pronuncia, ehGrego }) {
  const { texto, lang } = prepararFalaLemmaStrong({ pronuncia, translit, unicode, ehGrego })
  const rate = lang.startsWith('en') ? 0.78 : 0.86
  return falarTtsNativo(texto, lang, rate)
}

async function reproduzirTtsWeb({ unicode, translit, pronuncia, ehGrego }) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    throw new Error('tts-unsupported')
  }

  await aguardarVozes()
  await aguardarVozes(400)

  const { texto, lang } = prepararFalaLemmaStrong({ pronuncia, translit, unicode, ehGrego })
  const prefixo = lang.startsWith('pt') ? 'pt' : lang.startsWith('el') ? 'el' : 'en'
  const voz = escolherVozIdioma(prefixo) || escolherVozIdioma('pt') || escolherVozIdioma('en')

  return falarComVoz(texto, {
    voz,
    lang: voz?.lang || lang,
    rate: lang.startsWith('en') ? 0.78 : 0.86,
  })
}


async function reproduzirTtsNativoFormaExata({ unicode, translit, pronuncia, ehGrego }) {
  const { texto, lang } = prepararFalaTokenPassagem({ unicode, translit, pronuncia, ehGrego })
  const rate = lang.startsWith('en') ? 0.78 : 0.86
  return falarTtsNativo(texto, lang, rate)
}

async function reproduzirTtsWebFormaExata({ unicode, translit, pronuncia, ehGrego }) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    throw new Error('tts-unsupported')
  }

  await aguardarVozes()
  await aguardarVozes(400)

  const { texto, lang } = prepararFalaTokenPassagem({ unicode, translit, pronuncia, ehGrego })
  const prefixo = lang.startsWith('pt') ? 'pt' : lang.startsWith('el') ? 'el' : 'en'
  const voz = escolherVozIdioma(prefixo) || escolherVozIdioma('pt') || escolherVozIdioma('en')

  return falarComVoz(texto, {
    voz,
    lang: voz?.lang || lang,
    rate: lang.startsWith('en') ? 0.78 : 0.86,
  })
}

/**
 * Pronúncia da forma exata do token na passagem (nunca MP3/guia do lema Strong).
 * @returns {Promise<'tts'|'tts-native'>}
 */
export async function reproduzirPronunciaFormaToken({ unicode, translit, pronuncia, ehGrego }) {
  cancelarAudioAnterior()

  if (isNativeApp()) {
    try {
      return await reproduzirTtsNativoFormaExata({ unicode, translit, pronuncia, ehGrego })
    } catch {
      /* tenta Web TTS */
    }
  }

  return reproduzirTtsWebFormaExata({ unicode, translit, pronuncia, ehGrego })
}

/**
 * @returns {Promise<'mp3'|'tts'|'tts-native'>}
 */
export async function reproduzirPronunciaStrong({
  strongCode,
  unicode,
  translit,
  pronuncia,
  ehGrego,
}) {
  cancelarAudioAnterior()

  if (biblicalAudioEnabled) {
    const mp3Url = urlMp3Local(strongCode)
    if (mp3Url && (await mp3Disponivel(mp3Url))) {
      try {
        return await reproduzirMp3(mp3Url)
      } catch {
        /* tenta TTS */
      }
    }
  }

  if (isNativeApp()) {
    try {
      return await reproduzirTtsNativo({ unicode, translit, pronuncia, ehGrego })
    } catch {
      /* tenta Web TTS no WebView */
    }
  }

  return reproduzirTtsWeb({ unicode, translit, pronuncia, ehGrego })
}

export function pararPronunciaStrong() {
  cancelarAudioAnterior()
}

export function pronunciaDisponivel() {
  return (
    typeof window !== 'undefined' &&
    (!!window.speechSynthesis || typeof Audio !== 'undefined' || isNativeApp())
  )
}

/** Indica se há voz he-IL/el-GR instalada (útil para tooltip). */
export function temVozOriginalInstalada(ehGrego) {
  if (isNativeApp()) return true
  if (typeof window === 'undefined' || !window.speechSynthesis) return false
  return !!escolherVozIdioma(ehGrego ? 'el' : 'he')
}
