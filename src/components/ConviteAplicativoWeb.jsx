import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import AndroidIcon from '@mui/icons-material/Android'
import AppleIcon from '@mui/icons-material/Apple'
import LaunchIcon from '@mui/icons-material/Launch'
import { Capacitor } from '@capacitor/core'
import { aguardarPosSplash } from '../utils/posSplash'
import { isPWA } from '../utils/storageUtils'
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '../utils/appStoreLinks'
import { getNativeAppDeepLinkBase } from '../services/bibliaEstudosService'
import { abrirUrlExterna } from '../utils/abrirUrlExterna'

const SESSION_KEY = 'salvation-convite-app-web-v1'
const ROTAS_SEM_CONVITE = /^\/(?:chat|admin|configuracoes|sobre|privacidade)(?:\/|$)/

function pareceDispositivoApple() {
  return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent || '')
}

function deveConvidar(location) {
  if (Capacitor.isNativePlatform?.() || isPWA()) return false
  if (ROTAS_SEM_CONVITE.test(location.pathname)) return false
  return location.pathname !== '/' || Boolean(location.search)
}

export default function ConviteAplicativoWeb() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const applePrimeiro = useMemo(() => pareceDispositivoApple(), [])

  useEffect(() => {
    if (!deveConvidar(location)) return undefined
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return undefined
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // O convite ainda pode aparecer quando o navegador bloqueia o storage.
    }

    let timer = 0
    const cancelar = aguardarPosSplash(() => {
      timer = window.setTimeout(() => setOpen(true), 700)
    })
    return () => {
      cancelar()
      if (timer) window.clearTimeout(timer)
    }
  }, [location.pathname, location.search])

  const fechar = () => setOpen(false)
  const abrirAplicativo = () => {
    const path = `${location.pathname}${location.search}${location.hash || ''}`
    window.location.href = `${getNativeAppDeepLinkBase()}${path}`
  }

  const lojas = applePrimeiro
    ? [
        { nome: 'App Store', url: APP_STORE_URL, icon: <AppleIcon /> },
        { nome: 'Google Play', url: GOOGLE_PLAY_URL, icon: <AndroidIcon /> },
      ]
    : [
        { nome: 'Google Play', url: GOOGLE_PLAY_URL, icon: <AndroidIcon /> },
        { nome: 'App Store', url: APP_STORE_URL, icon: <AppleIcon /> },
      ]

  return (
    <Dialog open={open} onClose={fechar} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>Abra no aplicativo</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">
          Continue com mais conforto na Bíblia do Discípulo Cristão. Se o aplicativo já estiver
          instalado, abra este mesmo conteúdo diretamente nele.
        </Typography>
        <Button
          variant="contained"
          fullWidth
          startIcon={<LaunchIcon />}
          onClick={abrirAplicativo}
          sx={{ mt: 2.5 }}
        >
          Abrir aplicativo
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, mb: 1 }}>
          Ainda não instalou?
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {lojas.map((loja) => (
            <Button
              key={loja.nome}
              variant="outlined"
              startIcon={loja.icon}
              onClick={() => {
                fechar()
                void abrirUrlExterna(loja.url)
              }}
              sx={{ minWidth: 0 }}
            >
              {loja.nome}
            </Button>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={fechar}>Continuar no site</Button>
      </DialogActions>
    </Dialog>
  )
}
