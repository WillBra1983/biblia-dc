/**
 * Remove contas e-mail/senha legadas sem confirmação após 48 h (fluxo antigo com createUser).
 * Cadastros novos usam link de e-mail: a conta Auth só existe após abrir o link.
 */

const admin = require('firebase-admin')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { logger } = require('firebase-functions/v2')

const HORAS_PARA_APAGAR = 48
const MAX_POR_EXECUCAO = 120

function encodeEmailRtdbKey(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase()
    .replace(/\./g, ',')
}

async function limparIndicesBusca(uid, prof = {}) {
  const db = admin.database()
  const updates = {}
  const handle = typeof prof.handle === 'string' ? prof.handle.trim().replace(/^@+/, '').toLowerCase() : ''
  if (handle) updates[`publicHandles/${handle}`] = null
  const email = typeof prof.email === 'string' ? prof.email.trim() : ''
  if (email) updates[`profileEmails/${encodeEmailRtdbKey(email)}`] = null
  updates[`userSearch/${uid}`] = null
  updates[`publicDirectory/${uid}`] = null
  updates[`publicProfiles/${uid}`] = null
  if (Object.keys(updates).length) {
    await db.ref().update(updates).catch(() => {})
  }
}

async function apagarContaNaoVerificada(userRecord) {
  const uid = userRecord.uid
  const providers = (userRecord.providerData || []).map((p) => p.providerId)
  if (providers.includes('google.com')) return false
  if (!userRecord.email || userRecord.emailVerified) return false
  if (!providers.includes('password')) return false

  const created = new Date(userRecord.metadata.creationTime).getTime()
  if (!Number.isFinite(created)) return false
  if (Date.now() - created < HORAS_PARA_APAGAR * 60 * 60 * 1000) return false

  const db = admin.database()
  let prof = {}
  try {
    const snap = await db.ref(`users/${uid}/profile`).get()
    prof = snap.val() || {}
  } catch {
    /* ignore */
  }

  await limparIndicesBusca(uid, prof)
  await admin.auth().deleteUser(uid)
  logger.info('Conta e-mail não verificada removida', { uid, email: userRecord.email })
  return true
}

exports.limparContasEmailNaoVerificadas = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'America/Sao_Paulo',
    timeoutSeconds: 540,
  },
  async () => {
    let apagadas = 0
    let nextPageToken

    do {
      const batch = await admin.auth().listUsers(500, nextPageToken)
      for (const u of batch.users) {
        if (apagadas >= MAX_POR_EXECUCAO) break
        try {
          const ok = await apagarContaNaoVerificada(u)
          if (ok) apagadas += 1
        } catch (err) {
          logger.warn('Falha ao apagar conta não verificada', {
            uid: u.uid,
            message: err?.message || String(err),
          })
        }
      }
      if (apagadas >= MAX_POR_EXECUCAO) break
      nextPageToken = batch.pageToken
    } while (nextPageToken)

    logger.info('Limpeza de contas não verificadas concluída', { apagadas })
  }
)
