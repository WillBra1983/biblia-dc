import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'

/** Mesmos IDs de `capacitor.config.json` → plugins.GoogleAuth */
const IOS_CLIENT_ID =
  '419144943323-0ik1cnsgjbkajq03kds8ojqkm6f1ocb5.apps.googleusercontent.com'
const WEB_CLIENT_ID =
  '419144943323-9uca774ij800th8nk7aof6ju84nlqfb8.apps.googleusercontent.com'

let nativeGoogleInitPromise = null

/**
 * Inicializa o plugin com o clientId correto por plataforma (evita falhas no iOS).
 */
export function ensureNativeGoogleAuthInitialized() {
  if (typeof Capacitor === 'undefined' || Capacitor.isNativePlatform?.() !== true) {
    return Promise.resolve()
  }
  if (!nativeGoogleInitPromise) {
    const clientId = Capacitor.getPlatform() === 'ios' ? IOS_CLIENT_ID : WEB_CLIENT_ID
    nativeGoogleInitPromise = GoogleAuth.initialize({
      clientId,
      serverClientId: WEB_CLIENT_ID,
      scopes: ['profile', 'email', 'openid'],
      // idToken com audience Web — exigido pelo Firebase Auth no iOS
      grantOfflineAccess: false,
    }).catch((err) => {
      nativeGoogleInitPromise = null
      throw err
    })
  }
  return nativeGoogleInitPromise
}

export function resetNativeGoogleAuthInitForTests() {
  nativeGoogleInitPromise = null
}
