import { Dialog, DialogContent, DialogTitle, Typography } from '@mui/material'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { usuarioPrecisaVerificarEmail } from '../utils/emailVerificationAuth'
import AuthConectarForm from './AuthConectarForm'
import EmailVerificationGate from './EmailVerificationGate'

/**
 * Login / confirmação de e-mail sobre a tela atual (app nativo) — sem ir ao Chat.
 */
export default function LoginConectarOverlay({ open }) {
  const { user } = useFirebaseAuth()
  const precisaVerificar = Boolean(user?.uid && usuarioPrecisaVerificarEmail(user))

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown
      aria-labelledby="login-conectar-titulo"
      slotProps={{
        backdrop: { sx: { bgcolor: 'rgba(0, 0, 0, 0.55)' } },
      }}
      PaperProps={{ sx: { mx: 2, borderRadius: 2 } }}
    >
      <DialogTitle id="login-conectar-titulo" sx={{ pb: 0.5 }}>
        Conectar
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Entre na sua conta para sincronizar preferências, mensagens e estudos na nuvem. A Bíblia continua
          disponível no aparelho.
        </Typography>
        {precisaVerificar ? (
          <EmailVerificationGate email={user.email} />
        ) : (
          <AuthConectarForm embedded titleLogin="Entrar na sua conta" titleRegister="Criar conta" />
        )}
      </DialogContent>
    </Dialog>
  )
}
