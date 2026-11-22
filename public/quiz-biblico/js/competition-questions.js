/**
 * Geração de rodadas de competição — mix AT, NT, Histórico (personagens) e Teológicas.
 */
const QuizCompetitionQuestions = (() => {
  const BUCKETS = [
    { id: 'at', label: 'Antigo Testamento' },
    { id: 'nt', label: 'Novo Testamento' },
    { id: 'historico', label: 'Histórico' },
    { id: 'teologica', label: 'Teológicas' },
  ]

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

  function poolUnificado() {
    if (window.questionsUnified?.length) return window.questionsUnified
    const parts = []
    if (window.questionsPhases?.length) {
      window.questionsPhases.forEach((p) => parts.push(...p))
    } else {
      parts.push(...(window.questions || []), ...(window.questionsFase2 || []))
    }
    return typeof QuizQuestionId !== 'undefined' ? QuizQuestionId.dedupePool(parts) : parts
  }

  function classificar(q) {
    if (typeof QuizCategories === 'undefined') return 'historico'
    if (QuizCategories.matchesCategory(q, 'teologia')) return 'teologica'
    if (QuizCategories.matchesCategory(q, 'personagens')) return 'historico'
    if (
      QuizCategories.matchesCategory(q, 'novo_testamento') ||
      QuizCategories.matchesCategory(q, 'evangelhos') ||
      QuizCategories.matchesCategory(q, 'atos') ||
      QuizCategories.matchesCategory(q, 'cartas_paulinas')
    ) {
      return 'nt'
    }
    if (
      QuizCategories.matchesCategory(q, 'antigo_testamento') ||
      QuizCategories.matchesCategory(q, 'profetas')
    ) {
      return 'at'
    }
    return 'historico'
  }

  function agruparPorTipo(pool) {
    const buckets = { at: [], nt: [], historico: [], teologica: [] }
    for (const q of pool) {
      const b = classificar(q)
      buckets[b].push(q)
    }
    return buckets
  }

  /** Gera IDs estáveis de perguntas equilibrando os quatro tipos. */
  function gerarRodada(quantidade, seed) {
    const n = Math.max(5, Math.min(80, Number(quantidade) || 20))
    const pool = poolUnificado()
    if (!pool.length) return []

    const buckets = agruparPorTipo(pool)
    const baseSeed = hashSeed(String(seed || 'comp'))
    const shuffled = {}
    BUCKETS.forEach((b, i) => {
      shuffled[b.id] = seededShuffle(buckets[b.id], baseSeed + i * 997)
    })

    const out = []
    const used = new Set()
    let round = 0
    while (out.length < n && round < n * 4) {
      for (const b of BUCKETS) {
        if (out.length >= n) break
        const list = shuffled[b.id]
        while (list.length) {
          const q = list.shift()
          const id = QuizQuestionId.id(q)
          if (!id || used.has(id)) continue
          used.add(id)
          out.push(id)
          break
        }
      }
      round += 1
    }

    if (out.length < n) {
      const rest = seededShuffle(
        pool.filter((q) => {
          const id = QuizQuestionId.id(q)
          return id && !used.has(id)
        }),
        baseSeed + 999
      )
      for (const q of rest) {
        if (out.length >= n) break
        const id = QuizQuestionId.id(q)
        if (id && !used.has(id)) {
          used.add(id)
          out.push(id)
        }
      }
    }

    return out.slice(0, n)
  }

  function resolverPerguntas(ids) {
    const pool = poolUnificado()
    const map = QuizQuestionId.indexById(pool)
    return (ids || []).map((id) => map.get(id)).filter(Boolean)
  }

  function resumoTipos(ids) {
    const perguntas = resolverPerguntas(ids)
    const counts = { at: 0, nt: 0, historico: 0, teologica: 0 }
    perguntas.forEach((q) => {
      counts[classificar(q)] += 1
    })
    return BUCKETS.map((b) => `${b.label}: ${counts[b.id]}`).join(' · ')
  }

  return {
    BUCKETS,
    gerarRodada,
    resolverPerguntas,
    resumoTipos,
    classificar,
  }
})()

window.QuizCompetitionQuestions = QuizCompetitionQuestions
