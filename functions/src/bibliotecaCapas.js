const admin = require('./firebaseAdmin')
const crypto = require('crypto')
const { onCall, HttpsError } = require('firebase-functions/v2/https')

const TIPOS_PERMITIDOS = new Set(['image/webp', 'image/jpeg', 'image/png'])
const MAX_BYTES = 4 * 1024 * 1024

function idSeguro(valor) {
  return String(valor || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 100)
}

exports.enviarCapaBiblioteca = onCall(
  { region: 'us-central1', maxInstances: 3, timeoutSeconds: 60, cors: true },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')

    const adminSnap = await admin.database().ref(`users/${uid}/admin`).get()
    if (adminSnap.val() !== true) {
      throw new HttpsError('permission-denied', 'Apenas administradores podem enviar capas.')
    }

    const livroId = idSeguro(req.data?.livroId)
    const contentType = String(req.data?.contentType || '').toLowerCase()
    const base64 = String(req.data?.base64 || '')
    if (!livroId || !TIPOS_PERMITIDOS.has(contentType) || !base64) {
      throw new HttpsError('invalid-argument', 'Dados da capa inválidos.')
    }

    let bytes
    try {
      bytes = Buffer.from(base64, 'base64')
    } catch {
      throw new HttpsError('invalid-argument', 'Não foi possível interpretar a imagem.')
    }
    if (!bytes.length || bytes.length > MAX_BYTES) {
      throw new HttpsError('invalid-argument', 'A capa otimizada deve ter no máximo 4 MB.')
    }

    const extensao = contentType === 'image/png' ? 'png' : contentType === 'image/jpeg' ? 'jpg' : 'webp'
    const caminho = `bibliotecaCapas/${livroId}/capa.${extensao}`
    const token = crypto.randomUUID()
    const bucket = admin.storage().bucket()
    await bucket.file(caminho).save(bytes, {
      resumable: false,
      metadata: {
        contentType,
        cacheControl: 'public,max-age=86400',
        metadata: { firebaseStorageDownloadTokens: token },
      },
    })

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(caminho)}?alt=media&token=${token}`
    return { ok: true, url }
  },
)
