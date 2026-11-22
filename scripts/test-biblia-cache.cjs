const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict')
const { transformSync } = require('esbuild')
const inicio = performance.now()
const compilar = p => transformSync(fs.readFileSync(p, 'utf8'), { format: 'cjs', define: { 'import.meta.env': '{"BASE_URL":"/"}' } }).code
function modulo(code, globals, resolver) {
  const m = { exports: {} }
  vm.runInNewContext(code, { module: m, exports: m.exports, require: resolver, console, ...globals })
  return m.exports
}
;(async () => {
  const SQL = await require('sql.js')()
  const catalogo = await import('../src/data/bibliaVersoes.js')
  const cacheCode = compilar('src/services/bibliaCapituloRapido.js'), serviceCode = compilar('src/services/bibliaService.js')
  let grupos = 0
  for (const versao of catalogo.VERSOES_BIBLICAS) {
    const dados = new Map([['ultimaLeitura', JSON.stringify({ livroId: 23, capitulo: 43 })]])
    const storage = { getItem: k => dados.get(k) || null, setItem: (k,v) => dados.set(k,v) }
    const store = { obterVersaoBiblica: () => versao.id }
    const cache = modulo(cacheCode, { localStorage: storage, URLSearchParams, window: { location: { search: '' } } }, n => n.includes('bibliaVersoes') ? catalogo : store)
    let bancos = 0
    const criar = bloquear => modulo(serviceCode, { localStorage: storage }, n => {
      if (n === 'sql.js') return async () => { bancos++; if (bloquear) throw Error('SQLite não deveria abrir neste cenário'); return SQL }
      if (n.includes('bibliaCapituloRapido')) return cache
      if (n.includes('bibliaVersoes')) return catalogo
      if (n.includes('bibliaVersionStore')) return store
      if (n.includes('sqliteAssetCache')) return { obterSqliteAssetBytes: async arquivo => new Uint8Array(fs.readFileSync('public/' + arquivo)) }
      return {}
    })
    const frio = criar(false)
    const versos = await frio.buscarCapitulo(23, 43), titulos = await frio.buscarPericopes(23, 43)
    assert.ok(versos.length > 0)
    assert.equal(bancos, 1)
    const salvo = await cache.preaquecerCapituloInicial()
    assert.deepEqual(JSON.parse(JSON.stringify(salvo.versiculos)), JSON.parse(JSON.stringify(versos)))
    assert.deepEqual(JSON.parse(JSON.stringify(salvo.pericopes)), JSON.parse(JSON.stringify(titulos)))
    const aquecido = criar(true)
    const contadorAntes = bancos
    assert.deepEqual(JSON.parse(JSON.stringify(await aquecido.buscarCapitulo(23, 43))), JSON.parse(JSON.stringify(versos)))
    assert.deepEqual(JSON.parse(JSON.stringify(await aquecido.buscarPericopes(23, 43))), JSON.parse(JSON.stringify(titulos)))
    assert.equal(bancos, contadorAntes, 'Último capítulo aguardou SQLite')
    const snapshot = dados.get('salvation:ultimo-capitulo:v1')
    await frio.buscarCapitulo(23, 44); await frio.buscarPericopes(23, 44)
    assert.equal(dados.get('salvation:ultimo-capitulo:v1'), snapshot, 'Prefetch substituiu o último capítulo lido')
    dados.set('ultimaLeitura', JSON.stringify({livroId:23,capitulo:44}))
    await frio.buscarPericopes(23,44)
    assert.equal(JSON.parse(dados.get('salvation:ultimo-capitulo:v1')).capitulo,44,'Capítulo já pré-carregado não atualizou o cache de leitura')
    dados.set('salvation:ultimo-capitulo:v1',snapshot)
    assert.equal(await cache.obterCapituloRapido({ ...versao, revisao: 'outra' }, 23, 43), null)
    assert.equal(await cache.obterCapituloRapido(versao, 23, 44), null)
    dados.set('salvation:ultimo-capitulo:v1', '{invalido')
    assert.equal(await cache.preaquecerCapituloInicial(), null)
    console.log(`OK ${versao.sigla}: conteúdo e títulos idênticos ao banco; cache: ${Buffer.byteLength(snapshot)} bytes; leitura aquecida sem abrir SQLite.`)
    grupos++
  }
  assert.equal(fs.existsSync('public/bible-chapters'), false, 'Acervo duplicado ainda integra o pacote')
  console.log(`Cache da Bíblia: ${grupos}/${grupos} traduções aprovadas (100%); divergências: 0%; tempo: ${((performance.now()-inicio)/1000).toFixed(2)} s.`)
})().catch(e => { console.error(e); process.exitCode = 1 })
