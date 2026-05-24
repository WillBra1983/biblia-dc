import { Capacitor } from '@capacitor/core'

/** Apple exige Sign in with Apple no iOS quando há login social; no Android não é obrigatório. */
export function mostrarLoginApple() {
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) {
    return Capacitor.getPlatform() === 'ios'
  }
  return true
}
