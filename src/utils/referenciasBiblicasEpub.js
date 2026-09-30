import { livros } from '../data/biblia'
import { buscarIntervaloVersiculos, buscarLivroPorNome } from '../services/bibliaService'
import { normalizarNomeLivro } from './biblia'

const escaparRegex = (valor) => String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const nomesDosLivros = [...new Set(
  livros.flatMap((livro) => [livro.nome, livro.abreviacao]).filter(Boolean),
)]
  .sort((a, b) => b.length - a.length)
  .map(escaparRegex)
  .join('|')

// O EPUB analisado usa principalmente "Rm 1.20", mas também aceitamos
// "Rm 1:20" e intervalos como "Rm 1.20-22".
const criarRegexReferencia = () => new RegExp(
  `(^|[^\\p{L}\\p{N}])((?:${nomesDosLivros})\\.?\\s+\\d{1,3}(?:\\s*[:.]\\s*\\d{1,3}(?:\\s*[-–—]\\s*\\d{1,3})?)?)`,
  'giu',
)

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
    /^(.+?)\s+(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?$/u,
  )
  if (!match) return []

  const [, livroInformado, capituloTexto, inicioTexto, fimTexto] = match
  const livro = await buscarLivroPorNome(normalizarNomeLivro(livroInformado))
  if (!livro) return []

  const capitulo = Number(capituloTexto)
  const inicio = inicioTexto ? Number(inicioTexto) : 1
  const fim = fimTexto ? Number(fimTexto) : (inicioTexto ? inicio : 999)
  const resultado = await buscarIntervaloVersiculos(livro.id, capitulo, inicio, fim)

  return (resultado?.versiculos || []).map((versiculo) => ({
    ...versiculo,
    livro: livro.nome,
  }))
}
