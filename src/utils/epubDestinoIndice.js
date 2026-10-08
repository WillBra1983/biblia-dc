import { cancelarLimpezaEpub } from './epubRolagemEstavel'

export function alinharDestinoEpub(rendition, destino) {
  const manager = rendition?.manager
  const root = manager?.container
  if (!root || manager.isPaginated) return false
  const section = rendition.book?.spine?.get(destino)
  const view = manager.views?.all?.().find((valor) => valor.displayed && valor.section?.index === section?.index)
  if (!view?.contents || !view.iframe) return false
  let top = 0
  if (String(destino).startsWith('epubcfi(')) top = view.locationOf(destino)?.top || 0
  else {
    const fragmento = String(destino).split('#').slice(1).join('#')
    if (fragmento) {
      let id = fragmento
      try { id = decodeURIComponent(fragmento) } catch { /* Identificador literal. */ }
      const alvo = view.contents.document?.getElementById(id) || view.contents.document?.getElementsByName?.(id)?.[0]
      if (!alvo) return false
      top = alvo.getBoundingClientRect().top
    }
  }
  const posicao = root.scrollTop + view.iframe.getBoundingClientRect().top - root.getBoundingClientRect().top - (root.clientTop || 0) + top
  if (!Number.isFinite(posicao)) return false
  manager.scrollTo(root.scrollLeft, Math.max(0, posicao), true)
  rendition.reportLocation?.()
  return true
}

export async function navegarDestinoEpub(rendition, destino, modo) {
  if (!rendition) throw new Error('O leitor ainda está carregando.')
  if (modo === 'rolagem') cancelarLimpezaEpub(rendition.manager)
  await rendition.display(destino)
  if (modo !== 'rolagem') return
  // display() do gerenciador contínuo inclui a montagem dos capítulos vizinhos.
  // Aguarde o layout antes de calcular a posição absoluta, sem scrollBy acumulado.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  cancelarLimpezaEpub(rendition.manager)
  if (!alinharDestinoEpub(rendition, destino)) throw new Error('Não foi possível localizar este título na rolagem do EPUB.')
}
