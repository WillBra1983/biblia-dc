import { getFirebaseFunctions } from '../config/firebaseRuntime'
import { isFirebaseConfigured } from '../config/firebaseEnv'

/**
 * Em produção, a chave Gemini fica no servidor (Cloud Function).
 * Dev local: defina VITE_GEMINI_USE_PROXY=1 para testar o proxy ou use chave no .env.
 */
export function geminiProxyAtivo() {
  const v = String(import.meta.env.VITE_GEMINI_USE_PROXY ?? '').trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes') return true
  if (v === '0' || v === 'false' || v === 'no') return false
  return import.meta.env.PROD === true
}

export function geminiProxyConfigurado() {
  return geminiProxyAtivo() && isFirebaseConfigured()
}

/**
 * @param {string} model
 * @param {object} body
 * @returns {Promise<{ ok: boolean, data?: object, status?: number, error?: string, code?: string }>}
 */
export async function chamarGeminiViaProxy(model, body) {
  const fns = getFirebaseFunctions()
  if (!fns) {
    return { ok: false, status: 0, error: 'Firebase não configurado.', code: 'NO_FIREBASE' }
  }

  const { httpsCallable } = await import('firebase/functions')
  const fn = httpsCallable(fns, 'geminiGenerateContent', { timeout: 120_000 })

  try {
    const res = await fn({ model, body })
    const payload = res?.data || {}
    if (!payload.ok) {
      const msg = payload?.data?.error?.message || payload?.error || 'Erro da API Gemini.'
      return {
        ok: false,
        status: payload.status || 502,
        error: msg,
        code: payload.code || 'API',
        data: payload.data
      }
    }
    return { ok: true, status: payload.status || 200, data: payload.data }
  } catch (e) {
    const code = String(e?.code || '')
    const msg = e?.message || 'Falha ao chamar a IA.'
    if (code.includes('unauthenticated')) {
      return { ok: false, status: 401, error: 'Inicie sessão para usar a IA.', code: 'AUTH' }
    }
    if (code.includes('resource-exhausted')) {
      return { ok: false, status: 429, error: msg, code: 'QUOTA' }
    }
    if (code.includes('failed-precondition')) {
      return { ok: false, status: 503, error: msg, code: 'NO_SERVER_KEY' }
    }
    return { ok: false, status: 500, error: msg, code: 'PROXY' }
  }
}
