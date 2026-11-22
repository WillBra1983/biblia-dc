const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const http = require('node:http')
const { spawn } = require('node:child_process')
const WebSocket = require('ws')
const vm = require('node:vm')
const root = path.resolve(process.env.QUIZ_TEST_DIR || 'public/quiz-biblico')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let server, browser, socket
const fixture = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><script>
window.records={};window.writes=[];window.authUser={uid:'teste',displayName:'Wilson',email:'teste@example.test',emailVerified:true};
const subscriptions=new Map();
const valueAt=p=>{if(records[p]!=null)return records[p];const result={};let found=false;for(const [key,value]of Object.entries(records)){if(!key.startsWith(p+'/'))continue;const parts=key.slice(p.length+1).split('/');let target=result;for(const part of parts.slice(0,-1))target=target[part]||=( {} );target[parts.at(-1)]=value;found=true}return found?result:null};
const snap=p=>({val:()=>structuredClone(valueAt(p)),exists:()=>valueAt(p)!=null});
window.__bibliaQuizIntegrado={getUser:()=>authUser,isConfigured:()=>true,ready:async()=>true,rankingOptIn:()=>window.optIn!==false,
publicUrl:'https://foundcine.com/biblia/quiz-retiro',shareUrl:'https://example.test/convite/quiz',openProfile:()=>window.profileOpened=true,
share:async p=>window.shared=p,onAuth:f=>{f(authUser);return()=>{}},database:()=>({ref:p=>({
once:async()=>snap(p),on:(ev,f)=>{subscriptions.set(p,f);f(snap(p))},off:()=>subscriptions.delete(p),
set:async v=>{records[p]=structuredClone(v);writes.push(p)},update:async v=>{records[p]={...records[p],...v};writes.push(p)},remove:async()=>{delete records[p]},
transaction:async fn=>{const v=fn(structuredClone(records[p]??null));if(v!==undefined){records[p]=structuredClone(v);writes.push(p)};return{committed:v!==undefined,snapshot:snap(p)}}
})})};
</script><iframe id="quiz" title="Quiz" style="width:100%;height:750px;border:0" src="/quiz-biblico/index.html"></iframe>`
async function main() {
  const files = fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js'))
  for (const file of files) {
    const source = fs.readFileSync(path.join(root,'js',file),'utf8')
    new vm.Script(source,{filename:file})
    assert.ok(!/QuizAds|firebasejs\/|AdMob|serviceWorker\.register|googlesyndication|adsbygoogle/.test(source),file)
  }
  const html = fs.readFileSync(path.join(root,'index.html'),'utf8')
  assert.ok(!/ad-banner|ad-interstitial|ad-reward|monetization-info|Dica \(anúncio\)/.test(html))
  server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://local')
    if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);return}
    const relative=url.pathname.replace(/^\/quiz-biblico\//,'')
    const file=path.resolve(root,relative)
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return}
    res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html; charset=utf-8')
    res.end(fs.readFileSync(file))
  })
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'salvation-quiz-'))
  browser=spawn(process.env.BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--in-process-gpu','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'})
  const portFile=path.join(profile,'DevToolsActivePort')
  for(let i=0;i<100&&!fs.existsSync(portFile);i++) await delay(200)
  assert.ok(fs.existsSync(portFile),'Chrome não iniciou')
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0]
  const tabs=await(await fetch(`http://127.0.0.1:${port}/json`)).json()
  socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl)
  await new Promise(resolve=>socket.once('open',resolve))
  let id=0;const pending=new Map(), errors=[]
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error(method+' timeout'))},15000)
    pending.set(n,m=>{clearTimeout(timer);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result)})
    socket.send(JSON.stringify({id:n,method,params}))
  })
  socket.on('message',raw=>{const m=JSON.parse(raw);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails)})
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value}
  const q=expression=>evaluate(`(async()=>{const w=document.getElementById('quiz').contentWindow;const app=w.__quizApp;return ${expression}})()`)
  const load=async()=>{await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}`});for(let i=0;i<100;i++){if(await evaluate(`!!document.getElementById('quiz')?.contentWindow?.__quizApp`))return;await delay(100)}throw Error('Quiz não iniciou: '+JSON.stringify(errors))}
  await call('Page.enable');await call('Runtime.enable')
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await load();let cases=0
  assert.equal(await q(`w.questionsUnified.length`),799);cases++
  assert.equal(await q(`w.QuizPontuacao.calcularPontosRodada([true,true,false,true,null])`),30)
  assert.equal(await q(`w.QuizPontuacao.calcularPontosRodada([true,false,true,true,null])`),30)
  assert.equal(await q(`w.QuizPontuacao.pontosMaximosRodada(50)`),500)
  assert.equal(await q(`w.QuizPontuacao.lerModo()`),'fixo10');cases++
  assert.ok(await q(`w.document.querySelector('#start-screen').textContent.includes('10 pontos por resposta certa')`))
  assert.equal(await q(`w.document.querySelectorAll('.quiz-option').length`),5);cases++
  await q(`(w.document.getElementById('btn-daily').click(),true)`)
  assert.equal(await q(`app.screens.daily.classList.contains('active')`),true)
  await q(`(app.showScreen('start'),w.document.getElementById('btn-achievements').click(),true)`)
  assert.equal(await q(`w.document.getElementById('achievements-overlay').classList.contains('hidden')`),false)
  await q(`(app.closeOverlay('achievements'),w.document.getElementById('btn-home-competition').click(),true)`)
  assert.equal(await q(`w.QuizCompetition.ativo()`),true)
  assert.equal(await q(`w.document.getElementById('competition-role-chooser').classList.contains('hidden')`),false)
  await q(`(w.QuizCompetition.desativarParaJogoNormal(),app.showScreen('start'),true)`);cases++
  await q(`(()=>{w.localStorage.setItem(w.QuizTrilhaLinear.STORAGE_KEY,JSON.stringify({'1:completo':{bestPoints:1275,bestAcertos:40,completed:true}}));return true})()`)
  assert.equal(await q(`w.QuizTrilhaLinear.getProgress(1,'completo').bestPoints`),400)
  await q(`(w.localStorage.removeItem(w.QuizTrilhaLinear.STORAGE_KEY),true)`);cases++
  assert.ok(await q(`w.document.querySelector('#home-firebase-auth-panel').textContent.includes('Wilson')`));cases++
  await q(`(w.document.querySelector('#quiz-conta').click(),true)`)
  assert.equal(await evaluate('window.profileOpened'),true);cases++
  for(const width of [320,390,768]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true})
    await delay(120)
    assert.equal(await q(`w.document.documentElement.scrollWidth>w.innerWidth+1`),false,'overflow '+width);cases++
  }
  if (process.env.QUIZ_SCREENSHOTS === '1') {
    await evaluate(`document.getElementById('quiz').style.height='1150px'`)
    for (const width of [390,960]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height:1200,deviceScaleFactor:1,mobile:true})
      await delay(150)
      const shot=await call('Page.captureScreenshot',{format:'png',fromSurface:true})
      fs.writeFileSync('.cache/quiz-interface-'+width+'.png',Buffer.from(shot.data,'base64'))
    }
    await evaluate(`document.getElementById('quiz').style.height='750px'`)
  }
  await q(`(w.document.querySelector('#btn-play').click(),true)`)
  assert.equal(await q(`w.document.querySelector('#trilha-screen').classList.contains('active')`),true);cases++
  // Entrar na trilha geral pelo mesmo método chamado pelos cartões.
  await q(`(app.state.fase=1,app.state.categoriaId='completo',app.iniciarTrilhaLinear(),true)`)
  assert.equal(await q(`app.estaNoQuiz()`),true);cases++
  await q(`app.pedirDica()`)
  assert.equal(await q(`app.state.hintUsed`),true)
  assert.equal(await q(`!!w.document.querySelector('[id^="ad-"]')`),false);cases++
  await q(`(()=>{const question=app.state.perguntas[app.state.atual];app.state.escolha=app.state.optionOrders[app.state.atual].indexOf(question.correctAnswer);app.confirmar();return true})()`)
  assert.equal(await q(`app.state.mostrarFeedback`),true);cases++
  await q(`app.proxima()`)
  assert.equal(await q(`app.state.atual`),1);cases++
  await q(`(app.persistir(),w.QuizFirebaseCloudSync.flushImmediate())`)
  assert.ok(await evaluate(`!!records['users/teste/quizRetiro/novoQuiz']?.progress`))
  assert.equal(await evaluate(`writes.includes('users/teste/quizRetiro')`),false);cases++
  await load()
  assert.ok(await q(`!!w.QuizStorage.carregarProgresso()`));cases++
  await q(`(app.continuarSalvo(w.QuizStorage.carregarProgresso()),true)`)
  assert.equal(await q(`app.state.atual`),1);cases++
  await q(`(w.QuizStorage.limparProgresso(),w.QuizFirebaseCloudSync.flushImmediate())`)
  assert.equal(await evaluate(`records['users/teste/quizRetiro/novoQuiz'].progress`),null);cases++
  await q(`(async()=>{while(app.estaNoQuiz()){const s=app.state,q=s.perguntas[s.atual];s.escolha=s.optionOrders[s.atual].indexOf(q.correctAnswer);app.confirmar();await app.proxima()}return true})()`)
  assert.equal(await q(`w.document.querySelector('#result-screen').classList.contains('active')`),true)
  assert.equal(await q(`app._lastResult.acertos`),50)
  assert.equal(await q(`app._lastResult.pontos`),500)
  assert.equal(await q(`w.QuizStorage.carregarProgresso()`),null);cases++
  await evaluate(`records['quizBiblicoRanking/teste']={pontos:9999,acertos:20,photoURL:'https://example.test/photo',handle:'wilson'}`)
  await q(`w.QuizFirebaseRanking.sincronizar({pontos:1,acertos:1,totalPerguntas:50,categoria:'completo',fase:1,boardKey:'geral'})`)
  assert.equal(await evaluate(`records['quizBiblicoRanking/teste'].pontos`),9999);cases++
  const rows = await q(`new Promise(resolve=>w.QuizFirebaseRanking.subscribeGlobal(resolve))`)
  assert.equal(rows.find(r=>r.uid==='teste').pontos,200);cases++
  await q(`w.QuizFirebaseRanking.sincronizar({pontos:10000,acertos:30,totalPerguntas:50,categoria:'completo',fase:1,boardKey:'geral'})`)
  assert.equal(await evaluate(`records['quizBiblicoRanking/teste'].pontos`),300)
  assert.equal(await evaluate(`records['quizBiblicoRanking/teste'].handle`),'wilson');cases++
  await evaluate(`window.optIn=false`)
  await q(`w.QuizFirebaseRanking.sincronizar({pontos:10001,acertos:50,totalPerguntas:50,categoria:'completo',fase:1,boardKey:'geral'})`)
  assert.equal(await evaluate(`records['quizBiblicoRanking/teste'].pontos`),300);cases++
  await q(`(app._lastResult={pontos:5,acertos:2,total:3},app.compartilhar(),true)`)
  assert.equal(await evaluate(`window.shared.url`),'https://example.test/convite/quiz');cases++
  await q(`(w.QuizCompetition.ativarComoOrganizador(),true)`)
  const invitation = await q(`w.QuizCompetition.compartilharTorneio()`)
  assert.ok(invitation.includes('https://example.test/convite/quiz') && invitation.includes('Bíblia do Discípulo Cristão') && invitation.includes('Código do torneio:'))
  assert.ok(await evaluate(`writes.some(p=>p.startsWith('quizRetiroTorneios/') && p.endsWith('/config'))`));cases++
  // Trocar a conta no mesmo aparelho não atribui a ela o progresso local anterior.
  await evaluate(`authUser={uid:'outra',displayName:'Outra conta',emailVerified:true};document.getElementById('quiz').src='/quiz-biblico/index.html?outra=1'`)
  for (let i=0;i<100;i++) {
    if (await evaluate(`document.getElementById('quiz').contentWindow.document.querySelector('#home-firebase-auth-panel')?.textContent.includes('Outra conta')`)) break
    await delay(100)
  }
  assert.equal(await q(`w.QuizStorage.carregarProgresso()`),null)
  assert.ok(await q(`w.document.querySelector('#home-firebase-auth-panel').textContent.includes('Outra conta')`));cases++
  assert.deepEqual(errors,[])
  console.log(`Quiz integrado: ${cases}/${cases} verificações aprovadas no Chrome; conta e banco simulados.`)
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{socket?.close();browser?.kill();server?.close()})
