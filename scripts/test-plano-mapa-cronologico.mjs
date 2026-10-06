import assert from 'node:assert/strict'
import { build } from 'esbuild'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
const compilado = await build({ entryPoints: ['src/utils/planoMapaLeitura.js'], bundle: true, platform: 'node', format: 'cjs', write: false })
const modulo = { exports: {} }
vm.runInNewContext(compilado.outputFiles[0].text, { module: modulo, exports: modulo.exports })
const { blocosVisiveisParaTemplate, destinoMapaBloco, livrosDoMapa } = modulo.exports
const template = { livros: [{ id: 1, capitulos: 50 }, { id: 2, capitulos: 40 }, { id: 18, capitulos: 42 }] }
const instancia = { capitulosLidos: Array.from({ length: 50 }, (_, i) => `1-${i + 1}`) }
const mapa = blocosVisiveisParaTemplate(template)
assert.equal(mapa[0].id, 'cronologico', 'Cronológico deve ser o primeiro atalho')
assert.ok(mapa.some((b) => b.id === 'cronologico' && b.titulo === 'Leitura cronológica'))
assert.equal(destinoMapaBloco(instancia, template, 'cronologico').livroId, 18, 'Depois de Gênesis, a ordem cronológica existente leva a Jó')
assert.equal(destinoMapaBloco(instancia, template, 'pentateuco').livroId, 2, 'Pentateuco continua seguindo sua ordem habitual')
assert.equal(instancia.capitulosLidos.length, 50, 'Atalho não altera leituras registradas')
assert.equal(destinoMapaBloco({ capitulosLidos: [] }, template, 'cronologico').capitulo, 1)
assert.deepEqual(Array.from(livrosDoMapa(template, 'cronologico'), (livro) => livro.id), [1, 18, 2], 'Cronológico mostra os livros na ordem do mapa')
assert.deepEqual(Array.from(livrosDoMapa(template, 'pentateuco'), (livro) => livro.id), [1, 2])
assert.deepEqual(Array.from(livrosDoMapa(template, 'poeticos'), (livro) => livro.id), [18])
assert.equal(livrosDoMapa(template, ''), template.livros, 'Todos os livros continuam disponíveis')
const parcial = livrosDoMapa({ livros: [{ id: 18, capitulos: 42, inicioPlano: 3, fimPlano: 7 }] }, 'poeticos')[0]
assert.equal(parcial.inicioPlano, 3); assert.equal(parcial.fimPlano, 7)
assert.equal(instancia.capitulosLidos.length, 50)
const tela = readFileSync('src/pages/PlanoLeituraBiblia.jsx', 'utf8')
const escolher = tela.slice(tela.indexOf('const abrirMapaBloco'), tela.indexOf('const livrosExibidos'))
assert.ok(escolher.includes('setLivrosExpandido(true)'))
assert.ok(!escolher.includes('navigate('), 'Escolher mapa não abre automaticamente um capítulo')
assert.ok(tela.includes('aria-label={`${livro.nome}, capítulo ${cap}'))
console.log('Mapa: listas filtradas/ordenadas, navegação livre, capítulos lidos preservados e nenhuma abertura automática verificados.')
