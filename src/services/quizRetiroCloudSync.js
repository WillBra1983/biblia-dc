/**
 * Sincroniza partida em andamento e última/melhor rodada do Quiz na nuvem
 * (`users/{uid}/quizRetiro`). localStorage continua como cache rápido.
 */

import { onValue, ref, set, remove, get } from 'firebase/database'
import { getFirebaseDatabase, isFirebaseConfigured, loadFirebaseModules } from '../config/firebase'
import { getRtdbClientId, snapshotEhEcoDoMesmoCliente } from '../utils/rtdbClientId'
import {
  salvarProgressoQuizRetiro,
  limparProgressoQuizRetiro,
  carregarProgressoQuizRetiro
} from '../utils/quizRetiroProgressStorage'
const pathQuiz = (uid) => `users/${uid}/quizRetiro`

let unsubscribe = null
let debounceTimer = null
let activeUid = null
let lastLocalWriteAt = 0
let lastAppliedRemoteAt = 0
let removeListener = null

function registrarListener() {
  if (typeof window === 'undefined') return () => {}
  const handler = () => scheduleQuizProgressFlush()
  window.addEventListener('salvation-quiz-retiro-progresso', handler)
  return () => window.removeEventListener('salvation-quiz-retiro-progresso', handler)
}

export function notificarProgressoQuizLocal() {
  try {
    window.dispatchEvent(new CustomEvent('salvation-quiz-retiro-progresso'))
  } catch {
    /* ignore */
  }
}

function payloadProgressoLocal() {
  const p = carregarProgressoQuizRetiro()
  if (!p) return null
  const { v, updatedAt, ...rest } = p
  return rest
}

export function saveQuizProgressCloud(uid, progressPayload) {
  const db = getFirebaseDatabase()
  if (!db || !uid || !progressPayload) return Promise.resolve(0)
  const updatedAt = Date.now()
  lastLocalWriteAt = updatedAt
  return set(ref(db, `${pathQuiz(uid)}/progress`), {
    ...progressPayload,
    updatedAt,
    clientId: getRtdbClientId()
  }).then(() => updatedAt)
}

export function removeQuizProgressCloud(uid) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return Promise.resolve()
  return remove(ref(db, `${pathQuiz(uid)}/progress`)).catch(() => {})
}

/**
 * Grava última rodada concluída e atualiza melhor rodada (só melhora pontuação).
 */
export function saveQuizRodadasCloud(uid, rodada) {
  const db = getFirebaseDatabase()
  if (!db || !uid || !rodada) return Promise.resolve()

  const ultima = {
    pontos: Math.max(0, Number(rodada.pontos) || 0),
    acertos: Math.max(0, Number(rodada.acertos) || 0),
    perguntasRespondidas: Math.max(0, Number(rodada.perguntasRespondidas) || 0),
    totalPerguntas: Math.max(1, Number(rodada.totalPerguntas) || 50),
    fase: Math.min(3, Math.max(1, Number(rodada.fase) || 1)),
    updatedAt: Date.now()
  }

  const baseRef = ref(db, pathQuiz(uid))

  return get(ref(db, `${pathQuiz(uid)}/melhorRodada`))
    .then((snap) => {
      const atual = snap.exists() ? snap.val() : null
      const ptsAtual = Math.max(0, Number(atual?.pontos) || 0)
      const melhor =
        !atual || ultima.pontos > ptsAtual
          ? { ...ultima }
          : ultima.pontos === ptsAtual &&
              ultima.acertos > Math.max(0, Number(atual?.acertos) || 0)
            ? { ...ultima }
            : null

      const writes = [set(ref(db, `${pathQuiz(uid)}/ultimaRodada`), ultima)]
      if (melhor) writes.push(set(ref(db, `${pathQuiz(uid)}/melhorRodada`), melhor))
      return Promise.all(writes)
    })
}

export function scheduleQuizProgressFlush(options = {}) {
  if (!activeUid || !isFirebaseConfigured()) return
  const payload = payloadProgressoLocal()
  if (!payload) return

  const uid = activeUid
  const gravar = () => {
    saveQuizProgressCloud(uid, payload)
      .then((at) => {
        if (at) lastLocalWriteAt = at
      })
      .catch((err) => {
        console.warn('[QuizCloudSync] progresso:', err?.message || err)
      })
  }

  if (options.immediate) {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer)
      debounceTimer = null
    }
    gravar()
    return
  }
  if (debounceTimer) window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null
    gravar()
  }, 650)
}

export async function flushQuizProgressImmediate(uid) {
  const id = String(uid || activeUid || '').trim()
  if (!id) return 0
  const payload = payloadProgressoLocal()
  if (!payload) return 0
  if (debounceTimer) {
    window.clearTimeout(debounceTimer)
    debounceTimer = null
  }
  try {
    return (await saveQuizProgressCloud(id, payload)) || 0
  } catch {
    return 0
  }
}

export async function limparProgressoQuizCompleto(uid) {
  limparProgressoQuizRetiro()
  if (uid) await removeQuizProgressCloud(uid)
  notificarProgressoQuizLocal()
}

export function stopQuizRetiroCloudSync() {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  if (debounceTimer) {
    window.clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (removeListener) {
    removeListener()
    removeListener = null
  }
  activeUid = null
  lastLocalWriteAt = 0
  lastAppliedRemoteAt = 0
}

export function startQuizRetiroCloudSync(uid) {
  stopQuizRetiroCloudSync()
  if (!uid || !isFirebaseConfigured()) return

  void loadFirebaseModules().then(() => {
    const db = getFirebaseDatabase()
    if (!db) return

    activeUid = uid
    removeListener = registrarListener()
    const r = ref(db, pathQuiz(uid))

    unsubscribe = onValue(r, (snap) => {
      if (!snap.exists()) return
      const val = snap.val() || {}

      const prog = val.progress
      if (prog && typeof prog === 'object') {
        if (snapshotEhEcoDoMesmoCliente(prog.clientId)) return
        const u = Number(prog.updatedAt) || 0
        if (u === lastLocalWriteAt || u <= lastAppliedRemoteAt) {
          /* segue para melhorRodada */
        } else {
          const local = carregarProgressoQuizRetiro()
          const localAt = local?.updatedAt || 0
          if (u > localAt) {
            const { clientId, updatedAt, ...rest } = prog
            salvarProgressoQuizRetiro({ ...rest, updatedAt: u })
            notificarProgressoQuizLocal()
          }
          lastAppliedRemoteAt = Math.max(lastAppliedRemoteAt, u)
        }
      }

      if (val.melhorRodada?.pontos >= 1) {
        try {
          window.dispatchEvent(new CustomEvent('salvation-quiz-ranking-sync'))
        } catch {
          /* ignore */
        }
      }
    })
  })
}

/** Lê melhor/última rodada da nuvem (para ranking offline de outro aparelho). */
export async function lerQuizRodadasDaNuvem(uid) {
  if (!uid || !isFirebaseConfigured()) return { melhor: null, ultima: null }
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return { melhor: null, ultima: null }
  try {
    const snap = await get(ref(db, pathQuiz(uid)))
    if (!snap.exists()) return { melhor: null, ultima: null }
    const v = snap.val() || {}
    return {
      melhor: v.melhorRodada || null,
      ultima: v.ultimaRodada || null
    }
  } catch {
    return { melhor: null, ultima: null }
  }
}
