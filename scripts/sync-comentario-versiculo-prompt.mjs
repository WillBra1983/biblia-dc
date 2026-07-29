import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sourcePath = path.join(root, 'src', 'services', 'bibliaPassagemEstudoIaService.js')
const outputPath = path.join(root, 'functions', 'src', 'generated', 'comentarioVersiculoPrompt.cjs')
const source = fs.readFileSync(sourcePath, 'utf8')

function extractTemplate(name) {
  const marker = `const ${name} = \``
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) throw new Error(`Template ${name} nao encontrado em ${sourcePath}`)
  const start = markerIndex + marker.length
  for (let index = start; index < source.length; index += 1) {
    if (source[index] !== '`') continue
    let backslashes = 0
    for (let cursor = index - 1; cursor >= start && source[cursor] === '\\'; cursor -= 1) backslashes += 1
    if (backslashes % 2 === 0) return source.slice(start, index)
  }
  throw new Error(`Fim do template ${name} nao encontrado`)
}

function evaluateTemplate(raw, variables = {}) {
  const names = Object.keys(variables)
  const values = Object.values(variables)
  return Function(...names, `'use strict'; return \`${raw}\`;`)(...values)
}

const teologiaBase = evaluateTemplate(extractTemplate('TEOLOGIA_BASE'))
const comentarioTemplate = extractTemplate('INSTRUCAO_COMENTARIO_VERSICULO')
const instrucao = evaluateTemplate(comentarioTemplate, { TEOLOGIA_BASE: teologiaBase })
const promptIntegro =
  instrucao.includes('análise concentrada') &&
  instrucao.includes('Encerre naturalmente no último parágrafo do comentário.') &&
  !instrucao.includes('observação pontual de auxílio ao estudo')

if (!promptIntegro) {
  throw new Error('O prompt extraido nao passou pela verificacao de integridade.')
}

const fingerprint = crypto.createHash('sha256').update(instrucao).digest('hex')
const generated = `'use strict'\n\n// Gerado por scripts/sync-comentario-versiculo-prompt.mjs. Nao editar manualmente.\nmodule.exports = ${JSON.stringify({
  INSTRUCAO_COMENTARIO_VERSICULO: instrucao,
  PROMPT_FINGERPRINT: fingerprint,
}, null, 2)}\n`

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, generated, 'utf8')
console.log(`Prompt de comentario sincronizado: ${fingerprint.slice(0, 12)}`)
