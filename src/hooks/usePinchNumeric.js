import { useEffect, useRef } from 'react'
import { getTouchDistance } from '../utils/pinchZoom'

/**
 * Pinça com dois dedos no elemento: ajusta um valor numérico (ex.: zoom %, entre min e max).
 */
export function usePinchNumeric(
  ref,
  { enabled, value, onChange, min, max, step = 10, preserveAnchor = false }
) {
  const pinchRef = useRef(null)
  const valueRef = useRef(value)
  const restoreRafRef = useRef(null)
  valueRef.current = value

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    const captureAnchor = (touches) => {
      if (!preserveAnchor || touches.length < 2) return null
      const viewportX = (touches[0].clientX + touches[1].clientX) / 2
      const viewportY = (touches[0].clientY + touches[1].clientY) / 2
      const hit = document.elementFromPoint(viewportX, viewportY)
      const closest = hit?.closest?.('[data-pinch-anchor]')
      const anchor = closest && el.contains(closest) ? closest : hit
      const rect = anchor && el.contains(anchor) ? anchor.getBoundingClientRect() : null
      return {
        anchor: rect?.height > 0 ? anchor : null,
        ratioY: rect?.height > 0 ? Math.min(1, Math.max(0, (viewportY - rect.top) / rect.height)) : 0,
        viewportY,
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
      }
    }

    const restoreAnchor = (snapshot) => {
      if (!snapshot) return
      if (restoreRafRef.current != null) cancelAnimationFrame(restoreRafRef.current)
      restoreRafRef.current = requestAnimationFrame(() => {
        restoreRafRef.current = requestAnimationFrame(() => {
          restoreRafRef.current = null
          if (snapshot.anchor?.isConnected) {
            const rect = snapshot.anchor.getBoundingClientRect()
            const nextY = rect.top + rect.height * snapshot.ratioY
            el.scrollTop += nextY - snapshot.viewportY
            return
          }
          if (snapshot.scrollHeight > 0) {
            const ratio = el.scrollHeight / snapshot.scrollHeight
            const localY = snapshot.viewportY - el.getBoundingClientRect().top
            el.scrollTop = (snapshot.scrollTop + localY) * ratio - localY
          }
        })
      })
    }

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
          const next = Math.min(max, Math.max(min, snapped))
          if (next !== valueRef.current) {
            const anchor = captureAnchor(e.touches)
            valueRef.current = next
            onChange(next)
            restoreAnchor(anchor)
          }
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
      if (restoreRafRef.current != null) cancelAnimationFrame(restoreRafRef.current)
    }
  }, [enabled, min, max, step, onChange, preserveAnchor, ref])
}
