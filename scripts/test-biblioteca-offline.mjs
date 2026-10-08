import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { prepararLivroOffline, abrirLivroOffline } from '../src/services/bibliotecaOfflineService.js'
if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
const registros = new Map()
globalThis.indexedDB = { open: () => {
  const pedido = {}
  const db = { createObjectStore: () => {}, transaction: () => {
    const tx = { objectStore: () => ({
      put: (valor, chave) => { registros.set(chave, valor); const pedido = { result: chave }; queueMicrotask(() => tx.oncomplete()); return pedido },
      get: (chave) => { const pedido = { result: registros.get(chave) }; queueMicrotask(() => tx.oncomplete()); return pedido },
    }) }
    return tx
  } }
  queueMicrotask(() => { pedido.result = db; pedido.onupgradeneeded(); pedido.onsuccess() })
  return pedido
} }
const original = new TextEncoder().encode('exemplar comprado para uso pessoal')
globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => original.buffer })
const dados = { url: 'https://armazenamento/exemplar-assinado', formato: 'epub', contentType: 'application/epub+zip', versao: 1 }
await prepararLivroOffline('conta:livro', dados)
const armazenado = registros.get('conta:livro')
assert.equal(armazenado.key.extractable, false)
assert.equal(armazenado.metadados.url, undefined)
assert.notDeepEqual(new Uint8Array(armazenado.conteudo), original)
const local = await abrirLivroOffline('conta:livro')
assert.equal(local.offline, true)
const bytes = await (await fetchReal(local.url)).arrayBuffer()
assert.deepEqual(new Uint8Array(bytes), original)
URL.revokeObjectURL(local.url)
await assert.rejects(abrirLivroOffline('outra-conta:livro'), /primeiro/)
await assert.rejects(prepararLivroOffline('conta:amostra', { ...dados, acessoAte: Date.now() + 10000 }), /Amostras/)
await assert.rejects(prepararLivroOffline('conta:amostra', { ...dados, restricao: { percentual: 10 } }), /Amostras/)
assert.equal(registros.has('conta:amostra'), false)
console.log('Offline: criptografia, isolamento por conta, reabertura e bloqueio de amostras verificados.')

async function fetchReal(url) {
  const { resolveObjectURL } = await import('node:buffer')
  return resolveObjectURL(url)
}
