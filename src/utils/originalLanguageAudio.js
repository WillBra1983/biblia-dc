const HEBREW_AUDIO_BASE =
  'https://archive.org/download/HebBible_AShmuelof'

const GREEK_AUDIO_BASE =
  'https://raw.githubusercontent.com/ManolisMariakakis/Narration-of-the-Greek-New-Testament-TR-Scrivener-1894/main/mp3'

const HEBREW_BOOK_FILE = {
  1: 'Gen',
  2: 'Exo',
  3: 'Lev',
  4: 'Num',
  5: 'Deu',
  6: 'Jos',
  7: 'Jdg',
  8: 'Rut',
  9: '1Sa',
  10: '2Sa',
  11: '1Ki',
  12: '2Ki',
  13: '1Ch',
  14: '2Ch',
  15: 'Ezr',
  16: 'Neh',
  17: 'Est',
  18: 'Job',
  19: 'Psa',
  20: 'Pro',
  21: 'Ecc',
  22: 'Sng',
  23: 'Isa',
  24: 'Jer',
  25: 'Lam',
  26: 'Ezk',
  27: 'Dan',
  28: 'Hos',
  29: 'Jol',
  30: 'Amo',
  31: 'Oba',
  32: 'Jon',
  33: 'Mic',
  34: 'Nam',
  35: 'Hab',
  36: 'Zep',
  37: 'Hag',
  38: 'Zec',
  39: 'Mal',
}

const GREEK_BOOK_FILE = {
  40: 'mat',
  41: 'mrk',
  42: 'luk',
  43: 'jhn',
  44: 'act',
  45: 'rom',
  46: '1co',
  47: '2co',
  48: 'gal',
  49: 'eph',
  50: 'php',
  51: 'col',
  52: '1th',
  53: '2th',
  54: '1ti',
  55: '2ti',
  56: 'tit',
  57: 'phm',
  58: 'heb',
  59: 'jas',
  60: '1pe',
  61: '2pe',
  62: '1jn',
  63: '2jn',
  64: '3jn',
  65: 'jud',
  66: 'rev',
}

export function tipoAudioLinguaOriginal(livroId) {
  const id = Number(livroId)
  if (HEBREW_BOOK_FILE[id]) return 'hebraico'
  if (GREEK_BOOK_FILE[id]) return 'grego'
  return null
}

function faixaHebraica(codigo, capitulo, inicio = 0, fim = null, marcacoes = {}) {
  const arquivo = codigo === 'Oba'
    ? 'hbofOba.mp3'
    : `hbof${codigo}_${String(capitulo).padStart(2, '0')}.mp3`
  return {
    src: `${HEBREW_AUDIO_BASE}/${arquivo}`,
    inicio,
    fim,
    capituloFonte: capitulo,
    versiculoOffset: 0,
    ...marcacoes,
  }
}

/**
 * Retorna faixas humanas, completas e inalteradas por capítulo.
 * Joel e Malaquias têm divisão de capítulos diferente no texto hebraico.
 */
export function audiosCapituloHebraico(livroId, capitulo) {
  const id = Number(livroId)
  const codigo = HEBREW_BOOK_FILE[id]
  const cap = Number(capitulo)
  if (!codigo || !Number.isInteger(cap) || cap < 1) return []

  // Na divisão hebraica, Joel 2:28-32 forma o capítulo 3 e Joel 3 é o capítulo 4.
  if (id === 29 && cap === 2) {
    return [faixaHebraica(codigo, 2), faixaHebraica(codigo, 3, 0, null, { versiculoOffset: 27 })]
  }
  if (id === 29 && cap === 3) return [faixaHebraica(codigo, 4)]

  // Na divisão hebraica, Malaquias 4:1-6 corresponde a Malaquias 3:19-24.
  // Os tempos vêm da marcação oficial do eBible e não alteram o arquivo original.
  if (id === 39 && cap === 3) {
    return [faixaHebraica(codigo, 3, 0, 239.5, { versiculoFonteFim: 18 })]
  }
  if (id === 39 && cap === 4) {
    return [
      faixaHebraica(codigo, 3, 239.5, 318.1, {
        versiculoFonteInicio: 19,
        versiculoOffset: -18,
      }),
    ]
  }

  return [faixaHebraica(codigo, cap)]
}

export const HEBREW_AUDIO_INTROS = {
  '1:1': {
    hebraico: 'חֲמִשָּׁה חֻמְשֵׁי תוֹרָה, סֵפֶר בְּרֵאשִׁית, פָּרָשַׁת בְּרֵאשִׁית',
    portugues: 'Os cinco livros da Torá; livro de Gênesis; porção Bereshit.',
  },
  '2:1': { hebraico: 'שְׁמוֹת, פֶּרֶק א׳', portugues: 'Êxodo, capítulo 1.' },
  '3:1': { hebraico: 'וַיִּקְרָא, פֶּרֶק א׳', portugues: 'Levítico, capítulo 1.' },
  '4:1': {
    hebraico: 'פָּרָשַׁת בְּמִדְבַּר, סֵפֶר בְּמִדְבַּר, פֶּרֶק א׳',
    portugues: 'Porção Bamidbar; livro de Números; capítulo 1.',
  },
  '5:1': {
    hebraico: 'פָּרָשַׁת דְּבָרִים, סֵפֶר דְּבָרִים, פֶּרֶק א׳',
    portugues: 'Porção Devarim; livro de Deuteronômio; capítulo 1.',
  },
  '10:1': { hebraico: 'סֵפֶר שְׁמוּאֵל ב׳, פֶּרֶק א׳', portugues: 'Segundo livro de Samuel, capítulo 1.' },
  '11:1': { hebraico: 'סֵפֶר מְלָכִים א׳, פֶּרֶק א׳', portugues: 'Primeiro livro dos Reis, capítulo 1.' },
  '12:1': { hebraico: 'סֵפֶר מְלָכִים ב׳, פֶּרֶק א׳', portugues: 'Segundo livro dos Reis, capítulo 1.' },
  '14:1': { hebraico: 'סֵפֶר דִּבְרֵי הַיָּמִים ב׳, פֶּרֶק א׳', portugues: 'Segundo livro das Crônicas, capítulo 1.' },
  '17:1': { hebraico: 'מְגִלַּת אֶסְתֵּר, פֶּרֶק א׳', portugues: 'Rolo de Ester, capítulo 1.' },
  '18:1': { hebraico: 'סֵפֶר אִיּוֹב, פֶּרֶק א׳', portugues: 'Livro de Jó, capítulo 1.' },
  '21:1': { hebraico: 'מְגִלַּת קֹהֶלֶת, פֶּרֶק א׳', portugues: 'Rolo de Eclesiastes, capítulo 1.' },
  '22:1': { hebraico: 'שִׁיר הַשִּׁירִים, פֶּרֶק א׳', portugues: 'Cântico dos Cânticos, capítulo 1.' },
  '27:1': { hebraico: 'סֵפֶר דָּנִיֵּאל, פֶּרֶק א׳', portugues: 'Livro de Daniel, capítulo 1.' },
  '38:1': { hebraico: 'זְכַרְיָה, פֶּרֶק א׳', portugues: 'Zacarias, capítulo 1.' },
}

export function introducaoAudioHebraico(livroId, capitulo) {
  return HEBREW_AUDIO_INTROS[`${Number(livroId)}:${Number(capitulo)}`] || null
}

export function urlAudioCapituloGrego(livroId, capitulo) {
  const file = GREEK_BOOK_FILE[Number(livroId)]
  const cap = Number(capitulo)
  if (!file || !Number.isInteger(cap) || cap < 1) return null
  return `${GREEK_AUDIO_BASE}/${file}-${cap}.mp3`
}

export const ORIGINAL_AUDIO_ATTRIBUTIONS = {
  hebraico: {
    leitor: 'Abraham Shmuelof',
    detalhe: 'voz humana · texto hebraico massorético · CC BY-NC-ND 4.0',
    fonte: 'https://archive.org/details/HebBible_AShmuelof',
    licenca: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  },
  grego: {
    leitor: 'Theo Karvounakis',
    detalhe: 'voz humana · pronúncia grega contemporânea · Textus Receptus (Scrivener 1894) · GPL-3.0',
    fonte:
      'https://github.com/ManolisMariakakis/Narration-of-the-Greek-New-Testament-TR-Scrivener-1894',
    licenca:
      'https://github.com/ManolisMariakakis/Narration-of-the-Greek-New-Testament-TR-Scrivener-1894/blob/main/LICENSE',
  },
}
