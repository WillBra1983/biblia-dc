import { lexicon as lexiconPtBrCuradoSeed } from '../data/lexicon_ptbr_curado_seed'

const lexiconCuradoMap = (() => {
  const m = new Map()
  for (const entry of lexiconPtBrCuradoSeed || []) {
    const code = String(entry?.strong || '').trim().toUpperCase()
    if (/^H\d+$/.test(code)) m.set(code, entry)
  }
  return m
})()

export function aplicarDefinicaoCurada(detalheBase, strongCode) {
  const code = String(strongCode || detalheBase?.strong || '').trim().toUpperCase()
  const curado = lexiconCuradoMap.get(code)
  if (!curado) return detalheBase
  return {
    ...detalheBase,
    greek_unicode: curado.palavra || detalheBase?.greek_unicode || '',
    greek_translit: curado.transliteracao || detalheBase?.greek_translit || '',
    definition_original: detalheBase?.definition_original || detalheBase?.definition || '',
    derivation_original: detalheBase?.derivation_original || detalheBase?.derivation || '',
    definition_pt: curado.definicao_expandida || detalheBase?.definition_pt || detalheBase?.definition || '',
    derivation_pt: detalheBase?.derivation_pt || detalheBase?.derivation || '',
    definition: curado.definicao_expandida || detalheBase?.definition || '',
    derivation: detalheBase?.derivation || '',
    ptCurado: true,
    fonteCurada: 'seed_manual'
  }
}
