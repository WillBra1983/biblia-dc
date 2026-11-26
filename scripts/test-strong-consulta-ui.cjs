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
    import {ThemeProvider,createTheme} from '@mui/material';
    import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
    import StrongConsulta from './src/pages/StrongConsulta';
    function Destino(){window.destinoStrong=useLocation().pathname;return <div>Estudo completo</div>}
    const root=createRoot(document.getElementById('root'));let key=0;
    window.renderStrong=()=>root.render(<ThemeProvider theme={createTheme()}><MemoryRouter key={++key} initialEntries={['/estudo-strong']}><Routes><Route path="/estudo-strong" element={<StrongConsulta/>}/><Route path="/estudo-strong/:code" element={<Destino/>}/></Routes></MemoryRouter></ThemeProvider>);
    window.renderStrong();`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,jsx:'automatic',tsconfigRaw:{},define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{}'},plugins:[{name:'fixture',setup(b){
      b.onResolve({filter:/FirebaseAuthContext|services\/lexiconPtBrService|services\/strongResumoShareService/},a=>({path:a.path,namespace:'fixture'}));
      b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path.includes('FirebaseAuthContext')?'export const useFirebaseAuth=()=>({user:window.__loggedOut?null:{uid:"teste"}})':a.path.includes('lexiconPtBrService')?`
        export const pesquisarLexiconStrong=async(q,idioma)=>{window.pesquisaStrong={q,idioma};return [{code:'G26',palavra:'ἀγάπη',transliteracao:'agape',descricao:'Amor'}]};`:`
        export const listarResumosStrongGerados=async({tokens=false}={})=>({itens:tokens?[{code:'G26',resumo:'Token explicado já salvo.',cacheKey:'G26@forma@43.3.16@m',refPassagem:'João 3:16'}]:[{code:'G26',resumo:'Lemma já gerado e compartilhado.'}],proximo:''});
        export const obterResumoStrongPublicadoPorCodigo=async code=>({resumo:'Lemma já gerado e compartilhado.'});` }));
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
  for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('h1')`))break;await delay(150)}
  let cases=0;
  for(const width of [320,430,1024]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:740,deviceScaleFactor:1,mobile:true});
    await evaluate('window.__loggedOut=false;window.renderStrong()');await delay(250);
    assert.ok(await evaluate('document.body.innerText.includes("Estudo disponível")'));cases++;
    await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("G26")).click()');await delay(250);
    assert.ok(await evaluate('document.querySelector("[role=dialog]").innerText.includes("Lemma já gerado")'));cases++;
    assert.ok(await evaluate('document.querySelector("[role=dialog]").innerText.includes("Token explicado já salvo")'));cases++;
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));cases++;
    await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="Fechar").click()');await delay(250);
    await evaluate(`(()=>{const input=document.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'amor');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);await delay(50);
    await evaluate('document.querySelector("form").requestSubmit()');await delay(250);
    assert.equal(await evaluate('window.pesquisaStrong.q'),'amor');cases++;
    assert.ok(await evaluate('document.body.innerText.includes("Resultados do dicionário")'));cases++;
    await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("agape")).click()');await delay(250);
    await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="Abrir estudo completo").click()');await delay(150);
    assert.equal(await evaluate('window.destinoStrong'),'/estudo-strong/G26');cases++;
  }
  await evaluate('window.__loggedOut=true;window.renderStrong()');await delay(250);
  assert.ok(await evaluate('document.body.innerText.includes("Entre na sua conta")'));cases++;
  console.log('Interface de consulta Strong: '+cases+'/'+cases+' verificações aprovadas no Chrome; rede e conta simuladas.');
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{socket?.close();browser?.kill();server?.close()})
