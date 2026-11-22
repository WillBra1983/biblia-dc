/**
 * Desafio Diário — 10 perguntas sorteadas por data, priorizando inéditas.
 */
const QuizDaily = (() => {
  const COUNT = QuizConfig.DAILY?.count || 10

  function dateKey(d = new Date()) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function hashSeed(str) {
    let h = 2166136261
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return h >>> 0
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5)
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  function seededShuffle(arr, seed) {
    const rng = mulberry32(seed)
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  function fasesDesbloqueadas() {
    const fases = [1]
    if (QuizStorage.fase2Desbloqueada()) fases.push(2)
    if (QuizStorage.fase3Desbloqueada()) fases.push(3)
    return fases
  }

  function buildUnlockedPool() {
    const parts = []
    for (const fase of fasesDesbloqueadas()) {
      parts.push(...QuizCategories.getPoolForFase(fase))
      parts.push(...QuizCategories.getTeologiaPoolForFase(fase))
    }
    return QuizQuestionId.dedupePool(parts)
  }

  function getPool() {
    return buildUnlockedPool()
  }

  function pickPoolForDate(dateStr) {
    const pool = buildUnlockedPool()
    const fresh =
      typeof QuizHistory !== 'undefined' ? QuizHistory.filterUnanswered(pool) : pool
    return fresh.length >= COUNT ? fresh : pool
  }

  function getTodayQuestions(dateStr = dateKey()) {
    const base = pickPoolForDate(dateStr)
    if (base.length <= COUNT) return seededShuffle(base, hashSeed(dateStr))
    return seededShuffle(base, hashSeed(dateStr)).slice(0, COUNT)
  }

  function lerProgresso() {
    try {
      const raw = localStorage.getItem(QuizConfig.STORAGE.DAILY)
      return raw ? JSON.parse(raw) : { completed: {}, played: {}, streak: 0, lastDate: null }
    } catch {
      return { completed: {}, played: {}, streak: 0, lastDate: null }
    }
  }

  function gravarProgresso(data) {
    localStorage.setItem(QuizConfig.STORAGE.DAILY, JSON.stringify(data))
  }

  function isCompletedToday(dateStr = dateKey()) {
    const p = lerProgresso()
    return Boolean(p.completed?.[dateStr]?.perfect)
  }

  /** Já finalizou o desafio do dia (com ou sem medalha) */
  function jaJogouHoje(dateStr = dateKey()) {
    const p = lerProgresso()
    if (p.played?.[dateStr]) return true
    return Boolean(p.completed?.[dateStr])
  }

  function podeJogarHoje(dateStr = dateKey()) {
    return !jaJogouHoje(dateStr)
  }

  function marcarJogado(dateStr, { acertos, total, perfect }) {
    const p = lerProgresso()
    if (!p.played) p.played = {}
    p.played[dateStr] = {
      acertos: Number(acertos) || 0,
      total: Number(total) || COUNT,
      perfect: Boolean(perfect),
      at: Date.now(),
    }
    if (perfect) {
      if (!p.completed) p.completed = {}
      p.completed[dateStr] = { perfect: true, at: Date.now() }
      if (p.lastDate) {
        const prev = new Date(p.lastDate + 'T12:00:00')
        const cur = new Date(dateStr + 'T12:00:00')
        const diffDays = Math.round((cur - prev) / 86400000)
        p.streak = diffDays === 1 ? (p.streak || 0) + 1 : 1
      } else {
        p.streak = 1
      }
      p.lastDate = dateStr
    }
    gravarProgresso(p)
    return p
  }

  function marcarConcluido(perfeito, dateStr = dateKey()) {
    return marcarJogado(dateStr, { acertos: COUNT, total: COUNT, perfect: perfeito })
  }

  function contarMedalhas() {
    const p = lerProgresso()
    return Object.keys(p.completed || {}).length
  }

  function formatarDataBR(dateStr) {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  function resolveQuestions(ordem, dateStr = dateKey()) {
    const pool = buildUnlockedPool()
    const byId = QuizQuestionId.indexById(pool)
    const byRef = new Map()
    for (const q of pool) {
      if (q.reference && !byRef.has(q.reference)) byRef.set(q.reference, q)
    }
    return (ordem || []).map((key) => byId.get(key) || byRef.get(key)).filter(Boolean)
  }

  return {
    COUNT,
    dateKey,
    getPool,
    getTodayQuestions,
    resolveQuestions,
    isCompletedToday,
    jaJogouHoje,
    podeJogarHoje,
    marcarJogado,
    marcarConcluido,
    contarMedalhas,
    formatarDataBR,
    lerProgresso,
  }
})()

window.QuizDaily = QuizDaily
