/** Regra única: dez pontos por acerto, sem multiplicadores ou penalidades. */
const QuizPontuacao = (() => {
  const STORAGE_KEY = 'quizBibliaV2_scoring_v1'
  const pontosPorAcerto = 10
  const lerModo = () => 'fixo10'
  const gravarModo = () => {}
  const calcularSequenciaAtual = () => 0
  function calcularPontosRodada(respostas, _modo, totalPerguntas = 0) {
    const limit = totalPerguntas > 0 ? Math.min(totalPerguntas, respostas?.length || 0) : respostas?.length || 0
    let acertos = 0
    for (let i = 0; i < limit; i++) if (respostas[i] === true) acertos++
    return acertos * pontosPorAcerto
  }
  const pontosMaximosRodada = n => Math.max(0, Math.floor(Number(n) || 0)) * pontosPorAcerto
  return { STORAGE_KEY, pontosPorAcerto, lerModo, gravarModo, calcularSequenciaAtual, calcularPontosRodada, pontosMaximosRodada }
})()
window.QuizPontuacao = QuizPontuacao
