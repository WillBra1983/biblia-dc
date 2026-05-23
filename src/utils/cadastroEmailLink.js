import { getPublicAppBaseUrl } from '../services/bibliaEstudosService'

export const EMAIL_FOR_SIGN_IN_KEY = 'salvation-email-for-sign-in'

/** URL de retorno após o utilizador tocar no link do e-mail (Firebase Auth). */
export function buildCadastroEmailLinkContinueUrl() {
  const base = getPublicAppBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '')
  const trimmed = String(base).replace(/\/$/, '')
  return `${trimmed}/chat?cadastro=1`
}

export function guardarEmailParaCadastroLink(email) {
  try {
    localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, String(email || '').trim().toLowerCase())
  } catch {
    /* ignore */
  }
}

export function lerEmailParaCadastroLink() {
  try {
    return localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY) || ''
  } catch {
    return ''
  }
}

export function limparEmailParaCadastroLink() {
  try {
    localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY)
  } catch {
    /* ignore */
  }
}
