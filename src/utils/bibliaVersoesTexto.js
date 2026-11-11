/** A NTLH pode reunir vários números em um só bloco de tradução. */
export function buscarBlocoVersiculo(linhas, numero) {
  return (linhas || []).find((row, indice) => {
    const inicio = Number(row.numero) || indice + 1
    return inicio <= numero && (Number(row.numeroFim) || inicio) >= numero
  })
}

export function tokensDoBloco(tokens, inicio, fim = inicio) {
  const resultado = []
  for (let n = inicio; n <= fim; n++) {
    for (const token of tokens?.[n] || []) resultado.push({ ...token, versiculoOrigem: n })
  }
  return resultado
}

export function linhasCitacaoVersiculos(linhas, numeros) {
  return (linhas || []).flatMap((row, indice) => {
    const inicio = Number(row.numero) || indice + 1
    const fim = Number(row.numeroFim) || inicio
    if (!row.texto || !numeros.some(n => n >= inicio && n <= fim)) return []
    const corpo = String(row.texto).trim().replace(/^\s*(?:\d+|[⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s+/u, '')
    return [`${fim > inicio ? `${inicio}–${fim}` : inicio} ${corpo}`]
  })
}
