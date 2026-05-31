import { useState, useEffect, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import {
  bibliaJaEstaPronta,
  marcarSplashFechado,
  marcarSplashUiConcluido,
  removerSplashHtmlInicial,
  splashUiJaConcluiu,
} from '../utils/posSplash'
import { isNativeApp } from '../utils/isNativeApp'

const SPLASH_IMAGEM_WEBP = `${import.meta.env.BASE_URL}splash-b.webp`.replace(/\/{2,}/g, '/')
const SPLASH_IMAGEM_PNG = `${import.meta.env.BASE_URL}splash-b.png`.replace(/\/{2,}/g, '/')

const fontSans = '"Source Sans 3", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

/** Textos que ficavam na tela verde — no nativo aparecem abaixo da imagem. */
function SplashRodapeNativo() {
  return (
    <Box sx={{ textAlign: 'center', px: 2, pt: 1, pb: 'max(16px, env(safe-area-inset-bottom))' }}>
      <Typography
        variant="h6"
        sx={{
          color: '#00695c',
          fontWeight: 300,
          fontStyle: 'italic',
          letterSpacing: 0.5,
          fontSize: { xs: '1rem', sm: '1.15rem' },
          fontFamily: fontSans,
          mb: 1,
        }}
      >
        Ide e fazei discípulos...
      </Typography>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          color: 'rgba(0, 77, 64, 0.65)',
          fontSize: 14,
          letterSpacing: 0.3,
          fontFamily: fontSans,
        }}
      >
        • Powered by Pastor Wilson Lucas
      </Typography>
    </Box>
  )
}

function SplashImagem({ maxHeight = '92vh' }) {
  return (
    <picture
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        margin: 0,
      }}
    >
      <source srcSet={SPLASH_IMAGEM_WEBP} type="image/webp" />
      <img
        src={SPLASH_IMAGEM_PNG}
        alt=""
        decoding="async"
        fetchPriority="high"
        style={{
          width: 'min(92vw, 1080px)',
          height: 'auto',
          maxHeight,
          objectFit: 'contain',
        }}
      />
    </picture>
  )
}

/**
 * Web/PWA: imagem da Bíblia → tela verde → fecha ao `biblia-pronta`.
 * App nativo: imagem + rodapé (sem tela verde); fecha ao `biblia-pronta`.
 */
export default function SplashScreen({
  onComplete,
  imageMinMs = 650,
  minMs = 750,
  maxMs = 12000,
}) {
  const nativo = isNativeApp()
  const minPosPronta = nativo ? 0 : minMs
  const [visible, setVisible] = useState(() => !splashUiJaConcluiu())
  const [fase, setFase] = useState(() => (nativo ? 'nativo' : 'imagem'))
  const verdeIniciouEmRef = useRef(null)
  const bibliaProntaRef = useRef(bibliaJaEstaPronta())
  const timeoutFinalRef = useRef(null)

  useEffect(() => {
    if (splashUiJaConcluiu()) {
      onComplete?.()
      return undefined
    }

    let cancelled = false

    const finalizar = () => {
      if (cancelled || splashUiJaConcluiu()) return
      cancelled = true
      removerSplashHtmlInicial()
      marcarSplashUiConcluido()
      setVisible(false)
      window.setTimeout(() => {
        marcarSplashFechado()
        onComplete?.()
      }, 80)
    }

    const agendarFechamentoPosPronta = () => {
      if (cancelled || verdeIniciouEmRef.current == null) return
      const elapsed = Date.now() - verdeIniciouEmRef.current
      const restante = Math.max(0, minPosPronta - elapsed)
      if (timeoutFinalRef.current) window.clearTimeout(timeoutFinalRef.current)
      timeoutFinalRef.current = window.setTimeout(finalizar, restante)
    }

    const onPronta = () => {
      bibliaProntaRef.current = true
      if (verdeIniciouEmRef.current != null) {
        agendarFechamentoPosPronta()
      }
    }

    window.addEventListener('biblia-pronta', onPronta)

    if (nativo) {
      removerSplashHtmlInicial()
      verdeIniciouEmRef.current = Date.now()
      if (bibliaProntaRef.current) {
        agendarFechamentoPosPronta()
      }
    }

    const timeoutImagem = nativo
      ? null
      : window.setTimeout(() => {
          if (cancelled) return
          verdeIniciouEmRef.current = Date.now()
          setFase('verde')
          removerSplashHtmlInicial()
          if (bibliaProntaRef.current) {
            agendarFechamentoPosPronta()
          }
        }, imageMinMs)

    const timeoutTeto = window.setTimeout(finalizar, maxMs)

    if (bibliaJaEstaPronta()) {
      bibliaProntaRef.current = true
    }

    return () => {
      cancelled = true
      window.removeEventListener('biblia-pronta', onPronta)
      if (timeoutFinalRef.current) window.clearTimeout(timeoutFinalRef.current)
      if (timeoutImagem) window.clearTimeout(timeoutImagem)
      window.clearTimeout(timeoutTeto)
    }
  }, [onComplete, imageMinMs, minPosPronta, maxMs, nativo])

  if (!visible) return null

  if (fase === 'nativo') {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#ffffff',
          pointerEvents: 'auto',
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            px: 1,
          }}
        >
          <SplashImagem maxHeight="calc(100vh - 120px - env(safe-area-inset-bottom))" />
        </Box>
        <SplashRodapeNativo />
      </Box>
    )
  }

  if (fase === 'imagem') {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#ffffff',
          pointerEvents: 'auto',
        }}
      >
        <SplashImagem />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #004d40 0%, #00695c 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        transition: 'opacity 0.35s ease',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <Box
        sx={{
          textAlign: 'center',
          color: 'white',
          animation: 'splashZoomIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          '@keyframes splashZoomIn': {
            from: {
              opacity: 0,
              transform: 'scale(0.5)',
            },
            to: {
              opacity: 1,
              transform: 'scale(1)',
            },
          },
        }}
      >
        <Box sx={{ mb: 5 }}>
          <Box
            sx={{
              width: 120,
              height: 120,
              margin: '0 auto 20px',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              animation: 'splashIconFloat 3s ease-in-out infinite',
              '@keyframes splashIconFloat': {
                '0%, 100%': { transform: 'translateY(0px)' },
                '50%': { transform: 'translateY(-10px)' },
              },
            }}
          >
            <MenuBookIcon sx={{ fontSize: 60, color: 'white' }} />
          </Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 1,
              textShadow: '2px 2px 10px rgba(0, 0, 0, 0.3)',
              letterSpacing: 0.5,
              fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
            }}
          >
            Bíblia DC
          </Typography>
          <Typography
            variant="h6"
            sx={{
              opacity: 0.95,
              fontWeight: 300,
              letterSpacing: 0.5,
              fontStyle: 'italic',
              fontFamily: '"Source Sans 3", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            }}
          >
            Ide e fazei discípulos...
          </Typography>
        </Box>

        <Box
          sx={{
            width: 200,
            height: 4,
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            margin: '40px auto 20px',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              background: 'white',
              borderRadius: 2,
              animation: 'loaderProgress 2s ease-in-out forwards',
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
              '@keyframes loaderProgress': {
                from: { width: '0%' },
                to: { width: '100%' },
              },
            }}
          />
        </Box>

        <Typography
          variant="caption"
          sx={{
            fontSize: 14,
            opacity: 0.7,
            mt: 2.5,
            display: 'block',
            fontFamily: '"Source Sans 3", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            letterSpacing: 0.3,
          }}
        >
          • Powered by Pastor Wilson Lucas
        </Typography>
      </Box>
    </Box>
  )
}
