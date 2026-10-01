const NOME_BANCO = 'biblioteca-pessoal-biblia-dc'
const VERSAO_BANCO = 1
const STORE_LIVROS = 'livros'

let bancoPromise

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
