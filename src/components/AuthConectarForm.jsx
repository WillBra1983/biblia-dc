import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { hintForFirebaseAuthError, isAuthCancelError } from '../utils/firebaseAuthErrors'
import { mostrarLoginApple } from '../utils/mostrarLoginApple'

function GoogleMark18() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden style={{ display: 'block', flexShrink: 0 }}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C45.56 37.57 48 31.49 48 24c0-1.49-.13-2.98-.38-4.55z"
      />
      <path
        fill="#FBBC05"
        d="M6.52 14.77c-1.5 2.77-2.35 5.95-2.35 9.23s.85 6.46 2.35 9.23l7.98-6.19c-.43-2.28-.68-4.72-.68-7.04s.25-4.76.68-7.04l-7.98-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.24 0 11.47-2.04 15.28-5.52l-7.73-6c-2.15 1.45-4.92 2.3-7.55 2.3-5.8 0-10.72-3.42-13.2-8.36l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

/**
 * Formulário de login/cadastro (e-mail, Google, Apple) — usado no Chat e no overlay nativo.
 */
export default function AuthConectarForm({ embedded = false, titleLogin = 'Entrar', titleRegister = 'Criar conta' }) {
  const {
    user,
    isConfigured,
    registerWithEmail,
    concluirCadastroPorLinkEmail,
    loginWithEmail,
    loginWithGoogle,
    loginWithApple,
    setLastError,
    lastError,
  } = useFirebaseAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [authSuccess, setAuthSuccess] = useState('')
  const cadastroLinkProcessadoRef = useRef(false)

  useEffect(() => {
    if (!isConfigured || cadastroLinkProcessadoRef.current) return
    cadastroLinkProcessadoRef.current = true
    void (async () => {
      try {
        const res = await concluirCadastroPorLinkEmail()
        if (!res?.handled) {
          cadastroLinkProcessadoRef.current = false
          return
        }
        setAuthSuccess('Conta criada! Você já pode usar o app.')
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          const u = new URL(window.location.href)
          u.search = ''
          window.history.replaceState({}, '', `${u.pathname}${u.hash}`)
        }
      } catch (e) {
        cadastroLinkProcessadoRef.current = false
        setLastError(hintForFirebaseAuthError(e))
      }
    })()
  }, [isConfigured, concluirCadastroPorLinkEmail, setLastError])

  if (user) return null

  const shellSx = embedded
    ? { p: 0, maxWidth: 'none', mx: 0, mt: 0, boxShadow: 'none', bgcolor: 'transparent' }
    : { p: 2, maxWidth: 420, mx: 'auto', mt: 2 }

  return (
    <Paper sx={shellSx} elevation={embedded ? 0 : 1}>
      <Typography variant="h6" gutterBottom>
        {mode === 'login' ? titleLogin : titleRegister}
      </Typography>
      {mode === 'register' && (
        <TextField
          fullWidth
          size="small"
          label="Nome (opcional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          sx={{ mb: 1.5 }}
        />
      )}
      <TextField
        fullWidth
        size="small"
        label="E-mail"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 1.5 }}
      />
      <TextField
        fullWidth
        size="small"
        label="Senha"
        type="password"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mb: 2 }}
      />
      {authSuccess ? (
        <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setAuthSuccess('')}>
          {authSuccess}
        </Alert>
      ) : null}
      {lastError ? (
        <Typography
          color="error"
          variant="body2"
          sx={{ mb: 1, whiteSpace: 'pre-line', wordBreak: 'break-word' }}
        >
          {lastError}
        </Typography>
      ) : null}
      <Stack spacing={1}>
        <Button
          variant="contained"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setLastError(null)
            setAuthSuccess('')
            try {
              if (mode === 'login') {
                await loginWithEmail(email, password)
              } else {
                const res = await registerWithEmail(email, password, displayName)
                if (res?.emailVerificationSent) {
                  setAuthSuccess(res.message)
                  setMode('login')
                  setPassword('')
                  setDisplayName('')
                }
              }
            } catch (e) {
              if (e?.code !== 'salvation/email-not-verified') {
                setLastError(hintForFirebaseAuthError(e))
              }
            } finally {
              setBusy(false)
            }
          }}
        >
          {mode === 'login' ? 'Entrar' : 'Enviar link de cadastro'}
        </Button>
        <Button size="small" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Criar nova conta' : 'Já tenho conta'}
        </Button>
        <Divider sx={{ my: 1 }}>ou</Divider>
        <Button
          fullWidth
          variant="contained"
          disableElevation
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setLastError(null)
            try {
              await loginWithGoogle()
            } catch (e) {
              if (!isAuthCancelError(e)) {
                setLastError(hintForFirebaseAuthError(e))
              }
            } finally {
              setBusy(false)
            }
          }}
          sx={{
            py: 1.1,
            textTransform: 'none',
            fontWeight: 600,
            bgcolor: '#4285F4',
            color: '#fff',
            '&:hover': { bgcolor: '#3367D6' },
            '&.Mui-focusVisible': { bgcolor: '#3367D6' },
            '&.Mui-disabled': {
              bgcolor: 'rgba(66, 133, 244, 0.38)',
              color: 'rgba(255, 255, 255, 0.85)',
            },
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="center" component="span" sx={{ width: '100%' }}>
            <GoogleMark18 />
            <span>Continuar com Google</span>
          </Stack>
        </Button>
        {mostrarLoginApple() ? (
          <Button
            fullWidth
            variant="contained"
            disableElevation
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setLastError(null)
              try {
                await loginWithApple()
              } catch (e) {
                if (!isAuthCancelError(e)) {
                  setLastError(hintForFirebaseAuthError(e))
                }
              } finally {
                setBusy(false)
              }
            }}
            sx={{
              py: 1.1,
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#000',
              color: '#fff',
              '&:hover': { bgcolor: '#222' },
              '&.Mui-disabled': {
                bgcolor: 'rgba(0, 0, 0, 0.38)',
                color: 'rgba(255, 255, 255, 0.85)',
              },
            }}
          >
            Continuar com Apple
          </Button>
        ) : null}
      </Stack>
    </Paper>
  )
}
