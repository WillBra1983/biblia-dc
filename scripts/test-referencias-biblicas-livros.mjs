import fs from 'node:fs'
import assert from 'node:assert/strict'

// Isola o reconhecimento do navegador e da base bíblica, sem alterar os dados.
const data = fs.readFileSync(new URL('../src/data/biblia.js', import.meta.url), 'utf8')
const livros = new Function(data.replace(/export /g, '') + ';return livros')()
const source = fs.readFileSync(new URL('../src/utils/referenciasBiblicasEpub.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/export /g, '')
const chamadas = []
const api = new Function('livros', 'normalizarNomeLivro', 'buscarLivroPorNome', 'buscarIntervaloVersiculos', source + ';return {extrairReferenciasBiblicas,localizarReferenciasBiblicas,carregarReferenciaBiblica}')(
  livros, (nome) => nome === 'Salmo' ? 'Salmos' : nome,
  async (nome) => ({ id: nome, nome }),
  async (id, capitulo, inicio, fim) => {
    chamadas.push([id, capitulo, inicio, fim])
    return { versiculos: Array.from({ length: Math.min(fim - inicio + 1, 200) }, (_, i) => ({ id: `${id}:${capitulo}:${inicio + i}`, capitulo, versiculo: inicio + i })) }
  },
)
const referencias = ['2 Pedro 3:16', 'Salmo 119:105,130', 'Mateus 5:18', 'Isaias 8:20', 'Atos 15:15', 'João 5:39,46', '1 Coríntios 14:6, 9, 11, 12, 27, 28', 'Colossenses 3:16', 'Romanos 15:4', 'Rm 1.20-22', 'Salmo 4.3', 'Salmos 4:3', 'Sl 4.3', 'Jo 3', 'João 3:16–18,20']
referencias.push('1 Co 8:4,6', '2 Co 7.1', '2 Co 13.11', '1 Pe 1:16', '2 Pe 3:16')
referencias.push('1 Jo 3.24', '2 Jo 1:6', '3 Jo 1:4')
referencias.push('1 Tm 1.8', '2 Sm 16.10', '1 Ts 1.3-4', '2 Ts 2.13', 'Ha 1.13')
for (const ref of referencias) {
  const texto = `Leia (${ref}); confira.`
  assert.deepEqual(api.extrairReferenciasBiblicas(texto), [ref])
  const localizado = api.localizarReferenciasBiblicas(texto)[0]
  assert.equal(texto.slice(localizado.inicio, localizado.fim), ref)
  assert.ok((await api.carregarReferenciaBiblica(ref)).length > 0)
}
assert.deepEqual(api.extrairReferenciasBiblicas('Isaias 8:20; Atos 15:15; João 5:39,46.'), ['Isaias 8:20', 'Atos 15:15', 'João 5:39,46'])
chamadas.length = 0
assert.deepEqual((await api.carregarReferenciaBiblica('Salmo 119:105,130')).map((v) => v.versiculo), [105, 130])
assert.deepEqual(chamadas.map((c) => c.slice(1)), [[119, 105, 105], [119, 130, 130]])
assert.deepEqual((await api.carregarReferenciaBiblica('1 Coríntios 14:6, 9, 11, 12, 27, 28')).map((v) => v.versiculo), [6, 9, 11, 12, 27, 28])
assert.deepEqual((await api.carregarReferenciaBiblica('João 3:16-18,18,20')).map((v) => v.versiculo), [16, 17, 18, 20])
assert.deepEqual(await api.carregarReferenciaBiblica('João 3:18-16'), [])
assert.deepEqual(await api.carregarReferenciaBiblica('João 0:1'), [])
assert.deepEqual(await api.carregarReferenciaBiblica('João 3:0'), [])
assert.deepEqual(api.extrairReferenciasBiblicas('Texto sem referências. NãoSalmo 4.3.'), [])
for (const espaco of [' ', '  ', '   ', '    ', '     ', '        ', '\u00a0', '\u2009', ' \u00a0  ']) {
  for (const nome of ['1 Coríntios', '1 Timóteo', '1 Tessalonicenses', '2 Pedro', '1 João', '1 Reis', '1 Jo', '2 Jo', '3 Jo']) {
    const ref = `${nome.replace(' ', espaco)} 1:1,3`
    const texto = `Leia (${ref}).`
    assert.deepEqual(api.extrairReferenciasBiblicas(texto), [`${nome} 1:1,3`])
    const localizado = api.localizarReferenciasBiblicas(texto)[0]
    assert.equal(texto.slice(localizado.inicio, localizado.fim), ref)
    assert.equal((await api.carregarReferenciaBiblica(localizado.referencia)).length, 2)
  }
}
console.log(`${referencias.length} formatos: reconhecimento, posições no PDF, listas, intervalos e compatibilidade aprovados.`)
console.log('81 variações de espaços em livros numerados aprovadas, preservando as posições no texto original.')
const sequencias = [
  ['Rm 6.23; 2.16; Mc 9.44', ['Rm 6.23', 'Rm 2.16', 'Mc 9.44']],
  ['Rm 3.20 e 7.7', ['Rm 3.20', 'Rm 7.7']],
  ['Rm 3:20, 7:7', ['Rm 3:20', 'Rm 7:7']],
  ['1 Jo 3.6; 2.29; 3.9-14; 5.4-18', ['1 Jo 3.6', '1 Jo 2.29', '1 Jo 3.9-14', '1 Jo 5.4-18']],
  ['1 Pe 1.2; 2 Ts 2.13; Rm 8.29; Ef 1.4; 1 Ts 1.3-4', ['1 Pe 1.2', '2 Ts 2.13', 'Rm 8.29', 'Ef 1.4', '1 Ts 1.3-4']],
  ['2 Sm\n16.10; Nm 12.3', ['2 Sm 16.10', 'Nm 12.3']],
  ['Rm 3.20. O preço é 7.7.', ['Rm 3.20']],
  ['Rm 3.20; texto explicativo 7.7.', ['Rm 3.20']],
]
for (const [texto, esperado] of sequencias) {
  assert.deepEqual(api.extrairReferenciasBiblicas(texto), esperado)
  for (const encontrada of api.localizarReferenciasBiblicas(texto)) {
    assert.ok(encontrada.fim > encontrada.inicio)
    assert.ok((await api.carregarReferenciaBiblica(encontrada.referencia)).length > 0)
  }
}
console.log('Sequências sem repetição do livro e limites de contexto aprovados.')
