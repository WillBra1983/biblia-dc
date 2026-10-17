import { openNativeShareSheet } from './nativeShare'
import { partesApresentacao } from './apresentacaoFormatada'
import { obterLivroCatalogo } from '../data/livrosCatalogo'
import { versaoCompartilhamentoLivro } from './livroShareVersao'

const SITE_PUBLICO_PADRAO = 'https://foundcine.com/biblia'

export function linkCompartilhamentoLivro(livroId) {
  const baseConfigurada = typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL
  const base = String(baseConfigurada || SITE_PUBLICO_PADRAO).replace(/\/$/, '')
  const livro = obterLivroCatalogo(livroId)
  const versao = livro ? `?v=${versaoCompartilhamentoLivro(livro)}` : ''
  return `${base}/compartilhar/livro/${encodeURIComponent(String(livroId || ''))}.html${versao}`
}

export async function compartilharLivro(livro) {
  const url = linkCompartilhamentoLivro(livro?.id)
  const titulo = String(livro?.titulo || 'Livro da Biblioteca Digital').trim()
  const autor = String(livro?.autor || '').trim()
  const descricao = partesApresentacao(livro?.descricao).map((parte) => parte.texto).join('').trim()
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
