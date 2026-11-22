const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict')
const { transformSync } = require('esbuild')
process.env.GOMAXPROCS = '1'
const source = transformSync(fs.readFileSync('src/services/conviteInstalacaoService.js', 'utf8'), { format: 'cjs' }).code
function ambiente({ plataforma = 'android', resposta = { status: 'ok', referrer: 'convite=' + 'a'.repeat(32) } } = {}) {
  const valores = new Map(), m = { exports: {} }
  let consultas = 0, capturas = 0, offline = false, falhaNativa = false
  const storage = { getItem: k => valores.get(k) || null, setItem: (k, v) => valores.set(k, v) }
  vm.runInNewContext(source, { module: m, exports: m.exports, URLSearchParams, localStorage: storage, require: nome => {
    if (nome === '@capacitor/core') return { Capacitor: { getPlatform: () => plataforma }, registerPlugin: () => ({ read: async () => { consultas++; if (falhaNativa) throw Error('Plugin indisponível'); return resposta } }) }
    if (nome.includes('projetoCompartilhamentoService')) return { capturarConviteProjeto: async codigo => { capturas++; if (offline) throw Error('Offline'); return { codigo, recibo: 'recibo' } } }
    throw Error(nome)
  } })
  return { executar: m.exports.capturarConviteInstalacao, valores, get consultas() { return consultas }, get capturas() { return capturas }, set offline(v) { offline = v }, set falhaNativa(v) { falhaNativa = v } }
}
;(async () => {
  let grupos = 0
  for (const plataforma of ['web', 'ios']) { const a = ambiente({ plataforma }); assert.equal(await a.executar(), null); assert.equal(a.consultas, 0); assert.equal(a.capturas, 0) }; grupos++
  const a = ambiente(), resultados = await Promise.all([a.executar(), a.executar()])
  assert.equal(resultados[0].codigo, 'a'.repeat(32)); assert.equal(a.consultas, 1); assert.equal(a.capturas, 1)
  await a.executar(); assert.equal(a.consultas, 1); assert.equal(a.capturas, 1); grupos++
  const b = ambiente(); b.offline = true; assert.equal(await b.executar(), null)
  assert.ok([...b.valores.values()].some(v => JSON.parse(v).codigo === 'a'.repeat(32)))
  b.offline = false; assert.equal((await b.executar()).codigo, 'a'.repeat(32)); assert.equal(b.consultas, 1); assert.equal(b.capturas, 2); grupos++
  for (const referrer of ['utm_source=google-play', 'convite=invalido', 'convite=%3Cscript%3E', 'x'.repeat(2049)]) {
    const c = ambiente({ resposta: { status: 'ok', referrer } }); assert.equal(await c.executar(), null); await c.executar(); assert.equal(c.consultas, 1); assert.equal(c.capturas, 0)
  }; grupos++
  const d = ambiente({ resposta: { status: 'unavailable' } }); await d.executar(); await d.executar(); assert.equal(d.consultas, 2); assert.equal(d.capturas, 0); grupos++
  const e = ambiente({ resposta: { status: 'unsupported' } }); await e.executar(); await e.executar(); assert.equal(e.consultas, 1); assert.equal(e.capturas, 0); grupos++
  const f = ambiente(); f.falhaNativa = true; assert.equal(await f.executar(), null); f.falhaNativa = false; assert.ok(await f.executar()); assert.equal(f.consultas, 2); grupos++
  const g = ambiente(); g.valores.set('projeto-convite-instalacao-v1', '{malformado'); assert.equal(await g.executar(), null); assert.equal(g.capturas, 0); grupos++
  console.log(`Convites após instalação: ${grupos}/${grupos} grupos aprovados; Play Store e rede simuladas, sem atribuições reais.`)
})().catch(e => { console.error(e); process.exitCode = 1 })
