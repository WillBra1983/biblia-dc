/** Chave sessionStorage para o último resumo IA gerado por código Strong (mesma sessão do browser). */
export function strongResumoIaStorageKey(code) {
  return `strongIaResumo:${String(code || '').trim().toUpperCase()}`
}
