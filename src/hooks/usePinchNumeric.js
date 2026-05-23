import { useEffect, useRef } from 'react'
import { getTouchDistance } from '../utils/pinchZoom'

/**
 * Pinça com dois dedos no elemento: ajusta um valor numérico (ex.: zoom %, entre min e max).
 */
export function usePinchNumeric(ref, { enabled, value, onChange, min, max, step = 10 }) {
  const pinchRef = useRef(null)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    const onStart = (e) => {
      if (e.touches.length === 2) {
        const d = getTouchDistance(e.touches)
        if (d > 10) pinchRef.current = { d0: d, v0: valueRef.current }
      }
    }

    const onMove = (e) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const d = getTouchDistance(e.touches)
        if (d > 10 && pinchRef.current.d0 > 10) {
          const ratio = d / pinchRef.current.d0
          const raw = pinchRef.current.v0 * ratio
          const snapped = Math.round(raw / step) * step
          onChange(Math.min(max, Math.max(min, snapped)))
        }
      }
    }

    const onEnd = (e) => {
      if (e.touches.length < 2) pinchRef.current = null
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)

    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [enabled, min, max, step, onChange, ref])
}
