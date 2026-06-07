import { chaveResumoStrongCache } from './strongResumoLocalCache'

/** Chave sessionStorage para o último resumo IA gerado (mesma sessão do browser). */
export function strongResumoIaStorageKey(code, token = null, detalhe = null) {
  const cacheKey = chaveResumoStrongCache(code, token, detalhe)
  return `strongIaResumo:${cacheKey}`
}
