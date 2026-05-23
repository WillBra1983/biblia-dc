const DIGITOS_SOBRESCRITOS = {
  0: '⁰',
  1: '¹',
  2: '²',
  3: '³',
  4: '⁴',
  5: '⁵',
  6: '⁶',
  7: '⁷',
  8: '⁸',
  9: '⁹',
}

/**
 * Notas de rodapé no hinário (txt) costumam vir como ",11", ";12" ou "veraz1"
 * após a palavra. Converte para ¹²³ sem alterar números de estrofe no início da linha.
 */
const RE_NOTA_APOS_PALAVRA =
  /(?<=[\p{L}áéíóúãõâêîôûçÁÉÍÓÚÃÕÂÊÎÔÛÇ])([,;]?)(\d{1,2})(?!\d)(?=\s|$|\)|\n|—|\.|,|;|!|\?|:)/gu

export function digitosParaSobrescrito(digitos) {
  return String(digitos)
    .split('')
    .map((d) => DIGITOS_SOBRESCRITOS[d] ?? d)
    .join('')
}

export function formatarNotasRodapeHinario(texto) {
  return String(texto || '').replace(
    RE_NOTA_APOS_PALAVRA,
    (_match, pontuacao, nums) => `${pontuacao || ''}${digitosParaSobrescrito(nums)}`
  )
}
