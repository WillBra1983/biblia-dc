import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import assert from 'node:assert/strict'
import { transformSync } from 'esbuild'
import { sxMainBelowAppBar, sxSafeAreaTop } from '../src/utils/viewportHeight.js'

const inicio = performance.now()
const biblia = fs.readFileSync('src/pages/Biblia.jsx', 'utf8')
const layout = fs.readFileSync('src/components/Layout.jsx', 'utf8')
assert.match(biblia, /sxMainBelowAppBar\(undefined, \{ safeArea: false \}\)/)
assert.match(biblia, /\.\.\.sxFullViewportHeight\(\),\s*\.\.\.sxSafeAreaTop\(\),/)
assert.match(layout, /bibliaToolbarOverlay && <Box aria-hidden/)
for (const arquivo of ['src/pages/Biblia.jsx', 'src/components/Layout.jsx']) transformSync(fs.readFileSync(arquivo, 'utf8'), { loader: 'jsx' })
const spacer = sxMainBelowAppBar(undefined, { safeArea: false })
assert.match(sxMainBelowAppBar().xs, /env\(safe-area-inset-top/)
assert.doesNotMatch(spacer.xs, /env\(/)
if (process.argv.includes('--static')) {
  console.log(`Área segura da Bíblia: estrutura e sintaxe aprovadas; tempo: ${((performance.now() - inicio) / 1000).toFixed(2)} s. Geometria de navegador não executada neste modo.`)
  process.exit(0)
}
// O Chrome de desktop não possui notch. Substitui apenas o valor do inset
// para medir a geometria com as dimensões dos aparelhos, sem fingir um teste iOS real.
const padding = sxSafeAreaTop().pt.replace('env(safe-area-inset-top, 0px)', 'var(--safe-top)')
const executar = async () => {
  const resultados = []
  for (const [width, height, top] of [[390, 844, 47], [393, 852, 59], [375, 667, 20], [844, 390, 0], [1280, 800, 0]]) {
    const frame = document.createElement('iframe')
    frame.style.cssText = `width:${width}px;height:${height}px;border:0;display:block`
    const pronto = new Promise(resolve => { frame.onload = resolve })
    frame.srcdoc = `<style>*{box-sizing:border-box}body{margin:0;--safe-top:${top}px}#root{height:100dvh;display:flex;flex-direction:column;padding-top:PADDING;overflow:hidden}#scroll{flex:1;min-height:0;overflow:auto}#spacer{height:XS}@media(min-width:600px){#spacer{height:SM}}#header{position:fixed;top:0;left:0;right:0;height:calc(var(--safe-top) + ${width < 600 ? 56 : 64}px);background:#212121;z-index:1100}#mask{position:fixed;top:0;left:0;right:0;height:var(--safe-top);background:#212121;z-index:1101;pointer-events:none}#text{height:3000px}</style><div id="root"><div id="scroll"><div id="spacer"></div><div id="text">Texto bíblico</div></div></div><div id="header"></div><div id="mask"></div>`
      .replace('PADDING', 'REPLACE_PADDING').replace('XS', 'REPLACE_XS').replace('SM', 'REPLACE_SM')
    frame.srcdoc = frame.srcdoc.replace('REPLACE_PADDING', window.config.padding).replace('REPLACE_XS', window.config.spacer.xs).replace('REPLACE_SM', window.config.spacer.sm)
    document.body.append(frame)
    await pronto
    const win = frame.contentWindow, doc = frame.contentDocument
    const root = doc.getElementById('root'), scroll = doc.getElementById('scroll'), text = doc.getElementById('text')
    const verificar = (ok, nome) => { if (!ok) throw Error(`${width}x${height}, inset ${top}: ${nome}`); resultados.push(nome) }
    verificar(Math.abs(scroll.getBoundingClientRect().top - top) < 1, 'Área de rolagem começa abaixo da barra do sistema')
    verificar(Math.abs(text.getBoundingClientRect().top - (top + (width < 600 ? 56 : 64) + 12)) < 1, 'Safe area contada uma única vez')
    verificar(root.offsetHeight === win.innerHeight, 'Reserva não aumenta a altura da tela')
    doc.getElementById('header').style.transform = 'translateY(-100%)'
    scroll.scrollTop = 500
    verificar(scroll.getBoundingClientRect().top >= top, 'Recolher cabeçalho mantém o limite da leitura')
    verificar(doc.getElementById('mask').getBoundingClientRect().height === top, 'Proteção fixa preservada durante a rolagem')
    frame.remove()
  }
  return resultados.length
}
const dir = path.resolve('.cache/biblia-safe-area')
fs.mkdirSync(dir, { recursive: true })
const html = `<!doctype html><meta charset="utf-8"><pre id="resultado"></pre><script>window.config=${JSON.stringify({ padding, spacer })};(${executar.toString()})().then(total=>document.getElementById('resultado').textContent=JSON.stringify({total})).catch(e=>document.getElementById('resultado').textContent=JSON.stringify({erro:e.message}));</script>`
const arquivo = path.join(dir, 'geometria.html')
fs.writeFileSync(arquivo, html)
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'biblia-safe-area-'))
const stdout = await new Promise((resolve, reject) => execFile('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--user-data-dir=' + profile, '--virtual-time-budget=8000', '--dump-dom', 'file:///' + arquivo.replaceAll('\\', '/')], { windowsHide: true, timeout: 30000, maxBuffer: 2e6 }, (erro, out) => erro ? reject(erro) : resolve(out)))
const raw = stdout.match(/<pre id="resultado">(.*?)<\/pre>/s)?.[1]
assert.ok(raw, 'Sem resultado do navegador')
const resultado = JSON.parse(raw.replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>'))
assert.equal(resultado.erro, undefined)
assert.equal(resultado.total, 25)
console.log(`Área segura da Bíblia: 25/25 verificações aprovadas (100%); falhas: 0%; tempo: ${((performance.now() - inicio) / 1000).toFixed(2)} s. Geometria em Chrome com insets simulados; validação em iPhone físico pendente.`)
