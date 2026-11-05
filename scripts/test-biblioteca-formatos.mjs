import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { arquivoLivroPorFormato, formatosLivro } from '../src/utils/bibliotecaFormatos.js'
const require = createRequire(import.meta.url)
const { decidirArquivo } = require('../functions/src/bibliotecaDegustacao.js')
const id = 'livro-teste'
const epub = { chave: 'biblioteca/livro-teste/completo.epub', formato: 'epub', atualizadoEm: 1 }
let livro = { publicado: true, downloadPermitido: true, arquivos: { completo: epub }, degustacao: { modo: 'percentual', percentual: 12 } }
let ehAdmin = true, comprado = false
const assinados = []
const exports = {}
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
class Command { constructor(input) { this.input = input } }
const admin = {
  auth: () => ({ getUser: async () => ({ displayName: 'Comprador' }) }),
  database: () => ({ ref: (path) => ({
    get: async () => ({ val: () => path.startsWith('users/') ? ehAdmin : path.startsWith('bibliotecaAcessos/') ? comprado : livro }),
    set: async () => {},
    transaction: async (fn) => { if (path.endsWith('/arquivos')) livro.arquivos = fn(livro.arquivos) },
  }) }),
}
vm.runInNewContext(fs.readFileSync(new URL('../functions/src/bibliotecaArquivos.js', import.meta.url), 'utf8'), {
  exports, Buffer, console, require(name) {
    if (name === './firebaseAdmin') return admin
    if (name === 'firebase-functions/v2/https') return { onCall: (_, handler) => handler, HttpsError }
    if (name === 'firebase-functions/params') return { defineSecret: () => ({ value: () => 'teste' }) }
    if (name === '@aws-sdk/client-s3') return {
      S3Client: class { async send() { return { ContentLength: 4000, Metadata: { restricao: '{"percentual":12}' } } } },
      PutObjectCommand: Command, GetObjectCommand: Command, HeadObjectCommand: Command, DeleteObjectCommand: Command,
    }
    if (name === '@aws-sdk/s3-request-presigner') return { getSignedUrl: async (_, comando) => { assinados.push(comando.input); return 'https://example.test/privado' } }
    if (name === './bibliotecaDegustacao') return { decidirArquivo }
    if (name === './bibliotecaAmostraAutomatica') return { VERSAO_AMOSTRA: 1 }
    if (name === './bibliotecaExemplarPersonalizado') return { VERSAO_EXEMPLAR: 1 }
    if (name === './bibliotecaVisitante') return { identificarLeitor: async () => 'usuario' }
    return require(name)
  },
})
const req = (data) => ({ auth: { uid: 'usuario' }, data: { livroId: id, ...data } })
assert.deepEqual(formatosLivro(livro), ['epub'])
await assert.rejects(exports.prepararUploadLivroBiblioteca(req({ finalidade: 'completo-pdf', nome: 'livro.epub', tamanho: 4000 })), { code: 'invalid-argument' })
const dadosPdf = req({ finalidade: 'completo-pdf', nome: 'livro.pdf', tamanho: 4000 })
assert.equal((await exports.prepararUploadLivroBiblioteca(dadosPdf)).chave, 'biblioteca/livro-teste/completo.pdf')
await exports.confirmarUploadLivroBiblioteca(dadosPdf)
assert.equal(livro.arquivos.completo, epub)
assert.equal(arquivoLivroPorFormato(livro, 'pdf').formato, 'pdf')
assert.deepEqual(formatosLivro(livro), ['epub', 'pdf'])
assert.equal((await exports.obterArquivoLivroBiblioteca(req({ finalidade: 'completo' }))).formato, 'epub')
ehAdmin = false
await assert.rejects(exports.obterArquivoLivroBiblioteca(req({ finalidade: 'completo', formato: 'pdf' })), { code: 'permission-denied' })
for (const formato of ['epub', 'pdf']) {
  const amostra = await exports.obterArquivoLivroBiblioteca(req({ finalidade: 'amostra', formato }))
  assert.equal(amostra.formato, formato)
  assert.equal(amostra.restricao.percentual, 12)
  assert.match(assinados.at(-1).Key, /^biblioteca-amostras\//)
}
comprado = true
for (const formato of ['epub', 'pdf']) {
  const leitura = await exports.obterArquivoLivroBiblioteca(req({ finalidade: 'completo', formato }))
  assert.equal(leitura.formato, formato)
  const exemplar = await exports.obterArquivoLivroBiblioteca(req({ finalidade: 'completo', download: true, formato }))
  assert.equal(exemplar.formato, formato)
  assert.match(assinados.at(-1).Key, /^biblioteca-exemplares\//)
}
livro.downloadPermitido = false
await assert.rejects(exports.obterArquivoLivroBiblioteca(req({ finalidade: 'completo', formato: 'pdf', download: true })), { code: 'permission-denied' })
console.log('EPUB legado preservado; PDF adicional, compra única, amostras e downloads por formato validados.')
