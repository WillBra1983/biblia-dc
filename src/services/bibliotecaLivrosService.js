import { livrosCatalogo } from '../data/livrosCatalogo'

const CAMINHO = 'bibliotecaLivros'

function texto(valor, limite = 1200) {
  return String(valor || '').trim().slice(0, limite)
}

function normalizarLivro(id, valor = {}) {
  const normalizarArquivo = (arquivo) => arquivo?.chave ? {
    chave: texto(arquivo.chave, 500),
    formato: ['pdf', 'epub'].includes(arquivo.formato) ? arquivo.formato : '',
    contentType: texto(arquivo.contentType, 100),
    tamanho: Math.max(0, Number(arquivo.tamanho) || 0),
    nome: texto(arquivo.nome, 240),
    atualizadoEm: Number(arquivo.atualizadoEm) || 0,
  } : null
  return {
    id: texto(valor.id || id, 100),
    titulo: texto(valor.titulo, 180),
    autor: texto(valor.autor, 140),
    capa: texto(valor.capa, 600),
    descricao: texto(valor.descricao, 1800),
    amazonUrl: texto(valor.amazonUrl, 700),
    androidUrl: texto(valor.androidUrl, 700),
    appleUrl: texto(valor.appleUrl, 700),
    pixAtivo: valor.pixAtivo === true,
    precoPixCentavos: Math.max(0, Math.round(Number(valor.precoPixCentavos) || 0)),
    publicado: valor.publicado !== false,
    downloadPermitido: false,
    degustacao: {
      modo: valor.degustacao?.modo === 'tempo' ? 'tempo' : 'percentual',
      inicioEm: Math.max(0, Number(valor.degustacao?.inicioEm) || 0),
      fimEm: Math.max(0, Number(valor.degustacao?.fimEm) || 0),
      percentual: Math.max(1, Math.min(99, Number(valor.degustacao?.percentual) || 10)),
    },
    totalPartes: Math.max(0, Math.min(300, Number(valor.totalPartes) || 0)),
    destaque: Boolean(valor.destaque),
    excluido: Boolean(valor.excluido),
    atualizadoEm: Number(valor.atualizadoEm) || 0,
    arquivos: {
      completo: normalizarArquivo(valor.arquivos?.completo),
      amostra: normalizarArquivo(valor.arquivos?.amostra),
    },
  }
}

function normalizarPartes(partes = []) {
  return (Array.isArray(partes) ? partes : Object.values(partes || {}))
    .slice(0, 300)
    .map((parte, indice) => ({
      id: texto(parte?.id || `parte-${indice + 1}`, 100),
      tipo: ['apresentacao', 'prefacio', 'capitulo', 'apendice'].includes(parte?.tipo) ? parte.tipo : 'capitulo',
      titulo: texto(parte?.titulo || `Parte ${indice + 1}`, 220),
      conteudo: texto(parte?.conteudo, 120000),
      ordem: indice,
    }))
}

function catalogoMesclado(remotos = {}) {
  const mapa = new Map(livrosCatalogo.map((livro) => [livro.id, normalizarLivro(livro.id, livro)]))
  Object.entries(remotos || {}).forEach(([id, remoto]) => {
    const base = mapa.get(id) || { id }
    mapa.set(id, normalizarLivro(id, { ...base, ...(remoto || {}) }))
  })
  return Array.from(mapa.values()).filter((livro) => !livro.excluido)
}

export function obterCatalogoLivrosLocal() {
  return catalogoMesclado()
}

async function obterRtdb() {
  const { getFirebaseDatabase, loadFirebaseModules } = await import('../config/firebase')
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return null
  const api = await import('firebase/database')
  return { db, api }
}

export function assinarCatalogoLivros(callback, onError) {
  let cancelar = () => {}
  let ativo = true
  void obterRtdb().then((rtdb) => {
    if (!ativo) return
    if (!rtdb) {
      callback(catalogoMesclado())
      return
    }
    const { db, api } = rtdb
    cancelar = api.onValue(
      api.ref(db, CAMINHO),
      (snap) => callback(catalogoMesclado(snap.val() || {})),
      (erro) => {
        callback(catalogoMesclado())
        onError?.(erro)
      },
    )
  }).catch((erro) => {
    callback(catalogoMesclado())
    onError?.(erro)
  })
  return () => {
    ativo = false
    cancelar()
  }
}

export async function salvarLivroBiblioteca(livro, uid) {
  if (!uid || !livro?.id) throw new Error('Administrador não identificado.')
  const rtdb = await obterRtdb()
  if (!rtdb) throw new Error('Firebase não disponível.')
  const payload = normalizarLivro(livro.id, {
    ...livro,
    excluido: false,
    atualizadoEm: Date.now(),
  })
  await rtdb.api.set(rtdb.api.ref(rtdb.db, `${CAMINHO}/${payload.id}`), payload)
}

export async function carregarConteudoLivroBiblioteca(id, uid) {
  if (!uid || !id) return []
  const rtdb = await obterRtdb()
  if (!rtdb) throw new Error('Firebase não disponível.')
  const snap = await rtdb.api.get(rtdb.api.ref(rtdb.db, `bibliotecaConteudos/${id}`))
  return normalizarPartes(snap.val() || [])
}

export async function salvarConteudoLivroBiblioteca(id, partes, uid) {
  if (!uid || !id) throw new Error('Administrador não identificado.')
  const rtdb = await obterRtdb()
  if (!rtdb) throw new Error('Firebase não disponível.')
  const normalizadas = normalizarPartes(partes)
  await rtdb.api.set(rtdb.api.ref(rtdb.db, `bibliotecaConteudos/${id}`), normalizadas)
  return normalizadas
}

export async function prepararCapaLivro(arquivo) {
  if (!arquivo?.type?.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  if (arquivo.size > 12 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 12 MB.')

  const urlTemporaria = URL.createObjectURL(arquivo)
  try {
    const imagem = await new Promise((resolve, reject) => {
      const elemento = new Image()
      elemento.onload = () => resolve(elemento)
      elemento.onerror = () => reject(new Error('Não foi possível abrir a imagem escolhida.'))
      elemento.src = urlTemporaria
    })
    const escala = Math.min(1, 1200 / imagem.naturalWidth, 1800 / imagem.naturalHeight)
    const largura = Math.max(1, Math.round(imagem.naturalWidth * escala))
    const altura = Math.max(1, Math.round(imagem.naturalHeight * escala))
    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    canvas.getContext('2d', { alpha: false }).drawImage(imagem, 0, 0, largura, altura)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86))
    if (!blob) throw new Error('Não foi possível preparar a capa.')
    const dataUrl = await new Promise((resolve, reject) => {
      const leitor = new FileReader()
      leitor.onload = () => resolve(String(leitor.result || ''))
      leitor.onerror = () => reject(new Error('Não foi possível preparar a capa.'))
      leitor.readAsDataURL(blob)
    })
    return { dataUrl, contentType: 'image/webp' }
  } finally {
    URL.revokeObjectURL(urlTemporaria)
  }
}

export async function enviarCapaLivroBiblioteca(id, capaPreparada, uid) {
  if (!uid || !id || !capaPreparada?.dataUrl) throw new Error('Capa ou administrador inválido.')
  const { getFirebaseFunctions, loadFirebaseModules } = await import('../config/firebase')
  await loadFirebaseModules()
  const functions = getFirebaseFunctions()
  if (!functions) throw new Error('Envio de capa indisponível.')
  const { httpsCallable } = await import('firebase/functions')
  const enviar = httpsCallable(functions, 'enviarCapaBiblioteca')
  const resultado = await enviar({
    livroId: id,
    contentType: capaPreparada.contentType,
    base64: capaPreparada.dataUrl.split(',')[1] || '',
  })
  const url = texto(resultado?.data?.url, 1200)
  if (!url) throw new Error('A capa foi enviada, mas o endereço não foi devolvido.')
  return url
}

export async function excluirLivroBiblioteca(id, uid) {
  if (!uid || !id) throw new Error('Administrador não identificado.')
  const rtdb = await obterRtdb()
  if (!rtdb) throw new Error('Firebase não disponível.')
  await rtdb.api.set(rtdb.api.ref(rtdb.db, `${CAMINHO}/${id}`), {
    id,
    excluido: true,
    atualizadoEm: Date.now(),
  })
}

async function chamarFuncao(nome, dados = {}) {
  const { getFirebaseFunctions, loadFirebaseModules } = await import('../config/firebase')
  await loadFirebaseModules()
  const functions = getFirebaseFunctions()
  if (!functions) throw new Error('Serviço temporariamente indisponível.')
  const { httpsCallable } = await import('firebase/functions')
  const resultado = await httpsCallable(functions, nome)(dados)
  return resultado?.data || {}
}

export function assinarAcessosBiblioteca(uid, callback, onError) {
  let cancelar = () => {}
  let ativo = true
  if (!uid) { callback({}); return cancelar }
  void obterRtdb().then((rtdb) => {
    if (!ativo || !rtdb) return callback({})
    cancelar = rtdb.api.onValue(
      rtdb.api.ref(rtdb.db, `bibliotecaAcessos/${uid}`),
      (snap) => callback(snap.val() || {}),
      (erro) => onError?.(erro),
    )
  }).catch((erro) => onError?.(erro))
  return () => { ativo = false; cancelar() }
}

export function assinarPedidosPixAdmin(callback, onError) {
  let cancelar = () => {}
  let ativo = true
  void obterRtdb().then((rtdb) => {
    if (!ativo || !rtdb) return callback([])
    cancelar = rtdb.api.onValue(
      rtdb.api.ref(rtdb.db, 'bibliotecaPedidos'),
      (snap) => callback(Object.entries(snap.val() || {}).map(([id, pedido]) => ({ id, ...(pedido || {}) })).sort((a, b) => Number(b.criadoEm || 0) - Number(a.criadoEm || 0))),
      (erro) => onError?.(erro),
    )
  }).catch((erro) => onError?.(erro))
  return () => { ativo = false; cancelar() }
}

export function assinarConfiguracaoPixBiblioteca(callback, onError) {
  let cancelar = () => {}
  let ativo = true
  void obterRtdb().then((rtdb) => {
    if (!ativo || !rtdb) return callback({})
    cancelar = rtdb.api.onValue(rtdb.api.ref(rtdb.db, 'bibliotecaConfiguracao/pix'), (snap) => callback(snap.val() || {}), (erro) => onError?.(erro))
  }).catch((erro) => onError?.(erro))
  return () => { ativo = false; cancelar() }
}

export const salvarConfiguracaoPixBiblioteca = (configuracao) => chamarFuncao('salvarConfiguracaoPixBiblioteca', configuracao)
export const criarPedidoPixBiblioteca = (livroId) => chamarFuncao('criarPedidoPixBiblioteca', { livroId })
export const informarPagamentoPixBiblioteca = (pedidoId) => chamarFuncao('informarPagamentoPixBiblioteca', { pedidoId })
export const decidirPedidoPixBiblioteca = (pedidoId, aprovado) => chamarFuncao('decidirPedidoPixBiblioteca', { pedidoId, aprovado })

export async function enviarArquivoLivroBiblioteca(livroId, finalidade, arquivo) {
  if (!livroId || !arquivo) throw new Error('Escolha o arquivo do livro.')
  const permitido = /\.(pdf|epub)$/i.test(arquivo.name || '') || ['application/pdf', 'application/epub+zip'].includes(arquivo.type)
  if (!permitido) throw new Error('Envie um arquivo PDF ou EPUB.')
  if (arquivo.size > 100 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 100 MB.')
  const preparado = await chamarFuncao('prepararUploadLivroBiblioteca', {
    livroId,
    finalidade,
    nome: arquivo.name,
    contentType: arquivo.type || 'application/octet-stream',
    tamanho: arquivo.size,
  })
  const resposta = await fetch(preparado.url, {
    method: 'PUT',
    headers: { 'Content-Type': preparado.contentType },
    body: arquivo,
  })
  if (!resposta.ok) {
    throw new Error(`O armazenamento recusou o envio (${resposta.status}). Verifique a configuração CORS do bucket.`)
  }
  const confirmado = await chamarFuncao('confirmarUploadLivroBiblioteca', {
    livroId,
    finalidade,
    nome: arquivo.name,
    contentType: preparado.contentType,
    tamanho: arquivo.size,
  })
  return confirmado.arquivo
}

export const obterArquivoLivroBiblioteca = (livroId, finalidade = 'completo', download = false, eventoId = null) =>
  chamarFuncao('obterArquivoLivroBiblioteca', { livroId, finalidade, download, eventoId })

export const registrarAcessoBiblioteca = (dados) => chamarFuncao('registrarAcessoBiblioteca', dados)
export const listarAcessosBibliotecaAdmin = (inicio, fim) => chamarFuncao('listarAcessosBibliotecaAdmin', { inicio, fim })

export const excluirArquivoLivroBiblioteca = (livroId, finalidade) =>
  chamarFuncao('excluirArquivoLivroBiblioteca', { livroId, finalidade })
