import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createHash } from 'node:crypto'
import { transformSync, build } from 'esbuild'
import { createRequire } from 'node:module'
import path from 'node:path'
import * as origem from '../src/utils/estudoOriginal.js'
import * as trad from '../src/utils/estudoTraducao.js'
import * as tons from '../src/utils/iaTonalidade.js'
import * as livros from '../src/data/biblia.js'
import * as texto from '../src/utils/bibliaVersoesTexto.js'
import * as salmos from '../src/data/salmosEstrutura.js'

const inicio = performance.now(), pedidos = []
function servico(arquivo = 'src/services/bibliaPassagemEstudoIaService.js') {
  const mod = { exports: {} }
  const deps = {
    '../utils/estudoOriginal': origem, '../utils/estudoTraducao': trad,
    '../utils/iaTonalidade': tons, '../data/biblia': livros,
    '../utils/bibliaVersoesTexto': texto, '../data/salmosEstrutura': salmos,
    './bibliaService': {},
    './strongEstudoAiService': { iaGeminiDisponivel: () => true, gerarConteudoGemini: async (body, opts) => {
      pedidos.push(JSON.parse(JSON.stringify({ body, opts })))
      return { ok: true, text: 'Estudo de teste adaptado.' }
    } }
  }
  vm.runInNewContext(transformSync(fs.readFileSync(arquivo, 'utf8'), { format: 'cjs', define: { 'import.meta.env': '{}' }, logLevel: 'silent' }).code,
    { module: mod, exports: mod.exports, Date, console, require: n => { if (deps[n]) return deps[n]; throw Error(n) } })
  return mod.exports
}
const svc = servico(), hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
let grupos = 0
async function teste(nome, fn) { await fn(); grupos++; console.log('OK: ' + nome) }
const verso = { referenciaCompacta: 'Jo 3:16', textoCitacao: 'Texto bíblico de teste' }
const pericope = { referencia: 'Jo 3:1-21', titulo: 'Nicodemos', texto: 'Texto bíblico de teste' }

await teste('Roteiro de geração normal preservado integralmente para versículo e perícope', async () => {
  // Hashes dos pedidos completos capturados antes de acrescentar a adaptação.
  const esperados = ['03aa41be3f2956289523678a2652c0a479de792f20ea4c82e842c01bc4edd013', 'e951085de6431ffd73134a8d64fe2fe0c80d38fa1cc10423c3b9191b3a83c354']
  await svc.gerarComentarioVersiculo(verso)
  await svc.gerarEstudoPericopeCompleto(pericope)
  const atuais = pedidos.splice(0)
  assert.deepEqual(atuais.map(hash), esperados)
})
const original = { texto: 'Estudo original extenso e aprofundado. '.repeat(300), versaoBiblica: 'ara', legado: true, tom: 'pastoral', geradoEm: 100, referencia: 'Jo 3:16' }
await teste('Adaptação recebe o estudo completo, os dois textos e regras de revisão coerente', async () => {
  const antes = JSON.stringify(original)
  for (const gerar of [svc.gerarComentarioVersiculo, svc.gerarEstudoPericopeCompleto]) {
    const r = await gerar({ ...verso, ...pericope, versaoBiblica: 'ntlh', estudoBase: original, textoBiblicoBase: 'Texto ARA integral.' })
    assert.equal(r.ok, true)
    assert.equal(r.origemEstudo.texto, original.texto)
    const { body, opts } = pedidos.at(-1), prompt = body.contents[0].parts[0].text
    assert.ok(prompt.includes(original.texto))
    assert.ok(prompt.includes('Texto ARA integral.'))
    assert.ok(prompt.includes('Texto bíblico de teste'))
    for (const regra of ['relações sintáticas', 'não aparecer na tradução solicitada', 'Não resuma um estudo extenso', 'versículos agrupados', 'Não perpetue um erro', 'Não gere um estudo independente']) assert.ok(prompt.includes(regra), regra)
    assert.equal(body.systemInstruction.parts.length, 2)
    assert.equal(body.generationConfig.maxOutputTokens, 16384)
    assert.equal(opts.maxContinuacoes, 2)
  }
  assert.equal(JSON.stringify(original), antes)
})
await teste('A terceira tradução parte da raiz, inclusive quando só a adaptação está disponível', () => {
  const derivado = { texto: 'NAA intermediária.', versaoBiblica: 'naa', origemEstudo: original, geradoEm: 200 }
  const raiz = origem.selecionarEstudoOriginal({ naa: derivado })
  assert.equal(raiz.versaoBiblica, 'ara')
  assert.equal(raiz.texto, original.texto)
  const primeiro = { texto: 'Primeiro em NTLH.', versaoBiblica: 'ntlh', geradoEm: 10 }
  assert.equal(origem.selecionarEstudoOriginal({ ntlh: primeiro, naa: { texto: 'Posterior NAA.', versaoBiblica: 'naa', geradoEm: 20 } }).versaoBiblica, 'ntlh')
})
await teste('Sem a Bíblia original ou sem estudo-base válido, não chama a IA', async () => {
  const antes = pedidos.length
  for (const gerar of [svc.gerarComentarioVersiculo, svc.gerarEstudoPericopeCompleto]) {
    const r = await gerar({ ...verso, ...pericope, versaoBiblica: 'naa', estudoBase: original })
    assert.equal(r.ok, false)
    assert.equal(r.code, 'ADAPTATION_INPUT')
  }
  assert.equal(pedidos.length, antes)
})
await teste('Recuperar a própria tradução original não exige chamada paga', async () => {
  const antes = pedidos.length
  const r = await svc.gerarComentarioVersiculo({ ...verso, estudoBase: original, textoBiblicoBase: 'Texto ARA' })
  assert.equal(r.text, original.texto)
  assert.equal(pedidos.length, antes)
})
await teste('Origem e data sobrevivem à publicação e à curadoria das duas modalidades', async () => {
  const dados = new Map()
  globalThis.__dbAdaptacao = { ref: (_, p) => p, get: async p => ({ exists: () => dados.has(p), val: () => dados.get(p) }), set: async (p, v) => dados.set(p, v), remove: async p => dados.delete(p) }
  const arquivo = '.cache/menu-review/repo-adaptacao.cjs'
  await build({ entryPoints: ['src/services/estudosCuradosService.js'], outfile: arquivo, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', plugins: [{ name: 'firebase-memory', setup(b) {
    b.onResolve({ filter: /config\/firebase$|^firebase\/database$/ }, a => ({ path: a.path, namespace: 'fixture' }))
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({ contents: a.path === 'firebase/database' ? 'export const {ref,get,set,remove}=globalThis.__dbAdaptacao' : 'export const loadFirebaseModules=async()=>{};export const getFirebaseDatabase=()=>({})' }))
  } }] })
  const repo = createRequire(import.meta.url)(path.resolve(arquivo)).criarRepositorioEstudosPorTraducao('ntlh')
  const payload = { livroId: 43, capitulo: 3, versArr: [16], inicio: 1, fim: 21, texto: 'Adaptação NTLH.', origemEstudo: original, geradoEm: 12345, uidAutor: 'tester' }
  for (const [salvar, ler, args] of [
    ['publicarEstudoCandidato', 'lerEstudoCandidato', [43, 3, [16]]],
    ['publicarPericopeCandidata', 'lerPericopeCandidata', [43, 3, 1, 21]],
    ['salvarEstudoCurado', 'lerEstudoCurado', [43, 3, [16]]],
    ['salvarPericopeCurada', 'lerPericopeCurada', [43, 3, 1, 21]]
  ]) {
    assert.equal((await repo[salvar](payload)).ok, true)
    const salvo = await repo[ler](...args)
    assert.equal(salvo.origemEstudo.texto, original.texto)
    assert.equal(salvo.geradoEm, 12345)
  }
})
console.log(grupos + '/' + grupos + ' grupos aprovados (100%); falhas: 0%; tempo: ' + ((performance.now() - inicio) / 1000).toFixed(2) + ' s.')
