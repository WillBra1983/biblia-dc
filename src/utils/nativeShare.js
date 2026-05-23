import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

/**
 * Tenta abrir a janela nativa de compartilhamento.
 * Retorna true quando a folha de compartilhamento foi aberta.
 */
export async function openNativeShareSheet({ title, text, url }) {
  const payload = {
    ...(title ? { title } : {}),
    ...(text ? { text } : {}),
    ...(url ? { url } : {})
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    await navigator.share(payload)
    return true
  }

  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) {
    await Share.share({
      ...payload,
      dialogTitle: 'Compartilhar'
    })
    return true
  }

  return false
}
