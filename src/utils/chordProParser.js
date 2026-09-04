const DIRECTIVE_RE = /^\{\s*([^:}]+)(?::\s*([^}]*))?\s*\}$/
const INLINE_CHORD_RE = /\[([^\]]+)]/g
const CHORD_TOKEN_RE = /^[A-G](?:#|b)?(?:m|M|maj|min|dim|aug|sus|add|º|°)?(?:\d+M?)?(?:\([^)]*\))?(?:[+#-]\d*)?(?:\/[A-G](?:#|b)?)?$/i

const decodeHtmlEntities = value => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeText = value => decodeHtmlEntities(String(value ?? ''))
  .replace(/^\uFEFF/, '')
  .replace(/\r\n?/g, '\n')
  .replace(/\\_/g, '_')

const cleanChord = value => String(value ?? '').trim().replace(/^\(|\)$/g, '')

const chordFromLineToken = token => cleanChord(token).replace(/[|,:;]+$/g, '')

const isChordLine = line => {
  const candidate = String(line ?? '').trim().replace(/^(?:intro|introdu[cç][aã]o|refr[aã]o|ponte|final)\s*:\s*/i, '')
  if (!candidate) return false
  const tokens = candidate.split(/\s+/).filter(token => token && !/^[|/:.-]+$/.test(token))
  return tokens.length > 0 && tokens.every(token => CHORD_TOKEN_RE.test(chordFromLineToken(token)))
}

const firstChordRoot = lines => {
  for (const line of lines) {
    const chord = line.detalhes?.[0]?.acorde || line.cifras?.[0]
    const root = String(chord || '').match(/^([A-G](?:#|b)?)/i)?.[1]
    if (root) return root[0].toUpperCase() + root.slice(1)
  }
  return 'C'
}

const parseInlineLine = rawLine => {
  const detalhes = []
  let letra = ''
  let cursor = 0
  for (const match of rawLine.matchAll(INLINE_CHORD_RE)) {
    letra += rawLine.slice(cursor, match.index)
    const acorde = cleanChord(match[1])
    if (acorde) detalhes.push({ acorde, indice: letra.length, alternativa: false })
    cursor = match.index + match[0].length
  }
  letra += rawLine.slice(cursor)
  return {
    tipo: detalhes.length ? 'cifra_letra' : 'texto',
    letra,
    texto: letra,
    cifras: detalhes.map(item => item.acorde),
    detalhes,
  }
}

const parseChordLinePair = (chordLine, lyricLine) => {
  const prefixMatch = chordLine.match(/^(?:intro|introdu[cç][aã]o|refr[aã]o|ponte|final)\s*:\s*/i)
  const prefixLength = prefixMatch?.[0]?.length || 0
  const chordArea = chordLine.slice(prefixLength)
  const detalhes = []
  const tokenRe = /\S+/g
  for (const match of chordArea.matchAll(tokenRe)) {
    const acorde = chordFromLineToken(match[0])
    if (!CHORD_TOKEN_RE.test(acorde)) continue
    detalhes.push({
      acorde,
      indice: Math.max(0, Math.min(lyricLine.length, match.index + prefixLength)),
      alternativa: false,
    })
  }
  return {
    tipo: 'cifra_letra',
    letra: lyricLine,
    texto: lyricLine,
    cifras: detalhes.map(item => item.acorde),
    detalhes,
  }
}

export function parseChordProSong(rawText, options = {}) {
  const text = normalizeText(rawText)
  const metadata = {}
  const linhas = []
  const secoes = []

  for (const rawLine of text.split('\n')) {
    const directive = rawLine.trim().match(DIRECTIVE_RE)
    if (directive) {
      const name = directive[1].trim().toLowerCase()
      const value = (directive[2] || '').trim()
      if (['title', 't'].includes(name)) metadata.title = value
      else if (['artist', 'composer'].includes(name)) metadata.artist = value
      else if (['key', 'k'].includes(name)) metadata.key = value
      else if (['comment', 'c', 'section'].includes(name) && value) {
        secoes.push({ indiceLinha: linhas.length, texto: value })
      } else if (name.startsWith('start_of_')) {
        const label = value || name.replace('start_of_', '').replaceAll('_', ' ')
        secoes.push({ indiceLinha: linhas.length, texto: label })
      }
      continue
    }

    if (!rawLine.trim()) {
      if (linhas.length && linhas.at(-1)?.tipo !== 'espaco') linhas.push({ tipo: 'espaco', letra: '', texto: '', cifras: [], detalhes: [] })
      continue
    }

    linhas.push(parseInlineLine(rawLine))
  }

  while (linhas.at(-1)?.tipo === 'espaco') linhas.pop()
  const titulo = options.title || metadata.title || options.fallbackTitle || 'Música cifrada'
  const tom = options.key || metadata.key || firstChordRoot(linhas)
  return {
    id: options.id || titulo,
    numero: options.id || titulo,
    titulo,
    tom,
    compassos: [],
    detalhe: metadata.artist || options.artist || '',
    fonte: options.source || metadata.artist || '',
    secoes,
    linhas,
  }
}

export function parsePastedChordSong(rawText, options = {}) {
  const text = normalizeText(rawText)
  const hasInlineChords = [...text.matchAll(INLINE_CHORD_RE)]
    .some(match => CHORD_TOKEN_RE.test(cleanChord(match[1])))
  if (hasInlineChords || /^\s*\{[^}]+}\s*$/m.test(text)) {
    return { ...parseChordProSong(text, options), textoOriginal: String(rawText ?? '') }
  }

  const linhas = []
  const secoes = []
  const input = text.split('\n')
  let declaredKey = options.key || ''
  let pendingChordIndent = null
  const fallbackChordPositions = new Map()

  for (let index = 0; index < input.length; index += 1) {
    let rawLine = input[index].replace(/\s+$/, '')
    const trimmed = rawLine.trim()
    const keyMatch = trimmed.match(/^tom\s*:\s*([A-G](?:#|b)?m?)/i)
    if (keyMatch) {
      declaredKey = keyMatch[1]
      continue
    }
    const sectionWithChords = trimmed.match(/^\[\s*(intro|introdu[cç][aã]o|refr[aã]o|ponte|final)\s*]\s+(.+)$/i)
    if (sectionWithChords && isChordLine(sectionWithChords[2])) {
      secoes.push({ indiceLinha: linhas.length, texto: sectionWithChords[1] })
      rawLine = sectionWithChords[2]
    }
    const normalizedTrimmed = rawLine.trim()
    const sectionMatch = normalizedTrimmed.match(/^\[?\s*(intro|introdu[cç][aã]o|estrofe(?:\s+\d+)?|verso(?:\s+\d+)?|refr[aã]o|ponte|final)\s*]?\s*:?$/i)
    if (sectionMatch) {
      secoes.push({ indiceLinha: linhas.length, texto: sectionMatch[1] })
      continue
    }
    if (!normalizedTrimmed) {
      if (input[index].length > 0) {
        pendingChordIndent = input[index].length
        continue
      }
      if (linhas.length && linhas.at(-1)?.tipo !== 'espaco') linhas.push({ tipo: 'espaco', letra: '', texto: '', cifras: [], detalhes: [] })
      continue
    }
    const quotedChordMatch = normalizedTrimmed.match(/^"?\s*>\s*(.+)$/)
    if (quotedChordMatch && isChordLine(quotedChordMatch[1])) {
      const chords = quotedChordMatch[1].split(/\s+/).map(chordFromLineToken).filter(value => CHORD_TOKEN_RE.test(value))
      const previousIndex = linhas.findLastIndex(line => line.tipo !== 'espaco')
      const previous = linhas[previousIndex]
      if (previous?.tipo === 'cifras') {
        previous.cifras.push(...chords)
      } else if (previous) {
        const letra = previous.letra || previous.texto || ''
        const fallbackPosition = fallbackChordPositions.get(previousIndex)
        const existingDetails = previous.detalhes || []
        const lastPosition = existingDetails.reduce((max, item) => Math.max(max, Number(item.indice) || 0), 0)
        const longestChord = chords.reduce((max, chord) => Math.max(max, chord.length), 1)
        const trailingPosition = Math.max(0, letra.length - longestChord)
        const position = existingDetails.length
          ? Math.max(0, Math.min(Math.max(0, letra.length - 1), Math.max(lastPosition + 1, trailingPosition)))
          : Math.max(0, Math.min(Math.max(0, letra.length - 1), fallbackPosition ?? 0))
        previous.tipo = 'cifra_letra'
        previous.letra = letra
        previous.texto = letra
        previous.detalhes = existingDetails
        previous.cifras = previous.cifras || []
        chords.forEach(acorde => {
          previous.detalhes.push({ acorde, indice: position, alternativa: false })
          previous.cifras.push(acorde)
        })
      }
      const nextLine = input[index + 1]?.trim()
      const previousLyric = previous?.letra?.trim()
      if (nextLine && previousLyric && nextLine === previousLyric) index += 1
      pendingChordIndent = null
      continue
    }
    if (isChordLine(rawLine)) {
      const next = input[index + 1]?.replace(/\s+$/, '') ?? ''
      const nextQuotedChord = next.trim().match(/^"?\s*>\s*(.+)$/)
      if (next.trim() && !isChordLine(next) && !(nextQuotedChord && isChordLine(nextQuotedChord[1]))) {
        linhas.push(parseChordLinePair(rawLine, next))
        index += 1
      } else {
        const cifras = rawLine.split(/\s+/).map(chordFromLineToken).filter(value => CHORD_TOKEN_RE.test(value))
        linhas.push({ tipo: 'cifras', letra: '', texto: '', cifras, detalhes: [] })
      }
      continue
    }
    const lineIndex = linhas.length
    linhas.push({ tipo: 'texto', letra: rawLine, texto: rawLine, cifras: [], detalhes: [] })
    if (pendingChordIndent != null) fallbackChordPositions.set(lineIndex, pendingChordIndent)
    pendingChordIndent = null
  }

  while (linhas.at(-1)?.tipo === 'espaco') linhas.pop()
  const titulo = options.title || 'Música cifrada'
  return {
    id: options.id || titulo,
    numero: options.id || titulo,
    titulo,
    tom: declaredKey || firstChordRoot(linhas),
    compassos: [],
    detalhe: options.artist || '',
    fonte: options.source || 'Minha cifra',
    textoOriginal: String(rawText ?? ''),
    secoes,
    linhas,
  }
}

export function chordSongToEditableText(song) {
  if (song?.textoOriginal) return song.textoOriginal
  const sections = new Map()
  ;(song?.secoes || []).forEach(section => {
    if (!sections.has(section.indiceLinha)) sections.set(section.indiceLinha, [])
    sections.get(section.indiceLinha).push(section.texto)
  })
  const output = [`Tom: ${song?.tom || 'C'}`, '']
  ;(song?.linhas || []).forEach((line, index) => {
    ;(sections.get(index) || []).forEach(section => output.push(`[${section}]`))
    if (line.tipo === 'espaco') {
      output.push('')
      return
    }
    if (line.tipo === 'cifras') {
      output.push((line.cifras || []).join('  '))
      return
    }
    let text = line.letra || line.texto || ''
    const details = [...(line.detalhes || [])].sort((a, b) => b.indice - a.indice)
    details.forEach(item => {
      const position = Math.max(0, Math.min(text.length, Number(item.indice) || 0))
      text = `${text.slice(0, position)}[${item.acorde}]${text.slice(position)}`
    })
    output.push(text)
  })
  return output.join('\n')
}

export function normalizeChordSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
