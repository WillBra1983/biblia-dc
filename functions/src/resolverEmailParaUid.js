/**
 * Callable: `resolverEmailParaUid`.
 *
 * Resolve e-mail → UID (Firebase Auth), para busca no chat quando o índice
 * RTDB `profileEmails` ainda não foi sincronizado. Qualquer utilizador autenticado.
 */

const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions/v2')

function normalizeEmail(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
}

function encodeEmailRtdbKey(email) {
  return normalizeEmail(email).replace(/\./g, ',')
}

function normalizePeopleSearchTerm(raw) {
  return String(raw ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function normalizeHandle(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
}

async function upsertUserSearch(uid, { email, displayName, handle }) {
  if (!uid) return
  const payload = {}
  const em = normalizeEmail(email)
  if (em) payload.email = em.slice(0, 320)
  const dn = normalizePeopleSearchTerm(displayName)
  if (dn) payload.displayName = dn.slice(0, 200)
  const h = normalizeHandle(handle)
  if (h) payload.handle = h.slice(0, 30)
  if (!Object.keys(payload).length) return
  await admin.database().ref(`userSearch/${uid}`).set(payload)
}

exports.resolverEmailParaUid = onCall(
  { region: 'us-central1', maxInstances: 5, cors: true },
  async (req) => {
    const callerUid = req.auth?.uid
    if (!callerUid) {
      throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')
    }

    const email = normalizeEmail(req.data?.email)
    if (!email || !email.includes('@') || email.length < 5 || email.length > 320) {
      return { uid: null, email: null, displayName: null }
    }

    try {
      const key = encodeEmailRtdbKey(email)
      const idxSnap = await admin.database().ref(`profileEmails/${key}`).get()
      const idxUid = idxSnap.val()
      if (typeof idxUid === 'string' && idxUid.length > 0) {
        const profSnap = await admin.database().ref(`users/${idxUid}/profile`).get()
        const prof = profSnap.val() || {}
        const resolvedEmail =
          typeof prof.email === 'string' && prof.email.trim() ? prof.email.trim() : email
        const displayName = typeof prof.displayName === 'string' ? prof.displayName : ''
        await upsertUserSearch(idxUid, {
          email: resolvedEmail,
          displayName,
          handle: prof.handle,
        })
        return {
          uid: idxUid,
          email: resolvedEmail,
          displayName,
        }
      }

      const userRecord = await admin.auth().getUserByEmail(email)
      if (!userRecord?.uid) {
        return { uid: null, email: null, displayName: null }
      }

      // Mantém índices alinhados para buscas parciais no cliente.
      await admin.database().ref(`profileEmails/${key}`).set(userRecord.uid)

      let displayName = userRecord.displayName || ''
      let handle = ''
      try {
        const profSnap = await admin.database().ref(`users/${userRecord.uid}/profile`).get()
        const prof = profSnap.val() || {}
        if (typeof prof.displayName === 'string' && prof.displayName.trim()) {
          displayName = prof.displayName.trim()
        }
        if (typeof prof.handle === 'string' && prof.handle.trim()) {
          handle = prof.handle.trim()
        }
      } catch {
        /* ignore */
      }

      await upsertUserSearch(userRecord.uid, {
        email: userRecord.email || email,
        displayName,
        handle,
      })

      logger.info('resolverEmailParaUid', { callerUid, found: userRecord.uid })
      return {
        uid: userRecord.uid,
        email: userRecord.email || email,
        displayName,
      }
    } catch (e) {
      if (e?.code === 'auth/user-not-found') {
        return { uid: null, email: null, displayName: null }
      }
      logger.error('resolverEmailParaUid falhou', { err: e?.message })
      throw new HttpsError('internal', e?.message || 'Falha ao resolver e-mail.')
    }
  }
)
