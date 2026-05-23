/**
 * Mantém os tokens FCM dos usuários inscritos no topic `novidades`,
 * respeitando a preferência `users/{uid}/notif/preferencias/novidades`.
 *
 * Três triggers cuidam de manter tudo coerente:
 *
 *  1. **Token criado** (`/users/{uid}/fcmTokens/{key}`):
 *     se o usuário não desligou `novidades` (default `true`),
 *     inscrevemos o token no topic.
 *
 *  2. **Token removido** (mesmo path):
 *     desinscrevemos do topic. O FCM aceita `unsubscribeFromTopic` em
 *     tokens já inválidos sem erro.
 *
 *  3. **Preferência `novidades` mudou** (write em
 *     `/users/{uid}/notif/preferencias/novidades`): subscribe ou
 *     unsubscribe todos os tokens daquele usuário em massa.
 */

const admin = require('firebase-admin')
const {
  onValueCreated,
  onValueDeleted,
  onValueWritten
} = require('firebase-functions/v2/database')
const { logger } = require('firebase-functions/v2')

const TOPIC = 'novidades'

async function listarTokensDoUsuario(uid) {
  const snap = await admin.database().ref(`users/${uid}/fcmTokens`).get()
  if (!snap.exists()) return []
  const tokens = []
  snap.forEach((c) => {
    const v = c.val() || {}
    if (typeof v.token === 'string' && v.token.length > 16) tokens.push(v.token)
  })
  return tokens
}

async function prefNovidadesAtiva(uid) {
  const snap = await admin
    .database()
    .ref(`users/${uid}/notif/preferencias/novidades`)
    .get()
  // Default `true` (campo nunca foi gravado)
  return snap.exists() ? snap.val() !== false : true
}

exports.inscreverTokenNovoNovidades = onValueCreated(
  { ref: '/users/{uid}/fcmTokens/{tokenKey}', region: 'us-central1' },
  async (event) => {
    const { uid } = event.params
    const v = event.data?.val() || {}
    if (typeof v.token !== 'string' || v.token.length < 16) return
    if (!(await prefNovidadesAtiva(uid))) return
    try {
      await admin.messaging().subscribeToTopic([v.token], TOPIC)
      logger.info('Token inscrito em novidades', { uid })
    } catch (e) {
      logger.warn('Falha ao inscrever token em novidades', { uid, err: e?.message })
    }
  }
)

exports.desinscreverTokenRemovidoNovidades = onValueDeleted(
  { ref: '/users/{uid}/fcmTokens/{tokenKey}', region: 'us-central1' },
  async (event) => {
    const v = event.data?.val() || {}
    const token = typeof v.token === 'string' ? v.token : null
    if (!token || token.length < 16) return
    try {
      await admin.messaging().unsubscribeFromTopic([token], TOPIC)
    } catch (_) { /* ignora */ }
  }
)

exports.aoMudarPreferenciaNovidades = onValueWritten(
  {
    ref: '/users/{uid}/notif/preferencias/novidades',
    region: 'us-central1'
  },
  async (event) => {
    const { uid } = event.params
    const before = event.data?.before?.val()
    const after = event.data?.after?.val()
    const ativadoAntes = before !== false
    const ativadoDepois = after !== false
    if (ativadoAntes === ativadoDepois) return

    const tokens = await listarTokensDoUsuario(uid)
    if (tokens.length === 0) return

    try {
      if (ativadoDepois) {
        await admin.messaging().subscribeToTopic(tokens, TOPIC)
      } else {
        await admin.messaging().unsubscribeFromTopic(tokens, TOPIC)
      }
      logger.info('Topic novidades atualizado', { uid, ativadoDepois, tokens: tokens.length })
    } catch (e) {
      logger.warn('Falha ao atualizar topic novidades', { uid, err: e?.message })
    }
  }
)
