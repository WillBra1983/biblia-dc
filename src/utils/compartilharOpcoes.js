import { Capacitor } from '@capacitor/core'
import { openNativeShareSheet } from './nativeShare'

/**
 * Texto completo para colar ou enviar a apps externos.
 */
export function montarCorpoCompartilhamento({ text, url } = {}) {
  const t = String(text || '').trim()
  const u = String(url || '').trim()
  if (!t && !u) return ''
  if (!u) return t
  if (!t) return u
  if (t.includes(u)) return t
  return `${t}\n\n${u}`
}

export function suporteShareNativo() {
  if (typeof window === 'undefined') return false
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    return true
  }
  try {
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) {
      return true
    }
  } catch {
    // ignore
  }
  return false
}

export function abrirWhatsApp(texto) {
  const corpo = String(texto || '').trim()
  if (!corpo || typeof window === 'undefined') return
  window.open(`https://wa.me/?text=${encodeURIComponent(corpo)}`, '_blank', 'noopener,noreferrer')
}

export function abrirTelegram({ text, url } = {}) {
  const corpo = montarCorpoCompartilhamento({ text, url })
  if (!corpo || typeof window === 'undefined') return
  const u = String(url || '').trim()
  if (u) {
    const texto = String(text || '').trim()
    if (texto.includes(u)) {
      window.open(
        `https://t.me/share/url?text=${encodeURIComponent(corpo)}`,
        '_blank',
        'noopener,noreferrer'
      )
      return
    }
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(texto || corpo)}`,
      '_blank',
      'noopener,noreferrer'
    )
    return
  }
  window.open(`https://t.me/share/url?text=${encodeURIComponent(corpo)}`, '_blank', 'noopener,noreferrer')
}

export function abrirEmail({ subject, body } = {}) {
  const assunto = String(subject || '').trim()
  const corpo = String(body || '').trim()
  if (typeof window === 'undefined') return
  window.location.href = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`
}

export function abrirSms(body) {
  const corpo = String(body || '').trim()
  if (!corpo || typeof window === 'undefined') return
  window.location.href = `sms:?body=${encodeURIComponent(corpo)}`
}

/**
 * Tenta a folha nativa do SO; retorna true se abriu.
 */
export async function compartilharNativo({ title, text, url } = {}) {
  try {
    return await openNativeShareSheet({
      title,
      text: text || (url ? `Acesse: ${url}` : undefined),
      url
    })
  } catch {
    return false
  }
}
