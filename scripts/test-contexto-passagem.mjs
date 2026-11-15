import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import zlib from 'node:zlib'
import { prepararContextoPassagem } from '../src/utils/contextoPassagem.js'
import { contextosLivros } from '../src/data/contextosBiblicos.js'
import { livros } from '../src/data/biblia.js'

const catalogo = JSON.parse(zlib.gunzipSync(fs.readFileSync('functions/src/data/versiculos-dia.json.gz')))
const capitulo = catalogo.filter(v => v.bookId === 16 && v.chapter === 11).map(v => ({ numero: v.verse, texto: v.text }))
const secoes = [{ versiculo: 1, titulo: 'Relação dos que habitaram em Jerusalém' }, { versiculo: 20, titulo: 'Os moradores de outras cidades' }]
const item = { livroId: 16, capitulo: 11, versiculo: 12 }

test('Os 66 livros têm enquadramento editorial', () => {
  assert.equal(livros.length, 66)
  for (const livro of livros) assert.ok(contextosLivros[livro.id]?.length > 80, livro.nome)
})
test('Neemias 11.12 é explicado como continuação da identificação de Seraías', () => {
  const contexto = prepararContextoPassagem(item, capitulo, secoes)
  assert.match(contexto.introducao, /exílio/)
  assert.match(contexto.explicacao, /Seraías/)
  assert.match(contexto.explicacao, /continua/)
  assert.match(contexto.explicacao, /serviço do templo/)
  assert.equal(contexto.referenciaSecao, 'Neemias 11:1–19')
})
test('O trecho inclui os versículos anteriores e posteriores e destaca somente o alvo', () => {
  const contexto = prepararContextoPassagem(item, capitulo, secoes)
  assert.deepEqual(contexto.trecho.map(v => v.numero), [10, 11, 12, 13, 14])
  assert.deepEqual(contexto.trecho.filter(v => v.selecionado).map(v => v.numero), [12])
  assert.equal(contexto.referenciaTrecho, 'Neemias 11:10–14')
  assert.equal(contexto.trecho[2].texto, capitulo[11].texto.replace(/^[⁰¹²³⁴⁵⁶⁷⁸⁹]+\s*/, ''))
})
test('O trecho não ultrapassa os limites da seção', () => {
  const contexto = prepararContextoPassagem({ ...item, versiculo: 19 }, capitulo, secoes)
  assert.deepEqual(contexto.trecho.map(v => v.numero), [17, 18, 19])
  const inicio = prepararContextoPassagem({ ...item, versiculo: 1 }, capitulo, secoes)
  assert.deepEqual(inicio.trecho.map(v => v.numero), [1, 2, 3])
})
test('Traduções com versículos agrupados conservam o texto e o destaque', () => {
  const contexto = prepararContextoPassagem(item, [{ numero: 11, numeroFim: 12, texto: 'Texto integral dos dois versículos.' }, { numero: 13, numeroFim: 0, texto: 'Continuação.' }], secoes)
  assert.equal(contexto.trecho[0].selecionado, true)
  assert.equal(contexto.trecho[0].texto, 'Texto integral dos dois versículos.')
  assert.equal(contexto.trecho[1].numeroFim, 13)
})
test('Dados de entrada não são alterados', () => {
  const entrada = [...secoes].reverse(), antes = JSON.stringify(entrada)
  prepararContextoPassagem(item, capitulo, entrada)
  assert.equal(JSON.stringify(entrada), antes)
})
test('Sem texto carregado, o contexto editorial continua disponível sem inventar versículos', () => {
  const contexto = prepararContextoPassagem(item)
  assert.ok(contexto.explicacao)
  assert.equal(contexto.trecho.length, 0)
  assert.equal(contexto.referenciaTrecho, '')
})
test('Referências inválidas são rejeitadas e livros sem nota específica têm contexto do livro', () => {
  for (const valor of [null, {}, { ...item, livroId: 67 }, { ...item, capitulo: 14 }, { ...item, versiculo: 0 }]) assert.equal(prepararContextoPassagem(valor), null)
  const contexto = prepararContextoPassagem({ livroId: 63, capitulo: 1, versiculo: 3 })
  assert.ok(contexto.introducao)
  assert.equal(contexto.explicacao, '')
})
