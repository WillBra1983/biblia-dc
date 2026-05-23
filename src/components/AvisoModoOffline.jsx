import { useEffect } from 'react'
import { Alert, Button, Box } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useRedeDisponivel } from '../hooks/useRedeDisponivel'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { usuarioPrecisaVerificarEmail } from '../utils/emailVerificationAuth'
import {
  exibirFaixaSemInternetLogado,
  modoAcessoLimitadoOffline,
  rotaConteudoLocalOffline,
  limparModoLimitadoOffline,
  lerModoLimitadoOffline,
} from '../utils/conteudoLocalOffline'

const MSG_SEM_REDE_LOGADO = 'Sem acesso. Você está sem acesso à internet.'

/**
 * - Sem login + offline: aviso de acesso limitado (conteúdo no aparelho).
 * - Logado + offline + rota da nuvem: faixa “sem acesso à internet”.
 * - Logado + offline + Bíblia/discipulado: sem faixa (conteúdo local).
 */
export default function AvisoModoOffline() {
  const online = useRedeDisponivel()
  const { user } = useFirebaseAuth()
  const { pathname } = useLocation()

  const sessaoOk = Boolean(user?.uid && !usuarioPrecisaVerificarEmail(user))
  const limitado = modoAcessoLimitadoOffline(sessaoOk) && rotaConteudoLocalOffline(pathname)
  const semRedeLogado = exibirFaixaSemInternetLogado(sessaoOk, pathname)

  useEffect(() => {
    if (online && sessaoOk) limparModoLimitadoOffline()
  }, [online, sessaoOk])

  if (online) return null

  if (semRedeLogado) {
    return (
      <Box sx={{ px: { xs: 1, sm: 2 }, pt: 1, pb: 0 }}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {MSG_SEM_REDE_LOGADO}
        </Alert>
      </Box>
    )
  }

  if (limitado || (lerModoLimitadoOffline() && !sessaoOk && rotaConteudoLocalOffline(pathname))) {
    return (
      <Box sx={{ px: { xs: 1, sm: 2 }, pt: 1, pb: 0 }}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <strong>Acesso limitado.</strong> Você está sem internet e não está logado. Pode usar a Bíblia,
          o discipulado, o quiz e o restante do conteúdo <strong>guardado no aparelho</strong>. Quando a
          conexão voltar, entre na sua conta no menu Conectar para chat, sincronização e estudos na nuvem.
        </Alert>
      </Box>
    )
  }

  return null
}

export { MSG_SEM_REDE_LOGADO }
