import { chaveCacheAnaliseToken, formatarReferenciaPassagemToken } from './strongTokenHelpers'

const PREFIX_LEGACY = 'strongResumoLocal_v1:'
const PREFIX_LEMMA = 'strongResumoLemma_v1:'
const PREFIX_TOKEN = 'strongResumoToken_v1:'

export function listarResumosStrongLocais() {
  const itens = new Map()
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const prefixo = [PREFIX_LEMMA, PREFIX_LEGACY].find(p => key?.startsWith(p))
      if (!prefixo) continue
      const code = key.slice(prefixo.length)
      if (!/^[HG]\d+$/.test(code)) continue
      const resumo = lerResumoLemmaLocalStrong(code)
      if (resumo) itens.set(code, { code, resumo })
    }
  } catch { /* armazenamento indisponível */ }
  return [...itens.values()].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
}

export function listarTokensStrongLocais(code) {
  const itens = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(`${PREFIX_TOKEN}${normalizarCode(code)}@`)) continue
      const cacheKey = key.slice(PREFIX_TOKEN.length)
      const resumo = lerStorage(key)
      const [livroId, capitulo, versiculo] = (cacheKey.split('@')[2] || '').split('.')
      if (resumo) itens.push({ cacheKey, resumo,
        refPassagem: formatarReferenciaPassagemToken({ livroId, capitulo, versiculo }) })
    }
  } catch { /* armazenamento indisponível */ }
  return itens
}

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
