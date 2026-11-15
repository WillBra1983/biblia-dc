import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const source = fs.readFileSync('src/services/bibliotecaLivrosService.js', 'utf8')
const tokens = new Map([['biblioteca-dispositivo-v1', 'antigo'], ['biblioteca-acessos-offline:antigo', '{}']])
const auth = { currentUser: null, authStateReady: async () => {} }
let chamadas = [], geracao = 0, erro = null
const firebase = { getFirebaseAuth: () => auth, loadFirebaseModules: async () => {}, getFirebaseFunctions: () => ({}) }
const funcoes = { httpsCallable: (_, nome) => async dados => {
  chamadas.push({ nome, dados, uid: auth.currentUser?.uid })
  if (erro) throw erro
  if (!auth.currentUser && dados.dispositivoBiblioteca === 'antigo') throw Object.assign(new Error('Conecte-se à conta vinculada às compras deste aparelho.'), { details: { motivo: 'visitante_vinculado' } })
  return { data: { ok: true } }
} }
let funcao = source.slice(source.indexOf('async function chamarFuncao('), source.indexOf('export const listarVotosBiblioteca'))
funcao = funcao.replace("await import('../config/firebase')", 'firebase').replace("await import('firebase/functions')", 'funcoes')
const contexto = { firebase, funcoes, localStorage: { removeItem: key => tokens.delete(key) }, dispositivoBiblioteca: () => {
  if (!tokens.has('biblioteca-dispositivo-v1')) tokens.set('biblioteca-dispositivo-v1', 'novo-' + ++geracao)
  return tokens.get('biblioteca-dispositivo-v1')
} }
vm.createContext(contexto)
vm.runInContext(funcao + '; globalThis.chamar = chamarFuncao', contexto)
await contexto.chamar('criarPedidoPixBiblioteca', { livroId: 'livro' })
assert.equal(chamadas.length, 2)
assert.equal(chamadas[1].dados.dispositivoBiblioteca, 'novo-1')
assert.equal(tokens.has('biblioteca-acessos-offline:antigo'), false)
// Sessão de e-mail precisa estar restaurada antes da chamada.
auth.authStateReady = async () => { auth.currentUser = { uid: 'email-senha' } }
await contexto.chamar('criarPedidoPixBiblioteca', { livroId: 'livro' })
assert.equal(chamadas.at(-1).uid, 'email-senha')
assert.equal(geracao, 1)
// Erros de rede e recusas não relacionadas não descartam a identificação.
erro = new Error('Rede indisponível')
await assert.rejects(contexto.chamar('criarPedidoPixBiblioteca'), /Rede indisponível/)
assert.equal(geracao, 1)
// Uma confirmação antiga nunca é reenviada com outra identidade.
auth.authStateReady = async () => { auth.currentUser = null }
tokens.set('biblioteca-dispositivo-v1', 'antigo')
erro = null
await assert.rejects(contexto.chamar('informarPagamentoPixBiblioteca'), /conta vinculada/)
assert.equal(tokens.get('biblioteca-dispositivo-v1'), 'antigo')
console.log('Cliente: visitante vinculado renova identificação; login por e-mail aguardado; falhas comuns e confirmação antiga preservados.')
