/**
 * Conquistas / medalhas do Quiz Bíblico (localStorage).
 * Cada item pode ter `confete`: simples | dourado | intenso | versiculo | nenhum
 */
const QuizAchievements = (() => {
  const CATALOGO = {
    acertos_50: {
      emoji: '🏆',
      nome: 'Acertou 50 perguntas',
      desc: 'Acumulou 50 acertos no total.',
      confete: 'simples',
      grupo: 'progresso',
    },
    evangelhos_perfeito: {
      emoji: '🏆',
      nome: 'Acertou todos os evangelhos',
      desc: 'Rodada perfeita na categoria Evangelhos.',
      confete: 'dourado',
      grupo: 'categoria',
    },
    cartas_paulinas_perfeito: {
      emoji: '🏆',
      nome: 'Conhecedor das Epístolas Paulinas',
      desc: 'Rodada perfeita em Cartas Paulinas.',
      confete: 'dourado',
      grupo: 'categoria',
    },
    conhecedor_hebreus: {
      emoji: '📜',
      nome: 'Conhecedor de Hebreus',
      desc: 'Rodada perfeita com perguntas sobre a epístola aos Hebreus.',
      confete: 'dourado',
      grupo: 'categoria',
    },
    mestre_profetas: {
      emoji: '🏆',
      nome: 'Mestre dos Profetas',
      desc: 'Rodada perfeita na categoria Profetas.',
      confete: 'dourado',
      grupo: 'categoria',
    },
    rodada_perfeita: {
      emoji: '🧠',
      nome: 'Mente atenta',
      desc: '100% de acertos numa rodada.',
      confete: 'dourado',
      grupo: 'quiz',
    },
    fase2_desbloqueada: {
      emoji: '⭐',
      nome: 'Nível intermediário',
      desc: 'Desbloqueou a Fase 2.',
      confete: 'dourado',
      grupo: 'quiz',
    },
    fase3_desbloqueada: {
      emoji: '🌟',
      nome: 'Nível avançado',
      desc: 'Desbloqueou a Fase 3.',
      confete: 'dourado',
      grupo: 'quiz',
    },
    fase2_perfeita: {
      emoji: '💎',
      nome: 'Especialista intermediário',
      desc: 'Rodada perfeita em Todas (Fase 2).',
      confete: 'intenso',
      grupo: 'quiz',
    },
    fase3_perfeita: {
      emoji: '👑',
      nome: 'Especialista avançado',
      desc: 'Acertou todas as perguntas da Fase 3.',
      confete: 'intenso',
      grupo: 'quiz',
    },
    fase1_completa: {
      emoji: '🔥',
      nome: 'Caçador de recordes',
      desc: 'Completou todos os níveis de Todas na Fase 1.',
      confete: 'intenso',
      grupo: 'quiz',
    },
    dez_rodadas: {
      emoji: '📚',
      nome: 'Estudioso',
      desc: 'Completou 10 rodadas.',
      confete: 'simples',
      grupo: 'progresso',
    },
    reformado_perfeito: {
      emoji: '📚',
      nome: 'Teólogo em formação',
      desc: 'Nível perfeito em Questões Teológicas.',
      confete: 'dourado',
      grupo: 'categoria',
    },
    desafio_diario: {
      emoji: '📅',
      nome: 'Desafio do dia',
      desc: 'Acertou todas as perguntas do Desafio Diário.',
      confete: 'intenso',
      grupo: 'diario',
    },
    desafio_semana: {
      emoji: '🔥',
      nome: 'Semana fiel',
      desc: 'Completou 7 Desafios Diários perfeitos.',
      confete: 'intenso',
      grupo: 'diario',
    },
  }

  const GRUPOS = {
    quiz: 'Quiz e fases',
    categoria: 'Categorias',
    diario: 'Desafio diário',
    progresso: 'Progresso geral',
  }

  const LEGACY_IDS = {
    conhecedor_romanos: 'cartas_paulinas_perfeito',
    prof_quiz_perfeito: 'rodada_perfeita',
    nivel3_record: 'fase1_completa',
    fase2_perfeita: 'fase3_perfeita',
  }

  function carregar() {
    try {
      const raw = localStorage.getItem(QuizConfig.STORAGE.ACHIEVEMENTS)
      const g = raw ? JSON.parse(raw) : { ids: [] }
      if (!Array.isArray(g.ids)) g.ids = []
      for (const [oldId, newId] of Object.entries(LEGACY_IDS)) {
        if (g.ids.includes(oldId) && !g.ids.includes(newId)) {
          g.ids.push(newId)
        }
      }
      return g
    } catch {
      return { ids: [] }
    }
  }

  function gravar(g) {
    localStorage.setItem(QuizConfig.STORAGE.ACHIEVEMENTS, JSON.stringify(g))
  }

  function contarDesbloqueadas() {
    return carregar().ids.length
  }

  function desbloquear(id) {
    const c = CATALOGO[id]
    if (!c) return null
    const g = carregar()
    if (g.ids.includes(id)) return null
    g.ids.push(id)
    gravar(g)
    return { id, ...c }
  }

  function listar() {
    const g = carregar()
    return Object.entries(CATALOGO).map(([id, meta]) => ({
      id,
      ...meta,
      unlocked: g.ids.includes(id),
    }))
  }

  function listarPorGrupo() {
    const items = listar()
    const out = {}
    for (const [key, label] of Object.entries(GRUPOS)) {
      out[key] = { label, items: items.filter((i) => i.grupo === key) }
    }
    return out
  }

  function rodadaSobreHebreus(perguntas) {
    if (!Array.isArray(perguntas) || !perguntas.length) return false
    return perguntas.every((q) => String(q.reference || '').toLowerCase().includes('hebreus'))
  }

  function processarResultado(ctx) {
    const out = []
    const { total, acertos, fase, categoriaId, modo, stats, perguntas, dailyPerfect } = ctx
    const perfeito = total > 0 && acertos === total

    if (perfeito) {
      const e = desbloquear('rodada_perfeita')
      if (e) out.push(e)
    }
    if ((stats?.totalAcertos || 0) >= 50) {
      const e = desbloquear('acertos_50')
      if (e) out.push(e)
    }
    if (categoriaId === 'evangelhos' && perfeito) {
      const e = desbloquear('evangelhos_perfeito')
      if (e) out.push(e)
    }
    if (categoriaId === 'cartas_paulinas' && perfeito) {
      const e = desbloquear('cartas_paulinas_perfeito')
      if (e) out.push(e)
    }
    if (perfeito && rodadaSobreHebreus(perguntas)) {
      const e = desbloquear('conhecedor_hebreus')
      if (e) out.push(e)
    }
    if (categoriaId === 'profetas' && perfeito) {
      const e = desbloquear('mestre_profetas')
      if (e) out.push(e)
    }
    if ((categoriaId === 'teologia' || categoriaId === 'reformado') && perfeito) {
      const e = desbloquear('reformado_perfeito')
      if (e) out.push(e)
    }
    if (modo === 'desafio_diario' && dailyPerfect) {
      const e = desbloquear('desafio_diario')
      if (e) out.push(e)
      if (QuizDaily.contarMedalhas() >= 7) {
        const s = desbloquear('desafio_semana')
        if (s) out.push(s)
      }
    }
    if (QuizStorage.fase2Desbloqueada()) {
      const e = desbloquear('fase2_desbloqueada')
      if (e) out.push(e)
    }
    if (QuizStorage.fase3Desbloqueada()) {
      const e = desbloquear('fase3_desbloqueada')
      if (e) out.push(e)
    }
    if (fase === 2 && categoriaId === 'todas' && perfeito && total >= QuizLevels.PER_LEVEL) {
      const e = desbloquear('fase2_perfeita')
      if (e) out.push(e)
    }
    if (fase === 3 && categoriaId === 'todas' && perfeito && total >= QuizLevels.PER_LEVEL) {
      const e = desbloquear('fase3_perfeita')
      if (e) out.push(e)
    }
    if (fase === 1 && categoriaId === 'todas') {
      const pool = QuizCategories.filterQuestions(QuizCategories.getPoolForFase(1), 'todas', null, 1)
      if (QuizLevels.allLevelsCompleted(1, 'todas', pool)) {
        const e = desbloquear('fase1_completa')
        if (e) out.push(e)
      }
    }
    if ((stats?.rodadasCompletas || 0) >= 10) {
      const e = desbloquear('dez_rodadas')
      if (e) out.push(e)
    }
    return out
  }

  return {
    CATALOGO,
    GRUPOS,
    listar,
    listarPorGrupo,
    contarDesbloqueadas,
    desbloquear,
    processarResultado,
    carregar,
  }
})()

window.QuizAchievements = QuizAchievements
