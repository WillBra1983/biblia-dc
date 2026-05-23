import { useState } from 'react'
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { MSG_VERIFICACAO_CONTA_LEGADA } from '../utils/emailVerificationAuth'

/**
 * Bloqueia o app até o usuário confirmar o e-mail (contas e-mail/senha).
 */
export default function EmailVerificationGate({ email }) {
  const { resendVerificationEmail, reloadAuthUser, logout } = useFirebaseAuth()
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState('')
  const [erro, setErro] = useState('')

  const reenviar = async () => {
    setBusy(true)
    setErro('')
    setInfo('')
    try {
      await resendVerificationEmail()
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
