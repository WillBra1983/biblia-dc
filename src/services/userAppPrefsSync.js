import { ref, set, onValue } from 'firebase/database'
import { getFirebaseDatabase, isFirebaseConfigured } from '../config/firebase'
import { getRtdbClientId, snapshotEhEcoDoMesmoCliente } from '../utils/rtdbClientId'

/**
 * Preferências de app sincronizadas por usuário (tema, leitura por página).
 * Caminho RTDB: `users/{uid}/appPrefs`
 */

export function subscribeUserAppPrefs(uid, onValueCallback) {
  if (!isFirebaseConfigured() || !uid) return () => {}
  const db = getFirebaseDatabase()
  if (!db) return () => {}
  const r = ref(db, `users/${uid}/appPrefs`)
  return onValue(r, (snap) => {
    const val = snap.exists() ? snap.val() : null
    // Descarta eco da própria escrita deste cliente — evita re-render quando
    // o mesmo usuário está em vários dispositivos.
    if (val && snapshotEhEcoDoMesmoCliente(val.clientId)) return
    onValueCallback(val)
  })
}

/**
 * @returns {Promise<number>} `updatedAt` gravado no servidor
 */
export function saveUserAppPrefs(uid, prefs) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return Promise.resolve(0)
  const updatedAt = Date.now()
  const r = ref(db, `users/${uid}/appPrefs`)
  const clean = sanitizeForFirebase({ ...prefs, updatedAt, clientId: getRtdbClientId() })
  return set(r, clean).then(() => updatedAt)
}

function sanitizeForFirebase(value) {
  if (value === undefined) return null
  if (value === null) return null
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForFirebase(v)).filter((v) => v !== undefined)
  }
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue
      out[k] = sanitizeForFirebase(v)
    }
    return out
  }
  return value
}
