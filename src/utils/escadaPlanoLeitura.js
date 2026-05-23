/**
 * Escada de bonificação do plano de leitura: cada dia de meta concluída = +1 bronze;
 * 4 bronze → 1 prata; 4 prata → 1 ouro; 4 ouro → 1 troféu; 4 troféu → 1 super troféu campeão.
 * Inventário é guardado **por instância** e **reconciliado** com `indicesPlanoBonificados.length`
 * ao desmarcar capítulos, para as medalhas acompanharem as leituras.
 */

import { tentarDesbloquearMedalha } from './medalhasGamificacao'

const STORAGE_ESCADA = 'plano_leitura_escada_v1'
const prefixoInst = 'plano_leitura_escada_inst_'

function estadoVazio() {
  return {
    v: 1,
    bronze: 0,
    prata: 0,
    ouro: 0,
    trofeu: 0,
    superTrofeu: 0,
  }
}

function chaveEscadaInstancia(instanciaId) {
  return `${prefixoInst}${String(instanciaId || '')}`
}

function carregarEscadaLegacy() {
  try {
    const raw = localStorage.getItem(STORAGE_ESCADA)
    if (!raw) return null
    const j = JSON.parse(raw)
    if (!j || typeof j !== 'object') return null
    return {
      v: 1,
      bronze: Math.max(0, Number(j.bronze) || 0),
      prata: Math.max(0, Number(j.prata) || 0),
      ouro: Math.max(0, Number(j.ouro) || 0),
      trofeu: Math.max(0, Number(j.trofeu) || 0),
      superTrofeu: Math.max(0, Number(j.superTrofeu) || 0),
    }
  } catch {
    return null
  }
}

function migrarLegacyParaInstancia(instanciaId) {
  if (!instanciaId) return
  const k = chaveEscadaInstancia(instanciaId)
  try {
    if (localStorage.getItem(k)) return
    const leg = carregarEscadaLegacy()
    if (!leg) return
    localStorage.setItem(k, JSON.stringify(leg))
    localStorage.removeItem(STORAGE_ESCADA)
  } catch {
    /* ignore */
  }
}

export function carregarEscadaParaInstancia(instanciaId) {
  if (!instanciaId) return estadoVazio()
  migrarLegacyParaInstancia(instanciaId)
  try {
    const raw = localStorage.getItem(chaveEscadaInstancia(instanciaId))
    if (!raw) return estadoVazio()
    const j = JSON.parse(raw)
    if (!j || typeof j !== 'object') return estadoVazio()
    return {
      v: 1,
      bronze: Math.max(0, Number(j.bronze) || 0),
      prata: Math.max(0, Number(j.prata) || 0),
      ouro: Math.max(0, Number(j.ouro) || 0),
      trofeu: Math.max(0, Number(j.trofeu) || 0),
      superTrofeu: Math.max(0, Number(j.superTrofeu) || 0),
    }
  } catch {
    return estadoVazio()
  }
}

function gravarEscadaParaInstancia(instanciaId, s) {
  if (!instanciaId) return
  try {
    localStorage.setItem(chaveEscadaInstancia(instanciaId), JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

/** Aplica apenas a cadeia de conversões (bronze já foi incrementado). */
function aplicarConversoesEncadeadas(s) {
  let iter = 0
  while (iter < 32) {
    iter += 1
    if (s.bronze >= 4) {
      s.bronze -= 4
      s.prata += 1
      continue
    }
    if (s.prata >= 4) {
      s.prata -= 4
      s.ouro += 1
      continue
    }
    if (s.ouro >= 4) {
      s.ouro -= 4
      s.trofeu += 1
      continue
    }
    if (s.trofeu >= 4) {
      s.trofeu -= 4
      s.superTrofeu += 1
      continue
    }
    break
  }
}

/** Um marco completo: +1 bronze e conversões. Muta o objeto `s`. */
function aplicarUmMarcoCompleto(s) {
  s.bronze += 1
  aplicarConversoesEncadeadas(s)
}

/**
 * Estado final da escada após exatamente `n` marcos concluídos (sem efeitos secundários de medalhas).
 */
export function inventarioAposNMarcocos(n) {
  const s = estadoVazio()
  const safeN = Math.max(0, Number(n) || 0)
  for (let i = 0; i < safeN; i++) {
    aplicarUmMarcoCompleto(s)
  }
  return s
}

/**
 * Repõe o inventário da instância para combinar com quantos marcos já estão premiados.
 * Chamar após desmarcar capítulos ou migração de índices.
 */
export function reconciliarEscadaComIndices(inst) {
  if (!inst?.id) return
  const n = Array.isArray(inst.indicesPlanoBonificados) ? inst.indicesPlanoBonificados.length : 0
  gravarEscadaParaInstancia(inst.id, inventarioAposNMarcocos(n))
}

export function apagarChaveEscadaInstancia(instanciaId) {
  if (!instanciaId) return
  try {
    localStorage.removeItem(chaveEscadaInstancia(instanciaId))
  } catch {
    /* ignore */
  }
}

/** Zera medalhas da escada (legacy global + todas as instâncias) — migração / limpeza total. */
export function zerarInventarioEscada() {
  try {
    localStorage.removeItem(STORAGE_ESCADA)
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefixoInst)) toRemove.push(key)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

/** Zera só a escada deste plano (outros planos ativos mantêm as medalhas). */
export function zerarEscadaInstancia(instanciaId) {
  apagarChaveEscadaInstancia(instanciaId)
  try {
    const leg = carregarEscadaLegacy()
    if (leg) {
      localStorage.removeItem(STORAGE_ESCADA)
    }
  } catch {
    /* ignore */
  }
}

/** Inventário bruto (bronze/prata/ouro/trofeu podem ser 4 momentaneamente antes da conversão no mesmo ciclo). */
function clonarInventario(s) {
  return {
    bronze: Math.max(0, Number(s.bronze) || 0),
    prata: Math.max(0, Number(s.prata) || 0),
    ouro: Math.max(0, Number(s.ouro) || 0),
    trofeu: Math.max(0, Number(s.trofeu) || 0),
    superTrofeu: Math.max(0, Number(s.superTrofeu) || 0),
  }
}

/**
 * Quantas miniaturas mostrar por nível (1–4). Quando total é múltiplo de 4 e >0, mostra 4 até converter.
 */
export function pecasNivelParaBarra(totalNoNivel) {
  const t = Math.max(0, Number(totalNoNivel) || 0)
  const r = t % 4
  return r === 0 && t > 0 ? 4 : r
}

/**
 * Resumo da barra (restos visíveis) a partir de contagens brutas da escada.
 */
export function resumoVisualAPartirInventario(inv) {
  if (!inv || typeof inv !== 'object') return null
  return {
    restoBronze: pecasNivelParaBarra(inv.bronze),
    restoPrata: pecasNivelParaBarra(inv.prata),
    restoOuro: pecasNivelParaBarra(inv.ouro),
    restoTrofeu: pecasNivelParaBarra(inv.trofeu),
    superTrofeu: Math.max(0, Number(inv.superTrofeu) || 0),
  }
}

/**
 * Regista um dia de meta concluída e devolve eventos para UI da escada.
 * @param {string} instanciaId
 * @returns {Array<{ tipo: string, chave: string, mensagem: string, meta?: object }>}
 */
export function processarAoConcluirDiaNoPlano(instanciaId) {
  const s = carregarEscadaParaInstancia(instanciaId)
  const superAntes = s.superTrofeu
  const out = []

  s.bronze += 1
  out.push({
    tipo: 'plano_dia_bronze',
    chave: `pl_bronze_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    mensagem:
      'Medalha de bronze pela leitura do dia. Suas recompensas aumentarão. Continue firme!',
    meta: { confete: 'intenso', escadaSnapshot: clonarInventario(s) },
  })

  let iter = 0
  while (iter < 32) {
    iter += 1
    if (s.bronze >= 4) {
      s.bronze -= 4
      s.prata += 1
      out.push({
        tipo: 'plano_escada_conversao',
        chave: `pl_esc_prata_${Date.now()}_${iter}_${Math.random().toString(36).slice(2, 9)}`,
        mensagem: '4 medalhas de bronze viraram 1 de prata!',
        meta: { confete: 'dourado', nivel: 'prata', escadaSnapshot: clonarInventario(s) },
      })
      continue
    }
    if (s.prata >= 4) {
      s.prata -= 4
      s.ouro += 1
      out.push({
        tipo: 'plano_escada_conversao',
        chave: `pl_esc_ouro_${Date.now()}_${iter}_${Math.random().toString(36).slice(2, 9)}`,
        mensagem: '4 medalhas de prata viraram 1 de ouro!',
        meta: { confete: 'dourado', nivel: 'ouro', escadaSnapshot: clonarInventario(s) },
      })
      continue
    }
    if (s.ouro >= 4) {
      s.ouro -= 4
      s.trofeu += 1
      out.push({
        tipo: 'plano_escada_conversao',
        chave: `pl_esc_trofeu_${Date.now()}_${iter}_${Math.random().toString(36).slice(2, 9)}`,
        mensagem: '4 medalhas de ouro viraram 1 troféu!',
        meta: { confete: 'intenso', nivel: 'trofeu', escadaSnapshot: clonarInventario(s) },
      })
      continue
    }
    if (s.trofeu >= 4) {
      s.trofeu -= 4
      s.superTrofeu += 1
      out.push({
        tipo: 'plano_escada_conversao',
        chave: `pl_esc_super_${Date.now()}_${iter}_${Math.random().toString(36).slice(2, 9)}`,
        mensagem: '4 troféus viraram 1 super troféu campeão!',
        meta: { confete: 'dourado', nivel: 'superTrofeu', escadaSnapshot: clonarInventario(s) },
      })
      continue
    }
    break
  }

  gravarEscadaParaInstancia(instanciaId, s)

  if (s.superTrofeu > superAntes) {
    const m = tentarDesbloquearMedalha('pl_escada_super_campeao')
    if (m) {
      out.push({
        ...m,
        meta: { ...m.meta, escadaSnapshot: clonarInventario(s) },
      })
    }
  }

  return out
}

export function obterInventarioEscada(instanciaId) {
  return carregarEscadaParaInstancia(instanciaId)
}

/**
 * @param {string | null} [instanciaId] — sem id devolve resumo vazio; na UI do plano passar sempre o id.
 */
export function obterResumoEscadaParaUI(instanciaId = null) {
  if (!instanciaId) {
    return resumoVisualAPartirInventario(estadoVazio())
  }
  return resumoVisualAPartirInventario(carregarEscadaParaInstancia(instanciaId))
}
