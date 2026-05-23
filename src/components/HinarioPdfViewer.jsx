import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box,
  CircularProgress,
  IconButton,
  Slider,
  Stack,
  Typography
} from '@mui/material'
import ZoomIn from '@mui/icons-material/ZoomIn'
import ZoomOut from '@mui/icons-material/ZoomOut'
import Fullscreen from '@mui/icons-material/Fullscreen'
import FullscreenExit from '@mui/icons-material/FullscreenExit'
import { getPdfDocument } from '../services/pdfService'
import { sxFullViewportHeight } from '../utils/viewportHeight'

function defaultZoomForViewport() {
  if (typeof window === 'undefined') return 1.8
  return window.innerWidth < 700 ? 2.4 : 1.5
}

function touchDistance(touches) {
  if (touches.length < 2) return 0
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.hypot(dx, dy)
}

/**
 * Renderiza uma página do PDF de cifras (hinário) com zoom.
 * `pageNumber` é 1-based (como no PDF.js).
 */
export default function HinarioPdfViewer({
  pageNumber,
  tituloHino,
  resolvingPage,
  /** Modo hinário: menos texto, PDF usa quase toda a altura e largura úteis */
  compact = false
}) {
  const canvasRef = useRef(null)
  const rootRef = useRef(null)
  const scrollRef = useRef(null)
  const zoomRef = useRef(1)
  const pinchRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(defaultZoomForViewport)
  const [numPages, setNumPages] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  zoomRef.current = zoom

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  /** Pinça com 2 dedos na área do PDF para ampliar/reduzir; 1 dedo continua a deslocar a vista. */
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !pageNumber || pageNumber < 1 || resolvingPage) return

    const onTouchStart = e => {
      if (e.touches.length === 2) {
        const d = touchDistance(e.touches)
        if (d > 10) {
          pinchRef.current = { d0: d, z0: zoomRef.current }
        }
      }
    }

    const onTouchMove = e => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const d = touchDistance(e.touches)
        if (d > 10 && pinchRef.current.d0 > 10) {
          const ratio = d / pinchRef.current.d0
          const nz = Math.min(12, Math.max(0.5, pinchRef.current.z0 * ratio))
          setZoom(Math.round(nz * 100) / 100)
        }
      }
    }

    const onTouchEnd = e => {
      if (e.touches.length < 2) {
        pinchRef.current = null
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [pageNumber, resolvingPage])

  const renderPage = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !pageNumber || pageNumber < 1) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const pdf = await getPdfDocument()
      setNumPages(pdf.numPages)

      if (pageNumber > pdf.numPages) {
        setError(`Página ${pageNumber} fora do PDF (${pdf.numPages} páginas).`)
        setLoading(false)
        return
      }

      const page = await pdf.getPage(pageNumber)
      const baseViewport = page.getViewport({ scale: 1 })
      const containerW = rootRef.current?.clientWidth || 360
      const pad = compact ? 2 : 8
      const fitScale = Math.min(3, Math.max(0.35, (containerW - pad) / baseViewport.width))
      const scaleBase = fitScale * zoom
      const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2.5)
      const viewport = page.getViewport({ scale: scaleBase })
      const renderViewport = page.getViewport({ scale: scaleBase * dpr })

      const ctx = canvas.getContext('2d', { alpha: false })
      canvas.width = Math.floor(renderViewport.width)
      canvas.height = Math.floor(renderViewport.height)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      ctx.imageSmoothingEnabled = true
      if ('imageSmoothingQuality' in ctx) {
        ctx.imageSmoothingQuality = 'high'
      }

      await page.render({
        canvasContext: ctx,
        viewport: renderViewport
      }).promise
    } catch (e) {
      console.error('HinarioPdfViewer:', e)
      setError(
        e?.message?.includes('fetch') || e?.name === 'MissingPDFException'
          ? 'Não foi possível carregar o arquivo PDF. Confira se hinario-com-cifras.pdf está em public/.'
          : e?.message || 'Erro ao exibir o PDF.'
      )
    } finally {
      setLoading(false)
    }
  }, [pageNumber, zoom, isFullscreen, compact])

  useEffect(() => {
    renderPage()
  }, [renderPage])

  if (resolvingPage) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={36} />
      </Box>
    )
  }

  if (!pageNumber || pageNumber < 1) {
    return (
      <Box sx={{ py: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Não foi possível localizar as cifras deste hino no PDF (título ambíguo ou diferente do impresso).
          Ajuste o override em hinario_cifrado_index.json se necessário.
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      ref={rootRef}
      data-no-global-pinch
      sx={{
        width: '100%',
        minHeight: compact ? 0 : 200,
        flex: compact ? 1 : undefined,
        display: 'flex',
        flexDirection: 'column',
        ...(isFullscreen && {
          ...sxFullViewportHeight(),
          bgcolor: 'background.paper',
          p: 1,
          boxSizing: 'border-box'
        })
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ mb: compact ? 0.5 : 1, px: compact ? 0.5 : 0.5, flexShrink: 0 }}
      >
        <IconButton
          size="small"
          onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100))}
          aria-label="Diminuir zoom"
        >
          <ZoomOut />
        </IconButton>
        <Slider
          size="small"
          value={zoom}
          min={0.5}
          max={12}
          step={0.05}
          onChange={(_, v) => setZoom(v)}
          sx={{ flex: 1, maxWidth: { xs: '100%', sm: 260 } }}
        />
        <IconButton
          size="small"
          onClick={() => setZoom((z) => Math.min(12, Math.round((z + 0.15) * 100) / 100))}
          aria-label="Aumentar zoom"
        >
          <ZoomIn />
        </IconButton>
        {numPages > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            Pág. {pageNumber}/{numPages}
          </Typography>
        )}
        <IconButton
          size="small"
          onClick={async () => {
            const el = rootRef.current
            if (!el) return
            try {
              if (document.fullscreenElement) {
                await document.exitFullscreen()
              } else {
                await el.requestFullscreen()
              }
            } catch (e) {
              console.warn('Fullscreen:', e)
            }
          }}
          aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          title="Tela cheia"
        >
          {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
        </IconButton>
      </Stack>

      {!compact && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, px: 0.5 }}>
          Use dois dedos (pinça) na área cinza para ampliar ou reduzir. Com um dedo, deslize para ver a página.
        </Typography>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={36} />
        </Box>
      )}

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      <Box
        ref={scrollRef}
        sx={{
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y',
          flex: compact || isFullscreen ? 1 : undefined,
          minHeight: 0,
          maxHeight:
            isFullscreen || compact
              ? 'none'
              : { xs: 'min(52vh, 420px)', sm: 'min(58vh, 520px)' },
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100'),
          borderRadius: compact ? 0 : 1,
          border: compact ? 0 : 1,
          borderColor: 'divider',
          mx: compact ? 0 : undefined
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: loading && !error ? 'none' : 'block',
            margin: '0 auto',
            maxWidth: 'none',
            width: 'auto',
            height: 'auto'
          }}
        />
      </Box>

      {tituloHino && !compact && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
          {tituloHino}
        </Typography>
      )}
    </Box>
  )
}
