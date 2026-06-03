/**
 * Áudio hebraico OT por versículo (WordProject / wordproaudio.net).
 * Piloto: índice em public/data/ot-hebrew-audio/
 * Só ativo com VITE_BIBLICAL_AUDIO=true (ver src/config/biblicalAudio.js).
 */

import { biblicalAudioEnabled } from '../config/biblicalAudio'

const AUDIO_LANG = 44
const AUDIO_BASE = `https://www.wordproaudio.net/bibles/app/audio/${AUDIO_LANG}`

let audioAtual = null
let stopTimer = null
let tickHandler = null
const cacheVersos = new Map()
const capitulosAudioDisponiveis = new Set()
let cacheCapitulosPromise = null

function carregarIndiceCapitulos() {
  if (cacheCapitulosPromise) return cacheCapitulosPromise
  const base = import.meta.env.BASE_URL || '/'
  const rev = import.meta.env.VITE_SQLITE_ASSET_REV
  const qs = rev ? `?v=${encodeURIComponent(rev)}` : ''
  const url = `${base}data/ot-hebrew-audio/chapters.json${qs}`.replace(/\/{2,}/g, '/')
  cacheCapitulosPromise = fetch(url, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((doc) => {
      capitulosAudioDisponiveis.clear()
      const caps = doc?.chapters || {}
      for (const key of Object.keys(caps)) {
        capitulosAudioDisponiveis.add(key)
      }
      return doc
    })
    .catch(() => null)
  return cacheCapitulosPromise
}

if (biblicalAudioEnabled) void carregarIndiceCapitulos()

function cancelar() {
  try {
    if (stopTimer) {
      window.clearTimeout(stopTimer)
      stopTimer = null
    }
    if (audioAtual) {
      if (tickHandler) {
        audioAtual.removeEventListener('timeupdate', tickHandler)
        tickHandler = null
      }
      audioAtual.pause()
      audioAtual.currentTime = 0
      audioAtual.onended = null
      audioAtual.onerror = null
      audioAtual = null
    }
  } catch {
    /* ignore */
  }
}

export function pararAudioVersiculoHebraico() {
  cancelar()
}

export function urlAudioCapituloHebraico(livroId, capitulo) {
  return `${AUDIO_BASE}/${Number(livroId)}/${Number(capitulo)}.mp3`
}

export function audioVersiculoHebraicoDisponivel({ livroId, capitulo, versiculo, ehGrego }) {
  if (!biblicalAudioEnabled || ehGrego) return false
  const livro = Number(livroId)
  const cap = Number(capitulo)
  const ver = Number(versiculo)
  if (!(livro >= 1 && livro <= 39 && cap >= 1 && ver >= 1)) return false
  return capitulosAudioDisponiveis.has(`${livro}:${cap}`)
}

/** Aguarda o índice de capítulos e retorna se há áudio para livro:capítulo. */
export async function aguardarAudioVersiculoHebraicoDisponivel({ livroId, capitulo, versiculo, ehGrego }) {
  if (!biblicalAudioEnabled) return false
  await carregarIndiceCapitulos()
  return audioVersiculoHebraicoDisponivel({ livroId, capitulo, versiculo, ehGrego })
}

async function carregarIndiceVersos(livroId, capitulo) {
  const key = `${livroId}:${capitulo}`
  if (cacheVersos.has(key)) return cacheVersos.get(key)

  const base = import.meta.env.BASE_URL || '/'
  const rev = import.meta.env.VITE_SQLITE_ASSET_REV
  const qs = rev ? `?v=${encodeURIComponent(rev)}` : ''
  const url = `${base}data/ot-hebrew-audio/verses-${livroId}-${capitulo}.json${qs}`.replace(/\/{2,}/g, '/')
  try {
    const r = await fetch(url, { cache: 'no-cache' })
    if (!r.ok) return null
    const data = await r.json()
    cacheVersos.set(key, data)
    return data
  } catch {
    return null
  }
}

export async function obterIndiceAudioHebraico(livroId, capitulo) {
  if (!biblicalAudioEnabled) return null
  return carregarIndiceVersos(livroId, capitulo)
}

function obterTimestamps(indice, versiculo) {
  const ver = Number(versiculo)
  const row = (indice?.verses || []).find((v) => Number(v.verse) === ver)
  if (!row) return null
  let start = Number(row.start_sec)
  const end = Number(row.end_sec)
  // v.1: nunca antes do fim da intro do capítulo
  if (ver === 1) {
    const intro = Number(indice?.intro_before_verse1_sec)
    if (Number.isFinite(intro) && intro > 0 && start < intro + 0.25) {
      start = intro + 0.25
    }
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return { start, end }
}

const blobCacheMp3 = new Map()

async function urlAudioLocalOuRemoto(mp3Url) {
  const key = mp3Url.split('#')[0]
  if (blobCacheMp3.has(key)) return blobCacheMp3.get(key)
  try {
    const r = await fetch(key)
    if (!r.ok) return mp3Url
    const blob = await r.blob()
    const obj = URL.createObjectURL(blob)
    blobCacheMp3.set(key, obj)
    return obj
  } catch {
    return mp3Url
  }
}

/** Versículo correspondente ao tempo absoluto do MP3 (último cujo início já passou). */
export function versiculoNoTimestamp(verses, tempoSec) {
  const t = Number(tempoSec)
  if (!Number.isFinite(t) || !Array.isArray(verses) || !verses.length) return null
  let found = null
  for (const v of verses) {
    const start = Number(v.start ?? v.start_sec)
    if (!Number.isFinite(start)) continue
    if (t >= start - 0.1) found = v
    else break
  }
  return found
}

function seekEPlay(audio, startSec) {
  return new Promise((resolve, reject) => {
    const start = Math.max(0, Number(startSec) || 0)
    if (start < 0.05) {
      resolve()
      return
    }

    let settled = false
    let tentativas = 0
    const maxTentativas = 4

    const done = (err) => {
      if (settled) return
      settled = true
      window.clearTimeout(fallback)
      audio.removeEventListener('seeked', onSeeked)
      if (err) reject(err)
      else resolve()
    }

    const onSeeked = () => {
      if (audio.currentTime >= start - 0.35 || Math.abs(audio.currentTime - start) < 0.5) {
        done()
        return
      }
      if (tentativas < maxTentativas) {
        tentativas += 1
        try {
          if (typeof audio.fastSeek === 'function') audio.fastSeek(start)
          else audio.currentTime = start
        } catch (e) {
          done(e)
        }
      } else {
        done(new Error('verse-audio-seek-failed'))
      }
    }

    audio.addEventListener('seeked', onSeeked)

    const aplicarSeek = () => {
      try {
        if (typeof audio.fastSeek === 'function') audio.fastSeek(start)
        else audio.currentTime = start
      } catch (e) {
        done(e)
      }
    }

    if (audio.readyState >= 1) aplicarSeek()
    else audio.addEventListener('loadedmetadata', aplicarSeek, { once: true })

    const fallback = window.setTimeout(() => {
      if (audio.currentTime >= start - 0.35 || Math.abs(audio.currentTime - start) < 0.75) {
        done()
      } else if (tentativas < maxTentativas) {
        tentativas += 1
        aplicarSeek()
      } else {
        done(new Error('verse-audio-seek-failed'))
      }
    }, 1800)
  })
}

/**
 * @returns {Promise<'playing'>}
 */
export async function reproduzirVersiculoHebraico({ livroId, capitulo, versiculo, onEnd }) {
  if (!biblicalAudioEnabled) throw new Error('verse-audio-disabled')
  await carregarIndiceCapitulos()
  if (!audioVersiculoHebraicoDisponivel({ livroId, capitulo, versiculo, ehGrego: false })) {
    throw new Error('verse-audio-unavailable')
  }

  cancelar()

  const { pararPronunciaStrong } = await import('./strongPronunciationAudio')
  pararPronunciaStrong()

  const indice = await carregarIndiceVersos(livroId, capitulo)
  const ts = obterTimestamps(indice, versiculo)
  const mp3Remoto = indice?.url || urlAudioCapituloHebraico(livroId, capitulo)
  const start = ts?.start ?? 0
  const end = ts?.end ?? null
  const mp3Local = await urlAudioLocalOuRemoto(mp3Remoto)
  const mp3Url = mp3Local

  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audioAtual = audio
    audio.preload = 'auto'
    let settled = false

    const finish = (ok, err) => {
      if (settled) return
      settled = true
      if (stopTimer) {
        window.clearTimeout(stopTimer)
        stopTimer = null
      }
      if (tickHandler) {
        audio.removeEventListener('timeupdate', tickHandler)
        tickHandler = null
      }
      audio.onended = null
      audio.onerror = null
      if (ok) {
        onEnd?.()
        resolve('playing')
      } else {
        reject(err || new Error('verse-audio-error'))
      }
    }

    audio.onerror = () => finish(false, new Error('verse-audio-load-error'))

    const pararNoFim = () => {
      try {
        audio.pause()
      } catch {
        /* ignore */
      }
      finish(true)
    }

    if (end != null) {
      tickHandler = () => {
        if (audio.currentTime >= end - 0.1) {
          pararNoFim()
        }
      }
      audio.addEventListener('timeupdate', tickHandler)
      stopTimer = window.setTimeout(pararNoFim, Math.max(800, (end - start) * 1000 + 1200))
    } else {
      audio.onended = () => finish(true)
    }

    const iniciarReproducao = () => {
      seekEPlay(audio, start)
        .then(() => audio.play())
        .then(() => {
          /* timeupdate / timer cuidam do fim */
        })
        .catch((e) => finish(false, e))
    }

    audio.addEventListener('loadedmetadata', iniciarReproducao, { once: true })
    audio.src = mp3Url
    audio.load()
  })
}

/**
 * Reproduz o capítulo inteiro (sem parar automaticamente).
 * @returns {Promise<'playing'>}
 */
export async function reproduzirCapituloHebraico({
  livroId,
  capitulo,
  startSec = null,
  onEnd,
  onTimeUpdate,
}) {
  if (!biblicalAudioEnabled) throw new Error('verse-audio-disabled')
  cancelar()

  const { pararPronunciaStrong } = await import('./strongPronunciationAudio')
  pararPronunciaStrong()

  const indice = await carregarIndiceVersos(livroId, capitulo)
  const mp3Remoto = indice?.url || urlAudioCapituloHebraico(livroId, capitulo)
  const primeiroInicio = Number(indice?.verses?.[0]?.start_sec)
  const start = Number.isFinite(startSec)
    ? Math.max(0, Number(startSec) || 0)
    : (Number.isFinite(primeiroInicio) ? Math.max(0, primeiroInicio) : 0)
  const mp3Local = await urlAudioLocalOuRemoto(mp3Remoto)
  const mp3Url = mp3Local

  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audioAtual = audio
    audio.preload = 'auto'
    let settled = false

    const finish = (ok, err) => {
      if (settled) return
      settled = true
      audio.onended = null
      audio.onerror = null
      if (ok) {
        onEnd?.()
        resolve('playing')
      } else {
        reject(err || new Error('chapter-audio-error'))
      }
    }

    audio.onerror = () => finish(false, new Error('chapter-audio-load-error'))
    audio.onended = () => finish(true)
    if (typeof onTimeUpdate === 'function') {
      tickHandler = () => {
        try {
          onTimeUpdate(audio.currentTime)
        } catch {
          /* ignore callback errors */
        }
      }
      audio.addEventListener('timeupdate', tickHandler)
    }

    const iniciarReproducao = () => {
      seekEPlay(audio, start)
        .then(() => audio.play())
        .catch((e) => finish(false, e))
    }

    audio.addEventListener('loadedmetadata', iniciarReproducao, { once: true })
    audio.src = mp3Url
    audio.load()
  })
}
