import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Capacitor 6 usa um default export inexistente no tar 7.
// Mantém o tar atualizado e adapta apenas a importação do CLI.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.join(root, 'node_modules/@capacitor/cli/dist/util/template.js')
if (!fs.existsSync(target)) {
  console.log('[capacitor-patch-tar] CLI não instalado; ignorado.')
  process.exit(0)
}
const original = 'const tar_1 = tslib_1.__importDefault(require("tar"));'
const replacement = 'const tarModule = require("tar");\nconst tar_1 = { default: tarModule.default || tarModule };'
const source = fs.readFileSync(target, 'utf8')
if (source.includes(replacement)) {
  console.log('[capacitor-patch-tar] Compatibilidade já aplicada.')
} else if (source.includes(original)) {
  fs.writeFileSync(target, source.replace(original, replacement))
  console.log('[capacitor-patch-tar] Compatibilidade com tar 7 aplicada.')
} else {
  throw new Error('[capacitor-patch-tar] O CLI mudou: revise a importação do tar antes de compilar.')
}
