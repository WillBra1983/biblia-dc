/**
 * Callable: `enviarAvisoAdmin`.
 *
 * Permite que um usuário marcado como admin (`/users/{uid}/admin === true`)
 * dispare uma notificação push para o topic `novidades` (todos os
 * usuários que assinaram). Use para anunciar "novo devocional", "novo
 * estudo", etc.
 *
 * Exemplo de chamada do cliente (após login):
 * ```js
 * const fn = httpsCallable(functions, 'enviarAvisoAdmin')
 * await fn({ titulo: 'Novo estudo bíblico', mensagem: '...', url: '/estudos-biblicos' })
 * ```
 */

const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions/v2')
const { enviarParaTopic, enviarParaUsuarios } = require('./push')

const URL_ATUALIZACAO_FALLBACK = 'https://foundcine.com/biblia/'

/**
 * `cors: true` libera o preflight para qualquer origem. É seguro porque:
 *  1. Exigimos `req.auth?.uid` (usuário precisa ter autenticado no Firebase Auth).
 *  2. Validamos `users/{uid}/admin === true` antes de despachar a notificação.
 *
 * Diferente da 1ª geração, em Cloud Functions v2 `onCall` o CORS **não é
 * permissivo por padrão** — precisa ser declarado, ou requisições de outras
 * origens (ex.: `http://localhost:3000` em desenvolvimento) são bloqueadas
 * no preflight pelo navegador.
 */
exports.enviarAvisoAdmin = onCall(
  { region: 'us-central1', maxInstances: 5, cors: true },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')
    }

    // Verifica flag de admin no RTDB
    const flagSnap = await admin.database().ref(`users/${uid}/admin`).get()
    if (flagSnap.val() !== true) {
      throw new HttpsError('permission-denied', 'Apenas administradores podem enviar avisos.')
    }

    const titulo = String(req.data?.titulo || '').trim().slice(0, 120)
    const mensagem = String(req.data?.mensagem || '').trim().slice(0, 500)
    const url = String(req.data?.url || '/').trim().slice(0, 300)
    const atualizacaoApp = req.data?.atualizacaoApp === true
    const somenteParaMim = req.data?.somenteParaMim === true
    const topic = String(req.data?.topic || 'novidades').trim().slice(0, 50)

    if (!titulo || !mensagem) {
      throw new HttpsError('invalid-argument', 'Forneça `titulo` e `mensagem`.')
    }

    try {
      const avisoRef = somenteParaMim
        ? null
        : admin.database().ref('avisosAdmin').push()
      const data = {
        tipo: 'aviso',
        url: atualizacaoApp ? URL_ATUALIZACAO_FALLBACK : url,
        acao: atualizacaoApp ? 'atualizar_app' : 'abrir_destino',
        ...(avisoRef?.key ? { avisoId: avisoRef.key } : {})
      }
      if (somenteParaMim) {
        const resultado = await enviarParaUsuarios({
          uids: [uid],
          notification: { title: titulo, body: mensagem },
          data
        })
        if (!resultado?.sucesso) {
          throw new HttpsError(
            'failed-precondition',
            'Nenhum aparelho do administrador recebeu o teste. Verifique o login e as notificações.'
          )
        }
        logger.info('Teste de aviso admin enviado', { uid, resultado, atualizacaoApp })
        return { ok: true, teste: true, ...resultado }
      }

      const agora = Date.now()
      await avisoRef.set({
        titulo,
        mensagem,
        url: data.url,
        acao: data.acao,
        criadoEm: agora,
        expiraEm: agora + (30 * 24 * 60 * 60 * 1000),
      })

      const messageId = await enviarParaTopic({
        topic,
        notification: { title: titulo, body: mensagem },
        data
      })
      logger.info('Aviso admin enviado', { uid, topic, messageId })
      return { ok: true, messageId }
    } catch (e) {
      logger.error('Falha ao enviar aviso admin', { uid, topic, err: e?.message })
      throw new HttpsError('internal', e?.message || 'Falha ao enviar.')
    }
  }
)
