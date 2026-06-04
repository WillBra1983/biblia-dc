/**
 * Resolução de textos do estudo Strong em português.
 * Base enriquecida: `short_def` = PT, `short_def_original` = EN (sem coluna `short_def_pt`).
 */

import { limparTextoStepBibleExibicao } from './strongEstudoHelpers'

/** Maiúscula no início do texto e após fim de frase (. ! ? …), quebra de linha, `;` ou `:`. */
export function capitalizarFrasesPtBr(texto) {
  const s = String(texto || '').trim()
  if (!s) return ''
  const up = (ch) => ch.toLocaleUpperCase('pt-BR')
  return s
    .replace(/^([a-zà-ú])/u, (_, c) => up(c))
    .replace(/([.!?…]+)\s+([a-zà-ú])/gu, (_, punct, c) => `${punct} ${up(c)}`)
    .replace(/\n([a-zà-ú])/gu, (_, c) => `\n${up(c)}`)
    .replace(/;\s*([a-zà-ú])/gu, (_, c) => `; ${up(c)}`)
    .replace(/:\s*([a-zà-ú])/gu, (_, c) => `: ${up(c)}`)
}

function exibirTextoLexicoPt(texto) {
  const t = String(texto || '').trim()
  return t ? capitalizarFrasesPtBr(t) : ''
}

export function textoCurtoLexicalPt(li) {
  if (!li) return ''
  const pt = String(li.short_def_pt || '').trim()
  if (pt) return exibirTextoLexicoPt(pt)
  const curto = String(li.short_def || '').trim()
  const orig = String(li.short_def_original || '').trim()
  if (orig && curto) return exibirTextoLexicoPt(curto)
  return exibirTextoLexicoPt(curto)
}

export function textoBdbExibicao(entry) {
  if (!entry) return ''
  return exibirTextoLexicoPt(entry.content_text_pt)
}

/** Não usar `definition_clean`/`definition` no ramo PT — contêm inglês; PT costuma estar em `*_original` ou `*_pt`. */
export function textoStepBibleDefPt(e, limpar = (t) => String(t || '').trim()) {
  return exibirTextoLexicoPt(
    limpar(
      e?.definition_pt ||
        e?.definition_clean_pt ||
        e?.definition_original ||
        ''
    )
  )
}

export function textoStepBibleGlossPt(e, limpar = (t) => String(t || '').trim()) {
  return exibirTextoLexicoPt(limpar(e?.gloss_pt || e?.gloss_original || ''))
}

/** Quebras visíveis para numeração STEPBible (1), 1a), Também significa:). */
export function formatarTextoStepBibleExibicao(texto) {
  let s = String(texto || '').trim()
  if (!s) return ''
  s = s.replace(/^:\s*/, '')
  s = s.replace(/\s*(Também significa:)/gi, '\n\n$1 ')
  s = s.replace(/(?<!\n)(\s+)(?=(\d+[a-z]?\)))/gi, '\n')
  s = s.replace(/\n{3,}/g, '\n\n')
  return s
}

function textoStepBibleDefRaw(e) {
  return (
    e?.definition_pt ||
    e?.definition_clean_pt ||
    e?.definition_original ||
    ''
  )
}

export function textoStepBibleDefPtExibicao(e) {
  const limpo = limparTextoStepBibleExibicao(textoStepBibleDefRaw(e))
  return exibirTextoLexicoPt(formatarTextoStepBibleExibicao(limpo))
}

export function textoStepBibleGlossPtExibicao(e) {
  const limpo = limparTextoStepBibleExibicao(e?.gloss_pt || e?.gloss_original || '')
  return exibirTextoLexicoPt(limpo)
}
