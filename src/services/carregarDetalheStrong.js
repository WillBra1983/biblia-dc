import {
  buscarStrongHebraico,
  buscarLexicalIndexHebraico
} from './otStrongService'
import { buscarStrongGrego } from './ntStrongProvaService'
import { buscarStepBiblePorStrong } from './stepBibleLexiconService'
import { buscarLexiconPtBr } from './lexiconPtBrService'
import { aplicarDefinicaoCurada } from '../utils/lexiconCuradoHebrew'

/**
 * Carrega o mesmo objeto `detalhe` que o antigo modal Strong usava (Biblia.jsx).
 */
export async function carregarDetalheStrong(code, options = {}) {
  const stepBibleDisponivel = Boolean(options.stepBibleDisponivel)
  const lexiconPtBrDisponivel = Boolean(options.lexiconPtBrDisponivel)

  const c = String(code || '').trim().toUpperCase()
  if (!c) return { detalhe: null }

  let detalhe = null

  if (c.startsWith('H')) {
    const [lex, lexicalRows, sbRows, ptLex] = await Promise.all([
      buscarStrongHebraico(c),
      buscarLexicalIndexHebraico(c),
      stepBibleDisponivel ? buscarStepBiblePorStrong(c, 14) : Promise.resolve([]),
      lexiconPtBrDisponivel ? buscarLexiconPtBr(c) : Promise.resolve(null)
    ])
    if (lex) {
      detalhe = {
        strong: lex.strong_code,
        greek_unicode: lex.headword || '',
        greek_translit: lex.xlit || '',
        definition: lex.meaning || lex.usage || '',
        definition_original: lex.meaning || lex.usage || '',
        derivation: lex.source || '',
        derivation_original: lex.source || '',
        lexicalIndex: lexicalRows || [],
        stepBibleEntries: sbRows || []
      }
      detalhe = aplicarDefinicaoCurada(detalhe, c)
      detalhe.definition_pt = detalhe.definition
      if (ptLex && !detalhe?.ptCurado) {
        detalhe.definition_pt = ptLex.definicao_expandida || detalhe.definition_pt || detalhe.definition
        detalhe.definition = detalhe.definition_pt
        detalhe.ptCurado = true
      }
    } else if (sbRows?.length) {
      const first = sbRows[0]
      detalhe = {
        strong: c,
        greek_unicode: first.lemma || '',
        greek_translit: first.transliteration || '',
        definition: first.definition || first.gloss || '',
        definition_original: first.definition || first.gloss || '',
        derivation: '',
        derivation_original: '',
        lexicalIndex: lexicalRows || [],
        stepBibleEntries: sbRows
      }
    }
  } else {
    const [grego, sbRows, ptLex] = await Promise.all([
      buscarStrongGrego(c),
      stepBibleDisponivel ? buscarStepBiblePorStrong(c, 14) : Promise.resolve([]),
      lexiconPtBrDisponivel ? buscarLexiconPtBr(c) : Promise.resolve(null)
    ])
    if (grego) {
      detalhe = {
        ...grego,
        stepBibleEntries: sbRows || []
      }
      detalhe = aplicarDefinicaoCurada(detalhe, c)
      detalhe.definition_original = detalhe.definition_original || detalhe.definition || ''
      detalhe.derivation_original = detalhe.derivation_original || detalhe.derivation || ''
      detalhe.definition_pt = detalhe.definition
      if (ptLex && !detalhe?.ptCurado) {
        detalhe.definition_pt = ptLex.definicao_expandida || detalhe.definition_pt || detalhe.definition
        detalhe.definition = detalhe.definition_pt
        detalhe.ptCurado = true
      }
    } else if (sbRows?.length) {
      const first = sbRows[0]
      detalhe = {
        strong: c,
        greek_unicode: first.lemma || '',
        greek_translit: first.transliteration || '',
        definition: first.definition || first.gloss || '',
        definition_original: first.definition || first.gloss || '',
        derivation: '',
        derivation_original: '',
        stepBibleEntries: sbRows
      }
    }
  }

  return { detalhe }
}
