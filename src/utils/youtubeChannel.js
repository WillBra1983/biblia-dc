import { abrirUrlExterna } from './abrirUrlExterna'

/** Canal oficial — abre no Safari/Chrome (fora do WebView do app). */
export const YOUTUBE_CANAL_URL =
  'https://www.youtube.com/@BibliaDoDiscipuloCristao'

export async function abrirCanalYoutube() {
  try {
    await abrirUrlExterna(YOUTUBE_CANAL_URL)
  } catch {
    window.open(YOUTUBE_CANAL_URL, '_blank', 'noopener,noreferrer')
  }
}
