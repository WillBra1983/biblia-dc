/**
 * Callable: `registrarVisualizacaoSecao`.
 *
 * Incrementa contadores de visualização por secção (uma chamada = uma visita
 * já deduplicada no cliente por entrada). Mantém:
 *   - `adminMetrics/sectionViews/total/{key}` — sempre
 *   - `adminMetrics/sectionViews/daily/{YYYY-MM-DD}/{key}` — dia (America/Sao_Paulo)
 *
 * Qualquer utilizador autenticado pode registar (evita spam anónimo). Só
 * admins leem os números (regras RTDB). Utilizadores com `users/{uid}/admin`
 * não incrementam contadores (navegação de revisão não distorce métricas).
 */

const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions/v2')

const STATIC_KEYS = new Set([
  'biblia',
  'plano_leitura_biblia',
  'plano_leitura',
  'discipulado',
  'hinario_letra',
  'hinario_cifras',
  'confissao',
  'catecismo_maior',
  'catecismo_breve',
  'devocional',
  'mais_de_deus',
  'youtube',
  'quiz_retiro',
  'versiculos_marcados',
  'versiculos_compartilhados',
  'biblioteca_estudos',
  'chat',
  'config_notificacoes',
  'admin_notificar',
  'sobre',
  'hinario_editor',
  'estudos_biblicos',
  'estudos_biblicos_novo',
  'estudos_biblicos_gerir',
  'estudos_ia_passagem',
  'estudos_ia_pericope',
  'estudos_biblicos_abrir',
  'estudos_biblicos_resultado',
  'admin_usuarios',
])

function dataHojeBr() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function sectionKeyValida(key) {
  if (typeof key !== 'string' || key.length < 1 || key.length > 120) return false
  if (STATIC_KEYS.has(key)) return true
  if (/^discipulado:[a-zA-Z0-9_-]{1,64}(:[a-zA-Z0-9_-]{1,64})?$/.test(key)) return true
  if (/^estudos_biblicos:[a-zA-Z0-9_-]{1,80}$/.test(key)) return true
  if (/^devocional:[a-zA-Z0-9_-]{1,40}$/.test(key)) return true
  if (/^estudo_strong:[a-zA-Z0-9_-]{1,40}$/.test(key)) return true
  if (/^estudo_strong_resumo:[a-zA-Z0-9_-]{1,40}$/.test(key)) return true
  return false
}

exports.registrarVisualizacaoSecao = onCall(
  { region: 'us-central1', maxInstances: 20, cors: true },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')
    }

    const sectionKey = String(req.data?.sectionKey || '').trim()
    if (!sectionKeyValida(sectionKey)) {
      throw new HttpsError('invalid-argument', 'Chave de secção inválida.')
    }

    const adminSnap = await admin.database().ref(`users/${uid}/admin`).get()
    if (adminSnap.val() === true) {
      return { ok: true, skipped: true, reason: 'admin' }
    }

    const db = admin.database()
    const dia = dataHojeBr()
    const refTotal = db.ref(`adminMetrics/sectionViews/total/${sectionKey}`)
    const refDaily = db.ref(`adminMetrics/sectionViews/daily/${dia}/${sectionKey}`)

    try {
      await Promise.all([
        refTotal.transaction((c) => (typeof c === 'number' && c >= 0 ? c : 0) + 1),
        refDaily.transaction((c) => (typeof c === 'number' && c >= 0 ? c : 0) + 1),
      ])
      logger.info('Visualização secção', { uid, sectionKey, dia })
      return { ok: true }
    } catch (e) {
      logger.error('Falha registrar visualização', { uid, sectionKey, err: e?.message })
      throw new HttpsError('internal', e?.message || 'Falha ao registar.')
    }
  }
)
