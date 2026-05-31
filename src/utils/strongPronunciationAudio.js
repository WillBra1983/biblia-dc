/**
 * Reproduz pronúncia do verbete Strong.
 *
 * 1) MP3 local em public/sounds/strong-pron/{H|G}####.mp3 (quando existir).
 * 2) TTS com voz he-IL / el-GR lendo o texto original.
 * 3) Fallback (PC Windows sem voz hebraica): guia fonética em en-US.
 */

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
    const timer = window.setTimeout(() => finish(false), 4000)
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
    }, 10000)

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

async function reproduzirTts({ unicode, translit, pronuncia, ehGrego }) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    throw new Error('tts-unsupported')
  }

  await aguardarVozes()
  // Chrome carrega vozes de forma preguiçosa — segunda leitura ajuda no desktop.
  await aguardarVozes(300)

  const prefixo = ehGrego ? 'el' : 'he'
  const vozNativa = escolherVozIdioma(prefixo)
  const unicodeTxt = String(unicode || '').trim()
  const guiaFonetica = String(pronuncia || translit || '').trim()

  if (vozNativa && unicodeTxt) {
    try {
      return await falarComVoz(unicodeTxt, {
        voz: vozNativa,
        lang: ehGrego ? 'el-GR' : 'he-IL',
      })
    } catch {
      /* tenta fallback */
    }
  }

  if (guiaFonetica) {
    const vozEn = escolherVozIdioma('en') || escolherVozIdioma('pt')
    return falarComVoz(guiaFonetica, {
      voz: vozEn,
      lang: vozEn?.lang || 'en-US',
      rate: 0.82,
    })
  }

  if (unicodeTxt) {
    return falarComVoz(unicodeTxt, {
      voz: vozNativa,
      lang: ehGrego ? 'el-GR' : 'he-IL',
    })
  }

  throw new Error('tts-empty')
}

/**
 * @returns {Promise<'mp3'|'tts'>}
 */
export async function reproduzirPronunciaStrong({
  strongCode,
  unicode,
  translit,
  pronuncia,
  ehGrego,
}) {
  cancelarAudioAnterior()

  const mp3Url = urlMp3Local(strongCode)
  if (mp3Url) {
    try {
      return await reproduzirMp3(mp3Url)
    } catch {
      /* tenta TTS */
    }
  }

  return reproduzirTts({ unicode, translit, pronuncia, ehGrego })
}

export function pararPronunciaStrong() {
  cancelarAudioAnterior()
}

export function pronunciaDisponivel() {
  return (
    typeof window !== 'undefined' &&
    (!!window.speechSynthesis || typeof Audio !== 'undefined')
  )
}

/** Indica se há voz he-IL/el-GR instalada (útil para tooltip). */
export function temVozOriginalInstalada(ehGrego) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false
  return !!escolherVozIdioma(ehGrego ? 'el' : 'he')
}
