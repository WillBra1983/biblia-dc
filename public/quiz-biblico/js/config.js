/** Configuração central do Quiz Bíblico */
const QuizConfig = {
  STORAGE: {
    PROGRESS: 'quizBibliaV2_progress_v1',
    BEST_FASE1: 'quizBibliaV2_fase1_best',
    BEST_FASE2: 'quizBibliaV2_fase2_best',
    UNLOCK_PHASE2: 'quizBibliaV2_phase2Unlocked',
    UNLOCK_PHASE3: 'quizBibliaV2_phase3Unlocked',
    LOCAL_RANKING: 'quizBibliaV2_local_ranking_v2',
    ACHIEVEMENTS: 'quizBibliaV2_achievements_v1',
    STATS: 'quizBibliaV2_stats_v1',
    RANKING_OPTIN: 'quizBibliaV2_ranking_optin',
    PLAYER_NAME: 'quizBibliaV2_player_name',
    FIREBASE_UID: 'quizBibliaV2_firebase_uid',
    DAILY: 'quizBibliaV2_daily_v1',
    LEVELS: 'quizBibliaV2_levels_v1',
  },

  /** Perguntas por nível no mapa de caminho */
  QUESTIONS_PER_LEVEL: 12,

  /** Base fixa para cálculo de pontos mínimos (25 perg. originais na Fase 1) */
  FASE1_UNLOCK_BASE: 25,

  DAILY: {
    count: 10,
  },

  DIFFICULTY: [
    { id: null, label: 'Todas' },
    { id: 1, label: 'Fácil' },
    { id: 2, label: 'Médio' },
    { id: 3, label: 'Difícil' },
  ],

  CATEGORIES: [
    { id: 'todas', label: 'Todas as categorias', icon: '📖' },
    { id: 'antigo_testamento', label: 'Antigo Testamento (Completo)', icon: '📜' },
    { id: 'novo_testamento', label: 'Novo Testamento (Completo)', icon: '✝️' },
    { id: 'evangelhos', label: 'Apenas Evangelhos', icon: '🕊️' },
    { id: 'atos', label: 'Apenas Atos dos Apóstolos', icon: '🌍' },
    { id: 'cartas_paulinas', label: 'Apenas Cartas Paulinas', icon: '✉️' },
    { id: 'profetas', label: 'Apenas Profetas (AT)', icon: '🔥' },
    { id: 'personagens', label: 'Personagens Bíblicos', icon: '👤' },
    { id: 'variados', label: 'Variados', icon: '🔀' },
    { id: 'teologia', label: 'Questões Teológicas', icon: '📚' },
  ],

  /** % dos pontos máximos na rodada Todas para desbloquear a próxima fase */
  UNLOCK_RATIO: 0.85,


  /**
   * URL pública HTTPS do quiz (ex.: https://seusite.com/quiz).
   * Links de competição usam esta URL quando definida.
   * Vazio no app Android/iOS: usa deep link com.quizbiblico.app://open?comp=...
   */
  PUBLIC_APP_URL: window.BibliaQuiz.publicUrl,

  pontosMaximos(n) { return Math.max(0, Number(n) || 0) * 10 },

  minPontosDesbloquear(proximaFase) {
    if (typeof QuizLevels !== 'undefined' && QuizLevels.minPontosParaDesbloquear) {
      return QuizLevels.minPontosParaDesbloquear(proximaFase)
    }
    const n =
      proximaFase === 2
        ? this.FASE1_UNLOCK_BASE
        : proximaFase === 3
          ? (window.questionsPhase2 || []).length || 30
          : 25
    return Math.ceil(this.pontosMaximos(n) * this.UNLOCK_RATIO)
  },

  niveisNaFase(fase) {
    if (typeof QuizLevels === 'undefined') return 0
    return QuizLevels.levelCount(QuizLevels.poolTodasForFase(fase))
  },

  /** @deprecated use minPontosDesbloquear(2) */
  minPontosDesbloquearFase2(n) {
    return this.minPontosDesbloquear(2)
  },

  totalPerguntasFase(fase) {
    if (fase === 3) return (window.questionsPhase3 || window.questionsFase2 || []).length
    if (fase === 2) return (window.questionsPhase2 || []).length
    return (window.questionsPhase1 || window.questions || []).length
  },

  numFases: 3,

  /** Nomes temáticos das fases e dos níveis (Todas) */
  PHASES: [
    {
      id: 1,
      nome: 'Fundamentos da Palavra',
      icon: '🌱',
      tagline: 'Reis, profetas, evangelhos e personagens essenciais',
      levelNames: [
        'Reis e Profetas',
        'Evangelhos e Apóstolos',
        'Histórias do Antigo Testamento',
        'Personagens Marcantes',
      ],
    },
    {
      id: 2,
      nome: 'Histórias e Personagens',
      icon: '⚔️',
      tagline: 'Sansão, Jonas, Jó, Abraão, apóstolos e enigmas bíblicos',
      levelNames: [
        'Patriarcas e Guerras',
        'Profetas e Milagres',
        'Apóstolos e Corinto',
        'Enigmas Bíblicos',
        'Teologia Intermediária',
      ],
    },
    {
      id: 3,
      nome: 'Mestre das Escrituras',
      icon: '👑',
      tagline: 'Cartas paulinas, Confissão de Fé e desafios avançados',
      levelNames: [
        'Conhecimento Bíblico',
        'Cartas e Doutrina',
        'Teologia Reformada',
        'Confissão de Westminster',
        'Desafio Final',
      ],
    },
  ],

  metaFase(id) {
    return this.PHASES.find((p) => p.id === id) || { id, nome: null, icon: '📖', levelNames: [] }
  },

  /** Título curto da fase (evita "Fase 4 · Fase 4" em blocos extras). */
  labelFase(id) {
    const meta = this.metaFase(id)
    const prefix = `Fase ${id}`
    if (meta.nome && meta.nome !== prefix) return `${prefix} · ${meta.nome}`
    return prefix
  },

  nomeNivel(fase, levelIndex) {
    const meta = this.metaFase(fase)
    return meta.levelNames?.[levelIndex] || `Nível ${levelIndex + 1}`
  },
}

window.QuizConfig = QuizConfig
