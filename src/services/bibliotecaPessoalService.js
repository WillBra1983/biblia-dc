const NOME_BANCO = 'biblioteca-pessoal-biblia-dc'
const VERSAO_BANCO = 1
const STORE_LIVROS = 'livros'

let bancoPromise
let pdfPromise
let filaPrevias = Promise.resolve()

async function primeiraPaginaPdf(arquivo) {
  pdfPromise ||= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([pdf, worker]) => {
    pdf.GlobalWorkerOptions.workerSrc = worker.default
    return pdf
  })
  const pdf = await pdfPromise
  const tarefa = pdf.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) })
  let canvas
  try {
    const documento = await tarefa.promise
    const pagina = await documento.getPage(1)
    const base = pagina.getViewport({ scale: 1 })
    const viewport = pagina.getViewport({ scale: Math.min(420 / base.width, 600 / base.height) })
    canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    await pagina.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport }).promise
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .85))
  } finally {
    await tarefa.destroy()
    if (canvas) { canvas.width = 0; canvas.height = 0 }
  }
}

export function gerarPreviaLivroPessoal(livro) {
  if (livro.capa || livro.formato !== 'pdf' || !livro.arquivo) return Promise.resolve(livro.capa || null)
  const trabalho = filaPrevias.then(async () => {
    const capa = await primeiraPaginaPdf(livro.arquivo)
    if (!capa) return null
    const banco = await abrirBanco()
    await new Promise((resolve, reject) => {
      const transacao = banco.transaction(STORE_LIVROS, 'readwrite')
      const store = transacao.objectStore(STORE_LIVROS)
      const get = store.get(livro.id)
      get.onsuccess = () => {
        const atual = get.result
        // Não recria livros excluídos nem sobrescreve alterações posteriores.
        if (atual?.proprietario === livro.proprietario && !atual.capa) store.put({ ...atual, capa })
      }
      transacao.oncomplete = resolve
      transacao.onerror = () => reject(transacao.error)
      transacao.onabort = () => reject(transacao.error)
    })
    return capa
  })
  filaPrevias = trabalho.catch(() => {})
  return trabalho
}

function abrirBanco() {
  if (bancoPromise) return bancoPromise
  bancoPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('O armazenamento local de livros não está disponível neste aparelho.'))
      return
    }
    const requisicao = indexedDB.open(NOME_BANCO, VERSAO_BANCO)
    requisicao.onupgradeneeded = () => {
      const banco = requisicao.result
      if (!banco.objectStoreNames.contains(STORE_LIVROS)) {
        banco.createObjectStore(STORE_LIVROS, { keyPath: 'id' })
      }
    }
    requisicao.onsuccess = () => resolve(requisicao.result)
    requisicao.onerror = () => reject(requisicao.error || new Error('Não foi possível abrir a biblioteca pessoal.'))
  })
  return bancoPromise
}

function executarTransacao(modo, operacao) {
  return abrirBanco().then((banco) => new Promise((resolve, reject) => {
    const transacao = banco.transaction(STORE_LIVROS, modo)
    const store = transacao.objectStore(STORE_LIVROS)
    let resultado
    transacao.oncomplete = () => resolve(resultado)
    transacao.onerror = () => reject(transacao.error || new Error('Não foi possível acessar a biblioteca pessoal.'))
    transacao.onabort = () => reject(transacao.error || new Error('A operação da biblioteca pessoal foi interrompida.'))
    try {
      const requisicao = operacao(store)
      if (requisicao) {
        requisicao.onsuccess = () => { resultado = requisicao.result }
        requisicao.onerror = () => reject(requisicao.error || new Error('Não foi possível concluir a operação.'))
      }
    } catch (erro) {
      reject(erro)
    }
  }))
}

function criarId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `livro-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function tituloPeloArquivo(nome) {
  return String(nome || 'Livro pessoal').replace(/\.(epub|pdf)$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

async function lerDadosEpub(arquivo) {
  let livro
  let capaUrl
  try {
    const modulo = await import('epubjs')
    const ePub = modulo.default || modulo
    livro = ePub(await arquivo.arrayBuffer())
    await livro.ready
    const metadata = await livro.loaded.metadata
    capaUrl = await livro.coverUrl()
    let capa = null
    if (capaUrl) {
      const resposta = await fetch(capaUrl)
      if (resposta.ok) capa = await resposta.blob()
    }
    return {
      titulo: String(metadata?.title || '').trim() || tituloPeloArquivo(arquivo.name),
      autor: String(metadata?.creator || '').trim() || 'Autor não informado',
      capa,
    }
  } catch (erro) {
    console.warn('[biblioteca pessoal] metadados do EPUB indisponíveis:', erro)
    return { titulo: tituloPeloArquivo(arquivo.name), autor: 'Autor não informado', capa: null }
  } finally {
    livro?.destroy?.()
    if (capaUrl?.startsWith('blob:')) URL.revokeObjectURL(capaUrl)
  }
}

export async function listarLivrosPessoais(proprietario) {
  const livros = await executarTransacao('readonly', (store) => store.getAll())
  return (livros || [])
    .filter((livro) => livro.proprietario === String(proprietario || 'local'))
    .sort((a, b) => Number(b.adicionadoEm || 0) - Number(a.adicionadoEm || 0))
}

export async function obterLivroPessoal(id, proprietario) {
  if (!id) return Promise.resolve(null)
  const livro = await executarTransacao('readonly', (store) => store.get(String(id)))
  return livro?.proprietario === String(proprietario || 'local') ? livro : null
}

export async function importarLivroPessoal(arquivo, proprietario) {
  if (!arquivo || !/\.(epub|pdf)$/i.test(arquivo.name || '') && !['application/epub+zip', 'application/pdf'].includes(arquivo.type)) {
    throw new Error('Escolha um arquivo EPUB ou PDF.')
  }
  const formato = /\.pdf$/i.test(arquivo.name || '') || arquivo.type === 'application/pdf' ? 'pdf' : 'epub'
  const dados = formato === 'epub' ? await lerDadosEpub(arquivo) : { titulo: tituloPeloArquivo(arquivo.name), autor: 'Autor não informado', capa: null }
  if (formato === 'pdf') {
    try { dados.capa = await primeiraPaginaPdf(arquivo) }
    catch { /* Um PDF sem prévia continua disponível para leitura. */ }
  }
  const registro = {
    id: criarId(),
    proprietario: String(proprietario || 'local'),
    titulo: dados.titulo,
    autor: dados.autor,
    capa: dados.capa,
    arquivo,
    nomeArquivo: arquivo.name,
    tamanho: arquivo.size,
    formato,
    adicionadoEm: Date.now(),
  }
  await executarTransacao('readwrite', (store) => store.put(registro))
  return registro
}

export async function excluirLivroPessoal(id, proprietario) {
  const livro = await obterLivroPessoal(id, proprietario)
  if (!livro) return false
  await executarTransacao('readwrite', (store) => store.delete(String(id)))
  return true
}
