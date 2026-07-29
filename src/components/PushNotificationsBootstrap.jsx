/**
 * Bootstrap de Push Notifications.
 *
 * Responsabilidades:
 *  - No **app nativo** (Android/iOS via Capacitor): assim que o usuário
 *    está autenticado e a Bíblia carregou, ativa push automaticamente.
 *    Em iOS isso dispara o popup de permissão (padrão da plataforma).
 *  - Na **web/PWA**: NÃO ativa automaticamente. Quem ativa é a tela de
 *    Configurações de notificação (gesto explícito do usuário).
 *  - Em ambos os casos: escuta o evento global `salvation-push-tap`
 *    (emitido pelo serviço quando o usuário toca em uma notificação) e
 *    navega para a URL embutida no payload.
 *  - Em foreground (app aberto): exibe um snackbar discreto avisando da
 *    mensagem (sem disparar notificação do sistema, para não duplicar
 *    com o cabeçalho do iOS/Android).
 *
 * Este componente não renderiza nada — é só lógica.
 */

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import {
  ativarListenerToquePushNativo,
  ativarPushNotifications,
  desativarPushNotifications,
  exibirPushComoNotificacaoSistema,
} from '../services/notificacoesPushService'
import {
  listarAvisosAdminPendentes,
  marcarAvisoAdminEntregue,
  registrarAvisoAdminEntregueLocalmente,
} from '../services/avisosAdminService'
import { mostrarSnackbar } from '../utils/uiDialogs'
import { abrirUrlExterna } from '../utils/abrirUrlExterna'
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '../utils/appStoreLinks'

export default function PushNotificationsBootstrap() {
  const { user } = useFirebaseAuth()
  const navigate = useNavigate()
  const ativadoRef = useRef(false)
  const ultimoUidRef = useRef(null)

  // O toque pode abrir o app antes de o Firebase restaurar o login. Por isso,
  // este listener nasce no boot e não espera os cinco segundos do push.
  useEffect(() => {
    if (!Capacitor.isNativePlatform?.()) return
    void ativarListenerToquePushNativo()
  }, [])

  // Ativa push automaticamente no app nativo após login.
  useEffect(() => {
    const uid = user?.uid || null
    if (uid === ultimoUidRef.current) return

    // Mudou o usuário (login, troca de conta, ou logout)
    const uidAnterior = ultimoUidRef.current
    ultimoUidRef.current = uid

    // Logout: desativa
    if (!uid && uidAnterior) {
      void desativarPushNotifications(uidAnterior)
      ativadoRef.current = false
      return
    }
    if (!uid) return

    // Login: só ativa automaticamente no app nativo
    if (!Capacitor.isNativePlatform()) return
    if (ativadoRef.current) return

    // Atraso para não competir com o boot
    const t = window.setTimeout(async () => {
      try {
        const res = await ativarPushNotifications({
          uid,
          onMessage: (payload) => {
            const avisoId = payload?.data?.avisoId
            if (avisoId) void marcarAvisoAdminEntregue(uid, avisoId)
            if (!payload?.exibidaNoSistema) exibirSnackbarPush(payload)
          }
        })
        if (res?.ok) ativadoRef.current = true
      } catch (_) {
        // silencioso — usuário pode ativar manualmente nas Configurações
      }
    }, 5000)

    return () => window.clearTimeout(t)
  }, [user?.uid])

  // Se o comunicado foi enviado enquanto a conta estava desconectada, ele
  // permanece no servidor e é entregue assim que a sessão for restaurada.
  useEffect(() => {
    const uid = user?.uid
    if (!uid) return undefined
    let cancelado = false
    const t = window.setTimeout(async () => {
      try {
        const pendentes = await listarAvisosAdminPendentes(uid)
        for (const aviso of pendentes) {
          if (cancelado) return
          const payload = {
            notification: { title: aviso.titulo, body: aviso.mensagem },
            data: {
              avisoId: aviso.id,
              tipo: 'aviso',
              url: aviso.url,
              acao: aviso.acao,
            }
          }
          const exibida = await exibirPushComoNotificacaoSistema(payload)
          if (!exibida) exibirSnackbarPush(payload)
          await marcarAvisoAdminEntregue(uid, aviso.id)
        }
      } catch (_) {
        // A entrega direta pelo FCM continua funcionando; tentamos novamente
        // no próximo login se o histórico estiver temporariamente indisponível.
      }
    }, 2500)
    return () => {
      cancelado = true
      window.clearTimeout(t)
    }
  }, [user?.uid])

  // Escuta tap em notificação (no nativo: emitido por
  // `pushNotificationActionPerformed`; no SW web: emitido em
  // `notificationclick`, que abre o app na URL).
  useEffect(() => {
    function aoTap(e) {
      const url = e?.detail?.url
      const acao = e?.detail?.data?.acao
      const avisoId = e?.detail?.data?.avisoId
      if (avisoId) {
        registrarAvisoAdminEntregueLocalmente(avisoId)
        if (user?.uid) void marcarAvisoAdminEntregue(user.uid, avisoId)
      }
      if (acao === 'atualizar_app') {
        const plataforma = Capacitor.getPlatform?.()
        const destino = plataforma === 'ios'
          ? APP_STORE_URL
          : plataforma === 'android'
            ? GOOGLE_PLAY_URL
            : 'https://foundcine.com/biblia/'
        void abrirUrlExterna(destino)
        return
      }

      if (typeof url === 'string' && url.startsWith('/')) {
        navigate(url)
        return
      }

      if (typeof url === 'string') {
        try {
          const destino = new URL(url)
          if (destino.protocol === 'https:') {
            void abrirUrlExterna(destino.toString())
          }
        } catch {
          // Ignora destinos externos inválidos recebidos na notificação.
        }
      }
    }
    window.addEventListener('salvation-push-tap', aoTap)
    return () => window.removeEventListener('salvation-push-tap', aoTap)
  }, [navigate, user?.uid])

  return null
}

/** Mostra um snackbar quando chega push com app em foreground. */
function exibirSnackbarPush(payload) {
  const titulo = payload?.notification?.title || 'Bíblia DC'
  const corpo = payload?.notification?.body || ''
  const mensagem = corpo ? `${titulo}: ${corpo}` : titulo
  mostrarSnackbar({ mensagem, severidade: 'info' })
}
