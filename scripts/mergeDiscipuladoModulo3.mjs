/**
 * O módulo 3 já foi mesclado em src/data/discipulado.js.
 * Para reusar edições grandes, edite em src/data/discipuladoModulo3.partial.js
 * e copie/cole substituindo o objeto do tema id: 3 (ou aumente automatização).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const merged = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'data', 'discipulado.js'),
  'utf8'
)

if (!merged.includes('id: 3,\n  titulo: "A mediação de Cristo')) {
  console.warn('discipulado.js: bloco tema id 3 não encontrado (verifique se ainda existe).')
} else {
  console.log('OK: tema discipulado id 3 presente.')
}
