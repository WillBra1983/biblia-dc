import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const registros = {}
let administrador = false
const database = { ref: (caminho) => ({
  get: async () => ({ val: () => caminho.endsWith('/admin') ? administrador : caminho.startsWith('bibliotecaLivros/') ? { publicado: true } : registros }),
  transaction: async (fn) => { registros[caminho] = fn(registros[caminho]) },
}) }
const modulo = { exports: {} }
vm.runInNewContext(fs.readFileSync('functions/src/bibliotecaAcessos.js', 'utf8'), { exports: modulo.exports, Date, require: (nome) => nome === './firebaseAdmin' ? { database: () => database } : { onCall: (_, fn) => fn, HttpsError: class extends Error { constructor(code, mensagem) { super(mensagem); this.code = code } } } })
const api = modulo.exports
await assert.rejects(api.registrarAcessoBiblioteca({ data: {} }), { code: 'unauthenticated' })
const req = { auth: { uid: 'usuario' }, data: { tipo: 'entrada', eventoId: 'evento1' } }
await api.registrarAcessoBiblioteca(req)
await api.registrarAcessoBiblioteca(req)
assert.equal(Object.keys(registros).length, 1, 'Reenvio não duplica acesso')
await api.registrarAcessoBiblioteca({ ...req, data: { tipo: 'livro', livroId: 'livro1', eventoId: 'evento2' } })
assert.equal(Object.values(registros)[1].livroId, 'livro1')
await api.salvarAcesso('usuario', { tipo: 'leitura', livroId: 'livro1', modalidade: 'amostra_percentual', eventoId: 'evento3' })
assert.equal(Object.values(registros)[2].modalidade, 'amostra_percentual')
await assert.rejects(api.listarAcessosBibliotecaAdmin(req), { code: 'permission-denied' })
administrador = true
await api.registrarAcessoBiblioteca({ ...req, data: { tipo: 'entrada', eventoId: 'admin' } })
assert.equal(Object.keys(registros).length, 3, 'Administrador não altera estatísticas')
console.log('Acessos: autenticação, autorização, deduplicação, livro, modalidade da amostra e exclusão do administrador verificados.')
