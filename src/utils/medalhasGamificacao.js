/**
 * Medalhas persistentes (localStorage) — consistência, profundidade e propósito espiritual.
 * Desbloqueio idempotente; eventos compatíveis com `app-incentivo`.
 */

import { obterEstadoIncentivos, leuBibliaHojeSegundoEstado } from './incentivosLeitura'

const STORAGE_MEDALHAS = 'gamificacao_medalhas_v1'

const CATALOGO = {
  cons_inicio_fiel: {
    emoji: '🥉',
    nome: 'Início fiel',
    desc: 'Você começou o hábito da Palavra.',
    confete: 'simples',
  },
  cons_constante: {
    emoji: '🥈',
    nome: 'Constante',
    desc: '3 dias seguidos na Palavra.',
    confete: 'simples',
  },
  cons_perseverante: {
    emoji: '🥇',
    nome: 'Perseverante',
    desc: 'Uma semana inteira na Palavra.',
    confete: 'intenso',
  },
  cons_discipulado_firme: {
    emoji: '💎',
    nome: 'Discipulado firme',
    desc: '30 dias cultivando leitura diária.',
    confete: 'dourado',
  },
  cons_noventa: {
    emoji: '🌟',
    nome: 'Luminária',
    desc: '90 dias na Palavra — constância rara.',
    confete: 'intenso',
  },
  prof_palavra_quiz: {
    emoji: '📖',
    nome: 'Palavra e foco',
    desc: 'Leitura do dia e rodada do quiz sem erro.',
    confete: 'dourado',
  },
  prof_quiz_perfeito: {
    emoji: '🧠',
    nome: 'Mente atenta',
    desc: '100% de acertos numa rodada do quiz.',
    confete: 'dourado',
  },
  esp_amante_palavra: {
    emoji: '💜',
    nome: 'Amante da Palavra',
    desc: 'Amor à Escritura traduzido em constância.',
    confete: 'dourado',
  },
  esp_guardador_verdade: {
    emoji: '✝️',
    nome: 'Guardador da verdade',
    desc: 'Palavra no coração (7+ dias) e rodada do quiz sem erro no mesmo dia.',
    confete: 'dourado',
  },
  pl_prog_25: {
    emoji: '🥉',
    nome: 'Plano a quarta',
    desc: 'Atingiu 25% de um plano de leitura.',
    confete: 'simples',
  },
  pl_prog_40: {
    emoji: '🥈',
    nome: 'Plano em curso',
    desc: 'Atingiu 40% de um plano de leitura.',
    confete: 'simples',
  },
  pl_prog_50: {
    emoji: '🥇',
    nome: 'Metade do caminho',
    desc: 'Atingiu 50% de um plano de leitura.',
    confete: 'intenso',
  },
  pl_prog_60: {
    emoji: '💎',
    nome: 'Ritmo firme',
    desc: 'Atingiu 60% de um plano de leitura.',
    confete: 'intenso',
  },
  pl_prog_70: {
    emoji: '✨',
    nome: 'Bem adiante',
    desc: 'Atingiu 70% de um plano de leitura.',
    confete: 'dourado',
  },
  pl_prog_80: {
    emoji: '🌟',
    nome: 'Quase no fim',
    desc: 'Atingiu 80% de um plano de leitura.',
    confete: 'dourado',
  },
  pl_quase_fim: {
    emoji: '🏁',
    nome: 'Reto final',
    desc: 'Falta 10% ou menos para concluir o plano de leitura.',
    confete: 'intenso',
  },
  pl_escada_super_campeao: {
    emoji: '👑',
    nome: 'Super campeão do plano',
    desc: 'Alcançou o super troféu na escada do plano de leitura.',
    confete: 'dourado',
  },
}

function carregarMedalhas() {
  try {
    const raw = localStorage.getItem(STORAGE_MEDALHAS)
    if (!raw) return { ids: [] }
    const j = JSON.parse(raw)
    return { ids: Array.isArray(j.ids) ? j.ids.map(String) : [] }
  } catch {
    return { ids: [] }
  }
}

function gravarMedalhas(g) {
  try {
    localStorage.setItem(STORAGE_MEDALHAS, JSON.stringify(g))
  } catch {
    /* ignore */
  }
}

export function contarMedalhasDesbloqueadas() {
  return carregarMedalhas().ids.length
}

export function listarMedalhasDesbloqueadas() {
  return [...carregarMedalhas().ids]
}

/**
 * @returns {{ tipo: string, chave: string, mensagem: string, meta?: object } | null}
 */
export function tentarDesbloquearMedalha(id) {
  const c = CATALOGO[id]
  if (!c) return null
  const g = carregarMedalhas()
  if (g.ids.includes(id)) return null
  g.ids.push(id)
  gravarMedalhas(g)
  return {
    tipo: 'medalha',
    chave: id,
    mensagem: `${c.emoji} Medalha: ${c.nome} — ${c.desc}`,
    meta: { confete: c.confete, medalhaId: id },
  }
}

/**
 * Chamar depois de `registrarLeituraBibliaHoje()` (estado já gravado).
 */
export function processarMedalhasAposRegistarLeitura() {
  const s = obterEstadoIncentivos()
  const seq = Math.max(0, Number(s.sequenciaBiblia) || 0)
  const out = []

  if (seq >= 1) {
    const e = tentarDesbloquearMedalha('cons_inicio_fiel')
    if (e) out.push(e)
  }
  if (seq >= 3) {
    const e = tentarDesbloquearMedalha('cons_constante')
    if (e) out.push(e)
  }
  if (seq >= 7) {
    const e = tentarDesbloquearMedalha('cons_perseverante')
    if (e) out.push(e)
  }
  if (seq >= 30) {
    const e = tentarDesbloquearMedalha('cons_discipulado_firme')
    if (e) out.push(e)
    const e2 = tentarDesbloquearMedalha('esp_amante_palavra')
    if (e2) out.push(e2)
  }
  if (seq >= 90) {
    const e = tentarDesbloquearMedalha('cons_noventa')
    if (e) out.push(e)
  }

  return out
}

/**
 * Chamado ao mostrar ecrã de resultado do quiz.
 */
export function processarMedalhasAposQuizResultado({ total, acertos }) {
  const out = []
  const totalN = Number(total) || 0
  const acertosN = Number(acertos) || 0
  const perfeito = totalN > 0 && acertosN === totalN
  const leuHoje = leuBibliaHojeSegundoEstado()

  if (perfeito) {
    const e = tentarDesbloquearMedalha('prof_quiz_perfeito')
    if (e) out.push(e)
  }
  if (perfeito && leuHoje) {
    const e = tentarDesbloquearMedalha('prof_palavra_quiz')
    if (e) out.push(e)
  }
  const seqB = Math.max(0, Number(obterEstadoIncentivos().sequenciaBiblia) || 0)
  if (perfeito && leuHoje && seqB >= 7) {
    const e2 = tentarDesbloquearMedalha('esp_guardador_verdade')
    if (e2) out.push(e2)
  }

  return out
}

/**
 * Medalhas globais (uma vez) ao abrir o ecrã do plano, com base no progresso.
 * @param {{ progressoPct: number, restantes: number, total: number }} p
 */
export function processarMedalhasAposAbrirPlano(p) {
  const out = []
  const pct = Math.max(0, Number(p?.progressoPct) || 0)
  const rest = Math.max(0, Number(p?.restantes) || 0)
  const total = Math.max(0, Number(p?.total) || 0)

  if (pct >= 25) {
    const e = tentarDesbloquearMedalha('pl_prog_25')
    if (e) out.push(e)
  }
  if (pct >= 40) {
    const e = tentarDesbloquearMedalha('pl_prog_40')
    if (e) out.push(e)
  }
  if (pct >= 50) {
    const e = tentarDesbloquearMedalha('pl_prog_50')
    if (e) out.push(e)
  }
  if (pct >= 60) {
    const e = tentarDesbloquearMedalha('pl_prog_60')
    if (e) out.push(e)
  }
  if (pct >= 70) {
    const e = tentarDesbloquearMedalha('pl_prog_70')
    if (e) out.push(e)
  }
  if (pct >= 80) {
    const e = tentarDesbloquearMedalha('pl_prog_80')
    if (e) out.push(e)
  }
  if (total > 0 && rest > 0 && rest <= total * 0.1 && pct < 100) {
    const e = tentarDesbloquearMedalha('pl_quase_fim')
    if (e) out.push(e)
  }

  return out
}

export { CATALOGO }
