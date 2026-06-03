/**
 * Fontes e transliteração vocalizada (niqqud) para hebraico no Strong / Bíblia.
 */

import { formatarTextoMorphHb } from './strongTokenContext'

/** Empacotada via @fontsource/noto-serif-hebrew em main.jsx. */
export const FONT_FAMILY_HEBREW =
  '"Noto Serif Hebrew", "David Libre", "Ezra SIL", "Noto Sans Hebrew", serif'

export const FONT_FAMILY_GREEK_STRONG =
  '"Source Serif 4", "Noto Serif", "Times New Roman", serif'

/** Estilos MUI para texto hebraico vocalizado (niqqud + ta'amim). */
export const sxHebrewVocalizado = {
  fontFamily: FONT_FAMILY_HEBREW,
  /** 400 evita bold sintético no Chrome/Windows, que oculta niqqud. */
  fontWeight: 400,
  direction: 'rtl',
  unicodeBidi: 'plaintext',
  fontFeatureSettings: '"mark" 1, "mkmk" 1',
  fontSynthesis: 'none',
  textRendering: 'optimizeLegibility',
  WebkitFontSmoothing: 'antialiased',
  lineHeight: 1.45,
}

export function fontFamilyStrongPassagem(ehGrego) {
  return ehGrego ? FONT_FAMILY_GREEK_STRONG : FONT_FAMILY_HEBREW
}

const CANTILACAO_MIN = 0x0591
const CANTILACAO_MAX = 0x05af

function ehCantilacao(ch) {
  const cp = ch.codePointAt(0)
  return cp >= CANTILACAO_MIN && cp <= CANTILACAO_MAX
}

/** Indica se o texto ainda traz niqqud. */
export function textoHebraicoVocalizado(texto) {
  const nfd = String(texto || '').normalize('NFD')
  for (const ch of nfd) {
    const cp = ch.codePointAt(0)
    if (cp >= 0x05b0 && cp <= 0x05bc) return true
    if (cp === 0x05b9 || cp === 0x05bb) return true
  }
  return false
}

/**
 * Transliteração latina a partir da forma vocalizada do token (niqqud).
 * Cantilação (U+0591–05AF) é ignorada na saída.
 */
export function transliterarHebraicoVocalizado(palavra) {
  const w = formatarTextoMorphHb(palavra)
  if (!w) return ''

  const mapConsoantes = {
    א: "'",
    ב: 'b',
    ג: 'g',
    ד: 'd',
    ה: 'h',
    ו: 'v',
    ז: 'z',
    ח: 'ch',
    ט: 't',
    י: 'y',
    כ: 'k',
    ך: 'k',
    ל: 'l',
    מ: 'm',
    ם: 'm',
    נ: 'n',
    ן: 'n',
    ס: 's',
    ע: "'",
    פ: 'p',
    ף: 'p',
    צ: 'ts',
    ץ: 'ts',
    ק: 'q',
    ר: 'r',
    ש: 'sh',
    ת: 't',
  }

  const mapVogais = {
    '\u05B0': 'e',
    '\u05B1': 'e',
    '\u05B2': 'a',
    '\u05B3': 'o',
    '\u05B4': 'i',
    '\u05B5': 'e',
    '\u05B6': 'e',
    '\u05B7': 'a',
    '\u05B8': 'a',
    '\u05B9': 'o',
    '\u05BB': 'u',
    '\u05BC': '',
    '\u05C1': '',
    '\u05C2': '',
  }

  let out = ''
  const base = w.normalize('NFD')
  for (const ch of base) {
    if (ehCantilacao(ch)) continue
    out += mapConsoantes[ch] ?? mapVogais[ch] ?? ''
  }
  out = out.replace(/vv/g, 'v').replace(/shh/g, 'sh').replace(/''+/g, "'")
  return out.trim()
}
