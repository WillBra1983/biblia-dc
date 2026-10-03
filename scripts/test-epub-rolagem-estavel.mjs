import assert from 'node:assert/strict'
import { atualizarPaginasEpub, cancelarLimpezaEpub, limparPaginasEpub } from '../src/utils/epubRolagemEstavel.js'

let destruicoes = 0
let montagens = 0
let visivel = true
const view = {
  displayed: true,
  show() {},
  async display() { montagens++; this.displayed = true },
  destroy() { destruicoes++; this.displayed = false },
}
const fila = []
const manager = {
  settings: { offset: 500 },
  bounds: () => ({}),
  views: { all: () => [view] },
  isVisible: () => visivel,
  q: { enqueue: (tarefa) => fila.push(tarefa) },
  trim() {},
}
visivel = false
await atualizarPaginasEpub(manager)
assert.equal(destruicoes, 0, 'Não desmontar durante a rolagem')
await new Promise((resolve) => setTimeout(resolve, 550))
visivel = true
cancelarLimpezaEpub(manager)
fila.shift()()
assert.equal(destruicoes, 0, 'Invalidar limpeza já enfileirada ao inverter o gesto')
limparPaginasEpub(manager, 500)
assert.equal(destruicoes, 0, 'Manter a página que voltou à tela')
visivel = false
limparPaginasEpub(manager, 500)
assert.equal(destruicoes, 1, 'Liberar memória de páginas distantes após o gesto')
visivel = true
await atualizarPaginasEpub(manager)
cancelarLimpezaEpub(manager)
assert.equal(montagens, 1, 'Remontar quando necessário')
console.log('EPUB: 5 verificações de rolagem rápida e limpeza de páginas passaram.')
