import fs from 'node:fs'
import initSqlJs from 'sql.js'
import { discipuladoData } from '../src/data/discipulado.js'
import { livros } from '../src/data/biblia.js'

const normalizar = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\./g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

const aliases = new Map()
for (const livro of livros) {
  aliases.set(normalizar(livro.nome), livro)
  aliases.set(normalizar(livro.abreviacao), livro)
}
aliases.set('salmo', livros.find((livro) => livro.nome === 'Salmos'))
aliases.set('atos dos apostolos', livros.find((livro) => livro.nome === 'Atos dos Apóstolos'))
aliases.set('atos do apostolos', livros.find((livro) => livro.nome === 'Atos dos Apóstolos'))

const escapar = (valor) => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const nomes = [...aliases.keys()]
  .sort((a, b) => b.length - a.length)
  .map(escapar)
  .join('|')

const regexReferencia = new RegExp(
  `(?<![\\p{L}\\p{N}])(${nomes})\\.?\\s+(\\d+)` +
    `(?:[:.](\\d+)(?:[-–](\\d+))?)?` +
    `((?:\\s*[,;]\\s*\\d+(?:(?:[:.]\\d+(?:[-–]\\d+)?)|(?:[-–]\\d+)?))*)`,
  'giu'
)

const textos = []
function coletar(valor, caminho = 'discipulado') {
  if (typeof valor === 'string') {
    textos.push({ caminho, texto: valor })
    return
  }
  if (Array.isArray(valor)) {
    valor.forEach((item, indice) => coletar(item, `${caminho}[${indice}]`))
    return
  }
  if (valor && typeof valor === 'object') {
    Object.entries(valor).forEach(([chave, item]) => coletar(item, `${caminho}.${chave}`))
  }
}
coletar(discipuladoData)

const SQL = await initSqlJs()
const db = new SQL.Database(fs.readFileSync(new URL('../public/ara.sqlite', import.meta.url)))
const limites = new Map()
const consulta = db.exec(`
  SELECT book_id, chapter, COUNT(*) AS total
  FROM verse
  GROUP BY book_id, chapter
`)[0]
for (const linha of consulta.values) {
  limites.set(`${linha[0]}:${linha[1]}`, Number(linha[2]))
}

let total = 0
let compostasEntreCapitulos = 0
const erros = []

function validarFaixa({ livro, capitulo, inicio, fim, referencia, caminho }) {
  const maximo = limites.get(`${livro.id}:${capitulo}`)
  if (!maximo) {
    erros.push({ caminho, referencia, problema: `capítulo ${capitulo} não existe em ${livro.nome}` })
    return
  }
  if (inicio == null) return
  if (inicio < 1 || fim < inicio || fim > maximo) {
    erros.push({
      caminho,
      referencia,
      problema: `versículo ${inicio}${fim !== inicio ? `-${fim}` : ''} não existe em ${livro.nome} ${capitulo} (máximo ${maximo})`,
    })
  }
}

for (const { caminho, texto } of textos) {
  const textoNormalizado = normalizar(texto)
  regexReferencia.lastIndex = 0
  let match
  while ((match = regexReferencia.exec(textoNormalizado)) !== null) {
    if (
      normalizar(match[1]) === 'os' &&
      /^\s+livros\b/i.test(textoNormalizado.slice(match.index + match[0].length))
    ) {
      continue
    }
    total += 1
    const referencia = match[0]
    const livro = aliases.get(normalizar(match[1]))
    let capitulo = Number(match[2])
    const inicio = match[3] ? Number(match[3]) : null
    const fim = match[4] ? Number(match[4]) : inicio
    validarFaixa({ livro, capitulo, inicio, fim, referencia, caminho })

    const continuacoes = String(match[5] || '').split(/[,;]/).map((parte) => parte.trim()).filter(Boolean)
    for (const continuacao of continuacoes) {
      if (continuacao.includes(':') || continuacao.includes('.')) {
        compostasEntreCapitulos += 1
        const [capituloRaw, versosRaw] = continuacao.split(/[:.]/)
        capitulo = Number(capituloRaw)
        const [inicioRaw, fimRaw] = versosRaw.split(/[-–]/)
        const inicioContinuacao = Number(inicioRaw)
        const fimContinuacao = fimRaw ? Number(fimRaw) : inicioContinuacao
        validarFaixa({ livro, capitulo, inicio: inicioContinuacao, fim: fimContinuacao, referencia, caminho })
      } else if (inicio != null) {
        const [inicioRaw, fimRaw] = continuacao.split(/[-–]/)
        const inicioContinuacao = Number(inicioRaw)
        const fimContinuacao = fimRaw ? Number(fimRaw) : inicioContinuacao
        validarFaixa({ livro, capitulo, inicio: inicioContinuacao, fim: fimContinuacao, referencia, caminho })
      }
    }
  }
}

console.log(`Referências verificadas: ${total}`)
console.log(`Referências compostas entre capítulos: ${compostasEntreCapitulos}`)
console.log(`Referências inexistentes: ${erros.length}`)
for (const erro of erros) console.log(`- ${erro.referencia}: ${erro.problema} (${erro.caminho})`)

db.close()
if (erros.length) process.exitCode = 1
