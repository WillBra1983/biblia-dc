/**
 * Nível espiritual (quiz) — adaptado de Salvation/nivelEspiritual.js
 */
const QuizNivel = (() => {
  const NIVELS = [
    { id: 'iniciante', label: 'Iniciante', min: 0 },
    { id: 'discipulo', label: 'Discípulo', min: 45 },
    { id: 'servo', label: 'Servo', min: 120 },
    { id: 'mestre', label: 'Mestre', min: 260 },
  ]

  function calcularPontos() {
    const medalhas = QuizAchievements.contarDesbloqueadas()
    const stats = QuizStorage.lerStats()
    const daily = QuizDaily.lerProgresso()
    const streak = Number(daily.streak) || 0
    const rodadas = Number(stats.rodadasCompletas) || 0
    return medalhas * 22 + streak * 8 + rodadas * 4
  }

  function obterNivel(pontos = calcularPontos()) {
    let atual = NIVELS[0]
    for (const n of NIVELS) {
      if (pontos >= n.min) atual = n
    }
    const idx = NIVELS.indexOf(atual)
    const prox = NIVELS[idx + 1]
    return {
      ...atual,
      pontos,
      proximo: prox || null,
      falta: prox ? prox.min - pontos : 0,
      progressoPct: prox
        ? Math.min(100, Math.round(((pontos - atual.min) / (prox.min - atual.min)) * 100))
        : 100,
    }
  }

  return { NIVELS, calcularPontos, obterNivel }
})()

window.QuizNivel = QuizNivel
