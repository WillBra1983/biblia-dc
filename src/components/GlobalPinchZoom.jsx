import { useEffect, useRef } from 'react'
import { Box } from '@mui/material'
import { useApp } from '../contexts/AppContext'
import { usePinchNumeric } from '../hooks/usePinchNumeric'
import { normalizarZoomLeitura, ZOOM_LEITURA_MIN, ZOOM_LEITURA_MAX, ZOOM_LEITURA_PASSO } from '../utils/zoomLeitura'

/** A pinça altera o tamanho de leitura da seção; nunca escala botões ou o layout. */
export default function GlobalPinchZoom({ disabled = false, children, sx = {} }) {
  const rootRef = useRef(null)
  const { fontSize, setFontSize } = useApp()
  usePinchNumeric(rootRef, {
    enabled: !disabled, value: normalizarZoomLeitura(fontSize), onChange: setFontSize,
    min: ZOOM_LEITURA_MIN, max: ZOOM_LEITURA_MAX, step: ZOOM_LEITURA_PASSO,
    preserveAnchor: true,
  })
  useEffect(() => {
    const element = rootRef.current
    if (disabled || !element) return
    const wheel = event => {
      if (!event.ctrlKey || event.defaultPrevented || event.target?.closest?.('[data-no-global-pinch]')) return
      event.preventDefault()
      setFontSize(current => normalizarZoomLeitura(Number(current) + (event.deltaY > 0 ? -ZOOM_LEITURA_PASSO : ZOOM_LEITURA_PASSO)))
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [disabled, setFontSize])
  if (disabled) return children
  return <Box ref={rootRef} data-pinca-leitura sx={{
    width: '100%', maxWidth: '100%', minWidth: 0, minHeight: 0, flex: '1 1 0%',
    display: 'flex', flexDirection: 'column', alignItems: 'stretch', boxSizing: 'border-box',
    overflowWrap: 'anywhere',
    '& .MuiTypography-root:not(.MuiTypography-noWrap)': { minWidth: 0, maxWidth: '100%', overflowWrap: 'anywhere' },
    '& pre': { maxWidth: '100%', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
    ...sx,
  }}>{children}</Box>
}
