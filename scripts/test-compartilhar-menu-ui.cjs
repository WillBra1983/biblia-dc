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
  const bundle = await build({
    stdin: { contents: `
      import React from 'react'; import { createRoot } from 'react-dom/client';
      import { ThemeProvider, createTheme } from '@mui/material';
      import criarTema from './src/theme/theme';
      import { MemoryRouter, useNavigate } from 'react-router-dom';
      import Compartilhar from './src/components/CompartilharProjetoDialog';
      import Card from './src/components/MenuAcessoCard';
      import SharePage from './src/components/SharePageButton';
      import { useCompartilhamentoPagina } from './src/hooks/useCompartilhamentoPagina';
      function Pagina() {
        const [numero, selecionar] = React.useState(1); window.selecionarHino = selecionar; window.navegarTeste = useNavigate();
        useCompartilhamentoPagina({pathname:'/hinario/letra',title:'Hino '+numero,text:'Louvor '+numero,url:'https://example.test/hino/'+numero});
        return <SharePage />;
      }
      const root = createRoot(document.getElementById('root'));
      window.renderPagina = () => root.render(<ThemeProvider theme={criarTema('light')}><MemoryRouter key="pagina" initialEntries={['/hinario/letra']}><Pagina /></MemoryRouter></ThemeProvider>);
      window.renderTest = (menu=false, dark=false) => root.render(<ThemeProvider theme={criarTema(dark?'dark':'light')}><MemoryRouter>
        {menu ? <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,padding:10,background:'#004d40'}}>{[
          {text:'Bíblia',path:'/biblia'}, {text:'Plano de leitura',path:'/plano-leitura-biblia'},
          {text:'Estudos Compartilhados',path:'/estudos-biblicos'}, {text:'Conteúdos teológicos',path:'/mais-de-deus'}
        ].map(item => <Card key={item.path} item={item} onNavigate={()=>{}} escuro={dark} />)}</div> : <Compartilhar aberto onClose={()=>{}} />}
      </MemoryRouter></ThemeProvider>); window.renderTest();`, resolveDir: process.cwd(), loader: 'jsx' },
    bundle: true, write: false, jsx: 'automatic', absWorkingDir: process.cwd(), tsconfigRaw: {}, define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
    plugins: [{ name: 'simular-rede', setup(b) {
      b.onResolve({ filter: /FirebaseAuthContext|projetoCompartilhamentoService|AdminSectionViewCounts|sectionViewKeys|bibliaEstudosService|MenuOpcoesCompartilhar/ }, a => ({path:a.path,namespace:'fixture'}))
      b.onLoad({ filter: /.*/, namespace:'fixture' }, a => ({contents: a.path.includes('MenuOpcoesCompartilhar') ? 'import React from "react"; export default p=>p.open?React.createElement("div",{id:"menu-pagina", "data-url":p.url},p.title):null' : a.path.includes('bibliaEstudosService') ? 'export const buildAppShareLink=(path,search)=>"https://foundcine.com/biblia"+path+search' : a.path.includes('FirebaseAuthContext') ? 'export const useFirebaseAuth=()=>({user:{uid:"teste"}})' : a.path.includes('AdminSectionViewCounts') ? 'export default ()=>null' : a.path.includes('sectionViewKeys') ? 'export const chavesMetricaParaPathMenu=()=>[]' : `
        export const carregarCampanhaProjeto=async()=>({codigo:'a'.repeat(32),meta:window.__campaignMeta||10,total:window.__campaignTotal??9,creditos:window.__campaignCredits||0,beneficios:[],livros:[]});
        export const compartilharProjeto=async()=> window.__shareResult || 'compartilhado'; export const linkConviteProjeto=()=> 'https://example.test/baixar';
        export const mensagemConviteProjeto=()=> 'Bíblia do Discípulo Cristão\\nGratuito e sem propagandas\\nhttps://example.test/baixar';
        export const resgatarLivroProjeto=async()=>({});` }))
      // O resolvedor Node evita buscas nativas em diretórios externos ao projeto.
      b.onResolve({ filter: /.*/ }, a => {
        if (a.namespace === 'fixture') return {path:require.resolve(a.path,{paths:[process.cwd()]})}
        const directory = a.resolveDir || process.cwd()
        if (a.path.startsWith('.')) {
          const target = path.resolve(directory, a.path)
          for (const candidate of [target, target+'.jsx', target+'.js', path.join(target,'index.js')]) {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return {path:candidate}
          }
        }
        return {path:require.resolve(a.path,{paths:[directory]})}
      })
    }}],
  })
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
  for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('[aria-label="Como funciona a recompensa de leitura"]')`))break;await delay(150)}
  let cases=0
  for(const width of [320,375,430,768]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:true})
    await delay(200)
    const geometry=await evaluate(`(()=>{const title=document.querySelector('#compartilhar-projeto-titulo > span');const close=document.querySelector('[aria-label="Fechar compartilhamento"]');const range=document.createRange();range.selectNodeContents(title);const text=range.getBoundingClientRect();return {single:range.getClientRects().length===1,fits:title.scrollWidth<=title.clientWidth+1,separate:text.right<=close.getBoundingClientRect().left,overflow:document.querySelector('.MuiDialogContent-root').scrollWidth>document.querySelector('.MuiDialogContent-root').clientWidth}})()`)
    if (!geometry.fits || !geometry.separate) console.log(await evaluate(`(()=>{const e=document.querySelector('#compartilhar-projeto-titulo > span');return {style:e.style.cssText,font:getComputedStyle(e).font,width:e.clientWidth,scroll:e.scrollWidth,box:e.getBoundingClientRect().toJSON(),close:document.querySelector('[aria-label="Fechar compartilhamento"]').getBoundingClientRect().toJSON()}})()`))
    assert.deepEqual(geometry,{single:true,fits:true,separate:true,overflow:false},'Título/diálogo em '+width+'px');cases++
  }
  assert.equal(await evaluate(`document.getElementById('informacoes-recompensa-leitura')`),null)
  await evaluate(`document.querySelector('[aria-label="Como funciona a recompensa de leitura"]').click()`)
  await delay(400)
  assert.equal(await evaluate(`document.querySelector('[aria-label="Como funciona a recompensa de leitura"]').getAttribute('aria-expanded')`),'true')
  assert.ok(await evaluate(`document.getElementById('recompensa-leitura-titulo').closest('[role="dialog"]')?.innerText.includes('A cada 10 indicações confirmadas')`))
  await evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent==='Entendi').click()`)
  await delay(300);cases++
  assert.ok(await evaluate(`document.body.innerText.includes('9/10') && document.body.innerText.includes('Já compartilhou o evangelho com alguém hoje?') && !document.body.innerText.includes('Tenho um convite')`))
  assert.ok(await evaluate(`document.querySelector('blockquote').compareDocumentPosition(document.querySelector('.MuiLinearProgress-root')) & Node.DOCUMENT_POSITION_PRECEDING`));cases++
  const SQL=await require('sql.js')(),db=new SQL.Database(fs.readFileSync('public/ara.sqlite'))
  const versiculo=db.exec('SELECT text FROM verse WHERE book_id=55 AND chapter=4 ORDER BY id LIMIT 1 OFFSET 1')[0].values[0][0].replace(/^[²\s]+/,'')
  db.close()
  assert.equal((await evaluate(`document.querySelector('blockquote p').textContent`)).slice(1,-1).toLocaleLowerCase('pt-BR'),versiculo.toLocaleLowerCase('pt-BR'))
  assert.ok(await evaluate(`(()=>{const pergunta=[...document.querySelectorAll('p')].find(e=>e.textContent==='Já compartilhou o evangelho com alguém hoje?');return pergunta===pergunta.parentElement.firstElementChild&&!pergunta.querySelector('svg')})()`));cases++
  await evaluate(`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(window.__clipboardFail)throw Error('Falhou');window.__copied=text}}})`)
  const click=label=>evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent===${JSON.stringify(label)}).click()`)
  await click('Copiar convite');await delay(300)
  assert.ok(await evaluate(`window.__copied.includes('Bíblia do Discípulo Cristão')&&window.__copied.includes('https://example.test/baixar')`))
  assert.ok(await evaluate(`document.getElementById('agradecimento-compartilhar-titulo').closest('[role="dialog"]').innerText.includes('Convite copiado!')`))
  await click('Continuar');await delay(300);cases++
  await click('Compartilhar a Bíblia');await delay(300)
  assert.ok(await evaluate(`!!document.getElementById('agradecimento-compartilhar-titulo')`))
  await click('Continuar');await delay(300);cases++
  await evaluate(`window.__shareResult='cancelado'`)
  await click('Compartilhar a Bíblia');await delay(300)
  assert.equal(await evaluate(`document.getElementById('agradecimento-compartilhar-titulo')`),null);cases++
  await evaluate(`window.__clipboardFail=true`)
  await click('Copiar convite');await delay(300)
  assert.equal(await evaluate(`document.getElementById('agradecimento-compartilhar-titulo')`),null)
  assert.ok(await evaluate(`document.body.innerText.includes('Selecione e copie o link abaixo.')`));cases++
  await evaluate(`window.renderTest(true)`);await delay(200)
  await evaluate(`window.__campaignMeta=5;window.__campaignTotal=0;window.__campaignCredits=1;window.renderTest(false)`);await delay(400)
  assert.ok(await evaluate(`document.body.innerText.includes('0/10')&&!document.body.innerText.includes('0/5')&&!document.body.innerText.includes('benefício disponível!')&&!document.body.innerText.includes('Liberar sete dias de leitura')`));cases++
  for(const dark of [false,true]) {
    await evaluate(`window.renderTest(true,${dark})`)
    await call('Emulation.setDeviceMetricsOverride',{width:320,height:850,deviceScaleFactor:1,mobile:true})
    await delay(250)
    const cards=await evaluate(`(()=>{const names=[...document.querySelectorAll('.MuiCardActionArea-root > div:nth-of-type(2) > span:first-child')];return {sizes:names.map(n=>parseFloat(getComputedStyle(n).fontSize)),colors:names.map(n=>getComputedStyle(n).color),fits:names.every(n=>n.scrollWidth<=n.clientWidth+1),overflow:document.documentElement.scrollWidth>innerWidth}})()`)
    assert.equal(cards.sizes.length,4);assert.ok(cards.sizes.every(s=>s>=18));assert.equal(new Set(cards.colors).size,4);assert.equal(cards.fits,true);assert.equal(cards.overflow,false);cases++
  }
  await evaluate(`window.renderPagina()`);await delay(250)
  await evaluate(`document.querySelector('[aria-label="compartilhar página"]').click()`);await delay(100)
  assert.equal(await evaluate(`document.getElementById('menu-pagina').textContent`),'Hino 1')
  await evaluate(`window.selecionarHino(2)`);await delay(100)
  await evaluate(`document.querySelector('[aria-label="compartilhar página"]').click()`);await delay(100)
  assert.equal(await evaluate(`document.getElementById('menu-pagina').dataset.url`),'https://example.test/hino/2');cases++
  await evaluate(`window.navegarTeste('/biblioteca')`);await delay(150)
  assert.equal(await evaluate(`document.getElementById('menu-pagina')`),null)
  await evaluate(`document.querySelector('[aria-label="compartilhar página"]').click()`);await delay(100)
  assert.ok(await evaluate(`!document.getElementById('menu-pagina').textContent.includes('Hino') && document.getElementById('menu-pagina').dataset.url.includes('/biblioteca')`));cases++
  console.log(`Interface de compartilhamento e menu: ${cases}/${cases} verificações aprovadas no Chrome; rede e conta simuladas.`)
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{socket?.close();browser?.kill();server?.close()})
