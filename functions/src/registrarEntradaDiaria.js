/**
 * Registra uma presença por utilizador e por dia.
 *
 * O histórico não depende de `users/{uid}/profile/lastAccessAt`, pois esse
 * campo representa apenas o acesso mais recente e é sobrescrito a cada uso.
 */

const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions/v2')

function dataHojeBr() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

exports.registrarEntradaDiaria = onCall(
  { region: 'us-central1', maxInstances: 20, cors: true },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')
    }

    const db = admin.database()
    const adminSnap = await db.ref(`users/${uid}/admin`).get()
    if (adminSnap.val() === true) {
      return { ok: true, skipped: true, reason: 'admin' }
    }

    const dia = dataHojeBr()
    const agora = Date.now()
    const entradaRef = db.ref(`adminMetrics/userAccess/daily/${dia}/${uid}`)

    try {
      await entradaRef.transaction((atual) => {
        const anterior = atual && typeof atual === 'object' ? atual : {}
        return {
          firstAccessAt:
            typeof anterior.firstAccessAt === 'number' ? anterior.firstAccessAt : agora,
          lastAccessAt: agora,
        }
      })
      return { ok: true, dia }
    } catch (e) {
      logger.error('Falha ao registrar entrada diária', { uid, dia, err: e?.message })
      throw new HttpsError('internal', e?.message || 'Falha ao registrar entrada diária.')
    }
  }
)

exports.dataHojeBr = dataHojeBr
