/**
 * Lê a versão em produção na Google Play (Android Publisher API v3)
 * e grava em `appConfig/lojaVersao/android` no RTDB.
 *
 * Pré-requisito: conta de serviço com acesso à Play Console
 * (Utilizadores e permissões → Acesso à API → vincular projeto Google Cloud).
 * Secret: PLAY_STORE_SERVICE_ACCOUNT (JSON da conta de serviço).
 */

const PACKAGE = 'com.bibliadc.app'
const RTDB_ANDROID = 'appConfig/lojaVersao/android'
const URL_PLAY_PADRAO = `https://play.google.com/store/apps/details?id=${PACKAGE}`

function parseServiceAccount(raw) {
  if (!raw || typeof raw !== 'string') return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function extrairVersaoSemver(texto) {
  const s = String(texto || '').trim()
  const m = s.match(/\d+\.\d+(?:\.\d+)?/)
  return m ? m[0] : s
}

/**
 * @param {string} serviceAccountJson
 * @returns {Promise<{ versaoAtual: string, versionCode: number|null, track: string }>}
 */
async function obterVersaoProducaoPlay(serviceAccountJson) {
  const { google } = require('googleapis')

  let auth
  const creds = parseServiceAccount(serviceAccountJson)
  if (creds?.client_email) {
    auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    })
  } else {
    auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    })
  }

  const androidpublisher = google.androidpublisher({ version: 'v3', auth })
  const { data: editData } = await androidpublisher.edits.insert({ packageName: PACKAGE })
  const editId = editData.id
  if (!editId) throw new Error('Play API não devolveu editId.')

  try {
    const { data: track } = await androidpublisher.edits.tracks.get({
      packageName: PACKAGE,
      editId,
      track: 'production',
    })

    const releases = Array.isArray(track.releases) ? track.releases : []
    const ativa =
      releases.find((r) => r.status === 'completed') ||
      releases.find((r) => r.status === 'inProgress') ||
      releases[0]

    if (!ativa?.versionCodes?.length) {
      return { versaoAtual: '', versionCode: null, track: 'production' }
    }

    const versionCode = Math.max(...ativa.versionCodes.map(Number).filter(Number.isFinite))
    const nomeRelease = String(ativa.name || '').trim()
    let versaoAtual = extrairVersaoSemver(nomeRelease)

    if (!versaoAtual && Number.isFinite(versionCode)) {
      versaoAtual = String(versionCode)
    }

    return { versaoAtual, versionCode, track: 'production' }
  } finally {
    await androidpublisher.edits.delete({ packageName: PACKAGE, editId }).catch(() => {})
  }
}

/**
 * @param {import('firebase-admin')} admin
 * @param {{ versaoAtual: string, versionCode?: number|null, origem: string }} dados
 */
async function gravarVersaoAndroidRtdb(admin, { versaoAtual, versionCode, origem }) {
  const ref = admin.database().ref(RTDB_ANDROID)
  const snap = await ref.get()
  const cur = snap.val() || {}

  const patch = {
    versaoAtual: String(versaoAtual || '').trim() || cur.versaoAtual || '',
    sincronizadoEm: Date.now(),
    origem: origem || 'play-api',
  }

  if (Number.isFinite(versionCode)) {
    patch.versionCode = versionCode
  }

  if (!cur.urlLoja) {
    patch.urlLoja = URL_PLAY_PADRAO
  }

  await ref.update(patch)
  return { ...cur, ...patch }
}

module.exports = {
  PACKAGE,
  RTDB_ANDROID,
  URL_PLAY_PADRAO,
  parseServiceAccount,
  obterVersaoProducaoPlay,
  gravarVersaoAndroidRtdb,
}
