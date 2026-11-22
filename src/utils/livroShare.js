import { openNativeShareSheet } from './nativeShare'
import { partesApresentacao } from './apresentacaoFormatada'
import { obterLivroCatalogo } from '../data/livrosCatalogo'
import { versaoCompartilhamentoLivro } from './livroShareVersao'
import { linkCompartilhamentoConteudo } from './compartilhamentoConteudo'

export function linkCompartilhamentoLivro(livroId, dadosLivro) {
  const livro = dadosLivro || obterLivroCatalogo(livroId)
  return linkCompartilhamentoConteudo('livro', String(livroId || ''), livro ? { v: versaoCompartilhamentoLivro(livro) } : {})
}

export async function compartilharLivro(livro) {
  const url = linkCompartilhamentoLivro(livro?.id, livro)
  const titulo = String(livro?.titulo || 'Livro da Biblioteca Digital').trim()
  const autor = String(livro?.autor || '').trim()
  const descricao = partesApresentacao(livro?.descricao).map((parte) => parte.texto).join('').trim()
  const texto = [
    `Conheça “${titulo}”${autor ? `, de ${autor}` : ''}, na Livraria Cristã da Bíblia do Discípulo Cristão.`,
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
