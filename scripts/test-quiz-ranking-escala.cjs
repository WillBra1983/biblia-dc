const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const { transformSync } = require('esbuild')
const memory = new Map(), local = new Map()
let concurrent = null
const api = {
  ref: (_, path) => path,
  get: async path => ({ exists: () => memory.has(path), val: () => memory.get(path) }),
  remove: async path => memory.delete(path),
  runTransaction: async (path, updater) => {
    if (concurrent) { memory.set(path, concurrent); concurrent = null }
    memory.set(path, updater(memory.get(path) || null))
  },
}
const moduleFixture = { exports: {} }
const context = {
  console, module: moduleFixture, exports: moduleFixture.exports,
  localStorage: { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, value) },
  require: name => {
    if (name === 'firebase/database') return api
    if (name.includes('config/firebase')) return { isFirebaseConfigured: () => true, loadFirebaseModules: async () => {}, getFirebaseDatabase: () => ({}) }
    if (name.includes('chatService')) return { ensurePublicProfileMirrorAuth: async () => {} }
    if (name.includes('quizRetiroStorage')) return { QUIZ_STORAGE_BEST_FASE1: 'best' }
    if (name.includes('planoLeituraRankingService')) return { resolverNomeRanking: () => 'Wilson', resolverPhotoURLRanking: () => '' }
    throw Error('Import não simulado: ' + name)
  },
}
const code = transformSync(fs.readFileSync('src/services/quizBiblicoRankingService.js', 'utf8'), { format: 'cjs' }).code
vm.runInNewContext(code, context)
const service = moduleFixture.exports
async function main() {
  const legacy = { pontos: 1275, acertos: 40, totalPerguntas: 50 }
  assert.equal(service.montarSnapshotRankingQuiz('teste', legacy).pontos, 400)
  assert.equal(service.montarSnapshotRankingQuiz('teste', { pontos: 99999, acertos: 80, totalPerguntas: 50 }).pontos, 500)
  assert.equal(service.montarSnapshotRankingQuiz('teste', { pontos: 9999, acertos: 0 }), null)
  local.set('best', JSON.stringify({ correct: 20, points: 9999 }))
  assert.equal(service.lerMelhorPontuacaoQuizLocal().pontos, 200)
  memory.set('quizBiblicoRanking/teste', legacy)
  await service.sincronizarMeuRankingQuiz('teste', { perfil: {}, pontos: 10000, acertos: 30, totalPerguntas: 50 })
  assert.equal(memory.get('quizBiblicoRanking/teste').pontos, 400)
  assert.equal(memory.get('quizBiblicoRanking/teste').pontosHistoricos, 1275)
  concurrent = { pontos: 1060, acertos: 45, totalPerguntas: 50 }
  await service.sincronizarMeuRankingQuiz('teste', { perfil: {}, pontos: 10000, acertos: 35, totalPerguntas: 50 })
  assert.equal(memory.get('quizBiblicoRanking/teste').pontos, 450)
  assert.equal(memory.get('quizBiblicoRanking/teste').acertos, 45)
  console.log('Escala do ranking: 8/8 verificações aprovadas, incluindo histórico e gravação concorrente; banco simulado.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
