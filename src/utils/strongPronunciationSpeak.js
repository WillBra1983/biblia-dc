/**
 * Prepara texto para TTS/MP3 — transliteração Strong com acentos.
 *
 * pt-BR: ó/ê naturais (Christós, thélêma), mas falha em:
 *   - theós → "teóis" (th→t + ós→óis)
 *   - Iesous → s entre vogais vira /z/
 * Usa en-US nesses casos; no pt-BR duplica s intervocálico.
 */

const MACRON_PARA_FALA = {
  ā: 'á',
  ē: 'ê',
  ī: 'í',
  ō: 'ó',
  ū: 'ú',
  ă: 'ă',
  ĕ: 'é',
  ŏ: 'ó',
  ŭ: 'u',
}

const VOZ_PT = 'pt-BR-FranciscaNeural'
const VOZ_EN = 'en-US-AndrewNeural'
const VOZ_GREGO = 'el-GR-NestorasNeural'

/** Transliteração Strong para fala: Christós, thélêma (mantém acentos). */
export function transliteracaoParaFala(translit) {
  let s = String(translit || '')
    .replace(/[ʼ''`´ᵉ]/g, '')
    .replace(/[–—]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!s) return ''

  s = [...s]
    .map((ch) => MACRON_PARA_FALA[ch] ?? ch)
    .join('')

  return s.normalize('NFC').trim()
}

/** theós no pt-BR vira "teóis"; palavras tipo Iesous viram /z/ no s. */
export function precisaVozEnUs(texto) {
  const t = String(texto || '')
  if (/^th.+ós$/i.test(t)) return true
  if (/[aeiouáéíóúâêôãõàèìòùêîûô]s[aeiouáéíóúâêôãõàèìòùêîûô]/i.test(t)) return true
  if (/sous$/i.test(t)) return true
  return false
}

/** pt-BR: s entre vogais → ss (Jesus/Iesous sem virar /z/). */
export function ajustarIntervocalicSPtBr(texto) {
  return String(texto || '').replace(
    /(?<=[aeiouáéíóúâêôãõàèìòùêîûôAEIOU])s(?=[aeiouáéíóúâêôãõàèìòùêîûôAEIOU])/g,
    'ss'
  )
}

/** en-US: latim sem acentos — leitura neutra (theos, Iesous). */
export function latinParaEnUs(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .normalize('NFC')
    .trim()
}

export function gregoMonotonic(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .normalize('NFC')
    .trim()
}

export function guiaFoneticaParaFala(pronuncia) {
  const raw = String(pronuncia || '').trim()
  if (!raw) return ''
  return raw
    .replace(/[ʼ''`´]/g, '')
    .replace(/[–—]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function latinaUtilizavel(texto) {
  const t = String(texto || '').trim()
  return t.length >= 2 && /[a-zA-Z\u00C0-\u024F]/.test(t)
}

export function escolherVozTransliteracao(texto, ehGrego) {
  if (precisaVozEnUs(texto)) {
    return { voice: VOZ_EN, lang: 'en-US' }
  }
  const temAcento = /[óáéíúâêôãõàèìòùăēīōū]/i.test(texto)
  if (temAcento || ehGrego) {
    return { voice: VOZ_PT, lang: 'pt-BR' }
  }
  return { voice: VOZ_EN, lang: 'en-US' }
}

/** Texto final + voz para TTS a partir da transliteração. */
export function prepararTextoEVozTransliteracao(translit, ehGrego) {
  const base = transliteracaoParaFala(translit)
  if (!latinaUtilizavel(base)) {
    return { texto: '', lang: 'en-US', voice: VOZ_EN, origem: '' }
  }

  const { voice, lang } = escolherVozTransliteracao(base, ehGrego)

  if (lang === 'en-US') {
    return {
      texto: latinParaEnUs(base),
      lang,
      voice,
      origem: 'transliteracao_en_us',
    }
  }

  return {
    texto: ajustarIntervocalicSPtBr(base),
    lang,
    voice,
    origem: 'transliteracao_pt_br',
  }
}

export function prepararFalaLemmaStrong({ pronuncia, translit, unicode, ehGrego }) {
  const prep = prepararTextoEVozTransliteracao(translit, ehGrego)
  if (prep.texto) {
    return { ...prep, origem: prep.origem || 'transliteracao_acentuada' }
  }

  const guia = guiaFoneticaParaFala(pronuncia)
  if (guia) {
    return { texto: guia, lang: 'en-US', voice: VOZ_EN, origem: 'guia_fonetica' }
  }

  if (ehGrego) {
    const mono = gregoMonotonic(unicode)
    if (mono.length >= 2) {
      return { texto: mono, lang: 'el-GR', voice: VOZ_GREGO, origem: 'grego_monotonic' }
    }
  }

  const fallback = gregoMonotonic(unicode) || String(unicode || '').trim()
  return {
    texto: fallback,
    lang: ehGrego ? 'el-GR' : 'en-US',
    voice: ehGrego ? VOZ_GREGO : VOZ_EN,
    origem: 'unicode_fallback',
  }
}

export function prepararFalaTokenPassagem({ unicode, translit, ehGrego }) {
  const prep = prepararTextoEVozTransliteracao(translit, ehGrego)
  if (prep.texto) {
    return { ...prep, origem: prep.origem || 'transliteracao_token' }
  }

  const mono = gregoMonotonic(unicode)
  if (mono.length >= 2) {
    return {
      texto: mono,
      lang: ehGrego ? 'el-GR' : 'en-US',
      voice: ehGrego ? VOZ_GREGO : VOZ_EN,
      origem: 'forma_monotonic',
    }
  }

  return {
    texto: String(unicode || '').trim(),
    lang: ehGrego ? 'el-GR' : 'en-US',
    voice: ehGrego ? VOZ_GREGO : VOZ_EN,
    origem: 'unicode_raw',
  }
}

export function transliteracaoLatinizada(translit) {
  return transliteracaoParaFala(translit)
}
