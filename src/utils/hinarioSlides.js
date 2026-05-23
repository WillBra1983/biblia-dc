import { formatarNotasRodapeHinario } from './hinarioNotasFormat'

/**
 * Divide o texto do hino em blocos (estrofes) para modo apresentação.
 */
export function dividirHinoEmSlides(conteudo) {
  const texto = String(conteudo || '').trim()
  if (!texto) return []

  const porParagrafo = texto
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean)

  if (porParagrafo.length > 1) return porParagrafo

  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean)
  if (linhas.length <= 1) return linhas.length ? [linhas.join('\n')] : []

  const slides = []
  let bloco = []

  const fechaBloco = () => {
    if (bloco.length) {
      slides.push(bloco.join('\n'))
      bloco = []
    }
  }

  for (const linha of linhas) {
    if (/^\d+\s+\S/.test(linha) && bloco.length > 0) {
      fechaBloco()
    }
    bloco.push(linha)
  }
  fechaBloco()

  return slides.length ? slides : [texto]
}

function normalizarTextoSlide(texto) {
  return String(texto || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function inferirLabelSlide(texto, { nEstrofe, nCoro, textosVistos }) {
  const primeira = String(texto || '').split('\n')[0]?.trim() || ''

  if (/^coro\b|^refr[aã]o\b/i.test(primeira)) {
    const prox = nCoro + 1
    return { tipo: 'coro', label: prox > 1 ? `CORO ${prox}` : 'CORO', nCoro: prox, nEstrofe }
  }

  if (/^estrofe\s*(\d+)/i.test(primeira)) {
    const m = primeira.match(/^estrofe\s*(\d+)/i)
    return { tipo: 'estrofe', label: `ESTROFE ${m[1]}`, nCoro, nEstrofe: nEstrofe + 1 }
  }

  if (/^(\d+)\s+\S/.test(primeira)) {
    const m = primeira.match(/^(\d+)/)
    return { tipo: 'estrofe', label: `EST. ${m[1]}`, nCoro, nEstrofe: nEstrofe + 1 }
  }

  const norm = normalizarTextoSlide(texto)
  if (textosVistos.has(norm)) {
    const prox = nCoro + 1
    return { tipo: 'coro', label: prox > 1 ? `CORO ${prox}` : 'CORO', nCoro: prox, nEstrofe }
  }

  const proxEst = nEstrofe + 1
  return { tipo: 'estrofe', label: `ESTROFE ${proxEst}`, nCoro, nEstrofe: proxEst }
}

/**
 * Monta slides com rótulos para o painel lateral (estilo PowerPoint).
 * @returns {{ id: number, tipo: string, label: string, texto: string }[]}
 */
export function montarSlidesApresentacaoHino(conteudo, { numero = '', titulo = '' } = {}) {
  const partes = dividirHinoEmSlides(conteudo)
  const slides = [
    {
      id: 0,
      tipo: 'titulo',
      label: 'Título',
      texto: `${numero}. ${titulo}`.trim(),
    },
  ]

  let nEstrofe = 0
  let nCoro = 0
  const textosVistos = new Set()

  for (const texto of partes) {
    const norm = normalizarTextoSlide(texto)
    const info = inferirLabelSlide(texto, { nEstrofe, nCoro, textosVistos })
    nEstrofe = info.nEstrofe
    nCoro = info.nCoro
    textosVistos.add(norm)

    slides.push({
      id: slides.length,
      tipo: info.tipo,
      label: info.label,
      texto,
    })
  }

  return slides
}

const RE_LINHA_SO_ROTULO =
  /^(?:(?:estrofe|est\.?)\s*\d+|coro|refr[aã]o)\s*:?\s*$/i

/**
 * Remove rótulos ("Estrofe 3:", "Coro", etc.) do texto projetado no slide.
 * Os rótulos continuam só no painel lateral do condutor.
 */
export function limparRotulosDoTextoSlide(texto) {
  const linhas = String(texto || '').split('\n')
  const limpas = []

  for (const linha of linhas) {
    const t = linha.trim()
    if (!t) {
      if (limpas.length && limpas[limpas.length - 1] !== '') limpas.push('')
      continue
    }
    if (RE_LINHA_SO_ROTULO.test(t)) continue

    let limpa = linha
      .replace(/^(?:estrofe|est\.?)\s*\d+\s*:\s*/i, '')
      .replace(/^coro\s*:\s*/i, '')
      .replace(/^refr[aã]o\s*:\s*/i, '')

    if (limpa.trim()) limpas.push(limpa)
  }

  return formatarNotasRodapeHinario(
    limpas
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}
