/**
 * Histórico global de perguntas já respondidas (entre modos e categorias).
 */
const QuizHistory = (() => {
  const STORAGE_KEY = 'quizBibliaV2_answered_v1'

  function ler() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : { ids: {} }
    } catch {
      return { ids: {} }
    }
  }

  function gravar(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* quota */
    }
  }

  function getAnsweredIds() {
    return new Set(Object.keys(ler().ids || {}))
  }

  function registrar(perguntas, contexto) {
    if (!Array.isArray(perguntas) || !perguntas.length) return
    const data = ler()
    if (!data.ids) data.ids = {}
    const now = Date.now()
    for (const q of perguntas) {
      const key = QuizQuestionId.id(q)
      if (!key) continue
      const prev = data.ids[key] || { count: 0, contexts: [] }
      const contexts = [...(prev.contexts || [])]
      if (contexto && !contexts.includes(contexto)) contexts.push(contexto)
      data.ids[key] = { count: (prev.count || 0) + 1, lastAt: now, contexts }
    }
    gravar(data)
  }

  function filterUnanswered(pool) {
    const answered = getAnsweredIds()
    return (pool || []).filter((q) => !answered.has(QuizQuestionId.id(q)))
  }

  function contextoPartida({ modo, fase, categoriaId, nivelIndex, dailyDate }) {
    if (modo === 'desafio_diario') return `daily:${dailyDate || 'hoje'}`
    return `${fase}:${categoriaId}:${nivelIndex ?? 0}`
  }

  return {
    STORAGE_KEY,
    getAnsweredIds,
    registrar,
    filterUnanswered,
    contextoPartida,
    ler,
  }
})()

window.QuizHistory = QuizHistory
