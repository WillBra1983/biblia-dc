/**
 * Tela de Configurações de Notificações.
 *
 * Reúne todos os switches e o seletor de horário em um só lugar:
 *  - Receber mensagens do chat
 *  - Avisos de novidades (estudos, devocional novo, etc.)
 *  - Lembrete diário de devocional
 *  - Lembrete diário de plano de leitura
 *  - Horário dos lembretes (compartilhado entre os dois)
 *  - Botão "Ativar push neste aparelho" (na web; no nativo o ícone fica
 *    como status, porque o bootstrap já cuida).
 *
 * Layout: usa o `Layout` global (cabeçalho + drawer já vêm dele).
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Switch,
  TextField,
  Stack,
  Button,
  Alert,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import SwitchAccountOutlinedIcon from '@mui/icons-material/SwitchAccountOutlined'
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
import { mostrarSnackbar } from '../utils/uiDialogs'
import { ensureUserForFeature } from '../utils/chatExportSend'
import EmailVerificationGate from '../components/EmailVerificationGate'
import { usuarioPrecisaVerificarEmail } from '../utils/emailVerificationAuth'

export default function ConfiguracoesNotificacoes() {
  const { user, tentarAcessarComOutraConta } = useFirebaseAuth()
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState(PREFS_PADRAO)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [ativandoPush, setAtivandoPush] = useState(false)
  const [pushAtivoNoAparelho, setPushAtivoNoAparelho] = useState(Boolean(getTokenAtual()))
  const [dialogOutraConta, setDialogOutraConta] = useState(false)
  /** null | 'sucesso' | 'falha' — quadro após tentativa de troca de conta */
  const [dialogResultadoTroca, setDialogResultadoTroca] = useState(null)
  const [outraContaBusy, setOutraContaBusy] = useState(false)
  const [outraEmail, setOutraEmail] = useState('')
  const [outraSenha, setOutraSenha] = useState('')

  function fecharResultadoTroca() {
    setDialogResultadoTroca(null)
  }

  function irParaBibliaAposTroca() {
    fecharResultadoTroca()
    setDialogOutraConta(false)
    navigate('/biblia', { replace: true })
  }

  function irParaMenuAposTroca() {
    fecharResultadoTroca()
    setDialogOutraConta(false)
    window.dispatchEvent(new Event('salvation-open-main-menu'))
  }

  function tentarNovamenteTrocaConta() {
    fecharResultadoTroca()
    setDialogOutraConta(true)
  }

  function abrirResultadoTroca(tipo) {
    setDialogOutraConta(false)
    setDialogResultadoTroca(tipo)
  }

  function trocaNaoRealizada(r) {
    return r.cancelado || r.mesmaConta || (!r.ok && r.manteveConta)
  }

  const ehWeb = !Capacitor.isNativePlatform?.()
  const navegadorPermitido = useMemo(() => {
    if (!ehWeb) return true
    if (typeof window === 'undefined') return false
    return 'serviceWorker' in navigator && 'Notification' in window
  }, [ehWeb])

  // Exige login
  useEffect(() => {
    if (user === undefined) return
    if (!user?.uid) {
      ensureUserForFeature(user, navigate, {
        mensagem: 'Entre na sua conta para configurar notificações.',
        redirectTo: '/configuracoes/notificacoes'
      })
    }
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

  async function atualizar(patch) {
    if (!user?.uid) return
    setPrefs((prev) => ({ ...prev, ...patch }))
    setSalvando(true)
    try {
      await atualizarPreferenciasNotificacao(user.uid, patch)
    } catch (e) {
      mostrarSnackbar({
        mensagem: e?.message || 'Falha ao salvar preferências.',
        severidade: 'error'
      })
    } finally {
      setSalvando(false)
    }
  }

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

  const todasLigadas =
    Boolean(prefs.chat) &&
    Boolean(prefs.novidades) &&
    Boolean(prefs.lembreteDevocional) &&
    Boolean(prefs.lembretePlano)

  async function alternarTodasNotificacoes() {
    if (!user?.uid) return
    const ligar = !todasLigadas
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
      if (ehWeb && navegadorPermitido) {
        if (ligar && !pushAtivoNoAparelho) {
          await aoAtivarPush()
        } else if (!ligar && pushAtivoNoAparelho) {
          await aoDesativarPush()
        }
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

  async function handleOutraContaGoogle() {
    setOutraContaBusy(true)
    try {
      const r = await tentarAcessarComOutraConta({ tipo: 'google' })
      if (trocaNaoRealizada(r)) {
        abrirResultadoTroca('falha')
        return
      }
      if (r.trocou) {
        setOutraSenha('')
        abrirResultadoTroca('sucesso')
      }
    } catch {
      abrirResultadoTroca('falha')
    } finally {
      setOutraContaBusy(false)
    }
  }

  async function handleOutraContaEmail() {
    if (!outraEmail.trim() || !outraSenha) {
      mostrarSnackbar({
        mensagem: 'Informe e-mail e senha da outra conta.',
        severidade: 'warning'
      })
      return
    }
    setOutraContaBusy(true)
    try {
      const r = await tentarAcessarComOutraConta({
        tipo: 'email',
        email: outraEmail,
        password: outraSenha
      })
      if (trocaNaoRealizada(r)) {
        abrirResultadoTroca('falha')
        return
      }
      if (r.trocou || r.ok) {
        setOutraSenha('')
        abrirResultadoTroca('sucesso')
      }
    } catch {
      abrirResultadoTroca('falha')
    } finally {
      setOutraContaBusy(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Configurações
      </Typography>

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Conta
      </Typography>
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
          startIcon={<SwitchAccountOutlinedIcon />}
          fullWidth
          onClick={() => setDialogOutraConta(true)}
        >
          Acessar com outra conta
        </Button>
      </Stack>

      <Dialog
        open={dialogOutraConta}
        onClose={() => {
          if (!outraContaBusy) setDialogOutraConta(false)
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Acessar com outra conta</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Você <strong>não será desconectado</strong> até a outra conta entrar com sucesso. Se cancelar ou
            falhar, permanece na conta atual.
          </Typography>
          <Stack spacing={1.5}>
            <Button
              variant="contained"
              fullWidth
              disabled={outraContaBusy}
              onClick={() => void handleOutraContaGoogle()}
            >
              Continuar com Google
            </Button>
            <Divider>ou e-mail</Divider>
            <TextField
              size="small"
              fullWidth
              label="E-mail da outra conta"
              type="email"
              autoComplete="email"
              value={outraEmail}
              onChange={(e) => setOutraEmail(e.target.value)}
              disabled={outraContaBusy}
            />
            <TextField
              size="small"
              fullWidth
              label="Senha"
              type="password"
              autoComplete="current-password"
              value={outraSenha}
              onChange={(e) => setOutraSenha(e.target.value)}
              disabled={outraContaBusy}
            />
            <Button
              variant="outlined"
              fullWidth
              disabled={outraContaBusy}
              onClick={() => void handleOutraContaEmail()}
            >
              Entrar com e-mail e senha
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOutraConta(false)} disabled={outraContaBusy}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogResultadoTroca === 'sucesso'}
        fullWidth
        maxWidth="xs"
        onClose={fecharResultadoTroca}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Troca concluída!</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 1 }}>
            Você está conectado na nova conta. Escolha para onde ir agora.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1, px: 2, pb: 2 }}>
          <Button variant="contained" fullWidth onClick={irParaBibliaAposTroca}>
            Ir para a bíblia
          </Button>
          <Button variant="outlined" fullWidth onClick={irParaMenuAposTroca}>
            Ir para o menu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogResultadoTroca === 'falha'}
        fullWidth
        maxWidth="xs"
        onClose={fecharResultadoTroca}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Troca não realizada</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 1 }}>
            A conta atual foi mantida. Você pode tentar de novo ou ir para a Bíblia.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1, px: 2, pb: 2 }}>
          <Button variant="contained" fullWidth onClick={irParaBibliaAposTroca}>
            Ir para a bíblia
          </Button>
          <Button variant="outlined" fullWidth onClick={tentarNovamenteTrocaConta}>
            Tentar novamente
          </Button>
        </DialogActions>
      </Dialog>

      <Divider sx={{ mb: 2 }} />

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <NotificationsActiveIcon color="primary" />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Notificações
        </Typography>
      </Stack>

      {ehWeb && !navegadorPermitido ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Este navegador não suporta notificações push. Você ainda pode ligar ou desligar os tipos abaixo na
          conta.
        </Alert>
      ) : null}

      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{
          mb: 2,
          py: 1.25,
          px: 1.5,
          borderRadius: 1,
          bgcolor: 'action.hover'
        }}
      >
        <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
          {todasLigadas ? 'Desativar todas as notificações' : 'Ativar todas as notificações'}
        </Typography>
        <Button
          variant="contained"
          size="small"
          disabled={salvando || ativandoPush || (ehWeb && !navegadorPermitido)}
          onClick={() => void alternarTodasNotificacoes()}
        >
          {salvando || ativandoPush ? '…' : todasLigadas ? 'Desativar' : 'Ativar'}
        </Button>
      </Stack>

      <Stack divider={<Divider flexItem />} spacing={0.5}>
        <LinhaSwitch
          titulo="Mensagens do chat"
          descricao="Avisa quando alguém te enviar uma mensagem."
          ligado={prefs.chat}
          aoMudar={(v) => atualizar({ chat: v })}
        />
        <LinhaSwitch
          titulo="Novidades e estudos"
          descricao="Anúncios quando há novo devocional, estudo compartilhado ou plano de leitura."
          ligado={prefs.novidades}
          aoMudar={(v) => atualizar({ novidades: v })}
        />
        <LinhaSwitch
          titulo="Lembrete diário de Devocional"
          descricao="Convite para abrir o devocional do dia."
          ligado={prefs.lembreteDevocional}
          aoMudar={(v) => atualizar({ lembreteDevocional: v })}
        />
        <LinhaSwitch
          titulo="Lembrete diário do Plano de Leitura"
          descricao="Para não perder a leitura programada."
          ligado={prefs.lembretePlano}
          aoMudar={(v) => atualizar({ lembretePlano: v })}
        />

        {(prefs.lembreteDevocional || prefs.lembretePlano) && (
          <Box sx={{ pt: 1.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Horário dos lembretes
            </Typography>
            <TextField
              type="time"
              value={prefs.horarioLembrete || '07:00'}
              onChange={(e) => atualizar({ horarioLembrete: e.target.value })}
              size="small"
              fullWidth
            />
          </Box>
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
        {salvando ? 'Salvando…' : 'Suas preferências sincronizam em todos os seus aparelhos.'}
      </Typography>
    </Container>
  )
}

function LinhaSwitch({ titulo, descricao, ligado, aoMudar }) {
  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 1.5 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{titulo}</Typography>
        <Typography variant="caption" color="text.secondary">{descricao}</Typography>
      </Box>
      <Switch checked={Boolean(ligado)} onChange={(_, v) => aoMudar(v)} />
    </Stack>
  )
}
