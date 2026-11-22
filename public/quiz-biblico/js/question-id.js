/**
 * Identidade estável de perguntas — evita duplicatas entre pools e modos.
 */
const QuizQuestionId = (() => {
  function id(q) {
    if (!q) return ''
    const text = String(q.question || '').replace('Quantos capítulos possui a redação original da Confissão de Fé de Westminster, de 1647?', 'Quantos capítulos possui a Confissão de Fé de Westminster?')
      .trim()
      .toLowerCase()
    if (text) return `q:${text}`
    if (q.number != null && q.number !== '') return `n:${q.number}`
    return ''
  }

  function dedupePool(pool) {
    const seen = new Set()
    const out = []
    for (const q of pool || []) {
      const key = id(q)
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(q)
    }
    return out
  }

  function indexById(pool) {
    const map = new Map()
    for (const q of pool || []) {
      const key = id(q)
      if (key && !map.has(key)) map.set(key, q)
    }
    return map
  }

  return { id, dedupePool, indexById }
})()

window.QuizQuestionId = QuizQuestionId
