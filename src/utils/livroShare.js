import { openNativeShareSheet } from './nativeShare'

const SITE_PUBLICO_PADRAO = 'https://foundcine.com/biblia'

export function linkCompartilhamentoLivro(livroId) {
  const baseConfigurada = typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL
  const base = String(baseConfigurada || SITE_PUBLICO_PADRAO).replace(/\/$/, '')
  return `${base}/compartilhar/livro/${encodeURIComponent(String(livroId || ''))}.html`
}

export async function compartilharLivro(livro) {
  const url = linkCompartilhamentoLivro(livro?.id)
  const titulo = String(livro?.titulo || 'Livro da Biblioteca Digital').trim()
  const autor = String(livro?.autor || '').trim()
  const descricao = String(livro?.descricao || '').trim()
  const texto = [
    `Conheça “${titulo}”${autor ? `, de ${autor}` : ''}, na Biblioteca do Discípulo Cristão.`,
    descricao,
  ].filter(Boolean).join('\n\n')

  const abriu = await openNativeShareSheet({ title: titulo, text: texto, url })
  if (abriu) return { abriu: true, url }
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(`${texto}\n\n${url}`)
    return { abriu: false, copiado: true, url }
  }
  return { abriu: false, copiado: false, url }
}
