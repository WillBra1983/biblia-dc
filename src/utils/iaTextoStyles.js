/**
 * Estilo de parágrafos gerados por IA (corpo de texto; títulos ficam à esquerda).
 */
export const sxCorpoTextoIa = {
  textAlign: 'justify',
  hyphens: 'auto',
  pr: '5pt',
}

/** Mescla tipografia base com justificação obrigatória para conteúdo de IA. */
export function mesclarSxTextoIa(sxBase = {}) {
  return {
    ...sxBase,
    ...sxCorpoTextoIa,
  }
}
