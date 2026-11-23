const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const http = require('node:http')
const { spawn } = require('node:child_process')
const { build, transformSync } = require('esbuild')
const WebSocket = require('ws')
process.env.GOMAXPROCS = '1'
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let server, browser, socket
async function main() {
  const nav = { exports: {} }
  require('node:vm').runInNewContext(transformSync(fs.readFileSync('src/utils/navegacaoVoltar.js','utf8'),{format:'cjs'}).code, {module:nav,exports:nav.exports,URLSearchParams})
  const { destinoVoltarApp, caminhoSemTelaCheia } = nav.exports
  let cases = 0
  for (const [from, search, to] of [
    ['/plano-leitura-biblia','','/'],
    ['/discipulado/3/2','','/discipulado?modulo=3'], ['/discipulado/3','','/discipulado?modulo=3'],
    ['/discipulado','?modulo=3','/discipulado'], ['/devocional/12','','/devocional'],
    ['/biblioteca/pessoal/livro','','/biblioteca'], ['/biblioteca/livro/ler','','/biblioteca/livro'],
    ['/biblioteca/livro/amostra','','/biblioteca/livro'], ['/biblioteca/livro','','/biblioteca'],
    ['/estudo-strong/G123/resumo','','/estudo-strong/G123'], ['/estudo-strong/G123/ocorrencias','','/estudo-strong/G123'],
    ['/estudo-strong/G123','','/'], ['/estudos-biblicos/ia-pericope','','/biblioteca-estudos'],
    ['/estudos-biblicos/123/edit','','/estudos-biblicos/123'], ['/estudos-biblicos/123','','/estudos-biblicos'],
    ['/configuracoes/notificacoes','','/configuracoes'], ['/hinario-editor','','/hinario/outras-cancoes'],
  ]) { assert.equal(destinoVoltarApp(from,search).to,to);cases++ }
  // Inventário da árvore de rotas: toda seção tem saída, mesmo sem histórico.
  const routes=[...fs.readFileSync('src/App.jsx','utf8').matchAll(/<Route\s+path="([^"]+)"/g)].map(m=>'/'+m[1].replace(/^\//,'')).filter(p=>p!=='/'&&p!=='/biblia')
  for (const route of routes) assert.ok(destinoVoltarApp(route), 'Rota sem retorno: '+route)
  assert.equal(destinoVoltarApp('/'),null);cases++
  assert.equal(caminhoSemTelaCheia({pathname:'/hinario/letra',search:'?hino=42&telaCheia=1&versao=ara',hash:'#estrofe-2'}),'/hinario/letra?hino=42&versao=ara#estrofe-2');cases++
  const mocks = {
    MenuCards: 'import React from "react";export default()=>React.createElement("div",null,"Opções do menu")',
    AvisosPedidosPix: 'export default p=>p.children',
    FirebaseAuthContext: 'export const useFirebaseAuth=()=>({user:null})',
    AppContext: 'export const useApp=()=>({fontSize:window.__font||100,setFontSize:v=>window.setFonteTeste(v),lineHeight:1.6,textAlign:"left",fontFamily:"system",setBackButtonHandler:()=>{}})',
    ZoomResetContext: 'export const useZoomReset=()=>({version:0})',
    LeituraConfigButton: 'export default()=>null', SharePageButton: 'export default()=>null',
    sectionViewKeys: 'export const pathnameParaSectionKey=()=>null;export const registarVisualizacaoSecaoSeNecessario=()=>{}',
    appIconBadge: 'export const setAppIconBadgeCount=async()=>{}',
    posSplash: 'export const aguardarPosSplash=()=>()=>{}',
    menuMaisVistos: 'export const registrarNavegacaoMaisVistos=()=>{}',
    'config/firebase': 'export const isFirebaseConfigured=()=>false;export const loadFirebaseModules=async()=>{}',
    'services/chatService': 'export const subscribeUserChatList=()=>()=>{}',
    hinarioCifrasService: 'export const hinarioCifrasService=new Proxy({},{get:()=>async()=>({numero:1,titulo:"Hino com título longo para conferir os controles",conteudo:"Texto"})})',
    hinarioService: 'const h={numero:1,titulo:"Hino com título longo para conferir os controles",conteudo:"Estrofe do hino.\\n".repeat(200)};export const hinarioService={buscarTodos:async()=>[h],buscarPorTexto:async()=>[h],buscarHino:async()=>h}',
    HinarioCifrasDiretas: 'export default()=>null',
    useCompartilhamentoPagina: 'export const useCompartilhamentoPagina=()=>{}',
    compartilhamentoConteudo: 'export const linkCompartilhamentoConteudo=()=>"https://example.test"',
    '@capacitor/core': 'export const Capacitor={getPlatform:()=>"ios",isNativePlatform:()=>true};export const registerPlugin=()=>({setEnabled:async()=>{}})',
  }
  const chatSource = fs.readFileSync('src/pages/Chat.jsx','utf8')
  const chatDialog = flag => {
    const start = chatSource.indexOf('<Dialog\n        open={' + flag + '}')
    assert.ok(start >= 0, 'Janela do chat não encontrada: ' + flag)
    return chatSource.slice(start,chatSource.indexOf('</Dialog>',start)+'</Dialog>'.length)
  }
  mocks['fixture-chat-gates'] = `import React from 'react';import {useNavigate} from 'react-router-dom';import {Dialog,DialogTitle,DialogContent,DialogActions,Button,Typography,Stack,TextField} from '@mui/material';export default function Gates(){const navigate=useNavigate();const legacyAnonymousBlocked=window.gateCase==='anonymous';const mustCompletePublicHandle=window.gateCase==='handle';const busy=true;const logout=async()=>{};const savePublicHandle=()=>{};const[profileHandleInput,setProfileHandleInput]=React.useState('');return <>${chatDialog('legacyAnonymousBlocked')}${chatDialog('mustCompletePublicHandle')}</>}`
  const bundle = await build({
    stdin: { contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';
      import {createMemoryRouter,RouterProvider,useLocation,Outlet} from 'react-router-dom';
      import {ThemeProvider,CssBaseline,Box,Dialog,DialogTitle,IconButton} from '@mui/material';
      import theme from './src/theme/theme';import Layout from './src/components/Layout';import Hinario from './src/pages/Hinario';
      import Gates from 'fixture-chat-gates';
      function Shell(){const loc=useLocation();const[font,setFont]=React.useState(100);window.__font=font;window.setFonteTeste=setFont;
        const[dialog,setDialog]=React.useState(false);window.abrirDialogTeste=()=>setDialog(true);window.__rota=loc.pathname+loc.search;
        const full=new URLSearchParams(loc.search).get('telaCheia')==='1';
        return <Layout>{loc.pathname==='/hinario/letra'?<Hinario/>:loc.pathname==='/chat'?<Gates/>:<Box data-pagina-teste sx={{width:'100%',...(loc.pathname.startsWith('/biblioteca')&&full?{position:'fixed',inset:0,zIndex:1200}:{} )}}>Conteúdo da seção</Box>}
        <Dialog fullScreen open={dialog} onClose={()=>setDialog(false)}><DialogTitle><IconButton aria-label="Fechar janela de teste" onClick={()=>setDialog(false)}>X</IconButton>Janela ampliada</DialogTitle><Box sx={{overflow:'auto',flex:1}}><div style={{height:2000}}>Texto</div></Box></Dialog>
        </Layout>}
      window.routerTeste=createMemoryRouter([{path:'*',element:<Shell/>}],{initialEntries:['/discipulado/3/2']});
      createRoot(document.getElementById('root')).render(<ThemeProvider theme={theme('light')}><CssBaseline/><RouterProvider router={window.routerTeste}/></ThemeProvider>);
    `, resolveDir:process.cwd(),loader:'jsx'},
    bundle:true,write:false,jsx:'automatic',absWorkingDir:process.cwd(),tsconfigRaw:{},define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{}'},
    plugins:[{name:'fontes-simuladas',setup(b){
      b.onResolve({filter:/.*/},a=>{
        if(a.namespace==='fixture')return{path:require.resolve(a.path,{paths:[process.cwd()]})}
        const key=Object.keys(mocks).find(key=>a.path===key||a.path.endsWith('/'+key))
        if(key)return{path:key,namespace:'fixture'}
        const dir=a.resolveDir||process.cwd()
        if(a.path.startsWith('.')){const p=path.resolve(dir,a.path);for(const x of [p,p+'.jsx',p+'.js'])if(fs.existsSync(x)&&fs.statSync(x).isFile())return{path:x}}
        return{path:require.resolve(a.path,{paths:[dir]})}
      })
      b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path],loader:'jsx'}))
    }}],
  })
  // Chrome não tem Dynamic Island: substituir apenas as medidas de env(), sem simular WebKit.
  const script=bundle.outputFiles[0].text.replace(/env\((safe-area-inset-(?:top|bottom|left|right))(?:,\s*0px)?\)/g,'var(--teste-$1, 0px)')
  server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?script:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{height:100%;margin:0;overflow:hidden}:root{--teste-safe-area-inset-top:59px;--teste-safe-area-inset-bottom:34px;--teste-safe-area-inset-left:0px;--teste-safe-area-inset-right:0px}</style><div id="root"></div><script src="/app.js"></script>`)})
  await new Promise(r=>server.listen(0,'127.0.0.1',r))
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'salvation-ios-nav-'))
  browser=spawn(process.env.BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--in-process-gpu','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'})
  const portFile=path.join(profile,'DevToolsActivePort')
  for(let i=0;i<100&&!fs.existsSync(portFile);i++)await delay(200)
  assert.ok(fs.existsSync(portFile),'Chrome não iniciou')
  const tabs=await(await fetch('http://127.0.0.1:'+fs.readFileSync(portFile,'utf8').split('\n')[0]+'/json')).json()
  socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.once('open',r))
  let id=0;const pending=new Map(),errors=[]
  const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error(method+' timeout'))},20000);pending.set(n,m=>{clearTimeout(timer);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result)});socket.send(JSON.stringify({id:n,method,params}))})
  socket.on('message',raw=>{const m=JSON.parse(raw);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails)})
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value}
  const waitFor=async expr=>{for(let i=0;i<100;i++){if(await evaluate(expr))return;await delay(80)}throw Error('Não apareceu: '+expr+' '+JSON.stringify(errors))}
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const route=async url=>{await evaluate(`window.routerTeste.navigate(${JSON.stringify(url)})`);await delay(100)}
  await call('Page.enable');await call('Runtime.enable')
  await call('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true})
  await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port})
  await waitFor(`!!document.querySelector('[aria-label="Voltar às lições do módulo"]')`)
  const accessible=async(selector,{top=59,bottom=34,left=0,right=0}={})=>{
    const box=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});const b=el.getBoundingClientRect();const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {top:b.top,bottom:b.bottom,left:b.left,right:b.right,width:b.width,height:b.height,hit:el===hit||el.contains(hit)}})()`)
    assert.ok(box.top>=top-1&&box.bottom<= (await evaluate('innerHeight'))-bottom+1&&box.left>=left-1&&box.right<=(await evaluate('innerWidth'))-right+1&&box.hit,selector+' '+JSON.stringify(box));cases++
  }
  await accessible('[aria-label="Voltar às lições do módulo"]')
  await click('[aria-label="Voltar às lições do módulo"]');await waitFor(`window.__rota==='/discipulado?modulo=3'`)
  await click('[aria-label="Voltar aos módulos"]');await waitFor(`window.__rota==='/discipulado'`)
  await click('[aria-label="Voltar ao menu principal"]');await delay(260)
  await accessible('[aria-label="Fechar menu principal e voltar à leitura"]')
  await click('[aria-label="Fechar menu principal e voltar à leitura"]');cases++
  for(const url of ['/perfil','/configuracoes','/quiz-retiro','/confissao','/catecismo-maior','/biblioteca','/devocional','/estudos-biblicos']){
    await route(url);await accessible('[aria-label="Voltar ao menu principal"]')
    assert.ok(await evaluate(`parseFloat(getComputedStyle(document.querySelector('main')).paddingTop)>=115`),'Conteúdo sob AppBar '+url)
  }
  for(const [width,height,top,bottom,left,right] of [[393,852,59,34,0,0],[375,667,20,0,0,0],[852,393,0,21,59,59]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true})
    await evaluate(`Object.entries({top:${top},bottom:${bottom},left:${left},right:${right}}).forEach(([k,v])=>document.documentElement.style.setProperty('--teste-safe-area-inset-'+k,v+'px'))`)
    await route('/hinario/letra?telaCheia=1&hino=1')
    await waitFor(`!!document.querySelector('[aria-label="Sair da tela cheia"]')`)
    await accessible('[aria-label="Sair da tela cheia"]',{top,bottom,left,right})
    await accessible('[data-saida-leitura]',{top,bottom,left,right})
    await evaluate(`window.setFonteTeste(300)`);await delay(80)
    await accessible('[aria-label="Sair da tela cheia"]',{top,bottom,left,right})
    await accessible('[data-saida-leitura]',{top,bottom,left,right})
    await evaluate(`document.querySelector('main').scrollTop=9999`)
    await click('[data-saida-leitura]');await waitFor(`!window.__rota.includes('telaCheia')`)
    assert.ok(await evaluate(`window.__rota.includes('hino=1')`));cases++
    await accessible('[aria-label="Voltar ao menu principal"]',{top,bottom,left,right})
    await evaluate(`window.setFonteTeste(100)`)
    await evaluate(`window.abrirDialogTeste()`);await delay(260)
    await accessible('[aria-label="Fechar janela de teste"]',{top,bottom,left,right})
    await click('[aria-label="Fechar janela de teste"]');await delay(260)
  }
  await route('/biblioteca/livro/ler?telaCheia=1&pagina=7');await accessible('[data-saida-leitura]',{top:0,bottom:21,left:59,right:59})
  await click('[data-saida-leitura]');await waitFor(`window.__rota==='/biblioteca/livro/ler?pagina=7'`);cases++
  for (const mode of ['anonymous','handle']) {
    await evaluate(`window.gateCase=${JSON.stringify(mode)}`)
    await route('/chat')
    await waitFor(`!!document.querySelector('[role="dialog"]')`)
    assert.ok(await evaluate(`!![...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent==='Voltar à Bíblia'&&!b.disabled)`))
    await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent==='Voltar à Bíblia').click()`)
    await waitFor(`window.__rota==='/'`);cases++
  }
  assert.deepEqual(errors,[])
  console.log(`Navegação e área segura: ${cases}/${cases} verificações aprovadas; ${routes.length} rotas inventariadas. Chrome com insets, sessão e dados simulados; não é teste em iPhone físico.`)
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{socket?.close();browser?.kill();server?.close()})
