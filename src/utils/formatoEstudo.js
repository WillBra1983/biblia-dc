const MARCA = /^<!--alinhamento:(justify|left)-->\n?/
export function lerFormatoEstudo(valor) {
  const texto = String(valor || '')
  const encontrado = texto.match(MARCA)
  return { texto: texto.replace(MARCA, ''), alinhamento: encontrado?.[1] || null }
}
export function escreverFormatoEstudo(texto, alinhamento) {
  const limpo = lerFormatoEstudo(texto).texto
  return alinhamento ? `<!--alinhamento:${alinhamento === 'justify' ? 'justify' : 'left'}-->\n${limpo}` : limpo
}
