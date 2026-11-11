import { formatarNotasRodapeHinario } from './hinarioNotasFormat.js'

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
  const linhas = String(texto || '').split('\n')
  const primeira = (linhas.find((linha) => /^coro da \d+ª música/i.test(linha)) || linhas[0] || '').trim()

  if (/^(?:coro|refr[aã]o|estribilho)\b/i.test(primeira)) {
    const prox = nCoro + 1
    const variante = primeira.match(/^coro da \d+ª música/i)?.[0]
    const label = variante ? variante.toUpperCase() : prox > 1 ? `CORO ${prox}` : 'CORO'
    return { tipo: 'coro', label, nCoro: prox, nEstrofe }
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
      texto: formatarNotasRodapeHinario([numero, titulo].filter(Boolean).join('. ')),
    },
  ]

  let nEstrofe = 0
  let nCoro = 0
  const textosVistos = new Set()

  const secoes = partes.map((texto) => {
    const info = inferirLabelSlide(texto, { nEstrofe, nCoro, textosVistos })
    nEstrofe = info.nEstrofe
    nCoro = info.nCoro
    textosVistos.add(normalizarTextoSlide(texto))
    return { tipo: info.tipo, label: info.label, texto: limparRotulosDoTextoSlide(texto) }
  }).filter((secao) => secao.texto)

  // Repete o coro comum entre estrofes. Coros com variantes ou restritos a
  // outra melodia seguem as posições registradas no hinário.
  const indiceCoro = secoes.findIndex((secao) => secao.tipo === 'coro')
  const coroComum = nCoro === 1 && secoes[indiceCoro]?.label === 'CORO' &&
    indiceCoro === 1 && secoes[0].tipo === 'estrofe' ? secoes[indiceCoro] : null

  secoes.forEach((secao, index) => {
    // Mantém cada coro em uma tela. Divide as estrofes longas em partes equilibradas.
    const linhas = secao.texto.split('\n')
    const repetirCoro = coroComum && index > indiceCoro && secao.tipo === 'estrofe' &&
      !/^amém[.!]?$/i.test(secao.texto)
    const amemFinal = repetirCoro && index === secoes.length - 1 && /^amém[.!]?$/i.test(linhas.at(-1))
      ? linhas.pop()
      : null
    const total = secao.tipo === 'estrofe' ? Math.ceil(linhas.length / 6) : 1
    for (let parte = 0; parte < total; parte += 1) {
      const inicio = Math.ceil(parte * linhas.length / total)
      const fim = Math.ceil((parte + 1) * linhas.length / total)
      slides.push({
        id: slides.length,
        tipo: secao.tipo,
        label: total > 1 ? `${secao.label} · ${parte + 1}/${total}` : secao.label,
        texto: linhas.slice(inicio, fim).join('\n'),
      })
    }

    if (repetirCoro) {
      slides.push({ ...coroComum, id: slides.length })
    }
    if (amemFinal) {
      slides.push({ id: slides.length, tipo: 'estrofe', label: 'AMÉM', texto: amemFinal })
    }
  })

  return slides
}

const RE_LINHA_SO_ROTULO =
  /^(?:(?:estrofe|est\.?)\s*\d+|coro(?: da \d+ª música)?|refr[aã]o|estribilho)\s*:?\s*$/i

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
      .replace(/^(?:coro(?: da \d+ª música)?|refr[aã]o|estribilho)\s*:\s*/i, '')

    if (limpa.trim()) limpas.push(limpa)
  }

  return formatarNotasRodapeHinario(
    limpas
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}
