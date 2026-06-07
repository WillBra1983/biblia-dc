/**
 * Cron: sincroniza versão Android da Play Store → RTDB (a cada 12 h).
 * Só corre se PLAY_STORE_SERVICE_ACCOUNT estiver definido.
 */

const admin = require('firebase-admin')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { logger } = require('firebase-functions/v2')
const {
  obterVersaoProducaoPlay,
  gravarVersaoAndroidRtdb,
} = require('./playStoreVersionLib')

exports.sincronizarVersaoPlayStoreCron = onSchedule(
  {
    schedule: 'every 12 hours',
    timeZone: 'America/Sao_Paulo',
    region: 'us-central1',
  },
  async () => {
    const saJson = process.env.PLAY_STORE_SERVICE_ACCOUNT || ''

    try {
      const play = await obterVersaoProducaoPlay(saJson)
      if (!play.versaoAtual) {
        logger.info('sincronizarVersaoPlayStoreCron: sem release em produção.')
        return
      }

      await gravarVersaoAndroidRtdb(admin, {
        versaoAtual: play.versaoAtual,
        versionCode: play.versionCode,
        origem: 'play-api-cron',
      })

      logger.info('sincronizarVersaoPlayStoreCron ok', {
        versaoAtual: play.versaoAtual,
        versionCode: play.versionCode,
      })
    } catch (e) {
      logger.error('sincronizarVersaoPlayStoreCron falhou', { err: e?.message })
    }
  }
)
