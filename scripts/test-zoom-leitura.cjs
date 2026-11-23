const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http')
const assert=require('node:assert/strict'),vm=require('node:vm'),{spawn}=require('node:child_process'),WebSocket=require('ws')
const {build,transformSync}=require('esbuild')
process.env.GOMAXPROCS='1'
const delay=ms=>new Promise(r=>setTimeout(r,ms))
let server,browser,socket
async function main(){
  const mod={exports:{}};vm.runInNewContext(transformSync(fs.readFileSync('src/utils/zoomLeitura.js','utf8'),{format:'cjs'}).code,{module:mod,exports:mod.exports})
  let cases=0
  for(const [from,to]of [[400,200],[200,200],[180,180],[153,150],[-1,100],[NaN,100],[Infinity,100],[undefined,100]]){assert.equal(mod.exports.normalizarZoomLeitura(from),to);cases++}
  const {mergeLeituraPagina}=await import('../src/utils/leituraPorPaginaKey.js')
  assert.equal(mergeLeituraPagina({fontSize:400},'biblia').fontSize,200)
  assert.equal(mergeLeituraPagina({fontSize:10},'confissao').fontSize,100);cases++
  const source=fs.readFileSync('src/pages/Biblia.jsx','utf8'),start=source.indexOf('<Box data-cabecalho-leitura'),end=source.indexOf('\n            )}',start)
  assert.ok(start>0&&end>start)
  const header=source.slice(start,end)
  assert.ok(!source.includes('zoomLeitura / 100'))
  const constants=['BIBLIA_ESCALA_NOME_LIVRO_CABECALHO','BIBLIA_ESCALA_CAPITULO_CABECALHO'].map(name=>`const ${name}=${source.match(new RegExp('const '+name+' = ([0-9.]+)'))[1]};`).join('\n')
  const mocks={
    AppContext:`import React from 'react';export const FixtureContext=React.createContext(null);export const useApp=()=>React.useContext(FixtureContext);`,
    bibliaService:`export const buscarIntervaloVersiculos=async()=>({versiculos:[{numero:1,texto:'${'Nabucodonosor'.repeat(15)}'}]});export const buscarPericopes=async()=>[];`,
    ReferenciasPericope:'export default()=>null',ReferenciasParalelasDialog:'export default()=>null',TextoFalasJesus:'export default p=>p.texto',fontLoader:'export const carregarFonteLeitura=async()=>{}',
  }
  const bundle=await build({stdin:{contents:`
    import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
    import{ThemeProvider,CssBaseline,Box,Button,Typography,Tooltip}from'@mui/material';import theme from './src/theme/theme';
    import{FixtureContext,useApp}from'./src/contexts/AppContext';import Global from'./src/components/GlobalPinchZoom';import Local from'./src/components/LocalPinchZoom';
    import TextoBiblico from'./src/components/TextoBiblico';import Config from'./src/components/LeituraConfigButton';import{usePinchNumeric}from'./src/hooks/usePinchNumeric';
    import{normalizarZoomLeitura}from'./src/utils/zoomLeitura';import{resolveFontFamily}from'./src/utils/fontFamily';import{sxBotaoCabecalhoBiblia}from'./src/utils/bibliaHeaderButton';
    ${constants}
    function Header(){const{fontSize:fontSizeLeitura,fontFamily}=useApp();const livroAtual={nome:window.__book||'1 Tessalonicenses'},capitulo=119,livroCorBase='#175c40';const BibliaVersaoSeletor=()=> <Button variant="outlined" data-versao>NAA</Button>;return ${header}}
    function Reading(){const{fontSize,setFontSize}=useApp();const ref=React.useRef(null);usePinchNumeric(ref,{enabled:true,value:fontSize,onChange:setFontSize,min:100,max:200,step:10});return <Box ref={ref} id="reading" sx={{width:'100%',minWidth:0,maxWidth:'100%',overflowWrap:'anywhere'}}><Header/><TextoBiblico livroId={1} capitulo={1}/></Box>}
    function App(){const[value,set]=React.useState(100);const[book,setBook]=React.useState(0);window.__zoom=value;window.setLivroTeste=name=>{window.__book=name;setBook(n=>n+1)};window.setZoomTeste=v=>set(normalizarZoomLeitura(typeof v==='function'?v(value):v));const setFontSize=React.useCallback(v=>set(p=>normalizarZoomLeitura(typeof v==='function'?v(p):v)),[]);const noop=React.useCallback(()=>{},[]);const ctx={fontSize:value,setFontSize,fontFamily:'system',textAlign:'left',lineHeight:150,leituraPaginaKey:'biblia',setFontFamily:noop,setTextAlign:noop,setLineHeight:noop,setSemEspacoEntreVersiculos:noop,setBackButtonHandler:noop,toggleDarkMode:noop,isDarkMode:false};return <FixtureContext.Provider value={ctx}><Config/><Global><Local><Reading/></Local></Global></FixtureContext.Provider>}
    createRoot(document.getElementById('root')).render(<ThemeProvider theme={theme('light')}><CssBaseline/><MemoryRouter><App/></MemoryRouter></ThemeProvider>);
  `,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,jsx:'automatic',tsconfigRaw:{},define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{}'},plugins:[{name:'dados-simulados',setup(b){
    b.onResolve({filter:/.*/},a=>{if(a.namespace==='fixture')return{path:require.resolve(a.path,{paths:[process.cwd()]})};const key=Object.keys(mocks).find(k=>a.path.endsWith('/'+k));if(key)return{path:key,namespace:'fixture'};const dir=a.resolveDir||process.cwd();if(a.path.startsWith('.')){const p=path.resolve(dir,a.path);for(const f of[p,p+'.js',p+'.jsx'])if(fs.existsSync(f)&&fs.statSync(f).isFile())return{path:f}}return{path:require.resolve(a.path,{paths:[dir]})}})
    b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path],loader:'jsx'}))
  }}]})
  server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].contents:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0}#root{width:100%;padding:8px}</style><div id="root"></div><script src="/app.js"></script>')})
  await new Promise(r=>server.listen(0,'127.0.0.1',r))
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'salvation-zoom-'))
  browser=spawn(process.env.BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--in-process-gpu','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'})
  const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await delay(200);assert.ok(fs.existsSync(portFile))
  const tabs=await(await fetch('http://127.0.0.1:'+fs.readFileSync(portFile,'utf8').split('\n')[0]+'/json')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.once('open',r))
  let id=0;const pending=new Map(),errors=[]
  const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>reject(Error(method+' timeout')),20000);pending.set(n,m=>{clearTimeout(timer);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result)});socket.send(JSON.stringify({id:n,method,params}))})
  socket.on('message',raw=>{const m=JSON.parse(raw);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails)})
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value}
  await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:320,height:850,deviceScaleFactor:1,mobile:true})
  await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});for(let i=0;i<100;i++){if(await evaluate(`document.querySelector('#reading p')?.textContent.length>30`))break;await delay(100)}
  const pinch=async(ratio)=>{await evaluate(`(()=>{const el=document.querySelector('#reading p');const touches=d=>[new Touch({identifier:0,target:el,clientX:30,clientY:200}),new Touch({identifier:1,target:el,clientX:30+d,clientY:200})];el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:touches(50)}));el.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:touches(50*${ratio})}));el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[]}));})()`);await delay(80)}
  await evaluate('window.setZoomTeste(100)');await delay(50);await pinch(1.5)
  assert.equal(await evaluate('window.__zoom'),150,'Uma pinça não pode ser aplicada por todos os pais');cases++
  await evaluate('window.setZoomTeste(180)');await delay(50);await pinch(3)
  assert.equal(await evaluate('window.__zoom'),200);cases++
  await pinch(2);assert.equal(await evaluate('window.__zoom'),200);cases++
  const pinchSize=await evaluate(`getComputedStyle(document.querySelector('[data-cabecalho-leitura]>.MuiTypography-root')).fontSize`)
  await evaluate('window.setZoomTeste(100)');await delay(50)
  await evaluate(`window.dispatchEvent(new Event('salvation-abrir-leitura-config'))`);await delay(260)
  await evaluate(`document.querySelector('[role="dialog"] input[type="range"]').focus()`)
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'End',code:'End',windowsVirtualKeyCode:35})
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'End',code:'End',windowsVirtualKeyCode:35});await delay(100)
  assert.equal(await evaluate('window.__zoom'),200);cases++
  await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent==='Fechar').click()`);await delay(260)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-cabecalho-leitura]>.MuiTypography-root')).fontSize`),pinchSize);cases++
  for(const width of[280,320,375,430,844]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:true})
    for(const name of['1 Tessalonicenses','Cântico dos Cânticos','2 Crônicas','Nabucodonosor'.repeat(12)]){
      await evaluate(`window.setLivroTeste(${JSON.stringify(name)})`);await delay(30)
      assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),false,`${width}px: ${name}`)
      const fit=await evaluate(`(()=>{const h=document.querySelector('[data-cabecalho-leitura]'),title=h.querySelector('.MuiTypography-root'),button=h.querySelector('[aria-label="Comparar traduções"]');const a=title.getBoundingClientRect(),b=button.getBoundingClientRect();return a.left>=0&&a.right<=innerWidth+1&&title.scrollWidth<=title.clientWidth+1&&a.top>=b.bottom})()`)
      assert.ok(fit,'Título sem sobreposição: '+width);cases++
    }
  }
  await pinch(.25);assert.equal(await evaluate('window.__zoom'),100);cases++
  assert.deepEqual(errors,[])
  console.log(`Zoom de leitura: ${cases}/${cases} verificações aprovadas no Chrome; pinça, configuração, contêineres aninhados e títulos longos. Dados simulados.`)
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{socket?.close();browser?.kill();server?.close()})
