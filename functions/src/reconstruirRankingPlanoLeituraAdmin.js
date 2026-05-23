/**
 * Callable: reconstrói `planoLeituraRanking` a partir de todos os
 * `users/{uid}/planoLeitura` já existentes no RTDB (backfill único).
 *
 * Não exige que cada utilizador abra o app — lê o que já está na nuvem.
 */

const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions/v2')
const { sincronizarRankingDoPlano } = require('./planoLeituraRankingLib')

async function assertAdmin(uid) {
  const flagSnap = await admin.database().ref(`users/${uid}/admin`).get()
  if (!flagSnap.exists() || flagSnap.val() !== true) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem reconstruir o ranking.')
  }
}

exports.reconstruirRankingPlanoLeituraAdmin = onCall(
  { region: 'us-central1', maxInstances: 1, timeoutSeconds: 540, cors: true },
  async (req) => {
    const adminUid = req.auth?.uid
    if (!adminUid) {
      throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')
    }
    await assertAdmin(adminUid)

    const db = admin.database()
    const usersSnap = await db.ref('users').get()
    if (!usersSnap.exists()) {
      return { ok: true, processados: 0, publicados: 0, removidos: 0, ignorados: 0 }
    }

    let ignorados = 0
    const tarefas = []

    usersSnap.forEach((userChild) => {
      const uid = userChild.key
      if (!uid) return
      const dados = userChild.val() || {}
      const planoLeitura = dados.planoLeitura
      if (!planoLeitura || typeof planoLeitura !== 'object') {
        ignorados += 1
        return
      }
      const profile = dados.profile && typeof dados.profile === 'object' ? dados.profile : {}
      tarefas.push(
        sincronizarRankingDoPlano(db, uid, planoLeitura, profile).catch((err) => {
          logger.warn('reconstruirRanking: uid', { uid, err: err?.message })
          return 'skipped'
        })
      )
    })

    const resultados = await Promise.all(tarefas)
    const processados = resultados.length
    const publicados = resultados.filter((r) => r === 'published').length
    const removidos = resultados.filter((r) => r === 'removed').length

    logger.info('reconstruirRankingPlanoLeituraAdmin', {
      adminUid,
      processados,
      publicados,
      removidos,
      ignorados,
    })

    return {
      ok: true,
      processados,
      publicados,
      removidos,
      ignorados,
    }
  }
)
