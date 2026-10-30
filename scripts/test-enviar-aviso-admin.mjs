import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
let historico = [], envios = [], adminAtivo = true, sucesso = true
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
const exports = {}
vm.runInNewContext(fs.readFileSync('functions/src/enviarAvisoAdmin.js', 'utf8'), {
  exports, require: name => {
    if (name === './firebaseAdmin') return { database: () => ({ ref: path => ({
      get: async () => ({ val: () => adminAtivo }),
      push: () => ({ key: 'aviso-teste', set: async valor => historico.push(valor) }),
    }) }) }
    if (name === 'firebase-functions/v2/https') return { onCall: (_, fn) => fn, HttpsError }
    if (name === 'firebase-functions/v2') return { logger: { info() {}, error() {} } }
    if (name === './push') return {
      enviarParaTopic: async valor => { envios.push(valor); return 'simulado' },
      enviarParaUsuarios: async valor => { envios.push(valor); return { sucesso } },
    }
    throw new Error(name)
  },
})
const enviar = data => exports.enviarAvisoAdmin({ auth: { uid: 'admin' }, data: { titulo: 'Título', mensagem: 'Mensagem', ...data } })
await enviar({ topic: 'livros' })
assert.equal(historico.length, 0)
assert.equal(envios[0].topic, 'livros')
assert.equal(envios[0].data.avisoId, undefined)
await enviar({ topic: 'novidades' })
assert.equal(historico.length, 1)
assert.equal(envios[1].data.avisoId, 'aviso-teste')
await enviar({ topic: 'livros', somenteParaMim: true })
assert.equal(historico.length, 1)
assert.deepEqual(Array.from(envios[2].uids), ['admin'])
sucesso = false
await assert.rejects(enviar({ somenteParaMim: true }), e => e.code === 'failed-precondition')
adminAtivo = false
await assert.rejects(enviar({ topic: 'livros' }), e => e.code === 'permission-denied')
assert.equal(envios.length, 4)
console.log('Avisos: livros sem histórico, novidades com histórico, teste individual e permissões validados sem envios reais.')
