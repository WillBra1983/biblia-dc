import { useEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'
import { getTouchDistance } from '../utils/pinchZoom'

const MIN = 1
const MAX = 1.5

/**
 * Pinça temporária num contentor local (ex.: Drawer). Reinicia quando `resetKey` muda.
 */
export default function LocalPinchZoom({ resetKey, children, sx = {} }) {
  const rootRef = useRef(null)
  const contentRef = useRef(null)
  const scaleRef = useRef(1)
  const pinchRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [extraPadBottom, setExtraPadBottom] = useState(0)

  scaleRef.current = scale

  useEffect(() => {
    setScale(1)
  }, [resetKey])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const d = getTouchDistance(e.touches)
        if (d > 10) pinchRef.current = { d0: d, z0: scaleRef.current }
      }
    }

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const d = getTouchDistance(e.touches)
        if (d > 10 && pinchRef.current.d0 > 10) {
          const ratio = d / pinchRef.current.d0
          const nz = Math.min(MAX, Math.max(MIN, pinchRef.current.z0 * ratio))
          setScale(Math.round(nz * 100) / 100)
        }
      }
    }

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) pinchRef.current = null
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
  }, [resetKey])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const onWheel = (e) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const step = e.deltaY > 0 ? -0.06 : 0.06
      setScale((s) =>
        Math.min(MAX, Math.max(MIN, Math.round((s + step) * 100) / 100))
      )
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [resetKey])

  useEffect(() => {
    const node = contentRef.current
    if (!node) return

    const updatePad = () => {
      const h = node.offsetHeight
      if (!Number.isFinite(h) || h <= 0) {
        setExtraPadBottom(0)
        return
      }
      setExtraPadBottom(Math.max(0, h * (scale - 1)))
    }

    updatePad()
    const ro = new ResizeObserver(() => updatePad())
    ro.observe(node)
    return () => ro.disconnect()
  }, [scale])

  const inv = scale > 0 ? 100 / scale : 100

  return (
    <Box
      ref={rootRef}
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        minHeight: 0,
        overflowX: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        ...sx,
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          overflowX: 'hidden',
          paddingBottom: `${extraPadBottom}px`,
          boxSizing: 'border-box',
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          ref={contentRef}
          sx={{
            width: `${inv.toFixed(6)}%`,
            maxWidth: `${inv.toFixed(6)}%`,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            boxSizing: 'border-box',
            minWidth: 0,
            flexShrink: 0,
            '& .MuiGrid-container': { minWidth: 0 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
