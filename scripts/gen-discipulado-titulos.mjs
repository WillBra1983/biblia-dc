/**
 * Gera `src/data/discipuladoTitulos.js` a partir do `src/data/discipulado.js`.
 *
 * O arquivo gerado contém apenas `{ id, titulo, estudos: [{ id, titulo }] }`
 * por tema — informação suficiente para o Layout/AppBar e para validar
 * `temaId` em `appExportPayload`. Isso permite que módulos no path crítico
 * importem o índice leve em vez do dataset completo (220 kB) que carrega
 * todas as perguntas, explicações e meditações.
 *
 * Rodar manualmente quando `discipulado.js` mudar:
 *   node scripts/gen-discipulado-titulos.mjs
 */

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const inputUrl = new URL('../src/data/discipulado.js', import.meta.url)
const outPath = resolve(projectRoot, 'src/data/discipuladoTitulos.js')

const mod = await import(inputUrl.href)
const data = mod.discipuladoData

if (!Array.isArray(data)) {
  throw new Error('discipuladoData não é um array. Verifique o export.')
}

const indice = data.map((tema) => ({
  id: tema.id,
  titulo: String(tema.titulo || ''),
  estudos: Array.isArray(tema.estudos)
    ? tema.estudos.map((e) => ({ id: e.id, titulo: String(e.titulo || '') }))
    : []
}))

const header = `// AUTOGERADO por scripts/gen-discipulado-titulos.mjs.
// Não edite à mão — rode \`node scripts/gen-discipulado-titulos.mjs\` para regerar
// após alterar \`src/data/discipulado.js\`.
//
// Por que existe: este índice leve é importado por módulos no path crítico
// (Layout, appExportPayload em rotas eager). O dataset completo (220 kB) só é
// carregado quando o usuário entra em Discipulado ou em fluxos de export.

`

const json = JSON.stringify(indice, null, 2)
await writeFile(outPath, `${header}export const discipuladoTitulos = ${json}\n`, 'utf8')
console.log(`✓ Gerado: ${outPath} (${indice.length} temas)`)
