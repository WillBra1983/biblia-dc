/* Integração local com a sessão da Bíblia; sem SDK externo ou registro de SW. */
(() => {
  const bridge = window.parent.__bibliaQuizIntegrado
  if (!bridge) throw new Error('Abra o Quiz pelo menu da Bíblia.')
  window.BibliaQuiz = bridge
  // Guardar o progresso de cada conta separadamente no mesmo aparelho.
  const scope = bridge.getUser()?.uid || 'visitante'
  const previous = localStorage.getItem('quizBibliaContaAtual')
  const keys = Object.keys(localStorage).filter(key => key.startsWith('quizBibliaV2_'))
  if (previous !== scope) {
    if (previous) {
      const saved = Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]))
      localStorage.setItem('quizBibliaConta:' + previous, JSON.stringify(saved))
    }
    keys.forEach(key => localStorage.removeItem(key))
    try {
      const saved = JSON.parse(localStorage.getItem('quizBibliaConta:' + scope) || '{}')
      for (const [key, value] of Object.entries(saved)) if (key.startsWith('quizBibliaV2_')) localStorage.setItem(key, value)
    } catch { /* Uma cópia local inválida não impede o jogo. */ }
    localStorage.setItem('quizBibliaContaAtual', scope)
    if (!previous) {
      for (const name of ['fase1_best', 'fase2_best', 'phase2Unlocked', 'phase3Unlocked']) {
        const old = localStorage.getItem('quizRetiro_' + name)
        if (old != null && localStorage.getItem('quizBibliaV2_' + name) == null) localStorage.setItem('quizBibliaV2_' + name, old)
      }
    }
  }
  window.QuizFirebaseAuth = {
    isConfigured: bridge.isConfigured,
    googleDisponivel: bridge.isConfigured,
    init: async () => true,
    getUser: bridge.getUser,
    onChange: callback => bridge.onAuth(callback),
    podePublicarRanking: () => Boolean(bridge.getUser()?.emailVerified),
    displayName: user => (user?.displayName || user?.email?.split('@')[0] || 'Jogador').trim(),
  }
  // O histórico externo pertence ao roteador da Bíblia, inclusive no Android.
  history.pushState = () => {}
  window.addEventListener('pagehide', () => {
    if (window.__quizApp?.estaNoQuiz()) window.__quizApp.persistir()
    void window.QuizFirebaseCloudSync?.flushImmediate()
  })
})()
