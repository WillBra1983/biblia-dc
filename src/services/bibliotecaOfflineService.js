let bancoPromise
function banco() {
  bancoPromise ||= new Promise((resolve, reject) => {
    const pedido = indexedDB.open('biblioteca-leitura-offline', 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore('exemplares')
    pedido.onsuccess = () => resolve(pedido.result)
    pedido.onerror = () => reject(pedido.error)
  })
  return bancoPromise
}
async function registro(chave, valor) {
  const db = await banco()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('exemplares', valor ? 'readwrite' : 'readonly')
    const pedido = valor ? tx.objectStore('exemplares').put(valor, chave) : tx.objectStore('exemplares').get(chave)
    tx.oncomplete = () => resolve(pedido.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}
export async function prepararLivroOffline(chave, dados) {
  if (dados.acessoAte || dados.degustacao || dados.restricao) throw new Error('Amostras precisam de internet para verificar seus limites.')
  const resposta = await fetch(dados.url)
  if (!resposta.ok) throw new Error('Não foi possível preparar a leitura offline.')
  const bytes = await resposta.arrayBuffer()
  if (bytes.byteLength > 100 * 1024 * 1024) throw new Error('Livro muito grande para preparar offline.')
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const conteudo = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)
  const { url, ...metadados } = dados
  await registro(chave, { key, iv, conteudo, metadados })
}
export async function abrirLivroOffline(chave) {
  const valor = await registro(chave)
  if (!valor) throw new Error('Abra este livro com internet e prepare a leitura offline primeiro.')
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: valor.iv }, valor.key, valor.conteudo)
  return { ...valor.metadados, offline: true, url: URL.createObjectURL(new Blob([bytes], { type: valor.metadados.contentType })) }
}
