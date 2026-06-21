/**
 * Callable: reconstrói o ranking público do plano de leitura a partir dos
 * planos já salvos na nuvem. Qualquer utilizador autenticado pode solicitar,
 * com throttle global (7 dias) para evitar sobrecarga.
 */

const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions/v2')
const { reconstruirTodosRankingsPlano } = require('./planoLeituraRankingLib')

const THROTTLE_MS = 7 * 24 * 60 * 60 * 1000
const META_REF = 'appConfig/planoLeituraRanking/lastRebuildAt'

exports.atualizarRankingPlanoLeitura = onCall(
  { region: 'us-central1', maxInstances: 1, timeoutSeconds: 540, cors: true },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')
    }
    if (req.auth.token.email_verified !== true) {
      throw new HttpsError('permission-denied', 'Confirme seu e-mail para atualizar o ranking.')
    }

    const db = admin.database()
    const metaRef = db.ref(META_REF)
    const now = Date.now()

    const txn = await metaRef.transaction((current) => {
      const lastAt = typeof current === 'number' ? current : 0
      if (lastAt && now - lastAt < THROTTLE_MS) return undefined
      return now
    })

    if (!txn.committed) {
      return { ok: true, skipped: true, throttled: true }
    }

    const stats = await reconstruirTodosRankingsPlano(db)

    logger.info('atualizarRankingPlanoLeitura', { solicitanteUid: uid, ...stats })

    return { ok: true, skipped: false, ...stats }
  }
)
