const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const http = require('node:http')
const { spawn } = require('node:child_process')
const WebSocket = require('ws')
const { build } = require('esbuild')
process.env.GOMAXPROCS = '1'
process.env.GOMEMLIMIT = '512MiB'
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let server, browser, socket
async function main() {
  const bundle=await build({stdin:{contents:`
    import React from 'react';import {createRoot} from 'react-dom/client';
    import {ThemeProvider,createTheme} from '@mui/material';import {MemoryRouter} from 'react-router-dom';
    import Usuarios from './src/pages/AdminUsuarios';
    import Contadores from './src/components/AdminSectionViewCounts';
    const root=createRoot(document.getElementById('root'));let key=0;
    window.renderTest=(erro=false)=>{window.metricError=erro;root.render(<ThemeProvider theme={createTheme({typography:{fontSize:window.fontAdmin||14}})}><MemoryRouter key={++key}><div style={{padding:12,background:'#004d40',color:'white'}}><Contadores ehAdmin keys={['biblia']}/></div><Usuarios/></MemoryRouter></ThemeProvider>)};
    window.renderTest();`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,jsx:'automatic',tsconfigRaw:{},define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{}'},plugins:[{name:'fixture',setup(b){
      b.onResolve({filter:/FirebaseAuthContext|config\/firebase|^firebase\/(database|functions)$|utils\/uiDialogs/},a=>({path:a.path,namespace:'fixture'}));
      b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path.includes('FirebaseAuthContext')?'const user={uid:"admin"};export const useFirebaseAuth=()=>({user})':a.path.includes('uiDialogs')?'export const confirmarAsync=async()=>false;export const mostrarSnackbar=()=>{}':a.path==='firebase/database'?`
        export const ref=(_,p)=>p;export const get=async()=>({val:()=>true});export const onValue=(p,cb,fail)=>{if(window.metricError)fail(Error('permissão'));else cb({val:()=>p.includes('daily')?2:10});return ()=>{}};`:a.path==='firebase/functions'?`
        export const httpsCallable=(_,nome)=>async args=>{
          if(nome==='gerenciarUsuarioAdmin')throw Error('Ação destrutiva inesperada no teste');
          const users=[{uid:'admin',displayName:'Administrador',email:'admin@example.test',ehAdmin:true},
            {uid:'conta-com-identificador-longo-123456789',displayName:'Usuário com nome bastante comprido para verificar a leitura no celular',email:'email.muito.longo.para.testar.a.quebra.de.linha@example.test',profileHandle:'apelido-comprido',creationTime:'2026-11-01T15:00:00Z',ultimoAcesso:'2026-11-26T15:00:00Z',acessoNoDiaLastAt:1795705200000,provedorLabel:'Google (verificado pelo Google)'}];
          return {data:{users:nome==='listarAcessosDiariosAdmin'?[users[1]]:args.pageToken?[]:users,pageToken:null}}};`:'export const loadFirebaseModules=async()=>{};export const getFirebaseDatabase=()=>({});export const getFirebaseFunctions=()=>({});'}));
      b.onResolve({filter:/.*/},a=>{if(a.namespace==='fixture')return {path:require.resolve(a.path,{paths:[process.cwd()]})};const d=a.resolveDir||process.cwd();if(a.path.startsWith('.')){const target=path.resolve(d,a.path);for(const f of [target,target+'.jsx',target+'.js'])if(fs.existsSync(f)&&fs.statSync(f).isFile())return {path:f}}return {path:require.resolve(a.path,{paths:[d]})}})
    }}]});
  server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].contents:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="root"></div><script src="/app.js"></script>')})
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'salvation-compartilhar-'))
  browser=spawn(process.env.BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--in-process-gpu','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'})
  const portFile=path.join(profile,'DevToolsActivePort')
  for(let i=0;i<100&&!fs.existsSync(portFile);i++) await delay(200)
  assert.ok(fs.existsSync(portFile),'Chrome não iniciou')
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0]
  const tabs=await(await fetch(`http://127.0.0.1:${port}/json`)).json()
  socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl)
  await new Promise(resolve=>socket.once('open',resolve))
  let id=0;const pending=new Map()
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error(method+' timeout'))},15000)
    pending.set(n,m=>{clearTimeout(timer);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result)})
    socket.send(JSON.stringify({id:n,method,params}))
  })
  socket.on('message',raw=>{const m=JSON.parse(raw);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}})
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value}
  await call('Page.enable')
  await call('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true})
  await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}`})
  for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('article')`))break;await delay(150)}
  let cases=0;
  for(const width of [320,430,1024]) for(const font of [14,28]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:true});
    await evaluate('window.fontAdmin='+font+';window.renderTest()');await delay(300);
    assert.equal(await evaluate('document.querySelectorAll("article").length'),2);cases++;
    const geometry=await evaluate(`(()=>{const card=[...document.querySelectorAll('article')].find(e=>e.textContent.includes('conta-com-identificador'));const email=[...card.querySelectorAll('dd')].find(e=>e.textContent.includes('@example'));return {fits:document.documentElement.scrollWidth<=innerWidth+1,email:email.scrollWidth<=email.clientWidth+1,full:email.textContent.includes('email.muito.longo.para.testar'),table:!!document.querySelector('table')}})()`);
    assert.deepEqual(geometry,{fits:true,email:true,full:true,table:false});cases++;
    assert.ok(await evaluate('document.body.innerText.includes("Hoje: 2")&&document.body.innerText.includes("Total: 10")'));cases++;
    assert.equal(await evaluate('[...document.querySelectorAll("article")].find(e=>e.querySelector("h2").textContent==="Administrador").innerText.includes("Apagar conta")'),false);cases++;
    await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="Mostrar usuários do dia").click()');await delay(200);
    assert.equal(await evaluate('document.querySelectorAll("article").length'),1);cases++;
  }
  await evaluate('window.renderTest(true)');await delay(300);
  assert.ok(await evaluate('document.body.innerText.includes("Indisponível")&&document.body.innerText.includes("Falha ao consultar os acessos.")'));cases++;
  assert.ok(await evaluate('!document.body.innerText.includes("Hoje: 0")'));cases++;
  console.log('Interface administrativa: '+cases+'/'+cases+' verificações aprovadas no Chrome; Firebase e contas simulados.');
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{socket?.close();browser?.kill();server?.close()})
