/**
 * Helpers de envio de push notifications (FCM) e gestão de tokens.
 *
 * Modelo de dados no RTDB
 * -----------------------
 * /users/{uid}/fcmTokens/{tokenSeguro} = {
 *   token: string,         // token original (não use a chave, ela é base64url)
 *   plataforma: 'web' | 'android' | 'ios',
 *   userAgent: string,
 *   criadoEm: number       // ms epoch
 * }
 *
 * /users/{uid}/notif/preferencias = {
 *   chat: boolean,
 *   novidades: boolean,
 *   lembreteDevocional: boolean,
 *   lembretePlano: boolean,
 *   horarioLembrete: 'HH:mm'  // ex.: '07:00'
 * }
 *
 * Por que `tokenSeguro` ?
 * -----------------------
 * Tokens FCM contêm `:` e `/`, que não podem ser usados como chaves no RTDB.
 * O cliente codifica em base64url antes de gravar e o servidor decodifica
 * — ou simplesmente lê o campo `token` do objeto, que é o valor "limpo".
 */

const admin = require('firebase-admin')

function db() {
  return admin.database()
}

function fcm() {
  return admin.messaging()
}

/**
 * Calcula o total de mensagens não lidas de um usuário (soma de todos os
 * `unreadCount` em `/users/{uid}/chatList/{chatId}`). Usado para enviar o
 * número do badge no push, para que o ícone do app no Android/iOS reflita
 * o total de pendências mesmo com o app fechado.
 */
async function obterBadgeUsuario(uid) {
  if (!uid) return 0
  const snap = await db().ref(`users/${uid}/chatList`).get()
  if (!snap.exists()) return 0
  let total = 0
  snap.forEach((c) => {
    const n = Number(c.child('unreadCount').val()) || 0
    if (n > 0) total += n
  })
  return Math.min(999, total)
}

/**
 * Lê todos os tokens FCM ativos de um usuário.
 * @param {string} uid
 * @returns {Promise<Array<{token: string, plataforma: string}>>}
 */
async function listarTokens(uid) {
  if (!uid) return []
  const snap = await db().ref(`users/${uid}/fcmTokens`).get()
  if (!snap.exists()) return []
  const out = []
  snap.forEach((child) => {
    const v = child.val() || {}
    if (typeof v.token === 'string' && v.token.length > 16) {
      out.push({ token: v.token, plataforma: v.plataforma || 'web' })
    }
  })
  return out
}

/**
 * Lê as preferências de notificação de um usuário (com defaults seguros).
 * @param {string} uid
 */
async function obterPreferencias(uid) {
  if (!uid) return defaultPrefs()
  const snap = await db().ref(`users/${uid}/notif/preferencias`).get()
  const v = snap.exists() ? snap.val() : null
  return { ...defaultPrefs(), ...(v || {}) }
}

function defaultPrefs() {
  return {
    chat: true,
    novidades: true,
    lembreteDevocional: false,
    lembretePlano: false,
    horarioLembrete: '07:00'
  }
}

/**
 * Remove tokens FCM que o servidor reportou como inválidos/expirados.
 * @param {string} uid
 * @param {Array<string>} tokensInvalidos
 */
async function removerTokensInvalidos(uid, tokensInvalidos) {
  if (!uid || !tokensInvalidos?.length) return
  const refTokens = db().ref(`users/${uid}/fcmTokens`)
  const snap = await refTokens.get()
  if (!snap.exists()) return
  const ops = {}
  snap.forEach((child) => {
    const v = child.val() || {}
    if (tokensInvalidos.includes(v.token)) {
      ops[child.key] = null
    }
  })
  if (Object.keys(ops).length) {
    await refTokens.update(ops)
  }
}

/**
 * Envia push para todos os tokens de um conjunto de UIDs.
 *
 * @param {object} params
 * @param {Array<string>} params.uids                Lista de destinatários.
 * @param {object}        params.notification        { title, body, image? }.
 * @param {object}        [params.data]              Carga adicional (strings).
 * @param {string}        [params.categoria]         Para checar preferências.
 *   Aceita: 'chat' | 'novidades' | 'lembreteDevocional' | 'lembretePlano'.
 *   Se omitido, ignoramos preferências e enviamos a todos.
 * @param {boolean}       [params.computarBadge=false]
 *   Quando `true`, calculamos o total de mensagens não lidas do
 *   destinatário e enviamos como badge para Android/iOS. Use em
 *   notificações de chat.
 */
async function enviarParaUsuarios({ uids, notification, data = {}, categoria, computarBadge = false }) {
  if (!Array.isArray(uids) || uids.length === 0) return { sucesso: 0, falhas: 0 }

  /** @type {Array<{uid:string, token:string, badge:number}>} */
  const alvosTokens = []
  await Promise.all(uids.map(async (uid) => {
    if (categoria) {
      const prefs = await obterPreferencias(uid)
      if (!prefs[categoria]) return
    }
    const tokens = await listarTokens(uid)
    const badge = computarBadge ? await obterBadgeUsuario(uid) : 0
    for (const t of tokens) alvosTokens.push({ uid, token: t.token, badge })
  }))

  if (alvosTokens.length === 0) return { sucesso: 0, falhas: 0 }

  // Para incluir badge correto por usuário, montamos um Message para cada
  // destinatário e usamos `sendEach`. Em multicast comum não dá pra ter
  // badge diferente por usuário no mesmo lote.
  const dataStr = stringifyData(data)
  const messages = alvosTokens.map((x) => ({
    token: x.token,
    notification,
    data: dataStr,
    android: {
      priority: 'high',
      notification: {
        channelId: 'principal',
        defaultSound: true,
        defaultVibrateTimings: true,
        ...(computarBadge && x.badge ? { notificationCount: x.badge } : {})
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          'mutable-content': 1,
          ...(computarBadge ? { badge: x.badge } : {})
        }
      }
    },
    webpush: {
      fcmOptions: { link: data?.url || '/' },
      notification: {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png'
      }
    }
  }))

  // FCM aceita até 500 messages por chamada `sendEach`.
  const lotes = []
  for (let i = 0; i < messages.length; i += 500) {
    lotes.push(messages.slice(i, i + 500))
  }

  let sucesso = 0
  let falhas = 0
  for (const lote of lotes) {
    const resp = await fcm().sendEach(lote)
    sucesso += resp.successCount
    falhas += resp.failureCount

    // Coleta tokens inválidos por usuário e remove
    const porUid = new Map()
    resp.responses.forEach((r, idx) => {
      if (r.success) return
      const erroCode = r.error?.code || ''
      const ehInvalido =
        erroCode === 'messaging/invalid-registration-token' ||
        erroCode === 'messaging/registration-token-not-registered'
      if (!ehInvalido) return
      const alvo = alvosTokens[idx]
      if (!porUid.has(alvo.uid)) porUid.set(alvo.uid, [])
      porUid.get(alvo.uid).push(alvo.token)
    })
    for (const [uid, toks] of porUid) {
      await removerTokensInvalidos(uid, toks)
    }
  }

  return { sucesso, falhas }
}

/** Converte qualquer payload em string-map exigido pelo FCM `data`. */
function stringifyData(obj) {
  const out = {}
  if (!obj || typeof obj !== 'object') return out
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    out[String(k)] = typeof v === 'string' ? v : JSON.stringify(v)
  }
  return out
}

/**
 * Envia push para um topic do FCM (ex.: 'novidades').
 * Use em anúncios gerais.
 */
async function enviarParaTopic({ topic, notification, data = {} }) {
  if (!topic) throw new Error('topic é obrigatório')
  return await fcm().send({
    topic,
    notification,
    data: stringifyData(data),
    android: {
      priority: 'high',
      notification: { channelId: 'principal' }
    },
    webpush: { fcmOptions: { link: data?.url || '/' } }
  })
}

module.exports = {
  listarTokens,
  obterBadgeUsuario,
  obterPreferencias,
  removerTokensInvalidos,
  enviarParaUsuarios,
  enviarParaTopic
}
