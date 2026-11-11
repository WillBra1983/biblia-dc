import { versaoBiblicaPorId } from '../data/bibliaVersoes'

let bancoPromise
function chave(versao, livroId, capitulo) {
  if (!versaoBiblicaPorId(versao) || !Number.isInteger(livroId) || livroId < 1 || livroId > 66
    || !Number.isInteger(capitulo) || capitulo < 1 || capitulo > 150) throw Error('Referência inválida.')
  return `${versao}:${livroId}:${capitulo}`
}
function abrirBanco() {
  if (bancoPromise) return bancoPromise
  bancoPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(Error('Armazenamento offline indisponível.')); return }
    const pedido = indexedDB.open('biblia-dc-audios-offline', 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore('capitulos', { keyPath: 'chave' })
    pedido.onerror = () => reject(pedido.error)
    pedido.onblocked = () => reject(Error('Armazenamento offline ocupado.'))
    pedido.onsuccess = () => {
      const banco = pedido.result
      banco.onversionchange = () => { banco.close(); bancoPromise = null }
      resolve(banco)
    }
  }).catch(erro => { bancoPromise = null; throw erro })
  return bancoPromise
}
async function obter(versao, livroId, capitulo) {
  const id = chave(versao, livroId, capitulo)
  const banco = await abrirBanco()
  return new Promise((resolve, reject) => {
    const pedido = banco.transaction('capitulos', 'readonly').objectStore('capitulos').get(id)
    pedido.onerror = () => reject(pedido.error)
    pedido.onsuccess = () => {
      const item = pedido.result
      resolve(item?.arquivo instanceof Blob && item.arquivo.size > 0 ? item : null)
    }
  })
}
async function salvar(versao, livroId, capitulo, arquivo, metadados = {}) {
  const id = chave(versao, livroId, capitulo)
  if (!(arquivo instanceof Blob) || !arquivo.size || arquivo.size > 100 * 1024 * 1024) throw Error('Arquivo de áudio inválido ou muito grande.')
  const banco = await abrirBanco()
  await new Promise((resolve, reject) => {
    const tx = banco.transaction('capitulos', 'readwrite')
    tx.objectStore('capitulos').put({ chave: id, versao, livroId, capitulo, arquivo, metadados, salvoEm: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || Error('Gravação interrompida.'))
  })
}
async function remover(versao, livroId, capitulo) {
  const id = chave(versao, livroId, capitulo)
  const banco = await abrirBanco()
  await new Promise((resolve, reject) => {
    const tx = banco.transaction('capitulos', 'readwrite')
    tx.objectStore('capitulos').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || Error('Remoção interrompida.'))
  })
}
export const bibliaAudioOfflineService = { obter, salvar, remover, async existe(...args) { return Boolean(await obter(...args)) } }
