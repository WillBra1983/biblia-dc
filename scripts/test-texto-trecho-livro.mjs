import assert from 'node:assert/strict'
import { normalizarTrechoLivro, textoSelecaoLivro } from '../src/utils/textoTrechoLivro.js'

const texto = (nodeValue) => ({ nodeType: 3, nodeValue })
const elemento = (nodeName, ...childNodes) => ({ nodeType: 1, nodeName, childNodes })
const selecao = (...childNodes) => ({ cloneContents: () => elemento('#document-fragment', ...childNodes) })

assert.equal(textoSelecaoLivro(selecao(
  elemento('h2', texto('Pergunta 9')),
  elemento('p', elemento('strong', texto('Ministro:')), texto(' Como faremos isso?')),
  elemento('p', elemento('strong', texto('Discípulo:')), texto(' Conhecendo-o como todo-poderoso e perfeitamente bom.')),
)), 'Pergunta 9\n\nMinistro: Como faremos isso?\n\nDiscípulo: Conhecendo-o como todo-poderoso e perfeitamente bom.')
assert.equal(textoSelecaoLivro(selecao(elemento('p', texto('Parte selecionada'), elemento('br'), texto('segunda linha')))), 'Parte selecionada\nsegunda linha')
assert.equal(normalizarTrechoLivro('  Uma   frase\r\n\r\n Outra\tfrase  '), 'Uma frase\n\nOutra frase')
assert.equal(textoSelecaoLivro(null, ' Um trecho simples '), 'Um trecho simples')
assert.equal(textoSelecaoLivro(selecao(texto('Texto '), elemento('em', texto('com destaque')), texto('.'))), 'Texto com destaque.')
console.log('Compartilhamento: 5 testes de preservação de texto e parágrafos passaram.')
