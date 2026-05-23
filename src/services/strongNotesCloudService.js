import { onValue, ref, set, off } from 'firebase/database'
import { getFirebaseDatabase } from '../config/firebase'
import { getRtdbClientId, snapshotEhEcoDoMesmoCliente } from '../utils/rtdbClientId'

const notePath = (uid, code) => `users/${uid}/strongNotes/${code}`

export function subscribeStrongNote(uid, code, callback) {
  const db = getFirebaseDatabase()
  if (!db || !uid || !code) return () => {}
  const r = ref(db, notePath(uid, code))
  onValue(
    r,
    (snap) => {
      const val = snap.val() || {}
      // Ignora eco da própria escrita deste cliente (evita salto de cursor enquanto digita).
      if (val && snapshotEhEcoDoMesmoCliente(val.clientId)) return
      const text = typeof val.text === 'string' ? val.text : ''
      callback({ text, updatedAt: typeof val.updatedAt === 'number' ? val.updatedAt : 0 })
    },
    () => callback({ text: '', updatedAt: 0 })
  )
  return () => off(r)
}

export async function saveStrongNote(uid, code, text) {
  const db = getFirebaseDatabase()
  if (!db || !uid || !code) return
  const clean = String(text || '').trim()
  await set(ref(db, notePath(uid, code)), {
    text: clean,
    updatedAt: Date.now(),
    clientId: getRtdbClientId()
  })
}
