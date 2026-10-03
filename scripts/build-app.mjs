import { spawn, execFileSync } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { totalmem } from 'node:os'
import { restorePublicAudioDirs } from '../vite-plugin-strip-biblical-audio.js'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(raiz, 'dist')
const marcador = resolve(dist, 'build-validado.json')
// Uma execução que falhe não pode reutilizar a autorização de um build antigo.
if (existsSync(marcador)) unlinkSync(marcador)
try {
  const envBuild = { ...process.env }
  if (process.platform === 'win32') {
    let livreVirtualKiB = 0
    try {
      livreVirtualKiB = Number(execFileSync('powershell.exe', ['-NoProfile', '-Command', '(Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory'], { encoding: 'utf8', windowsHide: true, timeout: 15000 }).trim())
    } catch { /* Caso o Windows não permita consultar, a compilação continua. */ }
    if (livreVirtualKiB > 0 && livreVirtualKiB < 1536 * 1024) throw new Error(`Memoria virtual insuficiente (${Math.round(livreVirtualKiB / 1024)} MB livres). Feche aplicativos e rode o build novamente em um terminal separado. A publicacao continua bloqueada.`)
  }
  if (totalmem() < 6 * 1024 ** 3) {
    envBuild.NODE_OPTIONS = `${(envBuild.NODE_OPTIONS || '').replace(/--max-old-space-size(?:=|\s+)\d+/g, '').trim()} --max-old-space-size=1024`.trim()
    envBuild.GOMAXPROCS = '1'
    console.log('Computador com pouca memoria: build limitado a 1 GB de heap e um trabalhador nativo.')
  }
  const codigo = await new Promise((resolveExit, reject) => {
    const child = spawn(process.execPath, [resolve(raiz, 'node_modules/vite/bin/vite.js'), 'build'], { cwd: raiz, env: envBuild, stdio: 'inherit', windowsHide: true })
    child.once('error', reject)
    child.once('exit', (code) => resolveExit(code ?? 1))
  })
  if (codigo !== 0) throw new Error(`Build falhou (codigo ${codigo}). Nao publique nem sincronize o Android/iOS.`)
  const html = readFileSync(resolve(dist, 'index.html'), 'utf8')
  const base = process.env.VITE_BASE_URL || '/'
  const arquivos = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1]).filter((url) => url.startsWith(`${base}assets/`))
    .map((url) => url.slice(base.length).split(/[?#]/)[0])
  if (!arquivos.some((file) => file.endsWith('.js'))) throw new Error('O build nao possui o JavaScript inicial do aplicativo.')
  for (const arquivo of arquivos) if (!existsSync(resolve(dist, arquivo))) throw new Error(`O build esta incompleto: ${arquivo}`)
  writeFileSync(marcador, JSON.stringify({ base, indexSha256: createHash('sha256').update(html).digest('hex'), arquivos, criadoEm: new Date().toISOString() }, null, 2))
  console.log('Build completo validado. Arquivos de entrada e publicacao conferidos.')
} catch (erro) {
  console.error(erro.message)
  process.exitCode = 1
} finally {
  // Também restaura as pastas quando o processo nativo morre por falta de memória.
  restorePublicAudioDirs()
}
