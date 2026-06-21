/**
 * Sincroniza devocionais marcados como lidos na nuvem.
 * Caminho RTDB: `users/{uid}/devocionais`
 */

import { onValue, ref, set } from 'firebase/database'
import { getFirebaseDatabase, isFirebaseConfigured, loadFirebaseModules } from '../config/firebase'
import { getRtdbClientId, snapshotEhEcoDoMesmoCliente } from '../utils/rtdbClientId'
import { loadFromStorage } from '../utils/storageUtils'
import {
  devocionaisConcluidosIguais,
  normalizarDevocionaisConcluidos,
} from '../utils/devocionalConcluidos'

const pathDevocionais = (uid) => `users/${uid}/devocionais`

let unsubscribe = null
let debounceTimer = null
let activeUid = null
let lastLocalWriteAt = 0
let lastAppliedRemoteAt = 0
let applyFromCloud = null

export function notificarDevocionalLocal() {
  try {
    window.dispatchEvent(new CustomEvent('salvation-devocional-changed'))
  } catch {
    /* ignore */
  }
}

function payloadDevocionalLocal() {
  return {
    concluidos: normalizarDevocionaisConcluidos(loadFromStorage('devocionaisConcluidos', [])),
  }
}

export function saveDevocionalCloud(uid, payload) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return Promise.resolve(0)
  const updatedAt = Date.now()
  lastLocalWriteAt = updatedAt
  return set(ref(db, pathDevocionais(uid)), {
    ...(payload || payloadDevocionalLocal()),
    updatedAt,
    clientId: getRtdbClientId(),
  }).then(() => updatedAt)
}

export function scheduleDevocionalCloudFlush(options = {}) {
  if (!activeUid || !isFirebaseConfigured()) return
  const uid = activeUid
  const gravar = () => {
    saveDevocionalCloud(uid, payloadDevocionalLocal())
      .then((at) => {
        if (at) lastLocalWriteAt = at
      })
      .catch((err) => {
        console.warn('[DevocionalCloudSync]', err?.message || err)
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
  }, 900)
}

export function startDevocionalCloudSync(uid, { onApplyFromCloud } = {}) {
  stopDevocionalCloudSync()
  if (!uid || !isFirebaseConfigured()) return

  activeUid = uid
  applyFromCloud = typeof onApplyFromCloud === 'function' ? onApplyFromCloud : null

  const onLocalChange = () => scheduleDevocionalCloudFlush()
  window.addEventListener('salvation-devocional-changed', onLocalChange)

  void loadFirebaseModules().then(() => {
    const db = getFirebaseDatabase()
    if (!db || activeUid !== uid) return

    unsubscribe = onValue(ref(db, pathDevocionais(uid)), (snap) => {
      const val = snap.exists() ? snap.val() : null
      if (val && snapshotEhEcoDoMesmoCliente(val.clientId)) return

      const updatedAt = typeof val?.updatedAt === 'number' ? val.updatedAt : 0
      if (updatedAt && updatedAt === lastLocalWriteAt) return
      if (updatedAt && updatedAt <= lastAppliedRemoteAt) return

      if (!val) {
        scheduleDevocionalCloudFlush({ immediate: true })
        return
      }

      const remoto = {
        concluidos: normalizarDevocionaisConcluidos(
          Array.isArray(val.concluidos) ? val.concluidos : Object.values(val.concluidos || {})
        ),
      }

      const local = payloadDevocionalLocal()
      if (devocionaisConcluidosIguais(remoto.concluidos, local.concluidos)) {
        if (updatedAt) lastAppliedRemoteAt = updatedAt
        return
      }

      applyFromCloud?.(remoto)
      if (updatedAt) lastAppliedRemoteAt = updatedAt
    })
  })

  startDevocionalCloudSync._removeListener = () => {
    window.removeEventListener('salvation-devocional-changed', onLocalChange)
  }
}

export function stopDevocionalCloudSync() {
  if (debounceTimer) {
    window.clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (typeof startDevocionalCloudSync._removeListener === 'function') {
    startDevocionalCloudSync._removeListener()
    startDevocionalCloudSync._removeListener = null
  }
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  activeUid = null
  applyFromCloud = null
  lastLocalWriteAt = 0
  lastAppliedRemoteAt = 0
}
