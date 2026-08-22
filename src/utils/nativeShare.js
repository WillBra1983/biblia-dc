import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

/**
 * Tenta abrir a janela nativa de compartilhamento.
 * Retorna true quando a folha de compartilhamento foi aberta.
 */
export function montarPayloadShareNativo({ title, text, url } = {}) {
  const titulo = String(title || '').trim()
  const texto = String(text || '').trim()
  const endereco = String(url || '').trim()

  // Alguns chamadores antigos já incluíam a URL no texto. Android, iOS e
  // navegadores podem concatenar `text` e `url`, exibindo o mesmo link duas vezes.
  const textoJaContemUrl = Boolean(texto && endereco && texto.includes(endereco))

  return {
    ...(titulo ? { title: titulo } : {}),
    ...(texto ? { text: texto } : {}),
    ...(endereco && !textoJaContemUrl ? { url: endereco } : {})
  }
}

export async function openNativeShareSheet({ title, text, url }) {
  const payload = montarPayloadShareNativo({ title, text, url })

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
