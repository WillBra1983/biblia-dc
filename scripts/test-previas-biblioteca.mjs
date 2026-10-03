import fs from 'node:fs'
import assert from 'node:assert/strict'

let source = fs.readFileSync(new URL('../src/services/bibliotecaPessoalService.js', import.meta.url), 'utf8')
const start = source.indexOf('async function lerDadosEpub(arquivo) {')
const end = source.indexOf('export async function listarLivrosPessoais', start)
source = source.slice(0, start) + 'async function lerDadosEpub(arquivo) { return { capa: arquivo.original || null } }\n' + source.slice(end)
source = source.replace(/export /g, '')
const records = new Map()
const banco = {
  transaction() {
    const transaction = {
      objectStore() {
        return {
          get(id) {
            const request = {}
            queueMicrotask(() => {
              request.result = records.get(id)
              request.onsuccess()
              queueMicrotask(() => transaction.oncomplete())
            })
            return request
          },
          put(record) { records.set(record.id, record) },
        }
      },
    }
    return transaction
  },
}
const api = new Function('banco', source + ';bancoPromise = Promise.resolve(banco); return {gerarPreviaLivroPessoal}')(banco)
const old = { id: 'old', proprietario: 'user', formato: 'epub', arquivo: {}, capa: 'simplificada', progresso: 'preservado' }
records.set(old.id, old)
assert.equal(await api.gerarPreviaLivroPessoal(old), null)
assert.deepEqual(records.get(old.id), { ...old, capa: null, versaoPrevia: 2 })
const original = { ...old, id: 'original', arquivo: { original: 'capa-real' } }
records.set(original.id, original)
assert.equal(await api.gerarPreviaLivroPessoal(original), 'capa-real')
assert.equal(records.get(original.id).capa, 'capa-real')
assert.equal(await api.gerarPreviaLivroPessoal({ ...old, versaoPrevia: 2, capa: null }), null)
assert.equal(await api.gerarPreviaLivroPessoal({ ...original, versaoPrevia: 2, capa: 'capa-real' }), 'capa-real')
await api.gerarPreviaLivroPessoal({ ...old, id: 'apagado' })
assert.equal(records.has('apagado'), false)
const protectedRecord = { ...old, id: 'outro', proprietario: 'outro-user' }
records.set(protectedRecord.id, protectedRecord)
await api.gerarPreviaLivroPessoal({ ...old, id: 'outro' })
assert.deepEqual(records.get('outro'), protectedRecord)
assert.ok(!source.includes('fillText'))
console.log('Migração de prévias aprovada: capa original, fallback renderizado, progresso, exclusão e proprietário preservados.')
