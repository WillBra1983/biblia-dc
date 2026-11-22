/**
 * Monta o acervo unificado e distribui em fases de 50 perguntas.
 * Apenas a última fase fica com menos de 50 (até novas perguntas serem incluídas).
 */
;(function mergeQuestionPools() {
  const PER_PHASE = 50

  const sources = [
    ...(window.questions || []),
    ...(window.questionsFase2 || []),
    ...(window.questionsExtraFase1 || []),
    ...(window.questionsExtraFase2 || []),
    ...(window.questionsNewFase2 || []),
    ...(window.questionsMixedVF || []),
    ...(window.questionsPorLivro || []),
    ...(window.questionsTeologia || []),
  ]

  const seen = new Set()
  const unified = []

  for (const q of sources) {
    const key =
      typeof QuizQuestionId !== 'undefined'
        ? QuizQuestionId.id(q)
        : `${q.number || ''}:${String(q.question || '').slice(0, 80)}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    unified.push(q)
  }

  unified.sort((a, b) => {
    const na = Number(a.number) || 0
    const nb = Number(b.number) || 0
    if (na !== nb) return na - nb
    return String(a.reference || '').localeCompare(String(b.reference || ''), 'pt-BR')
  })

  const phases = []
  for (let i = 0; i < unified.length; i += PER_PHASE) {
    phases.push(unified.slice(i, i + PER_PHASE))
  }
  if (!phases.length) phases.push([])

  window.questionsUnified = unified
  window.questionsPhases = phases
  window.questionsPhase1 = phases[0] || []
  window.questionsPhase2 = phases[1] || []
  window.questionsPhase3 = phases[2] || []
  window.questionsPerPhase = PER_PHASE

  // Compatibilidade legado
  window.questions = window.questionsPhase1
  window.questionsFase2 = window.questionsPhase3
})()
