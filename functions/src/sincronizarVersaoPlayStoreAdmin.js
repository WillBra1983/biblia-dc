/**
 * Callable: `sincronizarVersaoPlayStoreAdmin`.
 * Lê a versão em produção na Google Play e atualiza RTDB (aviso in-app).
 * Só administradores. Requer secret PLAY_STORE_SERVICE_ACCOUNT.
 */

const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions/v2')
const {
  obterVersaoProducaoPlay,
  gravarVersaoAndroidRtdb,
} = require('./playStoreVersionLib')

async function assertAdmin(uid) {
  const flagSnap = await admin.database().ref(`users/${uid}/admin`).get()
  if (flagSnap.val() !== true) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem sincronizar a Play Store.')
  }
}

exports.sincronizarVersaoPlayStoreAdmin = onCall(
  {
    region: 'us-central1',
    maxInstances: 3,
    cors: true,
  },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')
    }
    await assertAdmin(uid)

    const saJson = process.env.PLAY_STORE_SERVICE_ACCOUNT || ''

    try {
      const play = await obterVersaoProducaoPlay(saJson)
      if (!play.versaoAtual) {
        throw new HttpsError(
          'not-found',
          'Nenhuma versão em produção encontrada na Play Store (faça o primeiro release ou use o script local).'
        )
      }

      const gravado = await gravarVersaoAndroidRtdb(admin, {
        versaoAtual: play.versaoAtual,
        versionCode: play.versionCode,
        origem: 'play-api-manual',
      })

      logger.info('sincronizarVersaoPlayStoreAdmin', {
        adminUid: uid,
        versaoAtual: play.versaoAtual,
        versionCode: play.versionCode,
      })

      return {
        ok: true,
        versaoAtual: play.versaoAtual,
        versionCode: play.versionCode,
        config: gravado,
      }
    } catch (e) {
      if (e instanceof HttpsError) throw e
      logger.error('sincronizarVersaoPlayStoreAdmin falhou', { err: e?.message })
      throw new HttpsError('internal', e?.message || 'Falha ao consultar a Play Store.')
    }
  }
)
