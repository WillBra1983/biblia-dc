import { obterCampanhaProjeto, registrarVisitaConviteProjeto, confirmarIndicacaoProjeto, resgatarLeituraProjeto } from './bibliotecaLivrosService'
import { linkDownloadBiblia } from '../utils/conviteAplicativo'
import { openNativeShareSheet } from '../utils/nativeShare'
const CHAVE = 'projeto-convite-pendente-v1'
const capturas = new Map()
export function aparelhoProjeto() {
  let token = localStorage.getItem('projeto-aparelho-v1')
  if (!token) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem('projeto-aparelho-v1', token)
  }
  return token
}
export function linkConviteProjeto(codigo, conteudo) {
  const padrao = linkDownloadBiblia(codigo)
  if (!conteudo?.url) return padrao
  try {
    const url = new URL(conteudo.url), base = new URL(padrao)
    if (url.origin !== base.origin || url.pathname !== base.pathname) return padrao
    url.searchParams.delete('convite')
    const convite = base.searchParams.get('convite')
    if (convite) url.searchParams.set('convite', convite)
    return url.href
  } catch { return padrao }
}
const TEXTO_CONVITE = 'Já compartilhou o evangelho com alguém hoje?\n\nBíblia do Discípulo Cristão\nUm aplicativo gratuito e sem propagandas para ler e ouvir a Bíblia, estudar e crescer no conhecimento da Palavra.\n\nDisponível para Android e iPhone. Baixe pelo convite abaixo:'
function textoConvite(conteudo) {
  return [conteudo?.title, conteudo?.text, TEXTO_CONVITE].filter(Boolean).join('\n\n')
}
export function mensagemConviteProjeto(codigo, conteudo) {
  return `${textoConvite(conteudo)}\n\n${linkConviteProjeto(codigo, conteudo)}`
}
export const carregarCampanhaProjeto = () => obterCampanhaProjeto({ dispositivo: aparelhoProjeto() })
export const resgatarLivroProjeto = livroId => resgatarLeituraProjeto({ livroId })
export function convitePendenteProjeto() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE) || 'null')
    if (dados?.expiraEm > Date.now()) return dados
    localStorage.removeItem(CHAVE)
  } catch { /* Convites não impedem o uso do aplicativo. */ }
  return null
}
export function capturarConviteProjeto(codigo) {
  if (!/^[a-f0-9]{32}$/.test(codigo || '')) return Promise.resolve(null)
  const pendente = convitePendenteProjeto()
  if (pendente) return Promise.resolve(pendente) // A primeira indicação permanece até ser confirmada ou expirar.
  if (!capturas.has(codigo)) capturas.set(codigo, registrarVisitaConviteProjeto({ codigo, dispositivo: aparelhoProjeto() }).then(dados => {
    const convite = { ...dados, codigo }
    localStorage.setItem(CHAVE, JSON.stringify(convite))
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('projeto-convite-pendente'))
    return convite
  }).finally(() => capturas.delete(codigo)))
  return capturas.get(codigo)
}
export async function confirmarConvitePendenteProjeto() {
  const dados = convitePendenteProjeto()
  if (!dados) return null
  const resultado = await confirmarIndicacaoProjeto({ recibo: dados.recibo, dispositivo: aparelhoProjeto() })
  localStorage.removeItem(CHAVE)
  return resultado
}
export async function compartilharProjeto(codigo, conteudo) {
  const url = linkConviteProjeto(codigo, conteudo)
  const text = textoConvite(conteudo)
  try {
    if (await openNativeShareSheet({ title: conteudo?.title || 'Bíblia do Discípulo Cristão', text, url })) return 'compartilhado'
  } catch (erro) { if (erro?.name === 'AbortError' || /cancel/i.test(erro?.message || '')) return 'cancelado'; throw erro }
  await navigator.clipboard.writeText(mensagemConviteProjeto(codigo, conteudo))
  return 'copiado'
}
