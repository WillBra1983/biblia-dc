/**
 * Callable: `geminiGenerateContent` — proxy seguro para a API Gemini.
 * Exige autenticação Firebase; chave só no servidor (secret GEMINI_API_KEY).
 */

const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { logger } = require('firebase-functions/v2')

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

const LIMITE_DIARIO = 80
const LIMITE_DIARIO_ADMIN = 500
const MAX_BODY_BYTES = 500_000

async function verificarCota(uid, isAdmin) {
  const hoje = new Date().toISOString().slice(0, 10)
  const ref = admin.database().ref(`users/${uid}/geminiUsage/${hoje}`)
  const limite = isAdmin ? LIMITE_DIARIO_ADMIN : LIMITE_DIARIO

  const resultado = await ref.transaction((atual) => {
    const count = Number(atual?.count) || 0
    if (count >= limite) return
    return {
      count: count + 1,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    }
  })

  if (!resultado.committed) {
    throw new HttpsError(
      'resource-exhausted',
      `Cota diária de IA atingida (${limite} pedidos). Tente amanhã.`
    )
  }
}

exports.geminiGenerateContent = onCall(
  {
    region: 'us-central1',
    maxInstances: 10,
    cors: true,
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 120
  },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'É preciso estar autenticado para usar a IA.')
    }

    const adminSnap = await admin.database().ref(`users/${uid}/admin`).get()
    const isAdmin = adminSnap.val() === true
    await verificarCota(uid, isAdmin)

    const model = String(req.data?.model || '').trim()
    const body = req.data?.body
    if (!model || !body || typeof body !== 'object' || Array.isArray(body)) {
      throw new HttpsError('invalid-argument', 'Forneça `model` (string) e `body` (objeto).')
    }

    const bodyStr = JSON.stringify(body)
    if (bodyStr.length > MAX_BODY_BYTES) {
      throw new HttpsError('invalid-argument', 'Corpo da requisição excede o limite permitido.')
    }

    const apiKey = GEMINI_API_KEY.value()
    if (!apiKey || apiKey.length < 8) {
      throw new HttpsError(
        'failed-precondition',
        'Chave Gemini não configurada no servidor. Defina o secret GEMINI_API_KEY.'
      )
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
      `:generateContent?key=${encodeURIComponent(apiKey)}`

    let res
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr
      })
    } catch (e) {
      logger.error('Gemini proxy: falha de rede', { uid, err: e?.message })
      throw new HttpsError('unavailable', e?.message || 'Falha de rede ao chamar a IA.')
    }

    const data = await res.json().catch(() => ({}))
    logger.info('Gemini proxy', { uid, model, status: res.status })

    return {
      ok: res.ok,
      status: res.status,
      data,
      code: res.ok ? null : 'API'
    }
  }
)
