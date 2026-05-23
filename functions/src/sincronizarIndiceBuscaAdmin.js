/**
 * Callable: `sincronizarIndiceBuscaAdmin`.
 *
 * Reconstrói `userSearch` e `profileEmails` a partir dos perfis RTDB + Auth.
 * Só administradores. Útil após deploy do índice de busca do chat.
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
    .replace(/[^a-z0-9_]/g, '')
}

async function assertAdmin(uid) {
  const flagSnap = await admin.database().ref(`users/${uid}/admin`).get()
  if (flagSnap.val() !== true) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem sincronizar índices.')
  }
}

exports.sincronizarIndiceBuscaAdmin = onCall(
  { region: 'us-central1', maxInstances: 1, timeoutSeconds: 540, cors: true },
  async (req) => {
    const adminUid = req.auth?.uid
    if (!adminUid) {
      throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')
    }
    await assertAdmin(adminUid)

    let pageToken
    let processados = 0
    let indexados = 0

    try {
      do {
        const list = await admin.auth().listUsers(500, pageToken)
        for (const u of list.users) {
          processados += 1
          let prof = {}
          try {
            const profSnap = await admin.database().ref(`users/${u.uid}/profile`).get()
            prof = profSnap.val() || {}
          } catch {
            /* ignore */
          }

          const email = normalizeEmail(prof.email || u.email || '')
          const displayName = normalizePeopleSearchTerm(prof.displayName || u.displayName || '')
          const handle = normalizeHandle(prof.handle || '')

          const payload = {}
          if (email) payload.email = email.slice(0, 320)
          if (displayName) payload.displayName = displayName.slice(0, 200)
          if (handle) payload.handle = handle.slice(0, 30)

          if (Object.keys(payload).length > 0) {
            await admin.database().ref(`userSearch/${u.uid}`).set(payload)
            indexados += 1
          } else {
            await admin.database().ref(`userSearch/${u.uid}`).remove().catch(() => {})
          }

          if (email.includes('@')) {
            const key = encodeEmailRtdbKey(email)
            if (key) {
              await admin.database().ref(`profileEmails/${key}`).set(u.uid)
            }
          }
        }
        pageToken = list.pageToken
      } while (pageToken)

      logger.info('sincronizarIndiceBuscaAdmin', { adminUid, processados, indexados })
      return { ok: true, processados, indexados }
    } catch (e) {
      logger.error('sincronizarIndiceBuscaAdmin falhou', { err: e?.message })
      throw new HttpsError('internal', e?.message || 'Falha ao sincronizar índices.')
    }
  }
)
