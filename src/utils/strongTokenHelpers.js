/**
 * Helpers para exibição de tokens Strong na passagem.
 *
 * Regra de ouro: lema e token têm campos próprios (unicode, translit, pronunciation).
 * O MorphGNT só traz a forma grega + morfologia — não há translit/pronúncia por token
 * no banco. Só reutilizamos os dados do Strong quando a forma do token = lema.
 */

import { limparTextoTokenPassagem, formatarTextoMorphHb } from './strongTokenContext'
import { transliterarHebraicoVocalizado } from './hebrewDisplay'
import { livros } from '../data/biblia'

export { limparTextoTokenPassagem, formatarTextoMorphHb } from './strongTokenContext'

function stripDiacritics(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function normalizarFormaLexical(s) {
  return stripDiacritics(s)
    .replace(/[\u0313\u0314\u0342\u0345]/g, '')
    .toLowerCase()
    .trim()
}

export function formasLexicaisEquivalentes(a, b) {
  const x = normalizarFormaLexical(a)
  const y = normalizarFormaLexical(b)
  return !!x && x === y
}

const MAP_GREGO = {
  α: 'a',
  β: 'b',
  γ: 'g',
  δ: 'd',
  ε: 'e',
  ζ: 'z',
  η: 'e',
  θ: 'th',
  ι: 'i',
  κ: 'k',
  λ: 'l',
  μ: 'm',
  ν: 'n',
  ξ: 'x',
  ο: 'o',
  π: 'p',
  ρ: 'r',
  σ: 's',
  ς: 's',
  τ: 't',
  υ: 'u',
  φ: 'ph',
  χ: 'ch',
  ψ: 'ps',
  ω: 'o',
}

const DIGRAFOS_GREGO = [
  ['ου', 'ou'],
  ['ει', 'ei'],
  ['αι', 'ai'],
  ['ευ', 'eu'],
  ['αυ', 'au'],
  ['ηυ', 'eu'],
  ['γγ', 'ng'],
  ['γκ', 'nk'],
  ['γχ', 'nch'],
  ['μπ', 'mp'],
  ['ντ', 'nt'],
]

/** Detecta espírito áspero (dasia) na primeira letra. */
function aspiracaoInicial(texto) {
  const nfd = String(texto || '')
    .normalize('NFD')
    .replace(/^[^\p{L}]+/u, '')
  if (!nfd) return { vowel: false, rho: false }
  const ch = nfd[0]
  const mark = nfd[1]
  if (mark !== '\u0314') return { vowel: false, rho: false }
  if (ch === 'ρ') return { vowel: false, rho: true }
  if (/[αεηιουω]/i.test(ch)) return { vowel: true, rho: false }
  return { vowel: false, rho: false }
}

/** Transliteração latina básica da forma (inclui h inicial por dasia). */
export function transliterarGregoBasico(texto) {
  const cleaned = limparTextoTokenPassagem(texto)
  if (!cleaned) return ''

  const { vowel: asperoVogal, rho: asperoRho } = aspiracaoInicial(cleaned)

  let src = stripDiacritics(cleaned).toLowerCase()
  for (const [gr, lat] of DIGRAFOS_GREGO) {
    src = src.split(gr).join(lat)
  }

  let out = ''
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (i === 0 && asperoRho && ch === 'r') {
      out += 'rh'
      continue
    }
    out += MAP_GREGO[ch] ?? ch
  }

  if (asperoVogal) out = `h${out}`
  return out
}

export function montarTranslitTokenHebraico(texto, opts = {}) {
  const he = formatarTextoMorphHb(texto)
  if (!he) return { translit: '', fonetica: '', linha: '', mesmaFormaQueLema: false }

  const lemmaUnicode = String(opts.lemmaUnicode || '').trim()
  const xlit = String(opts.lemmaTranslit || '').trim()
  const pron = String(opts.lemmaPron || '').trim()
  const mesmaForma = !!lemmaUnicode && formasLexicaisEquivalentes(he, lemmaUnicode)

  const daForma = transliterarHebraicoVocalizado(he)
  if (daForma) {
    const translit = guiaLeituraToken(daForma)
    const fonetica = mesmaForma && pron ? pron : ''
    const linha = fonetica ? `${translit} | ${fonetica}` : translit
    return { translit, fonetica, linha, mesmaFormaQueLema: mesmaForma }
  }

  if (mesmaForma && xlit) {
    const translit = guiaLeituraToken(xlit)
    const linha = pron ? `${translit} | ${pron}` : translit
    return { translit, fonetica: pron, linha, mesmaFormaQueLema: true }
  }

  if (xlit) {
    const translit = guiaLeituraToken(xlit)
    return { translit, fonetica: '', linha: translit, mesmaFormaQueLema: false }
  }

  return { translit: '', fonetica: '', linha: '', mesmaFormaQueLema: false }
}

/** Normaliza transliteração para exibição. */
export function guiaLeituraToken(tokenTranslit) {
  return String(tokenTranslit || '')
    .trim()
    .replace(/^[\u2018\u2019\u05F3'`"]+|[\u2018\u2019\u05F3'`"]+$/g, '')
    .replace(/[ʼ''`´]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[ēė]/g, 'e')
    .replace(/[ōô]/g, 'o')
    .replace(/[āă]/g, 'a')
    .replace(/[īí]/g, 'i')
    .replace(/[ūú]/g, 'u')
    .toLowerCase()
}

/**
 * Monta os campos de leitura do token.
 *
 * - Forma = lema → translit + pronunciation do Strong (fonte lexical).
 * - Forma flexionada → só transliteração calculada; pronúncia fica vazia
 *   (evita inventar guias erradas como agi-ois em vez de hag-ee-ois).
 */
export function montarLeituraToken(textoGrego, ehGrego, opts = {}) {
  const options = typeof opts === 'string' ? { translitFallback: opts } : opts || {}
  const texto = limparTextoTokenPassagem(textoGrego)
  if (!texto) {
    return { translit: '', fonetica: '', linha: '', mesmaFormaQueLema: false }
  }

  const lemmaUnicode = String(options.lemmaUnicode || '').trim()
  const lemmaTranslit = String(options.lemmaTranslit || options.translitFallback || '').trim()
  const lemmaPron = String(options.lemmaPron || '').trim()
  const mesmaForma = !!lemmaUnicode && formasLexicaisEquivalentes(texto, lemmaUnicode)

  if (!ehGrego) {
    const heb = montarTranslitTokenHebraico(texto, {
      lemmaUnicode,
      lemmaTranslit,
      lemmaPron,
    })
    return {
      translit: heb.translit,
      fonetica: heb.fonetica,
      linha: heb.linha || heb.translit,
      mesmaFormaQueLema: heb.mesmaFormaQueLema,
    }
  }

  if (mesmaForma && lemmaTranslit) {
    const translit = guiaLeituraToken(lemmaTranslit)
    const fonetica = lemmaPron
    const linha = fonetica ? `${translit} | ${fonetica}` : translit
    return { translit, fonetica, linha, mesmaFormaQueLema: true }
  }

  const translit = guiaLeituraToken(transliterarGregoBasico(texto))
  return { translit, fonetica: '', linha: translit, mesmaFormaQueLema: false }
}

/** @deprecated Use montarLeituraToken com opts.lemmaUnicode etc. */
export function montarLinhaLeituraToken(textoGrego, translitLat, ehGrego) {
  return montarLeituraToken(textoGrego, ehGrego, { translitFallback: translitLat })
}

/** Transliteração da forma na passagem (para contexto IA / fallback). */
export function transliteracaoTokenPassagem(token, detalhe, ehGrego) {
  const texto = limparTextoTokenPassagem(token?.text || token?.word || '')
  if (!texto) return ''

  const raizUnicode = String(detalhe?.greek_unicode || '').trim()
  const raizTranslit = String(detalhe?.greek_translit || detalhe?.xlit || '').trim()

  if (formasLexicaisEquivalentes(texto, raizUnicode)) {
    return raizTranslit
  }

  if (ehGrego) {
    return transliterarGregoBasico(texto)
  }

  if (formasLexicaisEquivalentes(texto, raizUnicode)) return raizTranslit
  return transliterarHebraicoVocalizado(formatarTextoMorphHb(texto))
}

export function deveExibirBarraToken(token) {
  if (!token) return false
  const texto = limparTextoTokenPassagem(token?.text || token?.word || '')
  return !!texto
}

/** Gn 1:1 a partir do token salvo na passagem. */
export function formatarReferenciaPassagemToken(tokenRef) {
  if (!tokenRef) return ''
  const livroId = Number(tokenRef.livroId)
  const capitulo = Number(tokenRef.capitulo)
  const versiculo = Number(tokenRef.versiculo ?? tokenRef.verse)
  if (!livroId || !capitulo || !versiculo) return ''
  const livro = livros.find((l) => l.id === livroId)
  if (!livro) return `${livroId}:${capitulo}:${versiculo}`
  return `${livro.abreviacao} ${capitulo}:${versiculo}`
}

export function referenciaPassagemCompleta(tokenRef) {
  if (!tokenRef) return null
  const livroId = Number(tokenRef.livroId)
  const capitulo = Number(tokenRef.capitulo)
  const versiculo = Number(tokenRef.versiculo ?? tokenRef.verse)
  if (!livroId || !capitulo || !versiculo) return null
  return { livroId, capitulo, versiculo }
}
