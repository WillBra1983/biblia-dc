/**
 * Persistência local — progresso, desbloqueios, estatísticas.
 */
const QuizStorage = (() => {
  const { STORAGE } = QuizConfig
  const PROGRESS_VERSION = 1

  function poolForFase(fase) {
    if (window.questionsPhases?.length) {
      return window.questionsPhases[(Number(fase) || 1) - 1] || []
    }
    if (fase === 3) return window.questionsPhase3 || window.questionsFase2 || []
    if (fase === 2) return window.questionsPhase2 || []
    return window.questionsPhase1 || window.questions || []
  }

  function migrarDesbloqueiosLegado() {
    try {
      if (localStorage.getItem(STORAGE.UNLOCK_PHASE2) === '1') {
        if (localStorage.getItem(STORAGE.UNLOCK_PHASE3) !== '1') {
          localStorage.setItem(STORAGE.UNLOCK_PHASE3, '1')
        }
      }
    } catch {
      /* ignore */
    }
  }

  migrarDesbloqueiosLegado()

  function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  function allQuestionsForFase(fase) {
    const parts = [...poolForFase(fase)]
    if (typeof QuizCategories !== 'undefined') {
      parts.push(...QuizCategories.getTeologiaPoolForFase(fase))
    }
    return QuizQuestionId.dedupePool(parts)
  }

  function perguntasFromOrdem(ordem, fase = 1) {
    const pool = allQuestionsForFase(fase)
    const byId = QuizQuestionId.indexById(pool)
    const byRef = new Map()
    for (const q of pool) {
      if (q.reference && !byRef.has(q.reference)) byRef.set(q.reference, q)
    }
    const list = []
    for (const key of ordem || []) {
      const q = byId.get(key) || byRef.get(key)
      if (q) list.push(q)
    }
    return list
  }

  function perguntasFromReferencias(referencias, fase = 1) {
    return perguntasFromOrdem(referencias, fase)
  }

  function quizPerguntasFromOrdem(fase, ordemNumeros) {
    const pool = poolForFase(fase)
    const list = []
    for (const num of ordemNumeros || []) {
      const q = pool.find((x) => x.number === num)
      if (q) list.push(q)
    }
    return list
  }

  function carregarProgresso() {
    try {
      const raw = localStorage.getItem(STORAGE.PROGRESS)
      if (!raw) return null
      const j = JSON.parse(raw)
      if (!j || j.v !== PROGRESS_VERSION) return null
      const fase = Number(j.fase) || 1
      const ordem = Array.isArray(j.ordem) ? j.ordem : []
      const perguntas =
        j.modo === 'desafio_diario'
          ? QuizDaily.resolveQuestions(ordem, j.dailyDate)
          : perguntasFromOrdem(ordem, fase)
      if (!perguntas.length) return null
      const total = perguntas.length
      return {
        ...j,
        fase,
        modo: j.modo || 'categoria',
        dailyDate: j.dailyDate || null,
        ordem,
        atual: Math.min(Math.max(0, Number(j.atual) || 0), total - 1),
        total,
      }
    } catch {
      return null
    }
  }

  function salvarProgresso(payload) {
    try {
      localStorage.setItem(
        STORAGE.PROGRESS,
        JSON.stringify({ ...payload, v: PROGRESS_VERSION, updatedAt: Date.now() })
      )
      window.dispatchEvent(new CustomEvent('quiz-progress-changed'))
    } catch {
      /* quota */
    }
  }

  function limparProgresso() {
    try {
      localStorage.removeItem(STORAGE.PROGRESS)
      window.dispatchEvent(new CustomEvent('quiz-progress-changed'))
    } catch {
      /* ignore */
    }
  }

  function lerMelhorFase1() {
    try {
      const j = JSON.parse(localStorage.getItem(STORAGE.BEST_FASE1) || '{}')
      return { correct: Number(j.correct) || 0, points: (Number(j.correct) || 0) * 10 }
    } catch {
      return { correct: 0, points: 0 }
    }
  }

  function gravarMelhorFase1(correct, points) {
    const best = lerMelhorFase1()
    const novo = {
      correct: Math.max(best.correct, correct),
      points: Math.max(best.points, points),
    }
    localStorage.setItem(STORAGE.BEST_FASE1, JSON.stringify(novo))
    return novo
  }

  function lerMelhorFase2() {
    try {
      const j = JSON.parse(localStorage.getItem(STORAGE.BEST_FASE2) || '{}')
      return { correct: Number(j.correct) || 0, points: (Number(j.correct) || 0) * 10 }
    } catch {
      return { correct: 0, points: 0 }
    }
  }

  function gravarMelhorFase2(correct, points) {
    const best = lerMelhorFase2()
    const novo = {
      correct: Math.max(best.correct, correct),
      points: Math.max(best.points, points),
    }
    localStorage.setItem(STORAGE.BEST_FASE2, JSON.stringify(novo))
    return novo
  }

  function fase2Desbloqueada() {
    try {
      if (localStorage.getItem(STORAGE.UNLOCK_PHASE2) === '1') return true
      if (typeof QuizLevels !== 'undefined') {
        return QuizLevels.progressoDesbloqueio(2).pronto
      }
      const b = lerMelhorFase1()
      return b.points >= QuizConfig.minPontosDesbloquear(2)
    } catch {
      return false
    }
  }

  function fase3Desbloqueada() {
    try {
      if (localStorage.getItem(STORAGE.UNLOCK_PHASE3) === '1') return true
      if (typeof QuizLevels !== 'undefined') {
        return QuizLevels.progressoDesbloqueio(3).pronto
      }
      const b = lerMelhorFase2()
      return b.points >= QuizConfig.minPontosDesbloquear(3)
    } catch {
      return false
    }
  }

  function desbloquearFase2() {
    localStorage.setItem(STORAGE.UNLOCK_PHASE2, '1')
  }

  function desbloquearFase3() {
    localStorage.setItem(STORAGE.UNLOCK_PHASE3, '1')
  }

  function lerStats() {
    try {
      const j = JSON.parse(localStorage.getItem(STORAGE.STATS) || '{}')
      return {
        totalAcertos: Number(j.totalAcertos) || 0,
        rodadasCompletas: Number(j.rodadasCompletas) || 0,
        categoriasJogadas: j.categoriasJogadas || {},
        evangelhosCompletos: Boolean(j.evangelhosCompletos),
        profetasCompletos: Boolean(j.profetasCompletos),
        cartasPaulinasPerfeito: Boolean(j.cartasPaulinasPerfeito),
      }
    } catch {
      return { totalAcertos: 0, rodadasCompletas: 0, categoriasJogadas: {} }
    }
  }

  function atualizarStats({ acertos, categoria, perfeito, categoriaId }) {
    const s = lerStats()
    s.totalAcertos += acertos
    s.rodadasCompletas += 1
    if (categoriaId) {
      s.categoriasJogadas[categoriaId] = (s.categoriasJogadas[categoriaId] || 0) + 1
    }
    if (categoriaId === 'evangelhos' && perfeito) s.evangelhosCompletos = true
    if (categoriaId === 'profetas' && perfeito) s.profetasCompletos = true
    if (categoriaId === 'cartas_paulinas' && perfeito) s.cartasPaulinasPerfeito = true
    localStorage.setItem(STORAGE.STATS, JSON.stringify(s))
    return s
  }

  function lerNomeJogador() {
    return localStorage.getItem(STORAGE.PLAYER_NAME) || ''
  }

  function gravarNomeJogador(nome) {
    localStorage.setItem(STORAGE.PLAYER_NAME, String(nome || '').trim().slice(0, 40))
  }

  function lerOptInRanking() {
    const v = localStorage.getItem(STORAGE.RANKING_OPTIN)
    if (v === '0') return false
    return true
  }

  function gravarOptInRanking(ativo) {
    localStorage.setItem(STORAGE.RANKING_OPTIN, ativo ? '1' : '0')
  }

  return {
    shuffle,
    poolForFase,
    quizPerguntasFromOrdem,
    perguntasFromOrdem,
    perguntasFromReferencias,
    carregarProgresso,
    salvarProgresso,
    limparProgresso,
    lerMelhorFase1,
    gravarMelhorFase1,
    lerMelhorFase2,
    gravarMelhorFase2,
    fase2Desbloqueada,
    fase3Desbloqueada,
    desbloquearFase2,
    desbloquearFase3,
    lerStats,
    atualizarStats,
    lerNomeJogador,
    gravarNomeJogador,
    lerOptInRanking,
    gravarOptInRanking,
    contarRespondidas(respostas) {
      if (!Array.isArray(respostas)) return 0
      return respostas.reduce((n, r) => (r === true || r === false ? n + 1 : n), 0)
    },
  }
})()

window.QuizStorage = QuizStorage
