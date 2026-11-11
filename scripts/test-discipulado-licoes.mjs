import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { transformSync } from 'esbuild'
import { discipuladoData, obterEstudosVisiveis } from '../src/data/discipulado.js'
import * as navegacao from '../src/utils/discipuladoNavegacao.js'

const inicio = performance.now()
let verificacoes = 0
function verificar(nome, fn) { fn(); verificacoes++; console.log(`OK: ${nome}`) }
const modulo = discipuladoData.find((item) => item.id === 4)
verificar('Módulo nominal, busca sem acentos e busca por número', () => {
  assert.equal(navegacao.rotuloModuloDiscipulado(discipuladoData, 4), 'Módulo 3')
  assert.equal(navegacao.rotuloModuloDiscipulado(discipuladoData, 1), 'Abertura')
  assert.equal(navegacao.buscarLicoesDiscipulado(discipuladoData, 'modulo 3').length, 4)
  assert.equal(navegacao.buscarLicoesDiscipulado(discipuladoData, 'licao 2 perseveranca')[0].estudo.id, 102)
  assert.equal(navegacao.buscarLicoesDiscipulado(discipuladoData, 'termo inexistente').length, 0)
})
verificar('Links antigos chegam à unidade correspondente sem reutilizar respostas antigas', () => {
  for (let id = 1; id <= 8; id++) {
    assert.equal(navegacao.resolverLicaoDiscipulado(4, String(id)), 101 + Math.floor((id - 1) / 2))
  }
  assert.equal(navegacao.resolverLicaoDiscipulado(2, 4), 4)
  assert.equal(navegacao.resolverLicaoDiscipulado(4, null), null)
  assert.equal(navegacao.resolverLicaoDiscipulado(4, 101), 101)
  assert.ok(!modulo.estudos.some((estudo) => estudo.id >= 1 && estudo.id <= 8))
})
verificar('Quatro lições completas, cada uma com aplicação e oito perguntas', () => {
  assert.equal(modulo.estudos.length, 4)
  for (const estudo of modulo.estudos) {
    assert.equal(estudo.tipo, 'licao')
    assert.ok(estudo.introducao.texto.includes('## Aplicação da lição'))
    assert.equal(estudo.questoes.length, 8)
    assert.ok(estudo.introducao.texto.split(/\s+/).length > 600)
    assert.deepEqual(estudo.questoes.map((q) => q.id), [1, 2, 3, 4, 5, 6, 7, 8])
    for (const questao of estudo.questoes) {
      assert.equal(questao.alternativas.filter((alt) => alt.correta).length, 1)
      assert.ok(questao.explicacao.length > 80)
    }
  }
  assert.ok(!/Este módulo está organizado|Cada lição reúne|responda ao questionário/i.test(modulo.introducao.texto), 'A introdução apresenta o tema, sem instruções de uso')
})

// Renderização real do componente React/MUI, sem depender do servidor de desenvolvimento.
const require = createRequire(import.meta.url)
const fonte = readFileSync('src/components/MenuDiscipulado.jsx', 'utf8')
const compilado = transformSync(fonte, { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code
const exportsModulo = { exports: {} }
vm.runInNewContext(compilado, {
  module: exportsModulo, exports: exportsModulo.exports, console,
  require: (nome) => nome === '../data/discipulado' ? { obterEstudosVisiveis }
    : nome === '../utils/discipuladoNavegacao' ? navegacao : require(nome),
})
const Menu = exportsModulo.exports.default
const props = { temas: discipuladoData, navigate() {}, abrirLicao() {}, concluida: (tema, estudo) => tema === 4 && estudo === 101 }
verificar('Menu inicial mostra todos os módulos e o atalho de retomada', () => {
  const html = renderToStaticMarkup(React.createElement(Menu, { ...props, ultimaLicao: { tema: modulo, estudo: modulo.estudos[0] } }))
  assert.ok(html.includes('Módulos e lições'))
  for (const tema of discipuladoData) assert.ok(html.includes(tema.titulo))
  assert.ok(html.includes('Continuar:'))
  assert.ok(html.includes('Buscar módulo ou lição'))
  assert.ok(!html.includes('Páginas da lição'))
})
verificar('Menu do módulo mostra quatro lições com seus questionários e conclusão independente', () => {
  const html = renderToStaticMarkup(React.createElement(Menu, { ...props, moduloId: 4 }))
  assert.ok(html.includes('Módulo 3'))
  assert.ok(html.includes('Todos os módulos'))
  for (const estudo of modulo.estudos) assert.ok(html.includes(estudo.titulo))
  assert.equal((html.replace(/<!--.*?-->/g, '').match(/8 perguntas de fixação/g) || []).length, 4)
  assert.equal((html.match(/aria-label="Lição concluída"/g) || []).length, 1)
})
verificar('Abertura permanece acessível e não mostra lições inexistentes', () => {
  const html = renderToStaticMarkup(React.createElement(Menu, { ...props, moduloId: 1 }))
  assert.ok(html.includes('Estudar a abertura e responder ao questionário'))
  assert.ok(!html.includes('NaN'))
})
verificar('A página principal compila com o fluxo de lição e questionário', () => {
  transformSync(readFileSync('src/pages/Discipulado.jsx', 'utf8'), { loader: 'jsx', jsx: 'automatic' })
})
console.log(`${verificacoes}/${verificacoes} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now() - inicio) / 1000).toFixed(2)} s.`)
