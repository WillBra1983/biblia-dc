/**
 * Callable: `listarUsuariosAdmin`.
 *
 * Lista utilizadores do Firebase Auth (paginação). Só para admins
 * (`users/{uid}/admin === true` no RTDB). Os dados sensíveis expostos são os
 * que o Admin SDK já devolve (email, displayName, datas); não inclui tokens.
 */

const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions/v2')

const MAX_PAGE = 500

function rotuloProvedor(signInProvider, emailVerified) {
  const id = String(signInProvider || '').trim()
  const map = {
    'google.com': 'Google',
    password: 'E-mail e senha',
    phone: 'Telefone',
    'apple.com': 'Apple',
  }
  const nome = map[id] || id || '—'
  if (id === 'google.com') return `${nome} (verificado pelo Google)`
  if (id === 'password') {
    return emailVerified ? `${nome} (e-mail verificado)` : `${nome} (e-mail não verificado)`
  }
  if (emailVerified) return `${nome} (verificado)`
  return nome
}

function msFromTimestamp(val) {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) return val
  return 0
}

function msFromAuthTime(iso) {
  if (typeof iso !== 'string' || !iso.trim()) return 0
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : 0
}

exports.listarUsuariosAdmin = onCall(
  { region: 'us-central1', maxInstances: 3, cors: true },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')
    }

    const flagSnap = await admin.database().ref(`users/${uid}/admin`).get()
    if (flagSnap.val() !== true) {
      throw new HttpsError('permission-denied', 'Apenas administradores podem listar utilizadores.')
    }

    const rawMax = Number(req.data?.maxResults)
    const maxResults = Number.isFinite(rawMax)
      ? Math.min(MAX_PAGE, Math.max(1, Math.floor(rawMax)))
      : 100
    const pageToken =
      typeof req.data?.pageToken === 'string' && req.data.pageToken.length > 0
        ? req.data.pageToken
        : undefined

    try {
      const uidParaHandle = {}
      try {
        const handlesSnap = await admin.database().ref('publicHandles').get()
        const handlesVal = handlesSnap.val()
        if (handlesVal && typeof handlesVal === 'object') {
          for (const [handle, ownerUid] of Object.entries(handlesVal)) {
            if (typeof ownerUid === 'string' && ownerUid && !uidParaHandle[ownerUid]) {
              uidParaHandle[ownerUid] = String(handle)
            }
          }
        }
      } catch {
        /* ignore */
      }

      const listResult = await admin.auth().listUsers(maxResults, pageToken)
      const users = await Promise.all(
        listResult.users.map(async (u) => {
          let profileHandle = uidParaHandle[u.uid] || ''
          let profileDisplayName = ''
          let lastAccessAtMs = 0
          try {
            const profSnap = await admin.database().ref(`users/${u.uid}/profile`).get()
            const prof = profSnap.val() || {}
            if (typeof prof.handle === 'string' && prof.handle.trim()) {
              profileHandle = prof.handle.trim().replace(/^@+/, '').toLowerCase()
            }
            if (typeof prof.displayName === 'string') profileDisplayName = prof.displayName.trim()
            lastAccessAtMs = msFromTimestamp(prof.lastAccessAt)
          } catch {
            /* ignore */
          }
          const providers = (u.providerData || []).map((p) => p.providerId).filter(Boolean)
          const signInProvider = providers[0] || ''
          const email = (u.email || '').trim()
          const emailVerified = Boolean(u.emailVerified)
          const lastSignInMs = msFromAuthTime(u.metadata.lastSignInTime || '')
          const ultimoAcessoMs = Math.max(lastAccessAtMs, lastSignInMs)
          let ehAdminConta = false
          try {
            const admSnap = await admin.database().ref(`users/${u.uid}/admin`).get()
            ehAdminConta = admSnap.val() === true
          } catch {
            /* ignore */
          }
          return {
            uid: u.uid,
            email,
            displayName: u.displayName || profileDisplayName || '',
            profileHandle,
            ehAdmin: ehAdminConta,
            disabled: Boolean(u.disabled),
            emailVerified,
            providers,
            signInProvider,
            provedorLabel: rotuloProvedor(signInProvider, emailVerified),
            photoURL: u.photoURL || '',
            creationTime: u.metadata.creationTime || '',
            lastSignInTime: u.metadata.lastSignInTime || '',
            lastAccessAt: lastAccessAtMs ? new Date(lastAccessAtMs).toISOString() : '',
            ultimoAcesso: ultimoAcessoMs ? new Date(ultimoAcessoMs).toISOString() : '',
          }
        })
      )
      logger.info('listarUsuariosAdmin', { adminUid: uid, count: users.length })
      return {
        users,
        pageToken: listResult.pageToken || null,
      }
    } catch (e) {
      logger.error('listarUsuariosAdmin falhou', { err: e?.message })
      throw new HttpsError('internal', e?.message || 'Falha ao listar utilizadores.')
    }
  }
)
