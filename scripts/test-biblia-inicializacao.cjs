const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict')
const { transformSync } = require('esbuild')
const inicio = performance.now()
function modulo(file, globals = {}, requireFn = () => ({})) {
  const m = { exports: {} }
  vm.runInNewContext(transformSync(fs.readFileSync(file, 'utf8'), { format: 'cjs', define: { 'import.meta.env': '{"BASE_URL":"/"}' } }).code,
    { module: m, exports: m.exports, require: requireFn, console, Uint8Array, setTimeout, clearTimeout, ...globals })
  return m.exports
}
function cache(mode, row) {
  return modulo('src/utils/sqliteAssetCache.js', { indexedDB: { open() {
    const req = {}
    if (mode === 'blocked') return req
    const agendar = mode === 'delayed' ? fn => setTimeout(fn, 1700) : queueMicrotask
    agendar(() => {
      req.result = { transaction(store, kind) {
        if (kind === 'readwrite') throw Error('Sem permissão de gravação')
        return { objectStore: () => ({ get() {
          const read = {}
          queueMicrotask(() => { read.result = row; read.onsuccess() })
          return read
        } }) }
      } }
      req.onsuccess()
    })
    return req
  } } })
}
;(async () => {
  let grupos = 0
  const bytes = new Uint8Array([1, 2, 3])
  let downloads = 0
  const fetcher = async () => { downloads++; return bytes }
  assert.equal(await cache('ok', { bytes }).obterSqliteAssetBytes('ara.sqlite', 'v1', fetcher), bytes)
  assert.equal(downloads, 0); grupos++
  assert.equal(await cache('ok').obterSqliteAssetBytes('ara.sqlite', 'v1', fetcher), bytes)
  assert.equal(downloads, 1); grupos++
  const espera = performance.now()
  assert.equal(await cache('blocked').obterSqliteAssetBytes('ara.sqlite', 'v1', fetcher), bytes)
  assert.ok(performance.now() - espera < 4000, 'Cache bloqueado prendeu a abertura')
  assert.equal(downloads, 2); grupos++
  assert.equal(await cache('delayed', { bytes }).obterSqliteAssetBytes('ara.sqlite', 'v1', async () => { throw Error('Sem rede') }), bytes)
  grupos++
  let resolverSql, resolverBytes, fetchIniciado = false, bancos = 0
  const sqlPendente = new Promise(resolve => { resolverSql = resolve })
  const bytesPendente = new Promise(resolve => { resolverBytes = resolve })
  const api = modulo('src/services/bibliaService.js', {}, name => {
    if (name === 'sql.js') return () => sqlPendente
    if (name.includes('bibliaCapituloRapido')) return { obterCapituloRapido: async () => null, preaquecerCapituloInicial: async () => null }
    if (name.includes('sqliteAssetCache')) return { obterSqliteAssetBytes: () => { fetchIniciado = true; return bytesPendente } }
    if (name.includes('bibliaVersoes')) return { versaoBiblicaPorId: () => ({ id: 'ara', arquivo: 'ara.sqlite', revisao: 'v1' }) }
    if (name.includes('bibliaVersionStore')) return { obterVersaoBiblica: () => 'ara' }
    return {}
  })
  const primeira = api.initDB(), segunda = api.initDB()
  assert.equal(fetchIniciado, true, 'Download aguardou o módulo SQLite')
  resolverBytes(bytes)
  resolverSql({ Database: class { constructor() { bancos++ } exec() { return [{ values: [[0, 'verse_number']] }] } run() {} } })
  assert.equal(await primeira, await segunda)
  assert.equal(bancos, 1, 'Pré-aquecimento duplicou a base')
  grupos++
  console.log(`Inicialização SQLite: ${grupos}/${grupos} cenários aprovados (100%); falhas: 0%; tempo: ${((performance.now()-inicio)/1000).toFixed(2)} s.`)
})().catch(e => { console.error(e); process.exitCode = 1 })
