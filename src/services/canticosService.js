import { normalizeChordSearch } from '../utils/chordProParser'

let dataPromise = null
const getBase = () => (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'

const loadData = async () => {
  if (dataPromise) return dataPromise
  dataPromise = (async () => {
    const base = getBase().replace(/\/$/, '') || ''
    const response = await fetch(`${base}/salmodia-cifras.json`)
    if (!response.ok) throw new Error(`Cânticos indisponíveis (${response.status})`)
    const data = await response.json()
    return Array.isArray(data?.canticos) ? data.canticos : []
  })().catch(error => {
    dataPromise = null
    throw error
  })
  return dataPromise
}

export const canticosService = {
  async precarregar() {
    await loadData()
  },
  async buscarTodos() {
    return loadData()
  },
  async buscarPorTexto(value) {
    const canticos = await loadData()
    const term = normalizeChordSearch(value).trim()
    if (!term) return canticos
    return canticos.filter(cantico =>
      normalizeChordSearch(cantico.titulo).includes(term) ||
      normalizeChordSearch(cantico.id).includes(term) ||
      cantico.linhas?.some(line => normalizeChordSearch(line.letra || line.texto).includes(term))
    )
  },
}
