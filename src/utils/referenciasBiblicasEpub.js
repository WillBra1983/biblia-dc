import { livros } from '../data/biblia'
import { buscarIntervaloVersiculos, buscarLivroPorNome } from '../services/bibliaService'
import { normalizarNomeLivro } from './biblia'

const escaparRegex = (valor) => String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const nomesDosLivros = [...new Set(
  [...livros.flatMap((livro) => [livro.nome, livro.abreviacao]), 'Salmo', 'Atos'].filter(Boolean)
    .flatMap((nome) => [nome, nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '')]),
)]
  .sort((a, b) => b.length - a.length)
  .map((nome) => escaparRegex(nome).replace(/\s+/g, '\\s+'))
  .join('|')

// Um capítulo pode citar versículos isolados, intervalos ou listas com vírgulas.
const trechoVersiculos = '\\d{1,3}(?:\\s*[-–—]\\s*\\d{1,3})?'
const listaVersiculos = `${trechoVersiculos}(?:\\s*,\\s*${trechoVersiculos})*`
const criarRegexReferencia = () => new RegExp(
  `(^|[^\\p{L}\\p{N}])((?:${nomesDosLivros})\\.?\\s+\\d{1,3}(?:\\s*[:.]\\s*${listaVersiculos})?)(?!\\p{N})`,
  'giu',
)

// Mantém os índices para localizar citações que atravessam vários trechos do PDF.
export function localizarReferenciasBiblicas(texto) {
  return [...String(texto || '').matchAll(criarRegexReferencia())].map((match) => ({
    referencia: match[2].replace(/\s+/g, ' ').trim(),
    inicio: match.index + match[1].length,
    fim: match.index + match[1].length + match[2].length,
  }))
}

export function extrairReferenciasBiblicas(texto) {
  const encontradas = []
  const vistas = new Set()
  const regex = criarRegexReferencia()
  let match
  while ((match = regex.exec(String(texto || ''))) !== null) {
    const referencia = String(match[2] || '').replace(/\s+/g, ' ').trim()
    const chave = referencia.toLocaleLowerCase('pt-BR')
    if (referencia && !vistas.has(chave)) {
      vistas.add(chave)
      encontradas.push(referencia)
    }
  }
  return encontradas
}

export function tornarReferenciasBiblicasClicaveis(documento, aoAbrir) {
  if (!documento?.body || typeof aoAbrir !== 'function') return

  const janela = documento.defaultView
  const nodeFilter = janela?.NodeFilter || globalThis.NodeFilter
  if (!nodeFilter) return

  const walker = documento.createTreeWalker(
    documento.body,
    nodeFilter.SHOW_TEXT,
    {
      acceptNode(no) {
        if (!no?.nodeValue?.trim()) return nodeFilter.FILTER_REJECT
        if (no.parentElement?.closest('a, button, script, style, textarea, [data-biblia-referencia]')) {
          return nodeFilter.FILTER_REJECT
        }
        const regex = criarRegexReferencia()
        return regex.test(no.nodeValue) ? nodeFilter.FILTER_ACCEPT : nodeFilter.FILTER_REJECT
      },
    },
  )

  const nos = []
  while (walker.nextNode()) nos.push(walker.currentNode)

  nos.forEach((no) => {
    const texto = no.nodeValue
    const regex = criarRegexReferencia()
    const fragmento = documento.createDocumentFragment()
    let inicio = 0
    let encontrou = false
    let match

    while ((match = regex.exec(texto)) !== null) {
      encontrou = true
      const prefixo = match[1] || ''
      const referencia = match[2]
      const indiceReferencia = match.index + prefixo.length

      if (indiceReferencia > inicio) {
        fragmento.appendChild(documento.createTextNode(texto.slice(inicio, indiceReferencia)))
      }

      const botao = documento.createElement('button')
      botao.type = 'button'
      botao.dataset.bibliaReferencia = referencia
      botao.textContent = referencia
      botao.title = `Ler ${referencia}`
      botao.setAttribute('aria-label', `Ler ${referencia}`)
      Object.assign(botao.style, {
        appearance: 'none',
        background: 'transparent',
        border: '0',
        color: '#17633b',
        cursor: 'pointer',
        font: 'inherit',
        margin: '0',
        padding: '0',
        textDecoration: 'underline',
        textDecorationThickness: '0.08em',
        textUnderlineOffset: '0.14em',
      })
      botao.addEventListener('click', (evento) => {
        evento.preventDefault()
        evento.stopPropagation()
        aoAbrir(referencia)
      })
      fragmento.appendChild(botao)
      inicio = regex.lastIndex
    }

    if (!encontrou) return
    if (inicio < texto.length) fragmento.appendChild(documento.createTextNode(texto.slice(inicio)))
    no.parentNode?.replaceChild(fragmento, no)
  })
}

export async function carregarReferenciaBiblica(referencia) {
  const match = String(referencia || '').trim().match(
    new RegExp(`^(.+?)\\s+(\\d{1,3})(?:\\s*[:.]\\s*(${listaVersiculos}))?$`, 'u'),
  )
  if (!match) return []

  const [, livroInformado, capituloTexto, versiculosTexto] = match
  const livro = await buscarLivroPorNome(normalizarNomeLivro(livroInformado))
  if (!livro) return []

  const capitulo = Number(capituloTexto)
  if (capitulo < 1) return []
  const intervalos = versiculosTexto ? versiculosTexto.split(',').map((trecho) => {
    const [inicio, fim = inicio] = trecho.trim().split(/\s*[-–—]\s*/).map(Number)
    return { inicio, fim }
  }) : [{ inicio: 1, fim: 999 }]
  if (intervalos.some(({ inicio, fim }) => inicio < 1 || fim < inicio)) return []
  const encontrados = []
  const vistos = new Set()
  for (const { inicio, fim } of intervalos) {
    const resultado = await buscarIntervaloVersiculos(livro.id, capitulo, inicio, fim)
    for (const versiculo of resultado?.versiculos || []) {
      const chave = versiculo.id ?? `${versiculo.capitulo ?? capitulo}:${versiculo.versiculo ?? JSON.stringify(versiculo)}`
      if (vistos.has(chave)) continue
      vistos.add(chave)
      encontrados.push({ ...versiculo, livro: livro.nome })
    }
  }
  return encontrados
}
