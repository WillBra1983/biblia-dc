/**
 * Incentivos locais (localStorage): sequência na Palavra, plano, perdão semanal,
 * eventos para UI (Snackbar + confete). Integra com medalhas em medalhasGamificacao.js.
 */

import {
  diaCivilAmericaSaoPaulo,
  diferencaDiasIso,
  ontem,
  chaveSemanaIsoSP,
} from './fusoHorarioBrasil'

const STORAGE_KEY = 'incentivos_app_v1'
const VERSION = 2

/**
 * Marcos extras só no plano (a Palavra usa medalhas em medalhasGamificacao.js).
 * Mantido export para compatibilidade / analytics.
 */
export const MARCOS_SEQUENCIA_BIBLIA = []
export const MARCOS_SEQUENCIA_PLANO = [1, 3, 7, 14, 30]

function mensagemMarcoBiblia(n) {
  const map = {
    1: 'Um dia na Palavra — todo hábito começa assim.',
    3: '3 dias seguidos — firme no costume.',
    7: 'Uma semana na Palavra — perseverança que forma.',
    14: 'Duas semanas — disciplina visível.',
    30: 'Um mês na Palavra — raízes crescendo.',
    90: '90 dias — caminho de discípulo.',
  }
  return map[n] || `${n} dias seguidos na Palavra — continue assim!`
}

function mensagemMarcoPlano(n) {
  const map = {
    1: 'Primeiro dia no plano — ótimo começo!',
    3: '3 dias no plano — constância!',
    7: 'Uma semana cumprindo o plano!',
    14: 'Duas semanas no plano!',
    30: 'Um mês fiel ao plano de leitura!',
  }
  return map[n] || `${n} dias seguidos no plano — excelente!`
}

function confeteMarcoPlano(n) {
  if (n === 7 || n === 30) return 'intenso'
  if (n === 14) return 'dourado'
  return 'simples'
}

function estadoVazio() {
  return {
    v: VERSION,
    ultimoDiaBiblia: '',
    sequenciaBiblia: 0,
    ultimoDiaPlano: '',
    sequenciaPlano: 0,
    marcosExibidos: [],
    semanaPerdaoChave: '',
    perdaoUsadoNaSemana: false,
    semanaPerdaoPlanoChave: '',
    perdaoPlanoUsadoNaSemana: false,
  }
}

function migrarSeNecessario(raw) {
  if (!raw) return estadoVazio()
  try {
    const j = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!j || typeof j !== 'object') return estadoVazio()
    if (j.v === VERSION) {
      const e = estadoVazio()
      return { ...e, ...j, v: VERSION }
    }
    const e = estadoVazio()
    e.ultimoDiaBiblia = String(j.ultimoDiaBiblia || '')
    e.sequenciaBiblia = Math.max(0, Number(j.sequenciaBiblia) || 0)
    e.ultimoDiaPlano = String(j.ultimoDiaPlano || '')
    e.sequenciaPlano = Math.max(0, Number(j.sequenciaPlano) || 0)
    e.marcosExibidos = Array.isArray(j.marcosExibidos) ? j.marcosExibidos.map(String) : []
    e.semanaPerdaoChave = chaveSemanaIsoSP()
    e.semanaPerdaoPlanoChave = chaveSemanaIsoSP()
    return e
  } catch {
    return estadoVazio()
  }
}

function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return estadoVazio()
    return migrarSeNecessario(raw)
  } catch {
    return estadoVazio()
  }
}

function gravar(estado) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...estado, v: VERSION }))
  } catch {
    /* ignore */
  }
}

function marcoJaExibido(lista, id) {
  return lista.includes(id)
}

function marcarMarco(lista, id) {
  if (lista.includes(id)) return lista
  return [...lista, id]
}

function resetPerdaoSemanal(s, campoSemana, campoUsado) {
  const semana = chaveSemanaIsoSP()
  if (s[campoSemana] !== semana) {
    s[campoSemana] = semana
    s[campoUsado] = false
  }
}

function atualizarSequenciaDiaria({
  hoje,
  anterior,
  sequenciaAtual,
  s,
  campoSemana,
  campoUsado,
  eventos,
  etiquetaPerdao,
}) {
  let seq = sequenciaAtual
  if (!anterior) {
    seq = 1
  } else {
    const diff = diferencaDiasIso(anterior, hoje)
    if (diff === 1) {
      seq = sequenciaAtual + 1
    } else if (diff === 2) {
      if (!s[campoUsado]) {
        s[campoUsado] = true
        seq = sequenciaAtual + 1
        eventos.push({
          tipo: 'perdao_semana',
          chave: etiquetaPerdao,
          mensagem:
            'Sequência preservada — você usou o perdão semanal (um dia sem perder o costume).',
          meta: { confete: 'simples' },
        })
      } else {
        seq = 1
      }
    } else {
      if (diff > 7) {
        eventos.push({
          tipo: 'reengajamento',
          chave: `reeng_${hoje}`,
          mensagem: 'Que bom voltar à Palavra — recomeçar também é fidelidade.',
          meta: { confete: 'simples' },
        })
      }
      seq = 1
    }
  }
  return seq
}

export function obterEstadoIncentivos() {
  return carregar()
}

/**
 * Regista que o utilizador leu conteúdo da Bíblia hoje (primeira vez no dia).
 * @returns {Array<{ tipo: string, chave: string, mensagem: string, meta?: object }>}
 */
export function registrarLeituraBibliaHoje() {
  const hoje = diaCivilAmericaSaoPaulo()
  let s = carregar()

  if (s.ultimoDiaBiblia === hoje) {
    return []
  }

  resetPerdaoSemanal(s, 'semanaPerdaoChave', 'perdaoUsadoNaSemana')

  const anterior = s.ultimoDiaBiblia
  const eventos = []

  s.sequenciaBiblia = atualizarSequenciaDiaria({
    hoje,
    anterior,
    sequenciaAtual: s.sequenciaBiblia,
    s,
    campoSemana: 'semanaPerdaoChave',
    campoUsado: 'perdaoUsadoNaSemana',
    eventos,
    etiquetaPerdao: 'biblia_perdao',
  })

  s.ultimoDiaBiblia = hoje

  gravar(s)
  return eventos
}

/**
 * Regista progresso no plano de leitura no dia (ex.: marcou capítulo).
 */
export function registrarProgressoPlanoHoje() {
  const hoje = diaCivilAmericaSaoPaulo()
  let s = carregar()

  if (s.ultimoDiaPlano === hoje) {
    return []
  }

  resetPerdaoSemanal(s, 'semanaPerdaoPlanoChave', 'perdaoPlanoUsadoNaSemana')

  const anterior = s.ultimoDiaPlano
  const eventos = []

  s.sequenciaPlano = atualizarSequenciaDiaria({
    hoje,
    anterior,
    sequenciaAtual: s.sequenciaPlano,
    s,
    campoSemana: 'semanaPerdaoPlanoChave',
    campoUsado: 'perdaoPlanoUsadoNaSemana',
    eventos,
    etiquetaPerdao: 'plano_perdao',
  })

  s.ultimoDiaPlano = hoje

  for (const n of MARCOS_SEQUENCIA_PLANO) {
    if (s.sequenciaPlano === n) {
      const chave = `plano_${n}`
      if (!marcoJaExibido(s.marcosExibidos, chave)) {
        s.marcosExibidos = marcarMarco(s.marcosExibidos, chave)
        eventos.push({
          tipo: 'sequencia_plano',
          chave,
          mensagem: mensagemMarcoPlano(n),
          meta: { dias: n, confete: confeteMarcoPlano(n) },
        })
      }
    }
  }

  gravar(s)
  return eventos
}

/** Para bonificações manuais ou outros ecrãs */
export function emitirIncentivoCustom(detail) {
  if (typeof window === 'undefined' || !detail?.mensagem) return
  window.dispatchEvent(new CustomEvent('app-incentivo', { detail }))
}

/** Útil para quiz “Palavra + quiz no mesmo dia” — já leu hoje? */
export function leuBibliaHojeSegundoEstado() {
  const s = carregar()
  const hoje = diaCivilAmericaSaoPaulo()
  return s.ultimoDiaBiblia === hoje
}
