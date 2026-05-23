import { useMediaQuery } from '@mui/material'
import { Capacitor } from '@capacitor/core'

/** Largura mínima + dispositivo com hover (heurística de computador). */
export const MEDIA_APRESENTACAO_DESKTOP = '(min-width: 900px) and (hover: hover)'

export function isAppNativo() {
  return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.() === true
}

export function podeUsarModoApresentacao() {
  if (typeof window === 'undefined') return false
  if (isAppNativo()) return false
  return window.matchMedia(MEDIA_APRESENTACAO_DESKTOP).matches
}

export function usePodeUsarModoApresentacao() {
  const desktop = useMediaQuery(MEDIA_APRESENTACAO_DESKTOP)
  return desktop && !isAppNativo()
}
