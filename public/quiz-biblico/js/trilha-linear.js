/**
 * Trilha linear — uma pergunta após a outra, sem níveis.
 * A ordem das perguntas é sorteada na 1ª vez e permanece fixa no conjunto;
 * ao repetir para melhorar pontos, só muda a ordem de aparição e das opções.
 */
const QuizTrilhaLinear = (() => {
  const STORAGE_KEY = 'quizBibliaV2_trilha_linear_v1'

  function normalizeCat(categoriaId) {
    if (categoriaId === 'todas') return 'completo'
    return categoriaId
  }

  function progressKey(fase, categoriaId) {
    return `${Number(fase) || 1}:${normalizeCat(categoriaId)}`
  }

  function ler() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  function gravar(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      window.dispatchEvent(new CustomEvent('quiz-progress-changed'))
    } catch {
      /* quota */
    }
  }

  function getProgress(fase, categoriaId) {
  const data = ler(); const p = data[progressKey(fase, categoriaId)] || { ordem: null, currentIndex: 0, completed: false, bestStars: 0, bestAcertos: 0, plays: 0 };
  return { ...p, bestPoints: Math.max(0, Number(p.bestAcertos) || 0) * 10 };
}

  function resumo(fase, categoriaId, poolLength) {
    const p = getProgress(fase, categoriaId)
    const ordemLen = p.ordem?.length || 0
    const total = ordemLen || poolLength || 0
    const atual = p.completed ? total : Math.min(p.currentIndex || 0, total)
    return {
      atual,
      total,
      completed: Boolean(p.completed),
      bestStars: Number(p.bestStars) || 0,
      bestPoints: Number(p.bestPoints) || 0,
      plays: Number(p.plays) || 0,
    }
  }

  function poolIdsFromPool(pool) {
    return pool.map((q) => QuizQuestionId.id(q)).filter(Boolean)
  }

  /** Ordem embaralhada com todas as perguntas do pool (sem excluir já respondidas). */
  function buildOrdem(pool) {
    const lista = QuizLevels.stableSort(pool)
    return QuizStorage.shuffle([...lista]).map((q) => QuizQuestionId.id(q)).filter(Boolean)
  }

  /** Reembaralha apenas a ordem de aparição, mantendo o mesmo conjunto de IDs. */
  function reshuffleOrdem(ordem) {
    return QuizStorage.shuffle([...(ordem || [])].filter(Boolean))
  }

  /** Garante que a ordem salva inclua todo o pool atual (corrige sessões antigas). */
  function syncOrdemComPool(ordem, pool) {
    const poolIds = poolIdsFromPool(pool)
    const poolSet = new Set(poolIds)
    const valid = (ordem || []).filter((id) => poolSet.has(id))
    const have = new Set(valid)
    const missing = poolIds.filter((id) => !have.has(id))
    if (!valid.length) return buildOrdem(pool)
    if (!missing.length && valid.length === poolIds.length) return valid
    return valid.concat(QuizStorage.shuffle(missing))
  }

  function preparar(fase, categoriaId, pool, { replay = false } = {}) {
    if (!pool?.length) {
      return { perguntas: [], currentIndex: 0, completed: false, esgotado: true, replay: false }
    }

    const key = progressKey(fase, categoriaId)
    const data = ler()
    let entry = data[key] || {}

    if (replay && entry.ordem?.length) {
      entry.ordem = reshuffleOrdem(syncOrdemComPool(entry.ordem, pool))
      entry.currentIndex = 0
      entry.completed = false
      data[key] = entry
      gravar(data)

      const perguntas = QuizStorage.perguntasFromOrdem(entry.ordem, fase)
      return {
        perguntas,
        currentIndex: 0,
        completed: false,
        esgotado: !perguntas.length,
        replay: true,
      }
    }

    if (entry.completed) {
      if (entry.ordem?.length && entry.ordem.length < pool.length) {
        entry.completed = false
        entry.ordem = syncOrdemComPool(entry.ordem, pool)
        entry.currentIndex = Math.min(entry.currentIndex || 0, entry.ordem.length)
        data[key] = entry
        gravar(data)
      } else {
        const total = entry.ordem?.length || pool.length
        return {
          perguntas: [],
          currentIndex: total,
          completed: true,
          esgotado: true,
          replay: false,
        }
      }
    }

    const expectedLen = pool.length
    if (!entry.ordem?.length) {
      entry = {
        ordem: buildOrdem(pool),
        currentIndex: 0,
        completed: false,
        bestPoints: Number(entry.bestPoints) || 0,
        bestStars: Number(entry.bestStars) || 0,
        bestAcertos: Number(entry.bestAcertos) || 0,
        plays: Number(entry.plays) || 0,
      }
      data[key] = entry
      gravar(data)
    } else if (entry.ordem.length !== expectedLen) {
      entry.ordem = syncOrdemComPool(entry.ordem, pool)
      entry.currentIndex = Math.min(entry.currentIndex || 0, entry.ordem.length)
      data[key] = entry
      gravar(data)
    }

    const perguntas = QuizStorage.perguntasFromOrdem(entry.ordem, fase)
    if (!perguntas.length) {
      return { perguntas: [], currentIndex: 0, completed: false, esgotado: true, replay: false }
    }

    const idx = Math.min(Math.max(0, entry.currentIndex || 0), perguntas.length - 1)
    return {
      perguntas,
      currentIndex: idx,
      completed: false,
      esgotado: false,
      replay: false,
    }
  }

  function setIndex(fase, categoriaId, index) {
    const key = progressKey(fase, categoriaId)
    const data = ler()
    if (!data[key]) {
      data[key] = { ordem: null, currentIndex: 0, completed: false, bestPoints: 0, bestStars: 0 }
    }
    data[key].currentIndex = Math.max(0, Number(index) || 0)
    gravar(data)
  }

  function marcarConcluido(fase, categoriaId, { points = 0, acertos = 0, total = 0, stars = 0 } = {}) {
    const key = progressKey(fase, categoriaId)
    const data = ler()
    if (!data[key]) data[key] = { ordem: [], currentIndex: 0 }
    const prev = data[key]
    const prevPlays = Number(prev.plays) || 0
    data[key] = {
      ...prev,
      completed: true,
      currentIndex: total || prev.ordem?.length || prev.currentIndex,
      bestPoints: Math.max((prev.bestAcertos || 0) * 10, Number(points) || 0),
      bestStars: Math.max(prev.bestStars || 0, Number(stars) || 0),
      bestAcertos: Math.max(prev.bestAcertos || 0, Number(acertos) || 0),
      lastAcertos: acertos,
      lastTotal: total,
      lastStars: Number(stars) || 0,
      plays: prevPlays + 1,
      completedAt: Date.now(),
    }
    gravar(data)
    return data[key]
  }

  function podeRepetir(fase, categoriaId) {
    const p = getProgress(fase, categoriaId)
    return Boolean(p.completed && p.ordem?.length)
  }

  function reiniciar(fase, categoriaId) {
    const key = progressKey(fase, categoriaId)
    const data = ler()
    const prev = data[key]
    if (prev?.ordem?.length) {
      data[key] = {
        ordem: prev.ordem,
        currentIndex: 0,
        completed: false,
        bestPoints: (Number(prev.bestAcertos) || 0) * 10,
        bestStars: Number(prev.bestStars) || 0,
        bestAcertos: Number(prev.bestAcertos) || 0,
        plays: Number(prev.plays) || 0,
      }
    } else {
      delete data[key]
    }
    gravar(data)
  }

  function pontosMaximosPool(pool) {
    const n = pool?.length || 0
    if (!n) return 0
    if (typeof QuizPontuacao !== 'undefined') return QuizPontuacao.pontosMaximosRodada(n)
    return QuizConfig.pontosMaximos(n)
  }

  function progressoDesbloqueioFase(proximaFase, pool) {
    const faseAtual = proximaFase - 1
    const p = getProgress(faseAtual, 'completo')
    const total = pool?.length || p.ordem?.length || 0
    const minPoints = Math.ceil(pontosMaximosPool(pool) * QuizConfig.UNLOCK_RATIO)
    const points = p.bestPoints || 0
    const done = Boolean(p.completed)
    const respondidas = done ? total : Math.min(p.currentIndex || 0, total)
    return {
      fase: faseAtual,
      levels: total,
      completed: respondidas,
      stars: Number(p.bestStars) || 0,
      points,
      minPoints,
      allDone: done,
      pronto: done && points >= minPoints,
    }
  }

  return {
    STORAGE_KEY,
    getProgress,
    resumo,
    preparar,
    setIndex,
    marcarConcluido,
    podeRepetir,
    reiniciar,
    pontosMaximosPool,
    progressoDesbloqueioFase,
  }
})()

window.QuizTrilhaLinear = QuizTrilhaLinear
