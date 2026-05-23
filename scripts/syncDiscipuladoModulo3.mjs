import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mainPath = path.join(__dirname, '..', 'src', 'data', 'discipulado.js')
const partialPath = path.join(__dirname, '..', 'src', 'data', 'discipuladoModulo3.partial.js')

let main = fs.readFileSync(mainPath, 'utf8')
/** Fragmento pode ser `{ ... }` ou `export default { ... };` (segundo formato valida no IDE/TS). */
let partial = fs.readFileSync(partialPath, 'utf8').trim()
partial = partial.replace(/^\s*export\s+default\s+/s, '').replace(/\s*;\s*$/s, '').trim()

const re = /,\s*\{\s*\r?\n\s*id:\s*3,\s*\r?\n\s*titulo:\s*"A mediação de Cristo/
const m = main.match(re)
if (!m) throw new Error('Bloco id:3 não encontrado')
const start = m.index

let depth = 0
let i = main.indexOf('{', start)
for (; i < main.length; i++) {
  const c = main[i]
  if (c === '{') depth++
  else if (c === '}') {
    depth--
    if (depth === 0) {
      const after = i + 1
      const newMain = main.slice(0, start) + ',\n' + partial + main.slice(after)
      fs.writeFileSync(mainPath, newMain)
      console.log('Sincronizado discipulado.js com discipuladoModulo3.partial.js')
      process.exit(0)
    }
  }
}
throw new Error('Fechamento } do tema 3 não encontrado')
