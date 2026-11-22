/**
 * Seleciona perguntas inéditas por nível/categoria (evita repetir ao trocar de trilha).
 */
const QuizQuestionSwap = (() => {
  function id(q) {
    return QuizQuestionId.id(q)
  }

  /** @deprecated use selecionarParaNivel */
  function substituirIneditas(perguntas, pool) {
    const r = selecionarParaNivel(pool, 0, { isReplay: true, perguntasFixas: perguntas })
    return r.perguntas.length ? r.perguntas : perguntas
  }

  function freshSlice(pool, nivelIndex) {
    if (typeof QuizHistory === 'undefined') return QuizLevels.stableSort(pool)
    const sorted = QuizLevels.stableSort(pool)
    const answered = QuizHistory.getAnsweredIds()
    return sorted.filter((q) => {
      const key = id(q)
      return key && !answered.has(key)
    })
  }

  function contarIneditas(pool) {
    return freshSlice(pool, 0).length
  }

  function selecionarParaNivel(pool, nivelIndex, { isReplay = false, perguntasFixas = null } = {}) {
    const PER_LEVEL = QuizLevels.PER_LEVEL
    const sorted = QuizLevels.stableSort(pool || [])
    if (!sorted.length) return { perguntas: [], esgotado: true, ineditas: 0 }

    if (isReplay) {
      const fixas = perguntasFixas || QuizLevels.questionsForLevel(pool, nivelIndex)
      return { perguntas: fixas, esgotado: false, ineditas: 0 }
    }

    if (typeof QuizHistory === 'undefined') {
      return {
        perguntas: QuizLevels.questionsForLevel(pool, nivelIndex),
        esgotado: false,
        ineditas: sorted.length,
      }
    }

    const answered = QuizHistory.getAnsweredIds()
    const fresh = sorted.filter((q) => {
      const key = id(q)
      return key && !answered.has(key)
    })

    if (!fresh.length) {
      return { perguntas: [], esgotado: true, ineditas: 0 }
    }

    const usados = new Set()
    const resultado = []

    const bloco = fresh.slice(nivelIndex * PER_LEVEL, (nivelIndex + 1) * PER_LEVEL)
    for (const q of bloco) {
      if (resultado.length >= PER_LEVEL) break
      const key = id(q)
      if (!key || usados.has(key)) continue
      usados.add(key)
      resultado.push(q)
    }

    if (resultado.length < PER_LEVEL) {
      for (const q of fresh) {
        if (resultado.length >= PER_LEVEL) break
        const key = id(q)
        if (!key || usados.has(key)) continue
        usados.add(key)
        resultado.push(q)
      }
    }

    return {
      perguntas: resultado,
      esgotado: false,
      ineditas: fresh.length,
    }
  }

  return {
    substituirIneditas,
    selecionarParaNivel,
    contarIneditas,
    freshSlice,
  }
})()

window.QuizQuestionSwap = QuizQuestionSwap
