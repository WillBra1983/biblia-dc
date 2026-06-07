import { chaveCacheAnaliseToken } from './strongTokenHelpers'

const PREFIX_LEGACY = 'strongResumoLocal_v1:'
const PREFIX_LEMMA = 'strongResumoLemma_v1:'
const PREFIX_TOKEN = 'strongResumoToken_v1:'

function normalizarCode(code) {
  return String(code || '').trim().toUpperCase()
}

function lerStorage(key) {
  if (typeof localStorage === 'undefined') return ''
  try {
    return String(localStorage.getItem(key) || '').trim()
  } catch {
    return ''
  }
}

function salvarStorage(key, texto, max = 12000) {
  const t = String(texto || '').trim()
  if (!t || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, t.slice(0, max))
  } catch {
    /* quota */
  }
}

/** Chave de sessão (léma + token quando aplicável). */
export function chaveResumoStrongCache(code, token = null) {
  const c = normalizarCode(code)
  if (!token) return c
  return `${c}::${chaveCacheAnaliseToken(c, token)}`
}

/** @deprecated Use lerResumoLemmaLocalStrong */
export function lerResumoLocalStrong(code) {
  return lerResumoLemmaLocalStrong(code)
}

/** @deprecated Use salvarResumoLemmaLocalStrong */
export function salvarResumoLocalStrong(code, resumo) {
  salvarResumoLemmaLocalStrong(code, resumo)
}

/** Resumo do léma (reutilizado em qualquer passagem com o mesmo Strong). */
export function lerResumoLemmaLocalStrong(code) {
  const key = PREFIX_LEMMA + normalizarCode(code)
  const atual = lerStorage(key)
  if (atual) return atual
  return lerStorage(PREFIX_LEGACY + normalizarCode(code))
}

export function salvarResumoLemmaLocalStrong(code, resumo) {
  salvarStorage(PREFIX_LEMMA + normalizarCode(code), resumo, 12000)
}

/** Resumo da forma na passagem (prefixo, flexão, contexto local). */
export function lerResumoTokenLocalStrong(chaveToken) {
  const k = String(chaveToken || '').trim()
  if (!k) return ''
  return lerStorage(PREFIX_TOKEN + k)
}

export function salvarResumoTokenLocalStrong(chaveToken, resumo) {
  const k = String(chaveToken || '').trim()
  if (!k) return
  salvarStorage(PREFIX_TOKEN + k, resumo, 6000)
}

export function limparResumoLemmaLocalStrong(code) {
  const c = normalizarCode(code)
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(PREFIX_LEMMA + c)
    localStorage.removeItem(PREFIX_LEGACY + c)
  } catch {
    /* ignore */
  }
}

export function limparResumoTokenLocalStrong(chaveToken) {
  const k = String(chaveToken || '').trim()
  if (!k || typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(PREFIX_TOKEN + k)
  } catch {
    /* ignore */
  }
}
