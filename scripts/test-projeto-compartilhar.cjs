const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict')
const { transformSync } = require('esbuild'), { webcrypto } = require('node:crypto')
const inicio = performance.now(), valores = new Map()
const storage = { getItem: k => valores.get(k) || null, setItem: (k, v) => valores.set(k, v), removeItem: k => valores.delete(k) }
let modo = 'nativo', copiado = '', visitas = 0, confirmacoes = 0, falhar = false, payload
const eventos = []
const helper = { exports: {} }
vm.runInNewContext(transformSync(fs.readFileSync('src/utils/conviteAplicativo.js', 'utf8'), { format: 'cjs' }).code, { module: helper, exports: helper.exports, URL })
const m = { exports: {} }
vm.runInNewContext(transformSync(fs.readFileSync('src/services/projetoCompartilhamentoService.js', 'utf8'), { format: 'cjs' }).code, {
  module: m, exports: m.exports, URL, crypto: webcrypto, localStorage: storage, Event, window: { dispatchEvent: e => eventos.push(e.type) }, navigator: { clipboard: { writeText: async s => { copiado = s } } }, require: n => {
    if (n.includes('conviteAplicativo')) return helper.exports
    if (n.includes('nativeShare')) return { openNativeShareSheet: async p => { payload = p; if (modo === 'cancelado') { const e = Error('Cancelado'); e.name = 'AbortError'; throw e } return modo === 'nativo' } }
    if (n.includes('bibliotecaLivrosService')) return {
      registrarVisitaConviteProjeto: async () => { visitas++; return { recibo: 'r'.repeat(48), expiraEm: Date.now() + 86400000 } },
      confirmarIndicacaoProjeto: async () => { confirmacoes++; if (falhar) throw Error('Confirme o e-mail'); return { contabilizada: true } },
    }
    throw Error(n)
  },
})
const api = m.exports
;(async () => {
  let grupos = 0
  const codigo = 'a'.repeat(32)
  assert.equal(api.linkConviteProjeto(codigo), `https://us-central1-biblia-dc.cloudfunctions.net/baixarBiblia?convite=${codigo}`)
  assert.equal(api.aparelhoProjeto(), api.aparelhoProjeto()); grupos++
  assert.equal(await api.compartilharProjeto(codigo), 'compartilhado')
  assert.ok(payload.text.includes('gratuito e sem propagandas'))
  assert.equal(confirmacoes, 0, 'Abrir compartilhamento não confirma uma indicação'); grupos++
  modo = 'cancelado'
  assert.equal(await api.compartilharProjeto(codigo), 'cancelado'); assert.equal(copiado, ''); assert.equal(confirmacoes, 0); grupos++
  modo = 'web'
  assert.equal(await api.compartilharProjeto(codigo), 'copiado')
  assert.ok(copiado.endsWith(api.linkConviteProjeto(codigo))); assert.equal(confirmacoes, 0); grupos++
  const conteudo = { title: 'Livraria Cristã', text: 'Conheça nosso catálogo.', url: 'https://us-central1-biblia-dc.cloudfunctions.net/baixarBiblia?tipo=secao&id=livraria&convite=' + 'b'.repeat(32) }
  await api.compartilharProjeto(codigo, conteudo)
  const destino = new URL(payload.url)
  assert.equal(destino.searchParams.get('id'), 'livraria'); assert.equal(destino.searchParams.get('convite'), codigo)
  assert.ok(copiado.includes(conteudo.title) && copiado.includes(conteudo.text)); grupos++
  assert.equal(api.linkConviteProjeto(codigo, { url: 'https://example.test/baixarBiblia' }), api.linkConviteProjeto(codigo))
  assert.equal(api.linkConviteProjeto(codigo, { url: 'https://us-central1-biblia-dc.cloudfunctions.net/outro' }), api.linkConviteProjeto(codigo)); grupos++
  const [a, b] = await Promise.all([api.capturarConviteProjeto(codigo), api.capturarConviteProjeto(codigo)])
  assert.equal(a.recibo, b.recibo); assert.equal(visitas, 1, 'StrictMode não duplica o registro')
  assert.equal(eventos.join(','), 'projeto-convite-pendente', 'Aplicar convite atualiza o acompanhamento na sessão atual')
  assert.equal((await api.capturarConviteProjeto('b'.repeat(32))).codigo, codigo, 'Primeiro convite não é substituído por um envio repetido'); grupos++
  falhar = true
  await assert.rejects(api.confirmarConvitePendenteProjeto())
  assert.ok(api.convitePendenteProjeto(), 'Convite permanece até confirmar o e-mail')
  falhar = false
  assert.equal((await api.confirmarConvitePendenteProjeto()).contabilizada, true)
  assert.equal(api.convitePendenteProjeto(), null)
  assert.equal(await api.confirmarConvitePendenteProjeto(), null); grupos++
  console.log(`Compartilhamento: ${grupos}/${grupos} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now() - inicio) / 1000).toFixed(2)} s. Compartilhamento nativo e rede simulados.`)
})().catch(e => { console.error(e); process.exitCode = 1 })
