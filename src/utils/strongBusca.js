export function normalizarBuscaStrong(texto) {
  return String(texto || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

export function codigosBuscaStrong(texto, idioma = '') {
  const match = String(texto || '').trim().match(/^([hg])?\s*0*(\d{1,5})$/i)
  if (!match || Number(match[2]) < 1) return []
  const prefixo = match[1]?.toUpperCase()
  return (prefixo ? [prefixo] : idioma ? [idioma] : ['H', 'G'])
    .filter(p => !idioma || p === idioma).map(p => `${p}${Number(match[2])}`)
}
