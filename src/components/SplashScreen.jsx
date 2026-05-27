import { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import {
  bibliaJaEstaPronta,
  deveExibirSplashOverlay,
  jaPassouDoSplash,
  marcarSplashFechado,
  marcarSplashOverlayExibido,
  marcarSplashUiConcluido,
  removerSplashHtmlInicial,
  splashUiJaConcluiu,
} from '../utils/posSplash'

/**
 * Splash com duração mínima curta (`minMs`) e teto máximo (`maxMs`).
 * Fecha quando `bibliaPronta = true` for despachado em `window`
 * (`window.dispatchEvent(new Event('biblia-pronta'))`) — assim o capítulo aparece
 * imediato, sem "tela preta" no meio do caminho.
 */
export default function SplashScreen({ onComplete, minMs = 600, maxMs = 1800 }) {
  const [visible, setVisible] = useState(() => deveExibirSplashOverlay())

  useEffect(() => {
    removerSplashHtmlInicial()

    if (splashUiJaConcluiu()) {
      if (onComplete) onComplete()
      return undefined
    }

    if (deveExibirSplashOverlay()) {
      marcarSplashOverlayExibido()
    } else {
      setVisible(false)
    }

    if (jaPassouDoSplash()) {
      onComplete?.()
      return undefined
    }

    let finalizado = false
    const startedAt = Date.now()
    let timeoutFinal = null

    const finalizar = () => {
      if (finalizado || splashUiJaConcluido()) return
      finalizado = true
      marcarSplashUiConcluido()
      setVisible(false)
      window.setTimeout(() => {
        marcarSplashFechado()
        onComplete?.()
      }, 60)
    }

    const onPronta = () => {
      const elapsed = Date.now() - startedAt
      const restante = Math.max(0, minMs - elapsed)
      if (timeoutFinal) window.clearTimeout(timeoutFinal)
      timeoutFinal = window.setTimeout(finalizar, restante)
    }

    window.addEventListener('biblia-pronta', onPronta, { once: true })
    const timeoutTeto = window.setTimeout(finalizar, maxMs)

    if (bibliaJaEstaPronta()) {
      onPronta()
    }

    return () => {
      if (timeoutFinal) window.clearTimeout(timeoutFinal)
      window.clearTimeout(timeoutTeto)
    }
  }, [onComplete, minMs, maxMs])

  if (!visible) return null

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
          {/* Tipografia alinhada ao tema: serifa elegante no título (Source
              Serif 4) e Source Sans no subtítulo. Stack robusta de fallback
              cobre o caso de a Google Font ainda não ter carregado quando o
              splash aparece (`font-display: swap` evita texto invisível). */}
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

