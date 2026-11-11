import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { ancoraComparacao, topoComparacao } from '../src/utils/bibliaComparacaoScroll.js'
const inicio = performance.now()
let testes = 0
function teste(nome, fn) { fn(); testes++; console.log(`OK: ${nome}`) }
const separado = [{ inicio: 9, fim: 9, topo: 0, altura: 100 }, { inicio: 10, fim: 10, topo: 100, altura: 200 }, { inicio: 11, fim: 11, topo: 300, altura: 100 }]
const agrupado = [{ inicio: 9, fim: 10, topo: 0, altura: 360 }, { inicio: 11, fim: 11, topo: 360, altura: 70 }]
teste('Alinha o mesmo versículo mesmo com alturas diferentes', () => {
 const ancora = ancoraComparacao(separado, 150, 350)
 assert.equal(ancora.posicao, 10.25)
 assert.equal(topoComparacao(agrupado, ancora, 400), 225)
})
teste('Bloco NTLH 9–10 volta ao versículo 10 da outra tradução', () => {
 const ancora = ancoraComparacao(agrupado, 270, 400)
 assert.equal(ancora.posicao, 10.5)
 assert.equal(topoComparacao(separado, ancora, 350), 200)
})
teste('Movimento é contínuo, crescente e reversível nos dois sentidos', () => {
 let anterior = -1
 for (let topo = 0; topo < 299; topo++) {
  const destino = topoComparacao(agrupado, ancoraComparacao(separado, topo, 350), 400)
  assert.ok(destino >= anterior)
  const volta = topoComparacao(separado, ancoraComparacao(agrupado, destino, 400), 350)
  assert.ok(Math.abs(volta - topo) < 0.00001)
  anterior = destino
 }
})
teste('Fim do capítulo alinha os finais sem exceder o limite de rolagem', () => {
 assert.equal(topoComparacao(agrupado, ancoraComparacao(separado, 350, 350), 400), 400)
 assert.equal(topoComparacao(separado, { posicao: 900 }, 350), 350)
 assert.equal(topoComparacao(separado, { posicao: 1 }, 350), 0)
})
teste('Painéis vazios e capítulos curtos permanecem estáveis', () => {
 assert.deepEqual(ancoraComparacao([], 0, 0), { posicao: 1 })
 assert.equal(topoComparacao([], { posicao: 1 }, 0), 0)
 assert.equal(topoComparacao(agrupado, { posicao: 10 }, 0), 0)
 assert.equal(ancoraComparacao(separado, 0, 0).final, false)
})
console.log(`${testes}/${testes} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now()-inicio)/1000).toFixed(2)} s.`)
