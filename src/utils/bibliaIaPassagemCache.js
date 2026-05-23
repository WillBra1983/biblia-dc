/**
 * Cache local (localStorage) para estudos gerados pela IA em
 * `/estudos-biblicos/ia-passagem`.
 *
 * Por que existe
 * --------------
 * Cada chamada à API Gemini consome cota (tier gratuito) ou custo (tier
 * pago). Mantemos o resultado de cada combinação livro/capítulo/versículos
 * em localStorage para que abrir o mesmo trecho de novo (ou compartilhar
 * o link com outra pessoa) **não** dispare nova chamada.
 *
 * Estratégia
 * ----------
 * - Chave: `salvation-ia-passagem:<livro>:<cap>:<vers-ordenados>[:<tom>]`.
 *   O sufixo de **tom** só aparece quando ≠ padrão (`pastoral`) — assim
 *   caches antigos (gerados antes do seletor de tom existir) seguem válidos.
 * - Valor: `{ versao, geradoEm, texto, meta }`.
 * - Sem TTL agressivo — o conteúdo é didático e raramente "envelhece".
 *   Quem quiser regenerar pode passar `?refresh=1` na URL ou trocar de tom.
 */

import { sufixoChaveCacheTom } from './iaTonalidade'

const PREFIXO = 'salvation-ia-passagem:'
const VERSAO_ATUAL = 1

export function chaveCacheIaPassagem(livroId, capitulo, versiculosArr, tom) {
  const vers = [...new Set((versiculosArr || []).map((n) => Number(n)))]
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b)
    .join(',')
  return `${PREFIXO}${Number(livroId) || 0}:${Number(capitulo) || 0}:${vers}${sufixoChaveCacheTom(tom)}`
}

export function lerCacheIaPassagem(livroId, capitulo, versiculosArr, tom) {
  try {
    const k = chaveCacheIaPassagem(livroId, capitulo, versiculosArr, tom)
    const raw = localStorage.getItem(k)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.versao !== VERSAO_ATUAL) return null
    if (typeof parsed.texto !== 'string' || !parsed.texto.trim()) return null
    return parsed
  } catch (_) {
    return null
  }
}

export function gravarCacheIaPassagem(livroId, capitulo, versiculosArr, { texto, meta, tom }) {
  try {
    const k = chaveCacheIaPassagem(livroId, capitulo, versiculosArr, tom)
    const payload = {
      versao: VERSAO_ATUAL,
      geradoEm: Date.now(),
      texto: String(texto || ''),
      meta: meta || null
    }
    localStorage.setItem(k, JSON.stringify(payload))
    return true
  } catch (_) {
    return false
  }
}

export function apagarCacheIaPassagem(livroId, capitulo, versiculosArr, tom) {
  try {
    localStorage.removeItem(chaveCacheIaPassagem(livroId, capitulo, versiculosArr, tom))
    return true
  } catch (_) {
    return false
  }
}
