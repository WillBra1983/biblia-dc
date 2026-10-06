import assert from 'node:assert/strict'
import { build } from 'esbuild'
import vm from 'node:vm'
const memoria = new Map()
const storage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, String(v)), removeItem: (k) => memoria.delete(k) }
const resultado = await build({ entryPoints: ['src/utils/planoLeituraUsuario.js'], bundle: true, platform: 'node', format: 'cjs', write: false })
const modulo = { exports: {} }
const contexto = { module: modulo, exports: modulo.exports, localStorage: storage, window: { dispatchEvent() {}, localStorage: storage }, CustomEvent: class {}, console, crypto: { randomUUID: () => 'teste-plano' } }
vm.runInNewContext(resultado.outputFiles[0].text, contexto)
const api = modulo.exports
assert.ok(api.obterTemplate('cronologico'))
const planos = await build({ entryPoints: ['src/data/planos.js'], bundle: true, platform: 'node', format: 'cjs', write: false })
const catalogo = { exports: {} }
vm.runInNewContext(planos.outputFiles[0].text, { module: catalogo, exports: catalogo.exports })
assert.ok(!catalogo.exports.PLANOS_NOVO_CADASTRO.some((p) => p.id === 'cronologico'), 'A opção cronológica pertence ao Mapa de Opções, não ao cadastro de modelos')
const criado = api.criarInstancia({ templateId: 'biblia', dataInicio: '2026-01-01', dataFim: '2026-12-31' })
assert.ok(criado.ok, criado.erro)
const estado = JSON.parse(storage.getItem('planoLeitura_instancias_v2'))
estado.instancias[0].capitulosLidos = ['1_1', '1_2']
estado.instancias[0].diasComLeitura = ['2026-01-01']
estado.instancias[0].medalhasAberturaMostradas = ['teste']
storage.setItem('planoLeitura_instancias_v2', JSON.stringify(estado))
const antes = JSON.parse(JSON.stringify(api.listarInstancias()[0]))
const salvo = api.atualizarPrazoInstancia(criado.instancia.id, '2026-10-01')
assert.ok(salvo.ok, salvo.erro)
const depois = JSON.parse(JSON.stringify(api.listarInstancias()[0]))
assert.deepEqual(depois, { ...antes, dataFim: '2026-10-01' }, 'Somente a data final deve mudar')
assert.ok(!api.atualizarPrazoInstancia(criado.instancia.id, '2025-12-31').ok)
assert.ok(!api.atualizarPrazoInstancia(criado.instancia.id, '2028-12-31').ok)
assert.ok(!api.atualizarPrazoInstancia('inexistente', '2026-10-01').ok)
console.log('Plano: prazo alterado, histórico/conquistas preservados e datas inválidas bloqueadas.')
