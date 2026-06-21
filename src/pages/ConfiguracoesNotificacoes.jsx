/**
 * Tela de Configurações — conta e notificações.
 *
 * Notificações: um único controle liga ou desliga todos os tipos na conta
 * (chat, novidades, lembretes) e o push neste aparelho quando aplicável.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Switch,
  Stack,
  Button,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import { Capacitor } from '@capacitor/core'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import {
  PREFS_PADRAO,
  obterPreferenciasNotificacao,
  atualizarPreferenciasNotificacao
} from '../services/preferenciasNotificacaoService'
import {
  ativarPushNotifications,
  desativarPushNotifications,
  getTokenAtual
} from '../services/notificacoesPushService'
import { mostrarSnackbar, confirmarAsync } from '../utils/uiDialogs'
import { ensureUserForFeature } from '../utils/chatExportSend'
import EmailVerificationGate from '../components/EmailVerificationGate'
import { usuarioPrecisaVerificarEmail } from '../utils/emailVerificationAuth'

export default function ConfiguracoesNotificacoes() {
  const { user, logout } = useFirebaseAuth()
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState(PREFS_PADRAO)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [ativandoPush, setAtivandoPush] = useState(false)
  const [pushAtivoNoAparelho, setPushAtivoNoAparelho] = useState(Boolean(getTokenAtual()))
  const [saindoConta, setSaindoConta] = useState(false)

  const ehWeb = !Capacitor.isNativePlatform?.()
  const navegadorPermitido = useMemo(() => {
    if (!ehWeb) return true
    if (typeof window === 'undefined') return false
    return 'serviceWorker' in navigator && 'Notification' in window
  }, [ehWeb])

  // Exige login — pequena pausa no iOS para a sessão estabilizar após OAuth nativo.
  useEffect(() => {
    if (user === undefined) return
    if (user?.uid) return
    const delay =
      typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.() ? 800 : 0
    const t = window.setTimeout(() => {
      ensureUserForFeature(user, navigate, {
        mensagem: 'Entre na sua conta para configurar notificações.',
        redirectTo: '/configuracoes/notificacoes',
      })
    }, delay)
    return () => window.clearTimeout(t)
  }, [user, navigate])

  // Carrega preferências do servidor
  useEffect(() => {
    if (!user?.uid) {
      setCarregando(false)
      return
    }
    let cancelado = false
    setCarregando(true)
    obterPreferenciasNotificacao(user.uid)
      .then((p) => { if (!cancelado) setPrefs(p) })
      .finally(() => { if (!cancelado) setCarregando(false) })
    return () => { cancelado = true }
  }, [user?.uid])

  async function aoAtivarPush() {
    if (!user?.uid) return
    setAtivandoPush(true)
    try {
      const res = await ativarPushNotifications({ uid: user.uid })
      if (res?.ok) {
        setPushAtivoNoAparelho(true)
        mostrarSnackbar({
          mensagem: 'Notificações ativadas neste aparelho.',
          severidade: 'success'
        })
      } else {
        const motivos = {
          permissao_negada: 'Permissão negada pelo navegador. Verifique o cadeado ao lado da URL.',
          vapid_key_ausente: 'Configuração de notificações ainda não está pronta. Avise o administrador.',
          messaging_sender_id_ausente: 'Configuração de notificações ainda não está pronta. Avise o administrador.',
          sem_service_worker: 'Seu navegador não suporta notificações.',
          sem_api_notification: 'Seu navegador não suporta notificações.'
        }
        mostrarSnackbar({
          mensagem: motivos[res?.motivo] || 'Não foi possível ativar agora. Tente novamente mais tarde.',
          severidade: 'warning'
        })
      }
    } finally {
      setAtivandoPush(false)
    }
  }

  async function aoDesativarPush() {
    if (!user?.uid) return
    setAtivandoPush(true)
    try {
      await desativarPushNotifications(user.uid)
      setPushAtivoNoAparelho(false)
      mostrarSnackbar({
        mensagem: 'Notificações desligadas neste aparelho.',
        severidade: 'info'
      })
    } finally {
      setAtivandoPush(false)
    }
  }

  const notificacoesAtivas =
    Boolean(prefs.chat) ||
    Boolean(prefs.novidades) ||
    Boolean(prefs.lembreteDevocional) ||
    Boolean(prefs.lembretePlano)

  async function alternarNotificacoes() {
    if (!user?.uid) return
    const ligar = !notificacoesAtivas
    const patch = {
      chat: ligar,
      novidades: ligar,
      lembreteDevocional: ligar,
      lembretePlano: ligar
    }
    setSalvando(true)
    setPrefs((prev) => ({ ...prev, ...patch }))
    try {
      await atualizarPreferenciasNotificacao(user.uid, patch)
      if (!ehWeb || navegadorPermitido) {
        if (ligar && !pushAtivoNoAparelho) {
          await aoAtivarPush()
        } else if (!ligar && pushAtivoNoAparelho) {
          await aoDesativarPush()
        }
      } else if (ligar) {
        mostrarSnackbar({
          mensagem: 'Notificações ativadas na sua conta.',
          severidade: 'success'
        })
      } else {
        mostrarSnackbar({
          mensagem: 'Notificações desativadas na sua conta.',
          severidade: 'info'
        })
      }
    } catch (e) {
      const p = await obterPreferenciasNotificacao(user.uid)
      setPrefs(p)
      mostrarSnackbar({
        mensagem: e?.message || 'Falha ao salvar preferências.',
        severidade: 'error'
      })
    } finally {
      setSalvando(false)
    }
  }

  if (user === undefined || (user?.uid && carregando)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (user && usuarioPrecisaVerificarEmail(user)) {
    return (
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <EmailVerificationGate email={user.email} />
      </Container>
    )
  }

  if (!user?.uid) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    )
  }

  async function handleSairConta() {
    const ok = await confirmarAsync({
      titulo: 'Sair da conta?',
      mensagem:
        'Você continuará podendo usar a Bíblia e o conteúdo local neste aparelho. Recursos da nuvem (chat, estudos sincronizados, IA na conta) exigirão entrar de novo.',
      labelOk: 'Sair',
      labelCancelar: 'Cancelar',
      destrutivo: true,
    })
    if (!ok) return
    setSaindoConta(true)
    try {
      await logout()
      mostrarSnackbar({ mensagem: 'Você saiu da conta.', severidade: 'info' })
      navigate('/biblia', { replace: true })
    } catch {
      mostrarSnackbar({ mensagem: 'Não foi possível sair agora. Tente de novo.', severidade: 'error' })
    } finally {
      setSaindoConta(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Configurações
      </Typography>

      <Button
        variant="contained"
        color="primary"
        startIcon={<MenuBookIcon />}
        fullWidth
        onClick={() => navigate('/biblia')}
        sx={{ mb: 2.5 }}
      >
        Menu inicial
      </Button>

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Conta
      </Typography>
      {user?.email ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Conectado como <strong>{user.email}</strong>
        </Typography>
      ) : user?.displayName ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Conectado como <strong>{user.displayName}</strong>
        </Typography>
      ) : null}
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<PersonOutlineIcon />}
          fullWidth
          onClick={() => navigate('/chat?perfil=1')}
        >
          Editar perfil
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutOutlinedIcon />}
          fullWidth
          onClick={() => void handleSairConta()}
          disabled={saindoConta}
        >
          {saindoConta ? 'Saindo…' : 'Sair da conta'}
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {ehWeb && !navegadorPermitido ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Este navegador não suporta notificações push. Você ainda pode ligar ou desligar na conta.
        </Alert>
      ) : null}

      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ py: 0.5 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <NotificationsActiveIcon color="primary" fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Notificações
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {notificacoesAtivas
              ? 'Chat, novidades e lembretes diários ligados.'
              : 'Chat, novidades e lembretes diários desligados.'}
          </Typography>
        </Box>
        <Switch
          checked={notificacoesAtivas}
          disabled={salvando || ativandoPush || (ehWeb && !navegadorPermitido)}
          onChange={() => void alternarNotificacoes()}
        />
      </Stack>
    </Container>
  )
}
