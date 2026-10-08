// Use a posição real do texto no iframe, não o último evento relocated.
export function linhaTopoEpub(rendition) {
  const root = rendition?.manager?.container
  if (!root?.getBoundingClientRect) return undefined
  const janela = root.getBoundingClientRect()
  for (const view of rendition.manager.views?.all?.() || []) {
    const doc = view.contents?.document
    if (!view.displayed || !doc?.body || !view.iframe) continue
    const frame = view.iframe.getBoundingClientRect()
    if (frame.bottom <= janela.top || frame.top >= janela.bottom || frame.right <= janela.left || frame.left >= janela.right) continue
    const topo = Math.max(0, janela.top - frame.top)
    const esquerda = Math.max(0, janela.left - frame.left)
    const direita = Math.min(frame.width, janela.right - frame.left)
    const base = Math.min(frame.height, janela.bottom - frame.top)
    const visivel = (rect) => rect.bottom > topo + 1 && rect.top < base && rect.right > esquerda && rect.left < direita
    const walker = doc.createTreeWalker(doc.body, 4)
    const range = doc.createRange()
    let node
    while ((node = walker.nextNode())) {
      if (!node.textContent?.trim() || node.parentElement?.closest('script, style, [aria-hidden="true"]')) continue
      range.selectNodeContents(node)
      if (![...range.getClientRects()].some(visivel)) continue
      for (let offset = 0; offset < node.length; offset++) {
        if (!node.textContent[offset].trim()) continue
        range.setStart(node, offset); range.setEnd(node, offset + 1)
        if (![...range.getClientRects()].some(visivel)) continue
        range.collapse(true)
        return view.contents.cfiFromRange(range, 'leitor-ancora-topo')
      }
    }
  }
  return undefined
}

export function posicaoTrocaModoEpub(rendition, ultimaPosicao) {
  try {
    const topo = linhaTopoEpub(rendition)
    if (topo) return topo
    const atual = rendition?.currentLocation?.()?.start?.cfi
    if (atual) return atual
  } catch {
    // Uma mudança de tamanho pode deixar a localização indisponível por instantes.
  }
  return ultimaPosicao || rendition?.location?.start?.cfi || undefined
}

export async function restaurarLinhaTopoEpub(rendition, cfi, modo) {
  if (!cfi) return
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  if (!rendition.manager?.views) return
  if (modo === 'rolagem') {
    const { alinharDestinoEpub } = await import('./epubDestinoIndice')
    const { cancelarLimpezaEpub } = await import('./epubRolagemEstavel')
    cancelarLimpezaEpub(rendition.manager)
    alinharDestinoEpub(rendition, cfi)
    return
  }
  const secao = rendition.book.spine.get(cfi)
  const view = rendition.manager.views.all().find((entrada) => entrada.displayed && entrada.section.index === secao.index)
  if (!view?.contents) return
  const range = view.contents.range(cfi, 'leitor-ancora-topo')
  if (!range?.startContainer || range.startContainer.nodeType !== 3) return
  // Uma quebra de coluna na linha capturada permite iniciar a nova página
  // nela, em vez de voltar ao início da coluna que conteria o destino.
  const doc = view.contents.document
  const marcador = doc.createElement('span')
  marcador.id = 'leitor-inicio-modo'
  marcador.className = 'leitor-ancora-topo'
  marcador.setAttribute('aria-hidden', 'true')
  marcador.style.cssText = 'display:block;break-before:column;-webkit-column-break-before:always;height:0;margin:0;padding:0;border:0;'
  range.collapse(true)
  range.insertNode(marcador)
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  if (!rendition.manager?.views || !view.contents) return
  view.expand?.()
  await rendition.display(`${secao.href}#${marcador.id}`)
}
