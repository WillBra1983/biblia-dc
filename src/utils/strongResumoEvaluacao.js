/** Marca que há avaliação pendente para um resumo recém-gerado (sessão do browser). */
export function strongEvalPendingKey(code) {
  return `strongStrEvalPending:${String(code || '').trim().toUpperCase()}`
}
