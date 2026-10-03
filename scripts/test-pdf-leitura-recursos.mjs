import assert from 'node:assert/strict'
import { CachePaginasPdf, FilaRenderPdf, prioridadePaginaPdf } from '../src/utils/pdfLeituraRecursos.js'

const cache = new CachePaginasPdf(100)
cache.guardar('1', { pagina: 1 }, 40)
cache.guardar('2', { pagina: 2 }, 40)
assert.equal(cache.obter('1').pagina, 1)
cache.guardar('3', { pagina: 3 }, 40)
assert.equal(cache.obter('2'), null, 'Descartar a menos recentemente usada')
assert.equal(cache.obter('1').pagina, 1, 'Voltar sem renderizar novamente')
assert.equal(cache.bytes, 80)
cache.guardar('1', { pagina: 1, largura: 700 }, 60)
assert.equal(cache.bytes, 100)
cache.guardar('enorme', {}, 101)
assert.equal(cache.obter('enorme'), null)
for (let i = 0; i < 494; i++) cache.guardar(String(i), {}, 40)
assert.ok(cache.bytes <= 100, 'Livro grande não aumenta o orçamento do cache')
cache.limpar()
assert.equal(cache.bytes, 0)

const fila = new FilaRenderPdf(2)
const ordem = []
let simultaneos = 0
let maximo = 0
const pendentes = []
const tarefas = [12, 8, 9, 7].map((numero) => fila.agendar(async () => {
  ordem.push(numero)
  maximo = Math.max(maximo, ++simultaneos)
  await new Promise((resolve) => pendentes.push(resolve))
  simultaneos--
  return numero
}, () => prioridadePaginaPdf(numero, 8, 1)))
const cancelada = fila.agendar(() => { throw new Error('Página cancelada não deve renderizar') }, () => 999)
cancelada.cancelar()
await new Promise((resolve) => setImmediate(resolve))
assert.deepEqual(ordem, [8, 9], 'Página atual primeiro, depois direção do movimento')
pendentes.splice(0).forEach((resolver) => resolver())
await new Promise((resolve) => setImmediate(resolve))
pendentes.splice(0).forEach((resolver) => resolver())
await Promise.all(tarefas.map((tarefa) => tarefa.promise))
assert.equal(maximo, 2, 'Nunca renderizar todas as páginas ao mesmo tempo')
assert.equal(await cancelada.promise, null)
assert.ok(prioridadePaginaPdf(7, 8, -1) < prioridadePaginaPdf(9, 8, -1))
const falha = fila.agendar(() => { throw new Error('Teste') })
await assert.rejects(falha.promise, /Teste/)
assert.equal(await fila.agendar(() => 'continua').promise, 'continua', 'Uma falha não bloqueia a fila')
console.log('PDF: cache limitado, reutilização, prioridade, direção, concorrência e cancelamento validados.')
