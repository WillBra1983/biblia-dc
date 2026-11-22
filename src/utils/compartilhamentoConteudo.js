import secoes from '../../functions/src/compartilhamentoSecoes.json'
import { LINK_DOWNLOAD_BIBLIA } from './conviteAplicativo'

const NOME = 'Bíblia do Discípulo Cristão'
const idSeguro = valor => /^[a-zA-Z0-9_-]{1,100}$/.test(valor || '')
const segmento = valor => String(valor || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100)

export function linkCompartilhamentoConteudo(tipo, id = '', extras = {}) {
  const url = new URL(LINK_DOWNLOAD_BIBLIA)
  url.searchParams.set('tipo', tipo)
  if (id) url.searchParams.set('id', id)
  for (const [chave, valor] of Object.entries(extras)) if (valor !== '' && valor != null) url.searchParams.set(chave, String(valor))
  return url.href
}

export function identificarConteudoCompartilhado(pathname = '/', search = '') {
  let path
  try { path = decodeURIComponent(pathname).replace(/\/$/, '') || '/' } catch { return { tipo: 'app', id: '', titulo: NOME } }
  const params = new URLSearchParams(search)
  const partes = path.split('/').filter(Boolean)
  const livro = /^\/(?:compartilhar\/livro|biblioteca)\/([a-zA-Z0-9_-]+)(?:\.html|\/(?:ler|amostra))?$/.exec(path)
  if (livro && idSeguro(livro[1])) return { tipo: 'livro', id: livro[1], titulo: 'Livro da Livraria Cristã', extras: /^[a-f0-9]{8}$/.test(params.get('v') || '') ? { v: params.get('v') } : {} }
  if (['/', '/biblia', '/biblia/apresentacao'].includes(path) && /^\d{1,2}$/.test(params.get('livro') || '') && /^\d{1,3}$/.test(params.get('capitulo') || '')) {
    const extras = { livro: params.get('livro'), capitulo: params.get('capitulo') }
    const versos = params.get('versiculos') || params.get('versiculo') || ''
    if (/^\d{1,3}(?:,\d{1,3}){0,175}$/.test(versos)) extras.versiculos = versos
    if (['ara', 'naa', 'ntlh'].includes(params.get('versao'))) extras.versao = params.get('versao')
    return { tipo: 'biblia', id: '', titulo: 'Passagem bíblica', extras }
  }
  if (partes[0] === 'estudo-strong' && /^[HG]\d{1,5}$/i.test(partes[1] || '')) {
    const extras = idSeguro(params.get('rid')) ? { rid: params.get('rid') } : {}
    return { tipo: 'strong', id: partes[1].toUpperCase(), titulo: `Estudo Strong ${partes[1].toUpperCase()}`, extras }
  }
  if (partes[0] === 'discipulado' && partes[1]) {
    const extras = {}
    if (partes[2] && idSeguro(partes[2])) extras.licao = partes[2]
    if (['questao', 'devocional', 'completo'].includes(params.get('parte'))) extras.parte = params.get('parte')
    for (const chave of ['numero', 'dia']) if (/^\d{1,3}$/.test(params.get(chave) || '')) extras[chave] = params.get(chave)
    return { tipo: 'discipulado', id: segmento(partes[1]), titulo: 'Lição de discipulado', extras }
  }
  if (partes[0] === 'versiculo-do-dia') return { tipo: 'dia', id: /^\d{4}-\d{2}-\d{2}$/.test(params.get('data') || '') ? params.get('data') : '', titulo: 'Versículo do dia' }
  if (partes[0] === 'versiculos-compartilhados' && idSeguro(params.get('item'))) return { tipo: 'versiculo', id: params.get('item'), titulo: 'Versículo compartilhado' }
  if (['hinario', 'canticos'].includes(partes[0]) && partes.length > 1) {
    const extras = { grupo: segmento(partes[1]) }
    const numero = partes[2] || params.get('hino') || params.get('numero') || ''
    return { tipo: 'cantico', id: segmento(numero), titulo: partes[1] === 'salmos' ? 'Salmo' : 'Cântico', extras }
  }
  if (['confissao', 'catecismo-maior', 'catecismo-breve'].includes(partes[0])) {
    const extras = {}
    for (const chave of ['capitulo', 'pergunta']) if (/^\d{1,3}$/.test(params.get(chave) || '')) extras[chave] = params.get(chave)
    return { tipo: 'doutrina', id: partes[0], titulo: partes[0] === 'confissao' ? 'Confissão de Fé de Westminster' : partes[0] === 'catecismo-maior' ? 'Catecismo Maior de Westminster' : 'Breve Catecismo de Westminster', extras }
  }
  if (partes[0] === 'estudos-biblicos' && partes[1] === 'abrir' && idSeguro(partes[2] || params.get('estudo'))) {
    const passagem = identificarConteudoCompartilhado('/', search)
    return { tipo: 'estudo', id: partes[2] || params.get('estudo'), titulo: 'Estudo bíblico compartilhado', extras: passagem.tipo === 'biblia' ? passagem.extras : {} }
  }
  if (partes[0] === 'estudos-biblicos' && partes.length === 2 && idSeguro(partes[1]) && !['abrir', 'novo', 'gerir', 'ia-passagem', 'ia-pericope', 'avaliacao-resultado', 'prova-resultado'].includes(partes[1])) return { tipo: 'estudo', id: partes[1], titulo: 'Estudo bíblico compartilhado' }
  if (partes[0] === 'estudos-biblicos' && ['ia-passagem', 'ia-pericope'].includes(partes[1])) {
    const consulta = new URLSearchParams(search)
    const inicio = Number(consulta.get('inicio')), fim = Number(consulta.get('fim'))
    if (partes[1] === 'ia-pericope' && Number.isInteger(inicio) && Number.isInteger(fim) && inicio > 0 && fim >= inicio && fim <= 176) consulta.set('versiculos', Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i).join(','))
    const passagem = identificarConteudoCompartilhado('/', consulta.toString())
    if (passagem.tipo === 'biblia') return { tipo: 'explicacao', id: '', titulo: 'Versículos explicados', extras: { ...passagem.extras, modo: partes[1] === 'ia-pericope' ? 'pericope' : 'passagem' } }
  }
  if (partes[0] === 'estudos-biblicos' && ['avaliacao-resultado', 'prova-resultado'].includes(partes[1]) && idSeguro(params.get('id'))) return { tipo: 'avaliacao', id: params.get('id'), titulo: 'Resultado de avaliação bíblica' }
  if (partes[0] === 'devocional' && idSeguro(partes[1] || params.get('dia'))) return { tipo: 'devocional', id: partes[1] || params.get('dia'), titulo: 'Devocional' }
  if (partes[0] === 'mais-de-deus' && (partes[1] || params.get('item') || params.get('tema'))) {
    const extras = {}
    for (const chave of ['secao', 'tema', 'item', 'aba']) if (idSeguro(params.get(chave))) extras[chave] = params.get(chave)
    return { tipo: 'teologia', id: segmento(partes[1] || params.get('item') || params.get('tema')), titulo: 'Conteúdo teológico', extras }
  }
  for (const [id, secao] of Object.entries(secoes)) {
    if (secao.caminhos.some(base => path === base || (base !== '/' && path.startsWith(base + '/')))) {
      // A seção pode ser compartilhada sem publicar dados de conta, provas ou editores.
      return { tipo: 'secao', id, titulo: secao.titulo, descricao: secao.descricao }
    }
  }
  return { tipo: 'app', id: '', titulo: NOME }
}

function rotaDoLink(endereco) {
  let url
  try { url = new URL(endereco) } catch { return null }
  if (url.origin === new URL(LINK_DOWNLOAD_BIBLIA).origin && url.pathname === new URL(LINK_DOWNLOAD_BIBLIA).pathname) {
    const secao = url.searchParams.get('tipo') === 'secao' && Object.prototype.hasOwnProperty.call(secoes, url.searchParams.get('id') || '') ? secoes[url.searchParams.get('id')] : null
    return { direto: url.href, ...(secao ? { titulo: secao.titulo, descricao: secao.descricao } : {}) }
  }
  const scheme = String(import.meta.env?.VITE_NATIVE_APP_SCHEME || import.meta.env?.VITE_ANDROID_APP_SCHEME || 'com.bibliadc.app').replace(/\/$/, '')
  if ((url.protocol === `${scheme}:` && url.hostname === 'open') || (url.protocol === 'intent:' && url.hash.match(/;scheme=([^;]+);/)?.[1] === scheme)) {
    const conteudo = identificarConteudoCompartilhado(url.pathname, url.search)
    return { ...conteudo, direto: linkCompartilhamentoConteudo(conteudo.tipo, conteudo.id, conteudo.extras) }
  }
  const configurado = import.meta.env?.VITE_PUBLIC_APP_URL
  let base
  try { base = configurado ? new URL(configurado) : null } catch { /* Usa os endereços públicos conhecidos. */ }
  if (!['foundcine.com', 'www.foundcine.com', 'biblia-dc.web.app', 'biblia-dc.firebaseapp.com', 'localhost', '127.0.0.1'].includes(url.hostname) && url.origin !== base?.origin) return null
  let path = url.pathname
  const prefixo = base?.origin === url.origin ? base.pathname.replace(/\/$/, '') : '/biblia'
  if (prefixo && (['foundcine.com', 'www.foundcine.com'].includes(url.hostname) || base?.origin === url.origin) && path !== prefixo && !path.startsWith(prefixo + '/')) return null
  if (prefixo && (path === prefixo || path.startsWith(prefixo + '/'))) path = path.slice(prefixo.length) || '/'
  const conteudo = identificarConteudoCompartilhado(path, url.search)
  const extras = { ...conteudo.extras }
  if (/^[a-f0-9]{32}$/.test(url.searchParams.get('convite') || '')) extras.convite = url.searchParams.get('convite')
  return { ...conteudo, direto: linkCompartilhamentoConteudo(conteudo.tipo, conteudo.id, extras) }
}

export function normalizarLinkCompartilhamento(url) {
  return rotaDoLink(String(url || '').trim())?.direto || String(url || '').trim()
}

export function normalizarTextoCompartilhamento(texto) {
  return String(texto || '').replace(/\b[a-z][a-z\d+.-]*:\/\/[^\s<>"']+/gi, link => {
    const sufixo = link.match(/[).,;!]+$/)?.[0] || ''
    return normalizarLinkCompartilhamento(sufixo ? link.slice(0, -sufixo.length) : link) + sufixo
  })
}

export function prepararCompartilhamentoConteudo({ title, text, url } = {}) {
  const original = String(url || '').trim()
  const conteudo = rotaDoLink(original)
  const titleGenerico = !title || /^(Bíblia DC|Bíblia do Discípulo Cristão)$/i.test(String(title).trim())
  const textGenerico = !text || /^Acesse este conteúdo no Bíblia DC\.?$/i.test(String(text).trim())
  return {
    title: titleGenerico && conteudo?.titulo ? `${conteudo.titulo} | ${NOME}` : title,
    text: textGenerico && conteudo?.titulo ? [!titleGenerico && title ? title : conteudo.titulo, conteudo.descricao, `Conheça este conteúdo na ${NOME}.`].filter(Boolean).join('\n\n') : normalizarTextoCompartilhamento(original && conteudo?.direto ? String(text || '').replaceAll(original, conteudo.direto) : text),
    url: conteudo?.direto || original,
  }
}
