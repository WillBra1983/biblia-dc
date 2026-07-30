import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { Capacitor } from '@capacitor/core'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { isFirebaseConfigured } from '../config/firebase'
import { notificarBibliaPronta } from '../utils/posSplash'
import { usuarioPrecisaVerificarEmail } from '../utils/emailVerificationAuth'
import {
  bloqueioOfflineSemConta,
  estaSemRede,
  rotaConteudoLocalOffline,
  modoAcessoLimitadoOffline,
  marcarModoLimitadoOffline,
  MSG_SEM_INTERNET_RECURSO,
} from '../utils/conteudoLocalOffline'
import { mostrarSnackbar } from '../utils/uiDialogs'
import { loginPathComRetorno } from '../utils/chatExportSend'

const PENDING_LOGIN_REDIRECT_KEY = 'salvation-pending-login-redirect'
const AUTH_WAIT_MS = 2800

const isNativeApp =
  typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.() === true

function dispararBibliaProntaSeguro() {
  notificarBibliaPronta()
}

/**
 * - **Com internet (web e app nativo):** conteúdo local abre sem login; rotas de conta/nuvem pedem login.
 * - **Sem internet e sem login:** só conteúdo local, com aviso de acesso limitado.
 * - **Sem internet no `/chat`:** vai ao conteúdo local (não dá para autenticar).
 * - **Logado:** permanece na sessão até escolher «Sair da conta» (Configurações ou Chat).
 */
export default function RequireAuth({ children }) {
  const { user } = useFirebaseAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const splashDisparadoRef = useRef(false)
  const offlineNuvemAvisoRef = useRef(false)
  const [authEspera, setAuthEspera] = useState(false)
  const conteudo = children ?? <Outlet />

  const pathname = location.pathname
  const offline = estaSemRede()
  const local = rotaConteudoLocalOffline(pathname)
  const onChat = pathname === '/chat' || pathname.startsWith('/chat/')
  const sessaoOk = Boolean(user?.uid && !usuarioPrecisaVerificarEmail(user))
  const limitado = modoAcessoLimitadoOffline(sessaoOk) && local
  const liberaConteudoLocal = local
  const podeVer = sessaoOk || limitado

  useEffect(() => {
    if (user !== undefined) {
      setAuthEspera(false)
      return
    }
    if (!offline || !local) return
    const t = window.setTimeout(() => setAuthEspera(true), AUTH_WAIT_MS)
    return () => window.clearTimeout(t)
  }, [user, offline, local])

  /** Offline numa rota da nuvem sem login → volta ao conteúdo local (snackbar breve). */
  useEffect(() => {
    if (!isFirebaseConfigured() || sessaoOk) {
      offlineNuvemAvisoRef.current = false
      return
    }
    if (!bloqueioOfflineSemConta(pathname)) return
    if (offlineNuvemAvisoRef.current) return
    offlineNuvemAvisoRef.current = true
    mostrarSnackbar({ mensagem: MSG_SEM_INTERNET_RECURSO, severidade: 'info' })
    navigate('/', { replace: true })
  }, [sessaoOk, pathname, navigate])

  /** Offline no login → conteúdo local (não fica preso no chat). */
  useEffect(() => {
    if (!isFirebaseConfigured() || sessaoOk || !offline || !onChat) return
    marcarModoLimitadoOffline()
    navigate('/', { replace: true })
  }, [sessaoOk, offline, onChat, navigate])

  /** Com internet, sem sessão → só rotas de conta/nuvem vão para login (Chat). */
  useEffect(() => {
    if (!isFirebaseConfigured()) return
    if (user === undefined) return
    if (sessaoOk) return
    if (offline) return
    if (onChat) return
    if (local) return

    if (user?.uid && usuarioPrecisaVerificarEmail(user)) {
      if (isNativeApp) return
      navigate('/chat', { replace: true })
      return
    }

    const target = `${pathname}${location.search}${location.hash}`
    try {
      if (target && !target.startsWith('/chat')) {
        sessionStorage.setItem(
          PENDING_LOGIN_REDIRECT_KEY,
          JSON.stringify({ url: target, ts: Date.now() })
        )
      }
    } catch {
      /* ignore */
    }
    navigate(loginPathComRetorno(target), { replace: true })
  }, [sessaoOk, user, pathname, location.search, location.hash, navigate, offline, onChat, local])

  useEffect(() => {
    if (splashDisparadoRef.current) return
    const isBibliaRoute = pathname === '/' || pathname === '/biblia'
    if (isBibliaRoute && liberaConteudoLocal) return
    if (user === undefined && !local && !limitado && !authEspera) return
    splashDisparadoRef.current = true
    dispararBibliaProntaSeguro()
  }, [user, pathname, local, limitado, authEspera, liberaConteudoLocal])

  const renderConteudo = () => {
    if (!isFirebaseConfigured()) {
      return conteudo
    }

    if (bloqueioOfflineSemConta(pathname) && !sessaoOk) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'min(40dvh, 240px)',
            py: 4,
          }}
        >
          <CircularProgress size={28} />
        </Box>
      )
    }

    if (user === undefined && !local && !limitado && !authEspera) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'min(70dvh, 480px)',
            py: 6,
          }}
        >
          <CircularProgress />
        </Box>
      )
    }

    if (liberaConteudoLocal || podeVer || onChat) {
      return conteudo
    }

    if (usuarioPrecisaVerificarEmail(user) && onChat) {
      return conteudo
    }

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'min(70dvh, 480px)',
          py: 6,
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return renderConteudo()
}
