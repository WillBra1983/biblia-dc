/**
 * Mantém no topic `livros` apenas quem escolheu receber comunicações
 * editoriais. Diferente de `novidades`, a preferência padrão é false:
 * nenhum token entra sem consentimento expresso do usuário.
 */

const admin = require('./firebaseAdmin')
const {
  onValueCreated,
  onValueDeleted,
  onValueWritten,
} = require('firebase-functions/v2/database')
const { logger } = require('firebase-functions/v2')

const TOPIC = 'livros'

async function listarTokensDoUsuario(uid) {
  const snap = await admin.database().ref(`users/${uid}/fcmTokens`).get()
  if (!snap.exists()) return []
  const tokens = []
  snap.forEach((child) => {
    const valor = child.val() || {}
    if (typeof valor.token === 'string' && valor.token.length > 16) tokens.push(valor.token)
  })
  return tokens
}

async function preferenciaAtiva(uid) {
  const snap = await admin.database().ref(`users/${uid}/notif/preferencias/livros`).get()
  return snap.val() === true
}

exports.inscreverTokenNovoLivros = onValueCreated(
  { ref: '/users/{uid}/fcmTokens/{tokenKey}', region: 'us-central1' },
  async (event) => {
    const { uid } = event.params
    const valor = event.data?.val() || {}
    if (typeof valor.token !== 'string' || valor.token.length < 16) return
    if (!(await preferenciaAtiva(uid))) return
    try {
      await admin.messaging().subscribeToTopic([valor.token], TOPIC)
      logger.info('Token inscrito em livros', { uid })
    } catch (error) {
      logger.warn('Falha ao inscrever token em livros', { uid, err: error?.message })
    }
  }
)

exports.desinscreverTokenRemovidoLivros = onValueDeleted(
  { ref: '/users/{uid}/fcmTokens/{tokenKey}', region: 'us-central1' },
  async (event) => {
    const token = event.data?.val()?.token
    if (typeof token !== 'string' || token.length < 16) return
    try {
      await admin.messaging().unsubscribeFromTopic([token], TOPIC)
    } catch (_) { /* token já removido ou inválido */ }
  }
)

exports.aoMudarPreferenciaLivros = onValueWritten(
  { ref: '/users/{uid}/notif/preferencias/livros', region: 'us-central1' },
  async (event) => {
    const { uid } = event.params
    const ativadoAntes = event.data?.before?.val() === true
    const ativadoDepois = event.data?.after?.val() === true
    if (ativadoAntes === ativadoDepois) return

    const tokens = await listarTokensDoUsuario(uid)
    if (!tokens.length) return
    try {
      if (ativadoDepois) await admin.messaging().subscribeToTopic(tokens, TOPIC)
      else await admin.messaging().unsubscribeFromTopic(tokens, TOPIC)
      logger.info('Topic livros atualizado', { uid, ativadoDepois, tokens: tokens.length })
    } catch (error) {
      logger.warn('Falha ao atualizar topic livros', { uid, err: error?.message })
    }
  }
)

