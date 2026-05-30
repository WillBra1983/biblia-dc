import { useEffect, useState } from 'react'
import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { MSG_VERIFICACAO_CONTA_LEGADA } from '../utils/emailVerificationAuth'

/**
 * Bloqueia o app até o usuário confirmar o e-mail (contas e-mail/senha).
 */
const AUTO_SEND_KEY = 'salvation-verification-auto-sent'
const INFO_ENVIADO =
  'Enviamos o e-mail de confirmação. Verifique a caixa de entrada e o spam.'

export default function EmailVerificationGate({ email }) {
  const { user, resendVerificationEmail, reloadAuthUser, logout } = useFirebaseAuth()
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState('')
  const [erro, setErro] = useState('')

  // Envia na primeira visita assim que a sessão Auth estiver pronta (não só ao Reenviar).
  useEffect(() => {
    if (!email?.trim() || !user?.uid) return

    const chave = `${AUTO_SEND_KEY}:${email.trim().toLowerCase()}`
    try {
      if (sessionStorage.getItem(chave)) {
        setInfo(INFO_ENVIADO)
        return
      }
    } catch {
      /* ignore */
    }

    let cancelled = false
    void (async () => {
      try {
        await resendVerificationEmail()
        if (cancelled) return
        try {
          sessionStorage.setItem(chave, String(Date.now()))
        } catch {
          /* ignore */
        }
        setInfo(INFO_ENVIADO)
      } catch (e) {
        if (cancelled) return
        setErro(
          e?.message ||
            'Não foi possível enviar o e-mail agora. Toque em "Reenviar e-mail de confirmação".'
        )
      }
    })()

    return () => {
      cancelled = true
    }
  }, [email, user?.uid, resendVerificationEmail])

  const reenviar = async () => {
    setBusy(true)
    setErro('')
    setInfo('')
    try {
      await resendVerificationEmail()
      const chave = `${AUTO_SEND_KEY}:${email.trim().toLowerCase()}`
      try {
        sessionStorage.setItem(chave, String(Date.now()))
      } catch {
        /* ignore */
      }
      setInfo('Novo e-mail de confirmação enviado. Verifique a caixa de entrada e o spam.')
    } catch (e) {
      setErro(e?.message || 'Não foi possível reenviar. Tente de novo em alguns minutos.')
    } finally {
      setBusy(false)
    }
  }

  const jaConfirmei = async () => {
    setBusy(true)
    setErro('')
    setInfo('')
    try {
      const ok = await reloadAuthUser()
      if (ok) {
        setInfo('E-mail confirmado! Carregando o app…')
        return
      }
      setErro(
        'Ainda não detectamos a confirmação. Abra o link no e-mail, aguarde alguns segundos e toque de novo.'
      )
    } catch (e) {
      setErro(e?.message || 'Não foi possível atualizar. Tente entrar de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper sx={{ p: 2.5, maxWidth: 440, mx: 'auto', mt: 2 }}>
      <Stack alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <MarkEmailReadOutlinedIcon sx={{ fontSize: 48, color: 'primary.main' }} />
        <Typography variant="h6" align="center" fontWeight={700}>
          Confirme seu e-mail
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {MSG_VERIFICACAO_CONTA_LEGADA}
      </Typography>
      {email ? (
        <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, wordBreak: 'break-all' }}>
          {email}
        </Typography>
      ) : null}
      {info ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {info}
        </Alert>
      ) : null}
      {erro ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      ) : null}
      <Stack spacing={1}>
        <Button variant="contained" disabled={busy} onClick={() => void jaConfirmei()}>
          Já confirmei — atualizar
        </Button>
        <Button variant="outlined" disabled={busy} onClick={() => void reenviar()}>
          Reenviar e-mail de confirmação
        </Button>
        <Button color="inherit" size="small" disabled={busy} onClick={() => void logout()}>
          Sair e usar outra conta
        </Button>
      </Stack>
    </Paper>
  )
}
