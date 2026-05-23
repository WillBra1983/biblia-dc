/**
 * Quando o plano de leitura é gravado em `users/{uid}/planoLeitura`,
 * publica/atualiza `planoLeituraRanking/{uid}`.
 */

const admin = require('firebase-admin')
const { onValueWritten } = require('firebase-functions/v2/database')
const { logger } = require('firebase-functions/v2')
const { sincronizarRankingDoPlano } = require('./planoLeituraRankingLib')

exports.onPlanoLeituraRankingSync = onValueWritten(
  {
    ref: '/users/{uid}/planoLeitura',
    region: 'us-central1',
  },
  async (event) => {
    const uid = String(event.params.uid || '').trim()
    if (!uid) return

    const after = event.data.after
    const db = admin.database()

    if (!after.exists()) {
      await db.ref(`planoLeituraRanking/${uid}`).remove().catch(() => {})
      return
    }

    const val = after.val() || {}
    let profile = {}
    try {
      const profSnap = await db.ref(`users/${uid}/profile`).get()
      profile = profSnap.val() || {}
    } catch (e) {
      logger.warn('onPlanoLeituraRanking: perfil', { uid, err: e?.message })
    }

    try {
      await sincronizarRankingDoPlano(db, uid, val, profile)
    } catch (e) {
      logger.error('onPlanoLeituraRanking: falha', { uid, err: e?.message })
    }
  }
)
