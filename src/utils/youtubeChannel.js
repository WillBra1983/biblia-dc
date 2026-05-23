import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

/** Canal oficial — abre direto no navegador / app YouTube */
export const YOUTUBE_CANAL_URL =
  'https://www.youtube.com/@BibliaDoDiscipuloCristao'

/**
 * Cor da barra do Chrome Custom Tabs / Safari — neutra, alinhada ao tema do app
 * (evita vermelho que o usuário associava à abertura).
 */
export function toolbarColorYoutube(isDarkMode) {
  return isDarkMode ? '#121212' : '#ececec'
}

export async function abrirCanalYoutube(isDarkMode) {
  const toolbarColor = toolbarColorYoutube(isDarkMode)
  try {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: YOUTUBE_CANAL_URL, toolbarColor })
    } else {
      window.open(YOUTUBE_CANAL_URL, '_blank', 'noopener,noreferrer')
    }
  } catch {
    window.open(YOUTUBE_CANAL_URL, '_blank', 'noopener,noreferrer')
  }
}
