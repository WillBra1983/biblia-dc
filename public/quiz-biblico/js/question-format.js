/**
 * Utilitários de formato de pergunta (MC vs Verdadeiro/Falso).
 */
const QuizQuestionFormat = (() => {
  const VF_OPTIONS = ['Verdadeiro', 'Falso']

  function isVerdadeiroFalso(q) {
    if (!q) return false
    if (q.type === 'vf') return true
    if (q.options?.length === 2) {
      const a = String(q.options[0] || '').toLowerCase()
      const b = String(q.options[1] || '').toLowerCase()
      return (a.includes('verdadeiro') && b.includes('falso')) || (a.includes('falso') && b.includes('verdadeiro'))
    }
    return false
  }

  function normalizeOptions(q) {
    if (isVerdadeiroFalso(q)) return [...VF_OPTIONS]
    return q.options || []
  }

  function labelTipo(q) {
    return isVerdadeiroFalso(q) ? 'V/F' : 'Múltipla escolha'
  }

  return { VF_OPTIONS, isVerdadeiroFalso, normalizeOptions, labelTipo }
})()

window.QuizQuestionFormat = QuizQuestionFormat
