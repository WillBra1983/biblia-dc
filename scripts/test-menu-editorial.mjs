import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import zlib from 'node:zlib'
import vm from 'node:vm'
import path from 'node:path'
import { createRequire } from 'node:module'
import { buildSync } from 'esbuild'

const require = createRequire(import.meta.url)
const { REFERENCIAS, escolherVersiculoEditorial } = require('../functions/src/versiculoDiaSelecao.js')
const catalogo = JSON.parse(zlib.gunzipSync(fs.readFileSync('functions/src/data/versiculos-dia.json.gz')))
const indice = new Map(catalogo.map(item => [[item.bookId, item.chapter, item.verse].join('_'), item]))
const bundle = buildSync({ entryPoints: ['src/utils/menuPreferencias.js'], bundle: true, format: 'esm', write: false }).outputFiles[0].text
const prefs = await import('data:text/javascript;base64,' + Buffer.from(bundle).toString('base64'))
const memoria = () => { const valores = new Map(); return { getItem: chave => valores.get(chave) ?? null, setItem: (chave, valor) => valores.set(chave, valor) } }
const chave = item => [item.bookId, item.chapter, item.verse].join('_')

test('Todas as referências editoriais existem e preservam o texto bíblico', () => {
  assert.equal(new Set(REFERENCIAS.map(item => item.chave)).size, REFERENCIAS.length)
  assert.equal(REFERENCIAS.length, 128)
  for (const ref of REFERENCIAS) assert.ok(indice.get(ref.chave)?.text, ref.chave)
  const item = escolherVersiculoEditorial(catalogo, {}, '2026-11-13')
  assert.equal(item.text, indice.get(chave(item)).text)
  assert.ok(item.pericopeStart > 0 && item.pericopeEnd >= item.verse)
})

test('Destaques excluem referências não selecionadas, mesmo com texto de tamanho elegível', () => {
  const estranho = indice.get('16_11_12')
  assert.ok(estranho)
  assert.throws(() => escolherVersiculoEditorial([estranho], {}, '2026-11-13'), /referências/)
})

test('A seleção é determinística e distribui oito temas nos primeiros oito dias', () => {
  const temas = new Set()
  for (let dia = 1; dia <= 8; dia++) {
    const data = '2026-11-' + String(dia).padStart(2, '0')
    const a = escolherVersiculoEditorial(catalogo, {}, data)
    assert.deepEqual(a, escolherVersiculoEditorial(catalogo, {}, data))
    temas.add(a.editorialTema)
  }
  assert.equal(temas.size, 8)
})

test('Um ciclo inteiro não repete e a renovação começa pelo versículo mais antigo', () => {
  const usados = { '16_11_12': '2020-01-01' }
  const vistos = new Set()
  let primeiro
  for (let dia = 0; dia < REFERENCIAS.length; dia++) {
    const data = new Date(Date.UTC(2026, 0, 1 + dia)).toISOString().slice(0, 10)
    const item = escolherVersiculoEditorial(catalogo, usados, data)
    const id = chave(item)
    assert.ok(!vistos.has(id), 'Repetição antes de completar o catálogo: ' + id)
    if (dia === 0) primeiro = id
    vistos.add(id); usados[id] = data
  }
  assert.equal(vistos.size, 128)
  assert.equal(chave(escolherVersiculoEditorial(catalogo, usados, '2027-01-01')), primeiro)
  assert.equal(usados['16_11_12'], '2020-01-01')
})

test('Catálogo parcial continua funcionando e catálogo vazio falha de forma explícita', () => {
  const unico = indice.get(REFERENCIAS[0].chave)
  assert.equal(chave(escolherVersiculoEditorial([unico], {}, '2026-11-13')), REFERENCIAS[0].chave)
  assert.throws(() => escolherVersiculoEditorial([], {}, '2026-11-13'), /catálogo/)
})

test('Preferências de visualização persistem sem habilitar estatísticas por valores ambíguos', () => {
  const storage = memoria()
  assert.deepEqual(prefs.lerPreferenciasMenu(storage), { visualizacao: 'cards', metricas: false })
  prefs.salvarPreferenciasMenu({ visualizacao: 'lista', metricas: true }, storage)
  assert.deepEqual(prefs.lerPreferenciasMenu(storage), { visualizacao: 'lista', metricas: true })
  storage.setItem(prefs.CHAVE_MENU_PREFERENCIAS, JSON.stringify({ visualizacao: 'desconhecida', metricas: 'true' }))
  assert.deepEqual(prefs.lerPreferenciasMenu(storage), { visualizacao: 'cards', metricas: false })
})

test('Armazenamento corrompido ou indisponível não impede a navegação', () => {
  const storage = memoria(); storage.setItem(prefs.CHAVE_MENU_PREFERENCIAS, '{')
  assert.deepEqual(prefs.lerPreferenciasMenu(storage), { visualizacao: 'cards', metricas: false })
  const bloqueado = { getItem() { throw Error('Bloqueado') }, setItem() { throw Error('Bloqueado') } }
  assert.doesNotThrow(() => prefs.salvarPreferenciasMenu({ visualizacao: 'lista' }, bloqueado))
  assert.deepEqual(prefs.lerPreferenciasMenu(bloqueado), { visualizacao: 'cards', metricas: false })
})

test('O módulo diário carrega e mantém os fluxos de seleção e substituição administrativa', () => {
  const contexto = { exports: {}, process: { env: {} }, __dirname: path.resolve('functions/src'), require: nome => {
    if (nome.startsWith('node:')) return require(nome)
    if (nome === './versiculoDiaSelecao') return require('../functions/src/versiculoDiaSelecao.js')
    if (nome === './firebaseAdmin') return {}
    if (nome.includes('generated/')) return { INSTRUCAO_COMENTARIO_VERSICULO: '', PROMPT_FINGERPRINT: 'teste' }
    if (nome === 'firebase-functions/params') return { defineSecret: () => ({ value: () => '' }) }
    if (nome === 'firebase-functions/v2/https') return { onCall: (_, handler) => handler, HttpsError: Error }
    if (nome === 'firebase-functions/v2/scheduler') return { onSchedule: (_, handler) => handler }
    if (nome === 'firebase-functions/v2/database') return { onValueWritten: (_, handler) => handler }
    if (nome === 'firebase-functions/v2') return { logger: {} }
    throw Error('Dependência inesperada: ' + nome)
  } }
  vm.runInNewContext(fs.readFileSync('functions/src/versiculoDoDia.js', 'utf8'), contexto)
  assert.equal(typeof contexto.exports.selecionarVersiculoDoDia, 'function')
  assert.equal(typeof contexto.exports.substituirVersiculoDoDia, 'function')
  assert.equal(typeof contexto.exports._test.escolherVersiculoEditorial, 'function')
  assert.equal(contexto.exports._test.dataNoFuso(new Date('2026-11-13T02:00:00Z')), '2026-11-12')
})
