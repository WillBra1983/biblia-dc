// Este arquivo agrupa os lookups completos (que dependem dos datasets pesados
// de Westminster: ~250 kB combinados). Para uso eager — apenas regex e
// parsers — use `./confissaoReferenciasLite.js` para evitar puxar os dados.
import { confissaoFeData } from '../data/confissaoFe'
import { catecismoMaior } from '../data/catecismoMaior'
import { breveCatecismo } from '../data/breveCatecismo'
import { catecismoHeidelberg } from '../data/catecismoHeidelberg'

import {
  parseCapituloRomanOuArabico,
  parseNumeroRomanOuArabico
} from './confissaoReferenciasLite'

// Re-exports para compatibilidade com callers que importam tudo daqui.
export {
  parseNumeroRomanOuArabico,
  parseCapituloRomanOuArabico,
  REGEX_CONF_LINK,
  REGEX_CFW_LINK
} from './confissaoReferenciasLite'

/**
 * Localiza capítulo e parágrafo na Confissão de Westminster (confissaoFe.js).
 * @returns {{ capitulo: number, tituloCapitulo: string, numero: number, texto: string } | null}
 */
export function buscarParagrafoConfissao(capituloRaw, paragrafoNum) {
  const cap = parseCapituloRomanOuArabico(capituloRaw)
  const np = parseNumeroRomanOuArabico(paragrafoNum, 200)
  if (!cap || !np || np < 1) return null
  const capituloObj = confissaoFeData.find((c) => Number(c.capitulo) === cap)
  if (!capituloObj?.paragrafos?.length) return null
  const p = capituloObj.paragrafos.find((x) => Number(x.numero) === np)
  if (!p?.texto) return null
  return {
    capitulo: cap,
    tituloCapitulo: String(capituloObj.titulo || ''),
    numero: np,
    texto: String(p.texto).trim()
  }
}

/**
 * Igual a `buscarParagrafoConfissao`, mas se o parágrafo não vier na referência
 * (ex.: clique em "CFW VIII"), abre o primeiro parágrafo do capítulo.
 */
export function buscarParagrafoConfissaoOuInicioCapitulo(capituloRaw, paragrafoNumRaw) {
  const np = parseNumeroRomanOuArabico(paragrafoNumRaw, 200)
  if (np != null && np >= 1) {
    return buscarParagrafoConfissao(capituloRaw, paragrafoNumRaw)
  }
  const cap = parseCapituloRomanOuArabico(capituloRaw)
  if (!cap) return null
  const capituloObj = confissaoFeData.find((c) => Number(c.capitulo) === cap)
  const first = capituloObj?.paragrafos?.[0]
  if (!first?.texto) return null
  return {
    capitulo: cap,
    tituloCapitulo: String(capituloObj.titulo || ''),
    numero: Number(first.numero) || 1,
    texto: String(first.texto).trim()
  }
}

/**
 * Busca pergunta de catecismo por sigla.
 * @returns {{ tipo: 'CMW'|'CBW'|'CH', numero: number, pergunta: string, resposta: string, referencias: string[] } | null}
 */
export function buscarPerguntaCatecismo(siglaRaw, numeroRaw) {
  const sigla = String(siglaRaw || '').trim().toUpperCase()
  const numero = parseNumeroRomanOuArabico(numeroRaw, 1000)
  if (!numero) return null

  if (sigla === 'CMW' || sigla === 'CATECISMO MAIOR') {
    const item = catecismoMaior.find((q) => Number(q.numero) === numero)
    if (!item) return null
    return {
      tipo: 'CMW',
      numero,
      pergunta: String(item.pergunta || '').trim(),
      resposta: String(item.resposta || '').trim(),
      referencias: Array.isArray(item.referencias)
        ? item.referencias.map((r) => String(r).trim())
        : String(item.referencias || '')
            .split(/[;,]/)
            .map((r) => r.trim())
            .filter(Boolean)
    }
  }

  if (sigla === 'CBW' || sigla === 'BCW' || sigla === 'BREVE CATECISMO' || sigla === 'CATECISMO BREVE') {
    const item = breveCatecismo.find((q) => Number(q.numero) === numero)
    if (!item) return null
    return {
      tipo: 'CBW',
      numero,
      pergunta: String(item.pergunta || '').trim(),
      resposta: String(item.resposta || '').trim(),
      referencias: Array.isArray(item.referencias)
        ? item.referencias.map((r) => String(r).trim())
        : String(item.referencias || '')
            .split(/[;,]/)
            .map((r) => r.trim())
            .filter(Boolean)
    }
  }

  if (sigla === 'CH' || sigla === 'CATECISMO DE HEIDELBERG') {
    const item = catecismoHeidelberg.find((q) => Number(q.numero) === numero)
    if (!item) return null
    return {
      tipo: 'CH',
      numero,
      pergunta: String(item.pergunta || '').trim(),
      resposta: String(item.resposta || '').trim(),
      referencias: Array.isArray(item.referencias) ? item.referencias : []
    }
  }

  return null
}
