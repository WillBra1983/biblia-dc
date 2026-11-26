const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const {build} = require('esbuild')
process.env.GOMAXPROCS='1'

async function main() {
  const bundle=await build({entryPoints:['src/utils/sectionViewKeys.js'],bundle:true,write:false,
    platform:'node',format:'cjs',tsconfigRaw:{},plugins:[{name:'firebase-teste',setup(b){
      b.onResolve({filter:/config\/firebase|^firebase\/(database|functions)$/},a=>({path:a.path,namespace:'mock'}))
      b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='firebase/database'
        ? `export const ref=(_,p)=>p;export const get=async p=>({val:()=>window.state.admins.has(p.split('/')[1])});`
        : a.path==='firebase/functions' ? `export const httpsCallable=()=>async dados=>{
            window.state.chamadas.push({uid:window.state.uid,...dados});
            if(window.state.falha)throw Error('offline');return {data:{ok:true}}};`
        : `export const loadFirebaseModules=async()=>{};export const getFirebaseDatabase=()=>({});
          export const getFirebaseFunctions=()=>({});export const getFirebaseAuth=()=>({currentUser:{uid:window.state.uid}});`}))
      b.onResolve({filter:/.*/},a=>({path:path.resolve(a.resolveDir||process.cwd(),a.path)}))
    }}]})
  const data={agora:Date.parse('2026-11-26T15:00:00Z')}
  class Relogio extends Date {constructor(...args){super(...(args.length?args:[data.agora]))}static now(){return data.agora}}
  const storage=new Map(),state={uid:'admin',admins:new Set(['admin']),chamadas:[],falha:false}
  const contexto={window:{state},module:{exports:{}},Date:Relogio,Intl,
    sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}}
  vm.runInNewContext(bundle.outputFiles[0].text,contexto)
  const api=contexto.module.exports
  let checks=0
  await api.registarVisualizacaoSecaoSeNecessario('biblia','admin')
  assert.equal(state.chamadas.length,0);checks++
  for(const uid of ['email-a','email-b']) {state.uid=uid;await api.registarVisualizacaoSecaoSeNecessario('biblia',uid)}
  assert.equal(state.chamadas.length,2);assert.equal(8+state.chamadas.length,10);checks++
  await api.registarVisualizacaoSecaoSeNecessario('biblia','email-b');assert.equal(state.chamadas.length,2);checks++
  await api.registarVisualizacaoSecaoSeNecessario('salmos','email-b');assert.equal(state.chamadas.length,3);checks++
  data.agora+=86400000
  await api.registarVisualizacaoSecaoSeNecessario('biblia','email-b');assert.equal(state.chamadas.length,4);checks++
  state.uid='nova';state.falha=true
  await api.registarVisualizacaoSecaoSeNecessario('biblia','nova')
  assert.equal(api.jaRegistouVisualizacaoNestaEntrada('biblia','nova'),false);checks++
  state.falha=false;await api.registarVisualizacaoSecaoSeNecessario('biblia','nova')
  assert.equal(api.jaRegistouVisualizacaoNestaEntrada('biblia','nova'),true);checks++
  state.uid='concorrente';const antes=state.chamadas.length
  await Promise.all(Array.from({length:5},()=>api.registarVisualizacaoSecaoSeNecessario('biblia','concorrente')))
  assert.equal(state.chamadas.length,antes+1);checks++
  state.uid='atual';await api.registarVisualizacaoSecaoSeNecessario('biblia','conta-antiga')
  assert.equal(state.chamadas.length,antes+1);checks++
  contexto.sessionStorage.setItem=()=>{throw Error('storage bloqueado')}
  state.uid='storage-bloqueado'
  await api.registarVisualizacaoSecaoSeNecessario('biblia',state.uid)
  const n=state.chamadas.length;await api.registarVisualizacaoSecaoSeNecessario('biblia',state.uid)
  assert.equal(state.chamadas.length,n);checks++
  assert.equal(api.pathnameParaSectionKey('/estudo-strong'),'estudo_strong');checks++

  const banco=new Map([['users/admin/admin',true]])
  const db={ref:p=>({get:async()=>({val:()=>banco.get(p)}),transaction:async fn=>{banco.set(p,fn(banco.get(p)));return {committed:true}}})}
  const server={exports:{},require:n=>n==='./firebaseAdmin'?{database:()=>db}:n==='firebase-functions/v2/https'
    ? {onCall:(_,f)=>f,HttpsError:class extends Error{}}:{logger:{info(){},error(){}}}}
  vm.runInNewContext(fs.readFileSync('functions/src/registrarVisualizacaoSecao.js','utf8'),server)
  const registrar=server.exports.registrarVisualizacaoSecao
  for(const uid of ['admin','email-a','email-b'])await registrar({auth:{uid},data:{sectionKey:'biblia'}})
  assert.equal(banco.get('adminMetrics/sectionViews/total/biblia'),2);checks++
  assert.equal([...banco.keys()].filter(k=>k.includes('userAccess/daily')).length,2);checks++
  await registrar({auth:{uid:'email-a'},data:{sectionKey:'estudo_strong'}})
  assert.equal(banco.get('adminMetrics/sectionViews/total/estudo_strong'),1);checks++
  await assert.rejects(registrar({auth:{uid:'email-a'},data:{sectionKey:'chave-invalida'}}));checks++
  await assert.rejects(registrar({auth:null,data:{sectionKey:'biblia'}}));checks++
  console.log(`Registros administrativos: ${checks}/${checks} cenários aprovados; Firebase e autenticação simulados.`)
}
main().catch(e=>{console.error(e);process.exitCode=1})
