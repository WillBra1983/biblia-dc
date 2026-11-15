import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import http from 'node:http'
import {execFile} from 'node:child_process'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
const start=performance.now(), dir=path.resolve('.cache/menu-review')
fs.mkdirSync(dir,{recursive:true})
const stubs={
 'contexts/FirebaseAuthContext':"const user={uid:'tester'};export const useFirebaseAuth=()=>({user})",
 'contexts/AppContext':"export const useApp=()=>({fontSize:18,fontFamily:'serif',lineHeight:1.6})",
 'hooks/useEhAdmin':"export const useEhAdmin=()=>({ehAdmin:false,carregando:false})",
 'services/bibliaService':"export const buscarIntervaloVersiculosNaVersao=async(v)=>({versiculos:[{numero:1,texto:v,livro:'Gênesis',capitulo:1}]})",
 'services/bibliaPassagemEstudoIaService':"export const iaGeminiDisponivel=()=>true;const pass=v=>({ok:true,referencia:'Gn 1:1-2',referenciaCompacta:'Gn 1:1',texto:'Texto '+v,textoCitacao:'Texto '+v,titulo:'Criação',meta:{versaoBiblica:v}});export const montarPassagemLida=async(l,c,vs,v)=>pass(v);export const montarPericopeLida=async(l,c,i,f,t,v)=>pass(v);const gerar=async o=>{window.geracoes.push(o.versaoBiblica);window.pedidos.push(o);return {ok:true,text:'Explicação na tradução '+o.versaoBiblica.toUpperCase(),origemEstudo:o.estudoBase||null,geradoEm:Date.now()}};export const gerarComentarioVersiculo=gerar;export const gerarEstudoPericopeCompleto=gerar;export const formatarReferenciaCompactaPassagem=()=> 'Gn 1:1';export const formatarReferenciaCompactaPericope=()=> 'Gn 1:1-2';export const limparVazamentoRaciocinioIa=t=>t;",
 'config/firebase':"export const loadFirebaseModules=async()=>{};export const getFirebaseDatabase=()=>({})",
 'firebase/database':"export const ref=(_,p)=>p;export const get=async p=>{if(window.falharConsulta)throw Error('Offline');const value=window.registros[p];return {exists:()=>value!=null,val:()=>value}};export const set=async(p,v)=>{window.registros[p]=v};export const remove=async p=>{delete window.registros[p]};",
 'services/bibliaEstudosService':"export const buildAppShareLink=p=>p",
 'components/TextoComReferencias':"export default function Texto({texto}){return <span>{texto}</span>}",
 'components/CompartilharMenu':"export default function Compartilhar(){return null}",
 'components/VersiculoPopup':"export default function Popup(){return null}"
}
const fixture=fs.readFileSync('scripts/fixtures/estudo-traducoes.jsx','utf8')
fs.writeFileSync(dir+'/estudo-ui.jsx',fixture)
await build({entryPoints:[dir+'/estudo-ui.jsx'],outfile:dir+'/estudo-ui.js',bundle:true,platform:'browser',format:'iife',jsx:'automatic',define:{'import.meta.env':'{}','process.env.NODE_ENV':'"development"'},logLevel:'silent',plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/./},a=>{const key=Object.keys(stubs).find(k=>a.path.endsWith(k) || a.path.endsWith('/'+k.split('/').at(-1)));if(key)return {path:key,namespace:'fixture'};if(a.path.startsWith('@mui/icons-material/'))return {path:path.resolve('node_modules/@mui/icons-material/esm',a.path.split('/').at(-1)+'.js')}});b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:stubs[a.path],loader:'jsx',resolveDir:process.cwd()}))}}]})
const js=fs.readFileSync(dir+'/estudo-ui.js');const html='<!doctype html><meta charset="utf-8"><div id="app"></div><pre id="results"></pre><script src="/ui.js"></script>'
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/ui.js'?'application/javascript':'text/html');res.end(req.url==='/ui.js'?js:html)});await new Promise(r=>server.listen(0,'127.0.0.1',r))
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'estudo-traducoes-'))
try{const stdout=await new Promise((resolve,reject)=>execFile('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-background-networking','--user-data-dir='+profile,'--virtual-time-budget=45000','--dump-dom','http://127.0.0.1:'+server.address().port],{windowsHide:true,timeout:45000,maxBuffer:8e6},(e,out)=>e?reject(e):resolve(out)));fs.writeFileSync(dir+'/estudo-ui-result.html',stdout);const raw=stdout.match(/<pre id="results">(.*?)<\/pre>/s)?.[1];assert.ok(raw,'Resultado da interface ausente');const result=JSON.parse(raw.replaceAll('&quot;','"').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>'));console.log(result);assert.ok(result.length>10&&!result.some(x=>typeof x==='object'),'Falha de interface');console.log(result.length+'/'+result.length+' verificações aprovadas (100%); falhas: 0%; tempo: '+((performance.now()-start)/1000).toFixed(2)+' s.')}finally{server.close()}
