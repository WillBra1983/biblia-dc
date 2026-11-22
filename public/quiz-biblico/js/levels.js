/**
 * Níveis — 12 perguntas por nível, estrelas e mapa de progresso.
 */
const QuizLevels = (() => {
  const PER_LEVEL = 12
  const STORAGE_KEY = 'quizBibliaV2_levels_v1'
  /** Primeira tentativa + no máximo 1 repetição para melhorar estrelas */
  const MAX_PLAYS = 2

  function stableSort(pool) {
    return [...pool].sort((a, b) => {
      const na = Number(a.number) || 0
      const nb = Number(b.number) || 0
      if (na !== nb) return na - nb
      return String(a.reference || '').localeCompare(String(b.reference || ''), 'pt-BR')
    })
  }

  function levelCount(pool) {
    if (!pool?.length) return 0
    return Math.ceil(pool.length / PER_LEVEL)
  }

  function questionsForLevel(pool, levelIndex) {
    const sorted = stableSort(pool)
    const start = levelIndex * PER_LEVEL
    return sorted.slice(start, start + PER_LEVEL)
  }

  function normalizeCategoriaId(categoriaId) {
    if (categoriaId === 'todas') return 'completo'
    return categoriaId
  }

  function pathKey(fase, categoriaId) {
    return `${fase}:${normalizeCategoriaId(categoriaId)}`
  }

  /**
   * Estrelas por acerto percentual:
   * ≤33% → 0 | >33% e ≤66% → 1 (bronze) | >66% e <100% → 2 (prata) | 100% → 3 (ouro)
   */
  function calcStars(acertos, total) {
    const n = Math.max(1, Number(total) || PER_LEVEL)
    const a = Math.max(0, Number(acertos) || 0)
    const pct = (a / n) * 100
    if (a >= n) return 3
    if (pct > 66) return 2
    if (pct > 33) return 1
    return 0
  }

  function medalhaDeEstrelas(stars) {
    if (typeof QuizMedalhas !== 'undefined') return QuizMedalhas.deEstrelas(stars)
    const s = Math.max(0, Math.min(3, Number(stars) || 0))
    if (s >= 3) return { id: 'ouro', label: 'Ouro', src: '', stars: s }
    if (s === 2) return { id: 'prata', label: 'Prata', src: '', stars: s }
    if (s === 1) return { id: 'bronze', label: 'Bronze', src: '', stars: s }
    return { id: 'nenhuma', label: 'Sem medalha', src: '', stars: 0 }
  }

  function starsHtml(n) {
    if (typeof QuizMedalhas !== 'undefined') return QuizMedalhas.badgeHtml(n, { size: 'sm', showStars: true })
    const s = Math.max(0, Math.min(3, Number(n) || 0))
    return '★'.repeat(s) + '☆'.repeat(3 - s)
  }

  function lerProgresso() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  function gravarProgresso(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      window.dispatchEvent(new CustomEvent('quiz-progress-changed'))
    } catch {
      /* quota */
    }
  }

  function getLevel(fase, categoriaId, levelIndex) {
    const pk = pathKey(fase, categoriaId)
    const data = lerProgresso()
    let lv = data[pk]?.[String(levelIndex)] || null
    if (!lv && normalizeCategoriaId(categoriaId) === 'completo') {
      lv = data[`${fase}:todas`]?.[String(levelIndex)] || null
    }
    return lv ? { ...lv, points: Math.max(0, Number(lv.acertos) || 0) * 10 } : null
  }

  function nivelDesbloqueado(fase, categoriaId, levelIndex) {
    if (levelIndex <= 0) return true
    const prev = getLevel(fase, categoriaId, levelIndex - 1)
    return Boolean(prev?.completed)
  }

  function playCount(levelData) {
    if (!levelData?.completed) return 0
    const n = Number(levelData.plays)
    return n >= 1 ? n : 1
  }

  function precisaPontosParaProximaFase(fase, categoriaId) {
    const catBase = String(categoriaId || '').split(':')[0]
    if (catBase !== 'completo' && catBase !== 'todas') return false
    const totalFases =
      typeof QuizTrilhas !== 'undefined' && QuizTrilhas.numFases
        ? QuizTrilhas.numFases()
        : typeof QuizConfig !== 'undefined'
          ? QuizConfig.numFases
          : 3
    if (fase >= totalFases) return false
    const prog = progressoDesbloqueio(fase + 1)
    return prog.allDone && prog.points < prog.minPoints
  }

  function podeRepetirNivel(fase, categoriaId, levelIndex) {
    const lv = getLevel(fase, categoriaId, levelIndex)
    if (!lv?.completed) return false
    if ((lv.stars || 0) >= 3 && !precisaPontosParaProximaFase(fase, categoriaId)) return false
    if (playCount(lv) >= MAX_PLAYS && !precisaPontosParaProximaFase(fase, categoriaId)) return false
    return true
  }

  function podeJogarNivel(fase, categoriaId, levelIndex) {
    if (!nivelDesbloqueado(fase, categoriaId, levelIndex)) return false
    const lv = getLevel(fase, categoriaId, levelIndex)
    if (!lv?.completed) return true
    return podeRepetirNivel(fase, categoriaId, levelIndex)
  }

  function gravarResultadoNivel(fase, categoriaId, levelIndex, { stars, points, acertos, total }) {
    const pk = pathKey(fase, categoriaId)
    const data = lerProgresso()
    if (!data[pk]) data[pk] = {}
    const key = String(levelIndex)
    const prev = data[pk][key] || {}
    const prevPlays = prev.completed ? playCount(prev) : 0
    data[pk][key] = {
      stars: Math.max(prev.stars || 0, stars),
      points: Math.max((prev.acertos || 0) * 10, points),
      acertos: Math.max(prev.acertos || 0, acertos),
      total: total || prev.total || PER_LEVEL,
      plays: prevPlays + 1,
      completed: true,
      updatedAt: Date.now(),
    }
    gravarProgresso(data)
    return data[pk][key]
  }

  function allLevelsCompleted(fase, categoriaId, pool) {
    const n = levelCount(pool)
    if (!n) return false
    for (let i = 0; i < n; i++) {
      if (!getLevel(fase, categoriaId, i)?.completed) return false
    }
    return true
  }

  function totalBestPoints(fase, categoriaId, pool) {
    const n = levelCount(pool)
    let sum = 0
    for (let i = 0; i < n; i++) {
      sum += getLevel(fase, categoriaId, i)?.points || 0
    }
    return sum
  }

  function totalStars(fase, categoriaId, pool) {
    const n = levelCount(pool)
    let sum = 0
    for (let i = 0; i < n; i++) {
      sum += getLevel(fase, categoriaId, i)?.stars || 0
    }
    return sum
  }

  function pathSummary(fase, categoriaId, pool) {
    const n = levelCount(pool)
    let completed = 0
    for (let i = 0; i < n; i++) {
      if (getLevel(fase, categoriaId, i)?.completed) completed++
    }
    return { levels: n, completed, stars: totalStars(fase, categoriaId, pool) }
  }

  function poolTodasForFase(fase) {
    if (typeof QuizTrilhas !== 'undefined') {
      return QuizTrilhas.filterTrilha(QuizTrilhas.poolForFase(fase), 'completo')
    }
    return QuizCategories.filterQuestions(
      QuizCategories.getPoolForFase(fase),
      'todas',
      null,
      fase
    )
  }

  function pontosMaximosPool(pool) {
    const n = levelCount(pool)
    let sum = 0
    for (let i = 0; i < n; i++) {
      const qty = questionsForLevel(pool, i).length
      sum += typeof QuizPontuacao !== 'undefined'
        ? QuizPontuacao.pontosMaximosRodada(qty)
        : QuizConfig.pontosMaximos(qty)
    }
    return sum
  }

  /** Pontos mínimos (85%) somando todos os níveis de Todas na fase */
  function minPontosParaDesbloquear(proximaFase) {
    const faseAtual = proximaFase - 1
    const pool = poolTodasForFase(faseAtual)
    if (!pool.length) return 0
    return Math.ceil(pontosMaximosPool(pool) * QuizConfig.UNLOCK_RATIO)
  }

  function progressoDesbloqueio(proximaFase) {
    const faseAtual = proximaFase - 1
    const pool = poolTodasForFase(faseAtual)
    if (typeof QuizTrilhaLinear !== 'undefined') {
      return QuizTrilhaLinear.progressoDesbloqueioFase(proximaFase, pool)
    }
    const catId = 'completo'
    const summary = pathSummary(faseAtual, catId, pool)
    const points = totalBestPoints(faseAtual, catId, pool)
    const minPoints = minPontosParaDesbloquear(proximaFase)
    const allDone = allLevelsCompleted(faseAtual, catId, pool)
    return {
      fase: faseAtual,
      ...summary,
      points,
      minPoints,
      allDone,
      pronto: allDone && points >= minPoints,
    }
  }

  function textoRequisitoFase(proximaFase) {
    const p = progressoDesbloqueio(proximaFase)
    const destino = `Fase ${proximaFase}`
    if (!p.levels) return `Complete a trilha Completo na fase anterior para desbloquear ${destino}`
    const faltaPerg = p.completed < p.levels
    const faltaPts = p.points < p.minPoints
    const origem = `trilha Completo da Fase ${p.fase}`
    if (typeof QuizTrilhaLinear !== 'undefined') {
      if (faltaPerg && faltaPts) {
        return `Para desbloquear ${destino}: ${origem} — ${p.completed}/${p.levels} perguntas, ${p.points}/${p.minPoints} pts`
      }
      if (faltaPerg) {
        return `Para desbloquear ${destino}: faltam ${p.levels - p.completed} perguntas em ${origem}`
      }
      if (faltaPts) {
        return `Para desbloquear ${destino}: faltam ${p.minPoints - p.points} pts em ${origem} (${p.points}/${p.minPoints})`
      }
      return `Pronto para desbloquear ${destino}`
    }
    const faltaNiveis = faltaPerg
    if (faltaNiveis && faltaPts) {
      return `Para desbloquear ${destino}: ${origem} — ${p.completed}/${p.levels} níveis, ${p.points}/${p.minPoints} pts`
    }
    if (faltaNiveis) {
      const falta = p.levels - p.completed
      return `Para desbloquear ${destino}: faltam ${falta} ${falta === 1 ? 'nível' : 'níveis'} em ${origem}`
    }
    if (faltaPts) {
      return `Para desbloquear ${destino}: faltam ${p.minPoints - p.points} pts em ${origem} (${p.points}/${p.minPoints})`
    }
    return `Pronto para desbloquear ${destino}`
  }

  return {
    PER_LEVEL,
    MAX_PLAYS,
    STORAGE_KEY,
    stableSort,
    levelCount,
    questionsForLevel,
    pathKey,
    calcStars,
    medalhaDeEstrelas,
    starsHtml,
    getLevel,
    playCount,
    nivelDesbloqueado,
    podeRepetirNivel,
    podeJogarNivel,
    gravarResultadoNivel,
    allLevelsCompleted,
    totalBestPoints,
    totalStars,
    pathSummary,
    poolTodasForFase,
    pontosMaximosPool,
    minPontosParaDesbloquear,
    progressoDesbloqueio,
    textoRequisitoFase,
  }
})()

window.QuizLevels = QuizLevels
