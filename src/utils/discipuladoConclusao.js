/** Chave interna para mapa de estudos/temas concluídos (sem prefixo localStorage). */
export function chaveConclusaoDiscipulado(temaId, estudoId = null) {
  if (temaId == null || temaId === '') return ''
  return estudoId != null && estudoId !== '' ? `${temaId}_${estudoId}` : String(temaId)
}

/** Chave legada em localStorage (`discipulado_concluido_*`). */
export function chaveLocalStorageConclusao(temaId, estudoId = null) {
  const base = chaveConclusaoDiscipulado(temaId, estudoId)
  return base ? `discipulado_concluido_${base}` : ''
}

/** Lê conclusões legadas espalhadas em localStorage e devolve um mapa unificado. */
export function migrarConclusoesLegadoLocalStorage(concluidosAtuais = {}) {
  const out = { ...(concluidosAtuais || {}) }
  if (typeof localStorage === 'undefined') return out
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key?.startsWith('discipulado_concluido_')) continue
      if (localStorage.getItem(key) !== 'true') continue
      const id = key.slice('discipulado_concluido_'.length)
      if (id) out[id] = true
    }
  } catch {
    /* ignore */
  }
  return out
}
