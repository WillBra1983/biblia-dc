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
import { ativarPushNotifications, desativarPushNotifications } from '../services/notificacoesPushService'
import { mostrarSnackbar } from '../utils/uiDialogs'

export default function PushNotificationsBootstrap() {
  const { user } = useFirebaseAuth()
  const navigate = useNavigate()
  const ativadoRef = useRef(false)
  const ultimoUidRef = useRef(null)

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
          onMessage: (payload) => exibirSnackbarPush(payload)
        })
        if (res?.ok) ativadoRef.current = true
      } catch (_) {
        // silencioso — usuário pode ativar manualmente nas Configurações
      }
    }, 5000)

    return () => window.clearTimeout(t)
  }, [user?.uid])

  // Escuta tap em notificação (no nativo: emitido por
  // `pushNotificationActionPerformed`; no SW web: emitido em
  // `notificationclick`, que abre o app na URL).
  useEffect(() => {
    function aoTap(e) {
      const url = e?.detail?.url
      if (typeof url === 'string' && url.startsWith('/')) {
        navigate(url)
      }
    }
    window.addEventListener('salvation-push-tap', aoTap)
    return () => window.removeEventListener('salvation-push-tap', aoTap)
  }, [navigate])

  return null
}

/** Mostra um snackbar quando chega push com app em foreground. */
function exibirSnackbarPush(payload) {
  const titulo = payload?.notification?.title || 'Bíblia DC'
  const corpo = payload?.notification?.body || ''
  const mensagem = corpo ? `${titulo}: ${corpo}` : titulo
  mostrarSnackbar({ mensagem, severidade: 'info' })
}
