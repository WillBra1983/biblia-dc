import { Capacitor } from '@capacitor/core'

export function isNativeApp() {
  return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.() === true
}
