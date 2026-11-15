import assert from 'node:assert/strict'
import fs from 'node:fs'
import { observarRetornoPagamentoPix } from '../src/utils/retornoPagamentoPix.js'
function documentoFake() {
  const listeners = new Map()
  return {
    visibilityState: 'visible',
    addEventListener: (tipo, fn) => listeners.set(tipo, fn),
    removeEventListener: tipo => listeners.delete(tipo),
    mudar(estado) { this.visibilityState = estado; listeners.get('visibilitychange')?.() },
  }
}
const documento = documentoFake()
let retornos = 0
const parar = observarRetornoPagamentoPix({ documento, onRetorno: () => retornos++ })
assert.equal(retornos, 0, 'Não libera ao abrir o Pix')
documento.mudar('visible')
assert.equal(retornos, 0, 'Visibilidade sem saída não libera')
documento.mudar('hidden')
assert.equal(retornos, 0, 'Não libera enquanto estiver no banco')
documento.mudar('visible')
assert.equal(retornos, 1, 'Libera ao retornar')
documento.mudar('hidden'); documento.mudar('visible')
assert.equal(retornos, 1, 'Retornos repetidos não disparam novamente')
parar()
let eventoNativo, removidos = 0, nativos = 0
const pararNativo = observarRetornoPagamentoPix({ documento, registrarEstadoNativo: async fn => { eventoNativo = fn; return { remove: () => removidos++ } }, onRetorno: () => nativos++ })
await new Promise(resolve => setTimeout(resolve, 0))
documento.mudar('hidden'); documento.mudar('visible')
assert.equal(nativos, 0, 'Nativo usa o ciclo de vida do Capacitor')
eventoNativo({ isActive: true })
assert.equal(nativos, 0)
eventoNativo({ isActive: false }); eventoNativo({ isActive: true })
assert.equal(nativos, 1)
pararNativo()
assert.equal(removidos, 1)
// Pedido novo começa bloqueado, sem herdar saída do pedido anterior.
let novo = 0
const pararNovo = observarRetornoPagamentoPix({ documento, onRetorno: () => novo++ })
documento.mudar('visible')
assert.equal(novo, 0)
pararNovo()
documento.mudar('hidden'); documento.mudar('visible')
assert.equal(novo, 0, 'Não altera estado após fechar o diálogo')
let concluir, tardio = 0
const pararTardio = observarRetornoPagamentoPix({ documento, registrarEstadoNativo: () => new Promise(resolve => { concluir = resolve }), onRetorno: () => assert.fail('Diálogo fechado') })
await Promise.resolve()
pararTardio()
concluir({ remove: () => tardio++ })
await new Promise(resolve => setTimeout(resolve, 0))
assert.equal(tardio, 1, 'Remove listener mesmo se a instalação terminar após fechar')
const tela = fs.readFileSync('src/pages/BibliotecaLivros.jsx', 'utf8')
assert.match(tela, /: retornouAoPix \? <Button/)
assert.match(tela, /if \(!pedidoPix\?\.pedidoId \|\| !retornouAoPix \|\| pedidoPix.informado\) return/)
console.log('Pix: aviso bloqueado inicialmente; retorno web e nativo; isolamento de pedidos; limpeza e proteção do envio aprovados.')
