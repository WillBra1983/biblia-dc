/**
 * Sincroniza progresso do Discipulado (respostas, meditação, conclusões) na nuvem.
 * Caminho RTDB: `users/{uid}/discipulado`
 */

import { onValue, ref, set } from 'firebase/database'
import { getFirebaseDatabase, isFirebaseConfigured, loadFirebaseModules } from '../config/firebase'
import { getRtdbClientId, snapshotEhEcoDoMesmoCliente } from '../utils/rtdbClientId'
import { loadFromStorage } from '../utils/storageUtils'
import { migrarConclusoesLegadoLocalStorage } from '../utils/discipuladoConclusao'

const pathDiscipulado = (uid) => `users/${uid}/discipulado`

let unsubscribe = null
let debounceTimer = null
let activeUid = null
let lastLocalWriteAt = 0
let lastAppliedRemoteAt = 0
let applyFromCloud = null

export function notificarDiscipuladoLocal() {
  try {
    window.dispatchEvent(new CustomEvent('salvation-discipulado-changed'))
  } catch {
    /* ignore */
  }
}

function payloadDiscipuladoLocal() {
  const concluidos = migrarConclusoesLegadoLocalStorage(
    loadFromStorage('discipulado_concluidos', {})
  )
  return {
    respostas: loadFromStorage('discipulado_respostas', {}),
    meditacao: loadFromStorage('discipulado_meditacao', {}),
    concluidos,
  }
}

function snapshotsIguais(a, b) {
  return JSON.stringify(a || {}) === JSON.stringify(b || {})
}

export function saveDiscipuladoCloud(uid, payload) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return Promise.resolve(0)
  const updatedAt = Date.now()
  lastLocalWriteAt = updatedAt
  return set(ref(db, pathDiscipulado(uid)), {
    ...(payload || payloadDiscipuladoLocal()),
    updatedAt,
    clientId: getRtdbClientId(),
  }).then(() => updatedAt)
}

export function scheduleDiscipuladoCloudFlush(options = {}) {
  if (!activeUid || !isFirebaseConfigured()) return
  const uid = activeUid
  const gravar = () => {
    saveDiscipuladoCloud(uid, payloadDiscipuladoLocal())
      .then((at) => {
        if (at) lastLocalWriteAt = at
      })
      .catch((err) => {
        console.warn('[DiscipuladoCloudSync]', err?.message || err)
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

export function startDiscipuladoCloudSync(uid, { onApplyFromCloud } = {}) {
  stopDiscipuladoCloudSync()
  if (!uid || !isFirebaseConfigured()) return

  activeUid = uid
  applyFromCloud = typeof onApplyFromCloud === 'function' ? onApplyFromCloud : null

  const onLocalChange = () => scheduleDiscipuladoCloudFlush()
  window.addEventListener('salvation-discipulado-changed', onLocalChange)

  void loadFirebaseModules().then(() => {
    const db = getFirebaseDatabase()
    if (!db || activeUid !== uid) return

    unsubscribe = onValue(ref(db, pathDiscipulado(uid)), (snap) => {
      const val = snap.exists() ? snap.val() : null
      if (val && snapshotEhEcoDoMesmoCliente(val.clientId)) return

      const updatedAt = typeof val?.updatedAt === 'number' ? val.updatedAt : 0
      if (updatedAt && updatedAt === lastLocalWriteAt) return
      if (updatedAt && updatedAt <= lastAppliedRemoteAt) return

      if (!val) {
        scheduleDiscipuladoCloudFlush({ immediate: true })
        return
      }

      const remoto = {
        respostas: val.respostas && typeof val.respostas === 'object' ? val.respostas : {},
        meditacao: val.meditacao && typeof val.meditacao === 'object' ? val.meditacao : {},
        concluidos: val.concluidos && typeof val.concluidos === 'object' ? val.concluidos : {},
      }

      const local = payloadDiscipuladoLocal()
      if (snapshotsIguais(remoto, local)) {
        if (updatedAt) lastAppliedRemoteAt = updatedAt
        return
      }

      applyFromCloud?.(remoto)
      if (updatedAt) lastAppliedRemoteAt = updatedAt
    })
  })

  startDiscipuladoCloudSync._removeListener = () => {
    window.removeEventListener('salvation-discipulado-changed', onLocalChange)
  }
}

export function stopDiscipuladoCloudSync() {
  if (debounceTimer) {
    window.clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (typeof startDiscipuladoCloudSync._removeListener === 'function') {
    startDiscipuladoCloudSync._removeListener()
    startDiscipuladoCloudSync._removeListener = null
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
