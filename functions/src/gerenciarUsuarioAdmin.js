/**
 * Callable: `gerenciarUsuarioAdmin`.
 *
 * Desativa, reativa ou apaga utilizador no Firebase Auth (só admin RTDB).
 * Não remove o nó `users/{uid}` no RTDB (chat, favoritos, etc.) — só Auth + índices de busca.
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
    throw new HttpsError('permission-denied', 'Apenas administradores podem gerir utilizadores.')
  }
}

async function targetEhAdmin(targetUid) {
  const snap = await admin.database().ref(`users/${targetUid}/admin`).get()
  return snap.val() === true
}

async function limparIndicesBusca(uid) {
  const db = admin.database()
  let prof = {}
  try {
    const profSnap = await db.ref(`users/${uid}/profile`).get()
    prof = profSnap.val() || {}
  } catch {
    /* ignore */
  }

  const email = normalizeEmail(prof.email)
  if (email.includes('@')) {
    const key = encodeEmailRtdbKey(email)
    if (key) {
      const emailRef = db.ref(`profileEmails/${key}`)
      const emailSnap = await emailRef.get()
      if (emailSnap.val() === uid) {
        await emailRef.remove()
      }
    }
  }

  const handle = normalizeHandle(prof.handle)
  if (handle) {
    const handleRef = db.ref(`publicHandles/${handle}`)
    const handleSnap = await handleRef.get()
    if (handleSnap.val() === uid) {
      await handleRef.remove()
    }
  }

  await db.ref(`userSearch/${uid}`).remove().catch(() => {})
  await db.ref(`publicDirectory/${uid}`).remove().catch(() => {})
  await db.ref(`publicProfiles/${uid}`).remove().catch(() => {})
}

exports.gerenciarUsuarioAdmin = onCall(
  { region: 'us-central1', maxInstances: 5, cors: true },
  async (req) => {
    const adminUid = req.auth?.uid
    if (!adminUid) {
      throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')
    }
    await assertAdmin(adminUid)

    const targetUid = String(req.data?.targetUid ?? '').trim()
    const acao = String(req.data?.acao ?? '').trim().toLowerCase()

    if (!targetUid || targetUid.length < 10) {
      throw new HttpsError('invalid-argument', 'UID do utilizador inválido.')
    }
    if (!['desativar', 'reativar', 'apagar'].includes(acao)) {
      throw new HttpsError('invalid-argument', 'Ação inválida. Use desativar, reativar ou apagar.')
    }
    if (targetUid === adminUid) {
      throw new HttpsError('failed-precondition', 'Não pode alterar a sua própria conta aqui.')
    }
    if (await targetEhAdmin(targetUid)) {
      throw new HttpsError('failed-precondition', 'Não é permitido desativar ou apagar outro administrador.')
    }

    try {
      const existente = await admin.auth().getUser(targetUid)

      if (acao === 'desativar') {
        if (existente.disabled) {
          return { ok: true, acao, targetUid, disabled: true, jaEstava: true }
        }
        await admin.auth().updateUser(targetUid, { disabled: true })
        logger.info('gerenciarUsuarioAdmin desativar', { adminUid, targetUid })
        return { ok: true, acao, targetUid, disabled: true }
      }

      if (acao === 'reativar') {
        if (!existente.disabled) {
          return { ok: true, acao, targetUid, disabled: false, jaEstava: true }
        }
        await admin.auth().updateUser(targetUid, { disabled: false })
        logger.info('gerenciarUsuarioAdmin reativar', { adminUid, targetUid })
        return { ok: true, acao, targetUid, disabled: false }
      }

      await limparIndicesBusca(targetUid)
      await admin.auth().deleteUser(targetUid)
      logger.info('gerenciarUsuarioAdmin apagar', { adminUid, targetUid })
      return { ok: true, acao, targetUid, apagado: true }
    } catch (e) {
      if (e?.code === 'auth/user-not-found') {
        await limparIndicesBusca(targetUid).catch(() => {})
        return { ok: true, acao, targetUid, apagado: acao === 'apagar', naoEncontradoAuth: true }
      }
      logger.error('gerenciarUsuarioAdmin falhou', { adminUid, targetUid, acao, err: e?.message })
      throw new HttpsError('internal', e?.message || 'Falha ao gerir utilizador.')
    }
  }
)
