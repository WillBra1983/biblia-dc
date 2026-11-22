const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn } = require('node:child_process')
const WebSocket = require('ws')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const inicio = performance.now()
let base = process.env.BIBLIA_TEST_URL || ''
let browser, socket, servidor
async function main() {
  if (!base) {
    const http = require('node:http'), root = path.resolve('dist')
    servidor = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
      let file = path.resolve(root, '.' + pathname.replace(/^\/biblia/, ''))
      if (!file.startsWith(root + path.sep) && file !== root) {res.writeHead(403);res.end();return}
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html')
      const size=fs.statSync(file).size, types={'.js':'application/javascript','.css':'text/css','.wasm':'application/wasm','.html':'text/html','.json':'application/json','.woff2':'font/woff2'}
      res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream')
      res.setHeader('Cross-Origin-Opener-Policy','same-origin-allow-popups')
      const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
      if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),size-1):size-1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res)}
      else {res.setHeader('Content-Length',size);fs.createReadStream(file).pipe(res)}
    })
    await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve))
    base='http://127.0.0.1:'+servidor.address().port+'/biblia/'
  }
  const SQL = await require('sql.js')()
  const { VERSOES_BIBLICAS } = await import('../src/data/bibliaVersoes.js')
  const fixtures = {}
  for (const v of VERSOES_BIBLICAS) {
    const db = new SQL.Database(fs.readFileSync('public/' + v.arquivo))
    const explicito = db.exec('PRAGMA table_info(verse)')[0].values.some(r => r[1] === 'verse_number')
    const rows = db.exec('SELECT text' + (explicito ? ',verse_number,verse_end' : '') + ' FROM verse WHERE book_id=23 AND chapter=43 ORDER BY id')[0].values
    const versiculos = rows.map(([marcado, numero, fim], i) => ({ texto: marcado.replace(/<\/?[Jj]>/g, ''), ...(marcado.includes('<J>') ? {textoMarcado:marcado}:{}), numero: explicito ? numero : i+1, numeroFim: explicito ? fim : i+1 }))
    const pericopes = (db.exec('SELECT versiculo,titulo,referencias FROM pericopes WHERE livro_id=23 AND capitulo=43 ORDER BY versiculo,rowid')[0]?.values || []).map(([versiculo,titulo,referencias])=>({versiculo,titulo,referencias:referencias||null}))
    fixtures[v.id] = {schema:1,versao:v.id,revisao:v.revisao,livroId:23,capitulo:43,versiculos,pericopes}
    db.close()
  }
  let bloquearBancos = false
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'salvation-abertura-'))
  browser = spawn(process.env.BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--no-sandbox', '--in-process-gpu', '--disable-gpu', '--no-first-run',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' })
  const porta = path.join(profile, 'DevToolsActivePort')
  for (let i = 0; i < 150 && !fs.existsSync(porta); i++) await delay(200)
  assert.ok(fs.existsSync(porta), 'Chrome não abriu o canal de teste')
  const port = fs.readFileSync(porta, 'utf8').split('\n')[0]
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject) })
  let id = 0
  const pending = new Map()
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id
    const timeout = setTimeout(() => { pending.delete(n); reject(Error('CDP timeout: ' + method)) }, 20000)
    pending.set(n, m => { clearTimeout(timeout); m.error ? reject(Error(JSON.stringify(m.error))) : resolve(m.result) })
    socket.send(JSON.stringify({ id: n, method, params }))
  })
  socket.on('message', raw => {
    const m = JSON.parse(raw)
    if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id) }
    // Mantém a folha de fontes sem resposta: o texto precisa abrir mesmo assim.
    if (m.method === 'Fetch.requestPaused') {
      const falhar = m.params.request.url.includes('/sw.js') || m.params.request.url.includes('fonts.googleapis.com') || (bloquearBancos && /\.(sqlite|wasm)([?]|$)/.test(m.params.request.url))
      void call(falhar ? 'Fetch.failRequest' : 'Fetch.continueRequest', { requestId: m.params.requestId, ...(falhar ? {errorReason:'TimedOut'} : {}) }).catch(() => {})
    }
  })
  const evaluate = async expression => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    assert.equal(r.exceptionDetails, undefined, JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
  await call('Page.enable')
  await call('Fetch.enable', { patterns: [{ urlPattern: '*sw.js*' }, { urlPattern: '*fonts.googleapis.com*' }, { urlPattern: '*.sqlite*' }, { urlPattern: '*.wasm*' }] })
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__bibliaReadyAt = 0; window.__heavyBeforeReady = 0;
    const fetchOriginal = window.fetch;
    window.fetch = (...args) => { if (/\\.(sqlite|wasm)([?]|$)/.test(String(args[0])) && !window.__bibliaReadyAt) window.__heavyBeforeReady++; return fetchOriginal(...args) };
    window.addEventListener('biblia-pronta', () => window.__bibliaReadyAt = performance.now());
    localStorage.setItem('ultimaLeitura', JSON.stringify({livroId:23,capitulo:43}));
  ` })
  const esperarTexto = async () => {
    for (let i = 0; i < 90; i++) {
      if (await evaluate(`!!document.getElementById('versiculo-23-43-1') && !!window.__bibliaReadyAt`)) { await delay(800); return }
      await delay(500)
    }
    const diagnostico = await evaluate(`JSON.stringify({body:document.body.innerText.slice(0,500),url:location.href,ready:document.readyState,error:document.querySelector('vite-error-overlay')?.shadowRoot?.textContent?.slice(0,500),resources:performance.getEntriesByType('resource').slice(-8).map(e=>({name:new URL(e.name).pathname,duration:e.duration}))})`)
    throw Error('Texto bíblico não abriu: '+diagnostico)
  }
  const geometria = () => evaluate(`(() => {
    const first = document.getElementById('versiculo-23-43-1');
    let reader = first; while (reader && getComputedStyle(reader).overflowY !== 'auto') reader = reader.parentElement;
    const title = [...document.querySelectorAll('main p')].find(e => e.textContent === 'Isaías');
    return {readyMs:window.__bibliaReadyAt,titleTop:title.getBoundingClientRect().top,
      headerBottom:document.querySelector('header').getBoundingClientRect().bottom,
      scrollTop:reader.scrollTop,documentScroll:document.scrollingElement.scrollTop,
      heavyBeforeReady:window.__heavyBeforeReady,restoration:history.scrollRestoration};
  })()`)
  let total = 0
  for (const [width, versao, cache] of [[390, 'ara', false], [390, 'ara', true], [390, 'naa', true], [390, 'ntlh', true], [1280, 'ara', true]]) {
    bloquearBancos = cache
    await call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 600 })
    const setup = await call('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('biblia-versao-selecionada-v1', '${versao}'); ${cache ? 'localStorage.setItem("salvation:ultimo-capitulo:v1", '+JSON.stringify(JSON.stringify(fixtures[versao]))+')' : 'localStorage.removeItem("salvation:ultimo-capitulo:v1")'}` })
    await evaluate('window.__bibliaReadyAt = 0')
    await call('Page.navigate', { url: base })
    await esperarTexto()
    await call('Page.removeScriptToEvaluateOnNewDocument', { identifier: setup.identifier })
    const g = await geometria()
    assert.ok(g.titleTop >= g.headerBottom, 'Título encoberto: ' + JSON.stringify(g))
    assert.equal(g.scrollTop, 0)
    assert.equal(g.documentScroll, 0)
    assert.equal(g.restoration, 'manual')
    if (cache) assert.equal(g.heavyBeforeReady, 0, 'Capítulo salvo aguardou o banco pesado')
    else assert.ok(g.heavyBeforeReady > 0, 'Primeira abertura não consultou o SQLite original')
    console.log(`OK ${versao.toUpperCase()} ${width}px, ${cache ? "cache local; banco bloqueado" : "primeira consulta SQLite"}: texto pronto em ${(g.readyMs / 1000).toFixed(2)} s`)
    total++
  }
  await evaluate(`(() => {let e=document.getElementById('versiculo-23-43-1');while(getComputedStyle(e).overflowY!=='auto')e=e.parentElement;e.scrollTop=700})()`)
  await evaluate('window.__bibliaReadyAt = 0')
  await call('Page.reload')
  await esperarTexto()
  assert.equal((await geometria()).scrollTop, 0, 'Reload restaurou deslocamento indevido')
  total++
  await evaluate('window.__bibliaReadyAt = 0')
  await call('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true})
  const fonteAmpliada = await call('Page.addScriptToEvaluateOnNewDocument', {source: `window.addEventListener('DOMContentLoaded',()=>document.documentElement.style.fontSize='20px')`})
  await call('Page.navigate', { url: base + '?livro=23&capitulo=43&versiculo=2' })
  await esperarTexto()
  const inicioCapitulo = await geometria()
  assert.equal(inicioCapitulo.scrollTop, 0, 'Link para versículo já visível cortou o título')
  assert.ok(inicioCapitulo.titleTop >= inicioCapitulo.headerBottom)
  total++
  await call('Page.removeScriptToEvaluateOnNewDocument', {identifier:fonteAmpliada.identifier})
  await evaluate('window.__bibliaReadyAt = 0')
  await call('Page.navigate', { url: base + '?livro=23&capitulo=43&versiculo=20' })
  await esperarTexto()
  // A animação começa após a montagem; aguarda sua condição final em vez
  // de presumir que a rolagem suave terminou em uma máquina ocupada.
  for (let i = 0; i < 20; i++) {
    if (await evaluate(`(() => {const e=document.getElementById('versiculo-23-43-20');const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=844&&!!e.style.backgroundColor})()`)) break
    await delay(150)
  }
  const target = await evaluate(`(() => {const e=document.getElementById('versiculo-23-43-20');const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,highlight:!!e.style.backgroundColor}})()`)
  assert.ok(target.top >= 0 && target.bottom <= 844 && target.highlight, 'Link para versículo perdeu foco: ' + JSON.stringify(target))
  total++
  console.log(`Abertura e posição: ${total}/${total} cenários aprovados (100%); falhas: 0%; tempo: ${((performance.now()-inicio)/1000).toFixed(2)} s. Build de produção em servidor local, sem representar o aparelho do usuário.`)
  await call('Browser.close')
}
main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => { socket?.close(); browser?.kill(); servidor?.closeAllConnections(); servidor?.close() })
