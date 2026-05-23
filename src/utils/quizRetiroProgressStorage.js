import { QUIZ_STORAGE_PROGRESS } from '../constants/quizRetiroStorage'
import { QUIZ_FASE1_QUESTIONS } from '../data/quizRetiroQuestionsFase1'
import { QUIZ_FASE2_QUESTIONS } from '../data/quizRetiroQuestionsFase2'
import { QUIZ_FASE3_QUESTIONS } from '../data/quizRetiroQuestionsFase3'

const VERSION = 1

function poolForFase(fase) {
  if (fase === 2) return QUIZ_FASE2_QUESTIONS
  if (fase === 3) return QUIZ_FASE3_QUESTIONS
  return QUIZ_FASE1_QUESTIONS
}

/**
 * Reconstrói a lista de perguntas na ordem salva (números estáveis no JSON de dados).
 */
export function quizPerguntasFromOrdem(fase, ordemNumeros) {
  const pool = poolForFase(fase)
  const list = []
  for (const num of ordemNumeros || []) {
    const q = pool.find((x) => x.number === num)
    if (q) list.push(q)
  }
  return list
}

/**
 * @returns {null | {
 *   v: number,
 *   fase: number,
 *   ordem: number[],
 *   atual: number,
 *   escolha: number|null,
 *   mostrarFeedback: boolean,
 *   sequencia: number,
 *   totalPontos: number,
 *   respostas: (boolean|null)[],
 *   pontosRodada: number,
 *   acertouUltima: boolean,
 *   updatedAt: number
 * }}
 */
export function carregarProgressoQuizRetiro() {
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_PROGRESS)
    if (!raw) return null
    const j = JSON.parse(raw)
    if (!j || j.v !== VERSION) return null
    const fase = Number(j.fase)
    if (!Number.isFinite(fase) || fase < 1 || fase > 3) return null
    const ordem = Array.isArray(j.ordem) ? j.ordem.map((n) => Number(n)).filter(Number.isFinite) : []
    const perguntas = quizPerguntasFromOrdem(fase, ordem)
    if (perguntas.length === 0 || perguntas.length !== ordem.length) return null
    const total = perguntas.length
    const atual = Math.min(Math.max(0, Number(j.atual) || 0), total - 1)
    return {
      v: VERSION,
      fase,
      ordem,
      atual,
      escolha: j.escolha === null || j.escolha === undefined ? null : Number(j.escolha),
      mostrarFeedback: Boolean(j.mostrarFeedback),
      sequencia: Math.max(0, Number(j.sequencia) || 0),
      totalPontos: Math.max(0, Number(j.totalPontos) || 0),
      respostas: normalizarRespostas(j.respostas, total),
      pontosRodada: Math.max(0, Number(j.pontosRodada) || 0),
      acertouUltima: Boolean(j.acertouUltima),
      updatedAt: Number(j.updatedAt) || 0
    }
  } catch {
    return null
  }
}

function normalizarRespostas(raw, total) {
  const arr = []
  for (let i = 0; i < total; i++) {
    const r = Array.isArray(raw) ? raw[i] : undefined
    if (r === true) arr[i] = true
    else if (r === false) arr[i] = false
    else arr[i] = undefined
  }
  return arr
}

export function salvarProgressoQuizRetiro(payload) {
  try {
    localStorage.setItem(QUIZ_STORAGE_PROGRESS, JSON.stringify({ ...payload, v: VERSION, updatedAt: Date.now() }))
  } catch {
    /* quota / privado */
  }
}

export function limparProgressoQuizRetiro() {
  try {
    localStorage.removeItem(QUIZ_STORAGE_PROGRESS)
  } catch {
    /* ignore */
  }
}

/** Quantas perguntas já têm resposta (certa ou errada) na rodada. */
export function contarPerguntasRespondidas(respostas) {
  if (!Array.isArray(respostas)) return 0
  return respostas.reduce((n, r) => (r === true || r === false ? n + 1 : n), 0)
}
