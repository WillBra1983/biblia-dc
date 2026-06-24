import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

/**
 * Abre URL no navegador do sistema (Safari/Chrome), fora do WebView do app.
 * Evita navegação irrestrita dentro do app (relevante para classificação etária na App Store).
 */
export async function abrirUrlExterna(url) {
  const u = String(url || '').trim()
  if (!u) return

  if (Capacitor.isNativePlatform()) {
    try {
      await App.openUrl({ url: u })
      return
    } catch {
      /* fallback web */
    }
  }

  window.open(u, '_blank', 'noopener,noreferrer')
}
