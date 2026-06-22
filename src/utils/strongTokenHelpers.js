/**
 * Helpers para exibição de tokens Strong na passagem.
 *
 * Regra de ouro: lema e token têm campos próprios (unicode, translit, pronunciation).
 * O MorphGNT só traz a forma grega + morfologia — não há translit/pronúncia por token
 * no banco. Só reutilizamos os dados do Strong quando a forma do token = lema.
 */

import { limparTextoTokenPassagem, formatarTextoMorphHb } from './strongTokenContext'
import { textoHebraicoVocalizado, transliterarHebraicoVocalizado } from './hebrewDisplay'
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

function aplicarVocalizacaoSeNecessario(forma, headwordVocalizado) {
  const f = String(forma || '').trim()
  const hw = String(headwordVocalizado || '').trim()
  if (!f) return hw
  if (textoHebraicoVocalizado(f)) return f
  if (hw && formasLexicaisEquivalentes(f, hw)) return hw
  return f
}

function vocalizarPrefixoMorphHb(prefixo, parteSeguinteVocalizada) {
  const p = String(prefixo || '').trim()
  if (!p || textoHebraicoVocalizado(p) || !parteSeguinteVocalizada) return p
  if (p.length !== 1) return p
  const comSheva = {
    '\u05D1': '\u05D1\u05B0', // בְ
    '\u05DB': '\u05DB\u05B0', // כְ
    '\u05DC': '\u05DC\u05B0', // לְ
    '\u05D5': '\u05D5\u05B0', // וְ
  }
  if (p === '\u05D4') {
    // Artigo definido (MorphHB «Hd/…»): הַ ou הָ perante guturais (אעהר)
    const guturais = new Set(['\u05D0', '\u05E2', '\u05D7', '\u05D4', '\u05E8'])
    const prox = String(parteSeguinteVocalizada || '').normalize('NFC')
    const base = [...prox].find((ch) => {
      const cp = ch.codePointAt(0)
      return cp >= 0x05D0 && cp <= 0x05EA
    })
    const vogal = base && guturais.has(base) ? '\u05B8' : '\u05B7'
    return p + vogal
  }
  return comSheva[p] || p
}

/**
 * MorphHB + vocalização: se o token não traz niqqud, usa o headword Strong
 * quando a forma consonantal coincide (ex.: ראשית → רֵאשִׁית).
 * Prefixos ב/כ/ל/ו recebem sheva quando a parte seguinte está vocalizada.
 */
export function formatarTextoMorphHbVocalizado(texto, headwordVocalizado) {
  const raw = String(texto || '').trim()
  const hw = String(headwordVocalizado || '').trim()
  if (!raw) return hw
  if (!raw.includes('/')) {
    return aplicarVocalizacaoSeNecessario(formatarTextoMorphHb(raw), hw)
  }
  const partesRaw = raw.split('/')
  const partes = partesRaw.map((parte, idx) => {
    const p = parte.trim()
    if (!p) return ''
    if (idx === partesRaw.length - 1 && hw) {
      return aplicarVocalizacaoSeNecessario(p, hw)
    }
    return p
  })
  for (let i = 0; i < partes.length - 1; i++) {
    if (partes[i] && partes[i + 1] && textoHebraicoVocalizado(partes[i + 1])) {
      partes[i] = vocalizarPrefixoMorphHb(partes[i], partes[i + 1])
    }
  }
  return partes.join('').normalize('NFC')
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

/** Normaliza transliteração para exibição. */
export function guiaLeituraToken(tokenTranslit) {
  return String(tokenTranslit || '')
    .trim()
    .toLowerCase()
    .replace(/^[\u2018\u2019\u05F3'`"]+|[\u2018\u2019\u05F3'`"]+$/g, '')
    .replace(/[ʻʼ''`´]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[ēėê]/g, 'e')
    .replace(/[ōô]/g, 'o')
    .replace(/[āăâ]/g, 'a')
    .replace(/[īíî]/g, 'i')
    .replace(/[ūúû]/g, 'u')
}

function transliteracaoTemVogalLatinas(s) {
  const t = guiaLeituraToken(s)
  return /[aeiou]/i.test(t)
}

/** Prefixos MorphHB (ב/כ/ל/ו/ה/מ…) → latim aproximado quando o token flexionado não traz niqqud. */
function transliterarPrefixosMorphHb(partesPrefixo) {
  let out = ''
  for (const px of partesPrefixo) {
    const p = String(px || '').trim()
    if (!p) continue
    if (p === 'ו') {
      out += 've'
      continue
    }
    if (p === 'ב') {
      out += 'be'
      continue
    }
    if (p === 'כ') {
      out += 'ke'
      continue
    }
    if (p === 'ל') {
      out += 'le'
      continue
    }
    if (p === 'ה') {
      out += 'ha'
      continue
    }
    if (p === 'מ') {
      out += 'me'
      continue
    }
    const voc = vocalizarPrefixoMorphHb(p, true)
    out += transliterarHebraicoVocalizado(voc) || p
  }
  return out
}

/**
 * Fallback: léma Strong (xlit) quando a forma na passagem não tem niqqud.
 * Preserva prefixos MorphHB (ex.: ו/יאמר → veamar).
 */
function montarTranslitFallbackLema(raw, xlit) {
  const raiz = guiaLeituraToken(xlit)
  if (!raiz || !transliteracaoTemVogalLatinas(raiz)) return ''
  if (!raw.includes('/')) return raiz
  const prefixLat = transliterarPrefixosMorphHb(raw.split('/').slice(0, -1))
  return prefixLat ? `${prefixLat}${raiz}` : raiz
}

/** Sufixos pronominais MorphHB (ex.: ב/ו, ל/הם) sem entrada Strong própria. */
function transliterarUltimoSegmentoMorphHb(segmento) {
  const map = {
    ו: 'o',
    ה: 'a',
    הו: 'hu',
    הם: 'hem',
    הן: 'hen',
    ך: 'kha',
    כם: 'khem',
    כן: 'khen',
    נו: 'nu',
    ם: 'm',
    ן: 'n',
    י: 'i',
  }
  const s = String(segmento || '').trim()
  return map[s] ?? transliterarHebraicoVocalizado(s)
}

function montarTranslitApenasMorphHb(raw) {
  if (!raw.includes('/')) return ''
  const parts = raw.split('/').map((p) => p.trim()).filter(Boolean)
  if (!parts.length) return ''
  if (parts.length === 1) {
    const t = guiaLeituraToken(transliterarHebraicoVocalizado(parts[0]))
    return transliteracaoTemVogalLatinas(t) ? t : ''
  }
  const prefixLat = transliterarPrefixosMorphHb(parts.slice(0, -1))
  const suffixLat = guiaLeituraToken(transliterarUltimoSegmentoMorphHb(parts[parts.length - 1]))
  const out = `${prefixLat}${suffixLat}`
  return transliteracaoTemVogalLatinas(out) ? out : ''
}

/** Formas isoladas sem Strong (artigo, pronomes enclíticos). */
function montarTranslitFormaIsolada(raw) {
  const map = {
    ה: 'ha',
    לך: 'lekha',
    כה: 'kha',
    בה: 'ba',
    ממך: 'memekha',
  }
  const key = formatarTextoMorphHb(raw)
  const v = map[key]
  return v && transliteracaoTemVogalLatinas(v) ? v : ''
}

function tokenTemArtigoHaMorph(raw) {
  const parts = String(raw || '')
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean)
  return parts.length > 1 && parts[0] === '\u05D4'
}

export function montarTranslitTokenHebraico(texto, opts = {}) {
  const lemmaUnicode = String(opts.lemmaUnicode || '').trim()
  const xlit = String(opts.lemmaTranslit || '').trim()
  const pron = String(opts.lemmaPron || '').trim()

  const raw = String(texto || '').trim()
  const heConsonantal = formatarTextoMorphHb(raw)
  if (!heConsonantal) return { translit: '', fonetica: '', linha: '', mesmaFormaQueLema: false }

  const mesmaForma = !!lemmaUnicode && formasLexicaisEquivalentes(heConsonantal, lemmaUnicode)
  const he = formatarTextoMorphHbVocalizado(raw, lemmaUnicode)

  const daForma = transliterarHebraicoVocalizado(he)
  const daFormaComVogais = daForma && transliteracaoTemVogalLatinas(daForma)

  if (daFormaComVogais) {
    let translit = guiaLeituraToken(daForma)
    if (tokenTemArtigoHaMorph(raw) && xlit && !/^ha[a-z]/.test(translit)) {
      const fb = montarTranslitFallbackLema(raw, xlit)
      if (fb) translit = fb
    }
    const fonetica = mesmaForma && pron ? pron : ''
    const linha = fonetica ? `${translit} | ${fonetica}` : translit
    return { translit, fonetica, linha, mesmaFormaQueLema: mesmaForma }
  }

  if (mesmaForma && xlit) {
    const translit = guiaLeituraToken(xlit)
    const linha = pron ? `${translit} | ${pron}` : translit
    return { translit, fonetica: pron, linha, mesmaFormaQueLema: true }
  }

  const fallbackLema = xlit ? montarTranslitFallbackLema(raw, xlit) : ''
  if (fallbackLema) {
    return { translit: fallbackLema, fonetica: '', linha: fallbackLema, mesmaFormaQueLema: false }
  }

  const morphOnly = montarTranslitApenasMorphHb(raw)
  if (morphOnly) {
    return { translit: morphOnly, fonetica: '', linha: morphOnly, mesmaFormaQueLema: false }
  }

  const isolada = montarTranslitFormaIsolada(raw)
  if (isolada) {
    return { translit: isolada, fonetica: '', linha: isolada, mesmaFormaQueLema: false }
  }

  if (daForma) {
    const translit = guiaLeituraToken(daForma)
    return { translit, fonetica: '', linha: translit, mesmaFormaQueLema: mesmaForma }
  }

  return { translit: '', fonetica: '', linha: '', mesmaFormaQueLema: false }
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
  return transliterarHebraicoVocalizado(
    formatarTextoMorphHbVocalizado(texto, raizUnicode)
  )
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

/** Chave estável para cache da análise de forma (prefixo/flexão) numa passagem. */
export function chaveCacheAnaliseToken(code, token) {
  const c = String(code || '').trim().toUpperCase()
  const forma = normalizarFormaLexical(
    formatarTextoMorphHb(limparTextoTokenPassagem(token?.text || token?.word || ''))
  )
  const ref = referenciaPassagemCompleta(token)
  const refKey = ref ? `${ref.livroId}.${ref.capitulo}.${ref.versiculo}` : 'sem-ref'
  const morph = String(token?.morph || '')
    .trim()
    .toLowerCase()
    .slice(0, 48)
  return `${c}@${forma || 'forma'}@${refKey}@${morph || 'm'}`
}

/**
 * A forma na passagem merece bloco próprio (prefixo MorphHB, flexão ou morfologia)?
 * Igual ao léma isolado → só o resumo do léma.
 */
export function precisaAnaliseFormaPassagem(token, detalhe, ehGrego) {
  if (!deveExibirBarraToken(token)) return false
  const raw = limparTextoTokenPassagem(token?.text || token?.word || '')
  if (!raw) return false
  const lemma = String(detalhe?.greek_unicode || '').trim()
  if (ehGrego) {
    if (!lemma) return true
    return !formasLexicaisEquivalentes(raw, lemma)
  }
  if (raw.includes('/')) return true
  const he = formatarTextoMorphHb(raw)
  if (lemma && he && !formasLexicaisEquivalentes(he, lemma)) return true
  const morph = String(token?.morph || '').trim()
  if (morph && !/^[-—?]$/.test(morph)) return true
  return false
}
