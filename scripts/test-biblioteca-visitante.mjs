import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import crypto from 'node:crypto'
import { rotaConteudoLocalOffline } from '../src/utils/conteudoLocalOffline.js'
const valores = new Map()
const ref = (path) => ({
  get: async () => ({ val: () => valores.get(path) || null }),
  orderByChild: () => ({ equalTo: (uid) => ({ get: async () => ({ val: () => valores.get(`pedidos:${uid}`) || null }) }) }),
  transaction: async (fn) => { const resultado = fn(valores.get(path) || null); if (resultado === undefined) return { committed: false }; valores.set(path, resultado); return { committed: true } },
})
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
const exports = {}
vm.runInNewContext(fs.readFileSync('functions/src/bibliotecaVisitante.js', 'utf8'), {
  exports, require: (name) => name === 'node:crypto' ? crypto : name === './firebaseAdmin' ? { database: () => ({ ref }) } : { onCall: (_, fn) => fn, HttpsError },
})
const token = 'ab'.repeat(32)
const visitante = exports.uidVisitante(token)
assert.match(visitante, /^visitante_[a-f0-9]{64}$/)
assert.throws(() => exports.uidVisitante('pedido-publico'), /inválida/)
assert.equal(await exports.identificarLeitor({ data: { dispositivoBiblioteca: token } }), visitante)
assert.equal(await exports.identificarLeitor({ auth: { uid: 'conta' } }), 'conta')
assert.equal(rotaConteudoLocalOffline('/biblioteca/livro/ler'), true)
assert.equal(rotaConteudoLocalOffline('/biblioteca-estudos'), false)
await assert.rejects(exports.vincularComprasBibliotecaVisitante({ data: { dispositivoBiblioteca: token } }), /Conecte/)
await assert.rejects(exports.vincularComprasBibliotecaVisitante({ auth: { uid: 'conta' }, data: { dispositivoBiblioteca: token, recuperar: true } }), /Nenhuma compra/)
valores.set(`bibliotecaAcessos/${visitante}`, { livro: { ativo: true, pedidoId: 'comprovado' }, outro: { ativo: false } })
const requisicao = { auth: { uid: 'conta' }, data: { dispositivoBiblioteca: token } }
await exports.vincularComprasBibliotecaVisitante(requisicao)
await exports.vincularComprasBibliotecaVisitante(requisicao)
assert.equal(valores.get('bibliotecaAcessos/conta/livro').pedidoId, 'comprovado')
assert.equal(valores.has('bibliotecaAcessos/conta/outro'), false)
await assert.rejects(exports.vincularComprasBibliotecaVisitante({ ...requisicao, auth: { uid: 'outra-conta' } }), /outra conta/)
await assert.rejects(exports.identificarLeitor({ data: requisicao.data }), /conta vinculada/)
valores.set('bibliotecaLivros', { publico: { titulo: 'Livro' }, rascunho: { publicado: false }, apagado: { excluido: true } })
assert.deepEqual(Object.keys(await exports.catalogoBibliotecaVisitante({})), ['publico'])
const regras = JSON.parse(fs.readFileSync('database.rules.json', 'utf8')).rules
assert.equal(regras.bibliotecaVinculosVisitantes['.read'], false)
assert.equal(regras.bibliotecaVinculosVisitantes['.write'], false)
console.log('Biblioteca visitante: identificação, comprovação, vínculo exclusivo/idempotente, catálogo público e regras verificados.')
