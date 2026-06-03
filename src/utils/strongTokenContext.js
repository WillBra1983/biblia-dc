/**
 * Mantém o token da passagem entre navegações (Capacitor/hash router perde location.state).
 */

const STORAGE_KEY = 'strong_token_passagem_v1'

function normalizarStrong(code) {
  return String(code || '').trim().toUpperCase()
}

export function salvarTokenPassagem(strongCode, token) {
  if (!token || typeof sessionStorage === 'undefined') return
  const texto = String(token.text || token.word || '').trim()
  if (!texto) return
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        strong: normalizarStrong(strongCode),
        token,
        savedAt: Date.now(),
      })
    )
  } catch {
    /* ignore */
  }
}

export function carregarTokenPassagem(strongCode) {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (normalizarStrong(parsed?.strong) !== normalizarStrong(strongCode)) return null
    return parsed?.token || null
  } catch {
    return null
  }
}

export function limparTokenPassagem() {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Remove aspas, pontuação morfológica e marcas periféricas do token. */
export function limparTextoTokenPassagem(texto) {
  return String(texto || '')
    .replace(/^[\u2018\u2019\u05F3'`"«\u1FBF\u1FFE\u0313]+|[\u2018\u2019\u05F3'`"»\u1FBF\u1FFE]+$/g, '')
    .replace(/^[.,;·:?!…]+|[.,;·:?!…]+$/g, '')
    .normalize('NFC')
    .trim()
}

/**
 * MorphHB separa prefixos com "/" (ex.: ב/ראשית = ב + ראשית).
 * Junta para exibir a forma contínua como no manuscrito/leitura.
 */
export function formatarTextoMorphHb(texto) {
  return String(texto || '')
    .split(/\s+/)
    .map((parte) => parte.replace(/\/+/g, '').trim())
    .filter(Boolean)
    .join(' ')
    .normalize('NFC')
    .trim()
}
