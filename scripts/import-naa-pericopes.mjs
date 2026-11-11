// Consulta pública por capítulo, com checkpoints e retomada. Não guarda versículos.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { livros } from '../src/data/biblia.js'
import { extrairPericopesYouVersion } from './lib/bible-pericopes.mjs'
const require = createRequire(import.meta.url)
const { referenciaAra } = require('../functions/src/araAudioCore.js')
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destino = path.join(raiz, 'data/bible-pericopes/naa.json')
await fs.mkdir(path.dirname(destino), { recursive: true })
let salvo
try { salvo = JSON.parse(await fs.readFile(destino, 'utf8')) } catch {}
const capitulos = salvo?.versao === 'naa' && salvo?.schema === 1 ? salvo.capitulos || {} : {}
const fila = []
for (const livro of livros) for (let cap = 1; cap <= livro.capitulos; cap++) {
  const ref = referenciaAra(livro.id, cap, 'naa')
  if (!capitulos[`${ref.codigo}.${cap}`]) fila.push(ref)
}
let indice = 0, concluidos = Object.keys(capitulos).length, cadeia = Promise.resolve()
const falhas = []
function gravar() {
  cadeia = cadeia.then(async () => {
    const temporario = destino + '.tmp'
    await fs.writeFile(temporario, JSON.stringify({ schema: 1, versao: 'naa', fonte: 'bible.com / Sociedade Bíblica do Brasil', completo: Object.keys(capitulos).length === 1189, capitulos }, null, 2))
    await fs.rename(temporario, destino)
  })
  return cadeia
}
async function consultar(ref) {
  let ultimoErro
  const url = `https://bible.youversionapi.com/3.1/chapter.json?id=1840&reference=${ref.codigo}.${ref.capitulo}`
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const resposta = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: 'error', headers: { Accept: 'application/json' } })
      if (!resposta.ok) throw Error(`HTTP ${resposta.status}`)
      const corpo = await resposta.text()
      if (corpo.length > 600000) throw Error('Resposta excessiva')
      return extrairPericopesYouVersion(JSON.parse(corpo), ref)
    } catch (erro) {
      ultimoErro = erro
      if (tentativa < 2) await new Promise(resolve => setTimeout(resolve, 500 * (tentativa + 1)))
    }
  }
  throw ultimoErro
}
console.log(`NAA: ${concluidos}/1189 capítulos já guardados; ${fila.length} a consultar.`)
async function trabalhador() {
  while (indice < fila.length) {
    const ref = fila[indice++]
    try {
      capitulos[`${ref.codigo}.${ref.capitulo}`] = await consultar(ref)
      concluidos++
      if (concluidos % 25 === 0) { await gravar(); console.log(`NAA: ${concluidos}/1189 capítulos conferidos.`) }
    } catch (erro) { falhas.push(`${ref.codigo}.${ref.capitulo}: ${erro.message}`); console.log('Falha:', falhas.at(-1)) }
  }
}
await Promise.all(Array.from({ length: 3 }, trabalhador))
await gravar()
console.log(JSON.stringify({ capitulos: concluidos, pericopes: Object.values(capitulos).reduce((n,c) => n + c.pericopes.length, 0), falhas }))
if (falhas.length) process.exitCode = 1
