/**
 * Trigger: nova mensagem em `/chats/{chatId}/messages/{msgId}`.
 *
 * Envia push para todos os outros participantes do chat. Filtra:
 * - Próprio remetente (não recebe push de si mesmo).
 * - Quem desativou push de chat em `users/{uid}/notif/preferencias/chat`.
 */

const admin = require('firebase-admin')
const { onValueCreated } = require('firebase-functions/v2/database')
const { logger } = require('firebase-functions/v2')
const { enviarParaUsuarios } = require('./push')

/** Tipos de exportação convertidos em texto amigável para a notificação. */
const RESUMO_EXPORT = {
  discipulado: 'Compartilhou progresso de discipulado',
  versiculos_marcados: 'Compartilhou versículos marcados',
  biblia_versiculos: 'Compartilhou versículos da Bíblia',
  devocional: 'Compartilhou devocional',
  mais_de_deus: 'Compartilhou "Mais de Deus"',
  quiz: 'Compartilhou progresso do Quiz',
  estudo_biblico: 'Compartilhou estudo bíblico',
  prova_biblica: 'Compartilhou resultado de avaliação'
}

exports.pushChatMensagem = onValueCreated(
  {
    ref: '/chats/{chatId}/messages/{msgId}',
    region: 'us-central1'
  },
  async (event) => {
    const snap = event.data
    if (!snap?.exists()) return
    const msg = snap.val() || {}
    const { chatId, msgId } = event.params

    const senderUid = String(msg.senderUid || '').trim()
    if (!senderUid) {
      logger.warn('Mensagem sem senderUid; pulando push.', { chatId, msgId })
      return
    }

    // Participantes do chat
    const partSnap = await admin.database().ref(`chats/${chatId}/participants`).get()
    if (!partSnap.exists()) return
    const destinatarios = []
    partSnap.forEach((c) => {
      if (c.key && c.key !== senderUid && c.val() === true) destinatarios.push(c.key)
    })
    if (destinatarios.length === 0) return

    // Texto da notificação
    const nome = (msg.senderDisplayName || msg.senderEmail || 'Alguém').toString().slice(0, 80)
    let corpo = String(msg.text || '').trim()
    if (msg.exportKind && RESUMO_EXPORT[msg.exportKind]) {
      corpo = RESUMO_EXPORT[msg.exportKind]
    }
    if (!corpo) corpo = 'Enviou uma mensagem'
    if (corpo.length > 180) corpo = corpo.slice(0, 177) + '…'

    const result = await enviarParaUsuarios({
      uids: destinatarios,
      categoria: 'chat',
      computarBadge: true,
      notification: {
        title: nome,
        body: corpo
      },
      data: {
        tipo: 'chat',
        chatId,
        msgId,
        peerUid: senderUid,
        url: `/chat?id=${encodeURIComponent(chatId)}`
      }
    })

    logger.info('Push de chat enviado', {
      chatId,
      destinatarios: destinatarios.length,
      sucesso: result.sucesso,
      falhas: result.falhas
    })
  }
)
