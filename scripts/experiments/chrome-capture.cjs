const fs = require('fs')
const http = require('http')
const WebSocket = require('ws')

const [, , url, output, width = '412', height = '915', routeAfter = '', actionLabel = '', hymnId = ''] = process.argv
if (!url || !output) throw new Error('Uso: node chrome-capture.cjs <url> <saida.png> [largura] [altura]')

const getJson = path => new Promise((resolve, reject) => {
  http.get(`http://127.0.0.1:9223${path}`, response => {
    let body = ''
    response.on('data', chunk => { body += chunk })
    response.on('end', () => {
      try { resolve(JSON.parse(body)) } catch (error) { reject(error) }
    })
  }).on('error', reject)
})

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function main() {
  let pages
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      pages = await getJson('/json')
      break
    } catch {
      await wait(500)
    }
  }
  const page = pages?.find(item => item.type === 'page')
  if (!page) throw new Error('Nenhuma pagina de depuracao encontrada.')

  const socket = new WebSocket(page.webSocketDebuggerUrl)
  const pending = new Map()
  const issues = []
  let id = 0
  socket.on('message', raw => {
    const message = JSON.parse(raw)
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown') issues.push(message.params.exceptionDetails?.text || 'Runtime exception')
    if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') issues.push(message.params.entry.text)
  })
  await new Promise((resolve, reject) => {
    socket.once('open', resolve)
    socket.once('error', reject)
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    id += 1
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: Number(width), height: Number(height), deviceScaleFactor: 1, mobile: Number(width) < 600
  })
  await send('Page.navigate', { url })
  await wait(18000)
  if (routeAfter) {
    await send('Runtime.evaluate', {
      expression: `${hymnId ? `localStorage.setItem('ultimoHinoAcessado', ${JSON.stringify(hymnId)})` : "localStorage.removeItem('ultimoHinoAcessado')"}; history.pushState({}, '', ${JSON.stringify(routeAfter)}); dispatchEvent(new PopStateEvent('popstate'))`
    })
    await wait(8000)
  }
  if (actionLabel) {
    await send('Runtime.evaluate', {
      expression: `[...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === ${JSON.stringify(actionLabel)})?.click()`
    })
    await wait(1500)
  }

  const evaluation = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      url: location.href,
      title: document.title,
      text: document.body.innerText.slice(0, 1200),
      splash: Boolean(document.getElementById('splash-initial')),
      rootLength: document.getElementById('root')?.innerHTML.length || 0,
      buttons: [...document.querySelectorAll('button')].map(button => button.getAttribute('aria-label') || button.title || button.innerText.trim()).filter(Boolean)
    })`,
    returnByValue: true
  })
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  fs.writeFileSync(output, Buffer.from(screenshot.data, 'base64'))
  process.stdout.write(`${evaluation.result.value}\nISSUES=${JSON.stringify(issues)}\nSCREENSHOT=${output}\n`)
  socket.close()
}

main().catch(error => {
  process.stderr.write(`${error.stack}\n`)
  process.exitCode = 1
})
