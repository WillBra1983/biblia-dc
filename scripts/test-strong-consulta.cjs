const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const { build } = require('esbuild')
process.env.GOMAXPROCS = '1'

async function main() {
  const SQL = await require('sql.js')()
  const store = new Map()
  global.localStorage = { getItem: k => store.get(k), setItem: (k,v) => store.set(k,v),
    key: i => [...store.keys()][i], get length() { return store.size } }
  global.__sqlStrong = SQL
  const realFetch = global.fetch
  global.fetch = async url => {
    const file = path.join(process.cwd(), 'public', String(url).replace(/^\//, '').split('?')[0])
    return { ok: fs.existsSync(file), text: async () => fs.readFileSync(file,'utf8'),
      arrayBuffer: async () => { const b=fs.readFileSync(file);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) } }
  }
  const bundle = await build({ stdin: { contents: `
    export * from './src/services/lexiconPtBrService';
    export * from './src/utils/strongBusca';
    export * from './src/utils/strongResumoLocalCache';`, resolveDir: process.cwd() },
    bundle:true,write:false,platform:'node',format:'cjs',tsconfigRaw:{},define:{'import.meta.env':'{}'},
    plugins:[{name:'sql-local',setup(b){b.onResolve({filter:/^sql\.js$/},()=>({path:'sql',namespace:'fixture'}));
      b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export default async()=>globalThis.__sqlStrong'}))
      b.onResolve({filter:/.*/}, a => {
        const target = path.resolve(a.resolveDir || process.cwd(), a.path)
        for (const f of [target, target+'.js', target+'.jsx']) {
          if (fs.existsSync(f) && fs.statSync(f).isFile()) return {path:f}
        }
        return {path:require.resolve(a.path,{paths:[a.resolveDir || process.cwd()]})}
      })
    }}] })
  const module = { exports:{} };vm.runInThisContext(`(function(module,exports){${bundle.outputFiles[0].text}\n})`)(module,module.exports)
  const api=module.exports;let checks=0
  assert.deepEqual(api.codigosBuscaStrong('g0026'),['G26']);checks++
  assert.deepEqual(api.codigosBuscaStrong('26'),['H26','G26']);checks++
  assert.deepEqual(api.codigosBuscaStrong('26','H'),['H26']);checks++
  assert.equal(api.normalizarBuscaStrong('ἀγάπη'),api.normalizarBuscaStrong('αγαπη'));checks++
  for(const [q,idioma,code] of [['G0026','','G26'],['H1732','','H1732'],['26','G','G26']]) {
    const rows=await api.pesquisarLexiconStrong(q,idioma);assert.ok(rows.some(r=>r.code===code),q);checks++
  }
  for(const q of ['amor','Davi','logos']) {
    const rows=await api.pesquisarLexiconStrong(q);assert.ok(rows.length>0,q);assert.ok(rows.length<=40);checks++
  }
  const palavra=(await api.pesquisarLexiconStrong('G26'))[0].palavra
  assert.ok((await api.pesquisarLexiconStrong(palavra)).some(r=>r.code==='G26'));checks++
  assert.equal((await api.pesquisarLexiconStrong("' OR 1=1 --")).length,0);checks++
  assert.equal((await api.pesquisarLexiconStrong('%')).length,0);checks++
  api.salvarResumoLemmaLocalStrong('G26','Estudo do amor')
  api.salvarResumoTokenLocalStrong('G26@forma@43.3.16@m','Forma nesta passagem')
  api.salvarResumoTokenLocalStrong('G260@forma@43.3.16@m','Outro verbete')
  assert.equal(api.listarResumosStrongLocais().length,1);checks++
  assert.equal(api.listarTokensStrongLocais('G26').length,1);checks++
  assert.equal(api.lerResumoLemmaLocalStrong('g26'),'Estudo do amor');checks++
  global.fetch=realFetch
  console.log(`Consulta Strong: ${checks}/${checks} verificações aprovadas com o SQLite real do aplicativo.`)
}
main().catch(e=>{console.error(e);process.exitCode=1})
