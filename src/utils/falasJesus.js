// As marcações editoriais pertencem à própria tradução; nunca se inferem pela referência.
export function segmentosFalasJesus(texto) {
  const partes = String(texto ?? '').split(/(<\/?J>)/gi)
  const segmentos = []
  let jesus = false
  for (const parte of partes) {
    if (/^<J>$/i.test(parte)) { jesus = true; continue }
    if (/^<\/J>$/i.test(parte)) { jesus = false; continue }
    if (parte) segmentos.push({ texto: parte, jesus })
  }
  return segmentos
}

export function limparMarcacaoJesus(texto) {
  return String(texto ?? '').replace(/<\/?J>/gi, '')
}

export const corFalasJesus = modo => modo === 'dark' ? '#ff4545' : '#b42332'
