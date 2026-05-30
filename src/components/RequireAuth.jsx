import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
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
} from '../utils/conteudoLocalOffline'
import RotaRequerRedeConta from './RotaRequerRedeConta'

const PENDING_LOGIN_REDIRECT_KEY = 'salvation-pending-login-redirect'
const AUTH_WAIT_MS = 2800

function dispararBibliaProntaSeguro() {
  notificarBibliaPronta()
}

/**
 * - **Com internet:** conteúdo local abre sem login; rotas de conta/nuvem pedem login.
 * - **Sem internet e sem login:** só conteúdo local, com aviso de acesso limitado.
 * - **Sem internet no `/chat`:** vai ao conteúdo local (não dá para autenticar).
 * - **Logado:** permanece na sessão; sem opção de deslogar na UI.
 */
export default function RequireAuth({ children }) {
  const { user } = useFirebaseAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const splashDisparadoRef = useRef(false)
  const [authEspera, setAuthEspera] = useState(false)
  const conteudo = children ?? <Outlet />

  const pathname = location.pathname
  const offline = estaSemRede()
  const local = rotaConteudoLocalOffline(pathname)
  const onChat = pathname === '/chat' || pathname.startsWith('/chat/')
  const sessaoOk = Boolean(user?.uid && !usuarioPrecisaVerificarEmail(user))
  const limitado = modoAcessoLimitadoOffline(sessaoOk) && local
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

  /** Offline no login → conteúdo local com aviso (não fica preso no chat). */
  useEffect(() => {
    if (!isFirebaseConfigured() || sessaoOk || !offline || !onChat) return
    marcarModoLimitadoOffline()
    navigate('/', { replace: true })
  }, [sessaoOk, offline, onChat, navigate])

  /** Com internet, sem sessão → só rotas de conta/nuvem vão para login. */
  useEffect(() => {
    if (!isFirebaseConfigured()) return
    if (sessaoOk) return
    if (offline) return
    if (onChat) return
    if (local) return

    // Logado mas e-mail não confirmado: só o chat (sem guardar URL — evita loop com /chat).
    if (user?.uid && usuarioPrecisaVerificarEmail(user)) {
      navigate('/chat', { replace: true })
      return
    }

    try {
      const target = `${pathname}${location.search}${location.hash}`
      if (target && !target.startsWith('/chat')) {
        sessionStorage.setItem(
          PENDING_LOGIN_REDIRECT_KEY,
          JSON.stringify({ url: target, ts: Date.now() })
        )
      }
    } catch {
      /* ignore */
    }
    navigate('/chat', { replace: true })
  }, [sessaoOk, user, pathname, location.search, location.hash, navigate, offline, onChat, local])

  useEffect(() => {
    if (splashDisparadoRef.current) return
    // Na Bíblia (`/` e `/biblia`), quem sinaliza "pronto" é a própria página,
    // após o capítulo realmente pintar. Sinalizar aqui fecharia o splash antes
    // do conteúdo aparecer (a demora ficava perceptível).
    const isBibliaRoute = pathname === '/' || pathname === '/biblia'
    if (isBibliaRoute) return
    // Em rotas locais (ex.: conteúdo offline), não esperar auth para sinalizar.
    if (user === undefined && !local && !limitado && !authEspera) return
    splashDisparadoRef.current = true
    dispararBibliaProntaSeguro()
  }, [user, pathname, local, limitado, authEspera])

  if (!isFirebaseConfigured()) {
    return conteudo
  }

  if (bloqueioOfflineSemConta(pathname) && !sessaoOk) {
    return <RotaRequerRedeConta>{conteudo}</RotaRequerRedeConta>
  }

  // Rotas locais (ex.: Bíblia) devem montar imediatamente para carregar
  // durante o splash; esperar auth aqui torna a abertura perceptivelmente lenta.
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

  if (podeVer) {
    return conteudo
  }

  if (onChat) {
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
