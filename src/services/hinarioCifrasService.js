let dataPromise = null

const getBase = () => (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'

const normalizeId = value => {
  const text = String(value ?? '').trim()
  const match = text.match(/^(\d+)(.*)$/)
  if (!match) return text.toLowerCase()
  return `${String(Number(match[1]))}${match[2]}`.toLowerCase()
}

const normalizeSearch = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()

const loadData = async () => {
  if (dataPromise) return dataPromise
  dataPromise = (async () => {
    const base = getBase().replace(/\/$/, '') || ''
    const response = await fetch(`${base || ''}/hinario-cifras.json`)
    if (!response.ok) throw new Error(`Hinário cifrado indisponível (${response.status})`)
    const data = await response.json()
    const hinos = Array.isArray(data?.hinos) ? data.hinos : []
    return {
      hinos,
      porId: new Map(hinos.map(hino => [normalizeId(hino.id), hino]))
    }
  })().catch(error => {
    dataPromise = null
    throw error
  })
  return dataPromise
}

export const hinarioCifrasService = {
  async precarregar() {
    await loadData()
  },

  async buscarHino(numero) {
    const data = await loadData()
    return data.porId.get(normalizeId(numero)) || null
  },

  async buscarTodos() {
    const data = await loadData()
    return data.hinos.map(hino => ({ numero: hino.id, titulo: hino.titulo }))
  },

  async buscarPorTexto(value) {
    const data = await loadData()
    const term = normalizeSearch(value).trim()
    if (!term) return this.buscarTodos()
    return data.hinos
      .filter(hino => {
        if (normalizeId(hino.id) === normalizeId(term)) return true
        if (normalizeSearch(hino.titulo).includes(term)) return true
        return hino.linhas?.some(line => normalizeSearch(line.letra || line.texto || '').includes(term))
      })
      .map(hino => ({ numero: hino.id, titulo: hino.titulo }))
  }
}
