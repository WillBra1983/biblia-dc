import { Capacitor } from '@capacitor/core'

const ANDROID_PACKAGE = 'com.bibliadc.app'
const APPLE_APP_ID = '6772898342'

export const GOOGLE_PLAY_URL =
  import.meta.env.VITE_PLAY_STORE_URL?.trim() ||
  `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`

export const APP_STORE_URL =
  import.meta.env.VITE_APP_STORE_URL?.trim() ||
  `https://apps.apple.com/br/app/biblia-do-discipulo-cristao/id${APPLE_APP_ID}`

export function obterLinkLojaDaPlataforma() {
  if (Capacitor.isNativePlatform?.()) {
    return Capacitor.getPlatform?.() === 'ios' ? APP_STORE_URL : GOOGLE_PLAY_URL
  }
  return ''
}

export function montarLinksInstalacao({ apenasPlataformaAtual = false } = {}) {
  const atual = obterLinkLojaDaPlataforma()
  if (apenasPlataformaAtual && atual) {
    return `Abra ou instale a Bíblia do Discípulo Cristão:\n${atual}`
  }
  return [
    'Abra ou instale a Bíblia do Discípulo Cristão:',
    `Google Play: ${GOOGLE_PLAY_URL}`,
    `App Store: ${APP_STORE_URL}`,
  ].join('\n')
}
