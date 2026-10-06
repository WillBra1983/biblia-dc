export function partesApresentacao(texto) {
  return String(texto || '').split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((parte) => {
    if (parte.startsWith('***') && parte.endsWith('***')) return { texto: parte.slice(3, -3), tipo: 'negritoitalico' }
    if (parte.startsWith('**') && parte.endsWith('**')) return { texto: parte.slice(2, -2), tipo: 'negrito' }
    if (parte.startsWith('*') && parte.endsWith('*') && parte.length > 2) return { texto: parte.slice(1, -1), tipo: 'italico' }
    return { texto: parte, tipo: 'normal' }
  })
}
export function contarApresentacao(texto) {
  return partesApresentacao(texto).reduce((total, parte) => total + parte.texto.length, 0)
}
