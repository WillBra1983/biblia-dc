// Verificação opcional de rede: consulta metadados públicos, sem baixar os MP3s.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { performance } from 'node:perf_hooks'
const require = createRequire(import.meta.url)
const { criarResolvedorAra } = require('../functions/src/araAudioCore.js')
const resolver = criarResolvedorAra()
const inicio = performance.now()
const amostras = [[1,1,31],[19,23,6],[19,119,176],[40,1,25],[43,1,51],[43,3,36],[66,22,21]]
let aprovadas = 0
for (let i = 0; i < amostras.length; i += 3) {
  await Promise.all(amostras.slice(i,i+3).map(async ([livro,capitulo,total]) => {
    const dados = await resolver(livro,capitulo)
    assert.equal(dados.gravacaoId,549,`Gravação em ${livro}:${capitulo}`)
    assert.equal(dados.marcacoes?.length,total,`Marcações em ${livro}:${capitulo}`)
    assert.equal(dados.marcacoes[0].versiculo,1)
    assert.equal(dados.marcacoes.at(-1).versiculo,total)
    aprovadas++
    console.log(`OK: ${dados.referencia}: ${total} versículos; ${dados.marcacoes[0].inicio}–${dados.marcacoes.at(-1).fim} s`)
  }))
}
console.log(`${aprovadas}/${amostras.length} capítulos consultados (100%); falhas: 0%; tempo: ${((performance.now()-inicio)/1000).toFixed(2)} s. Não verifica a reprodução dos MP3s.`)
