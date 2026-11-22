/**
 * Trilhas por fase — layout do diagrama: Completo | NT | AT (Completo/Livros/Grupos).
 */
const QuizTrilhas = (() => {
  const QUESTIONS_PER_PHASE = 50

  const GRUPOS = {
    nt: [
      { id: 'evangelhos', label: 'Evangelhos', books: ['Mateus', 'Marcos', 'Lucas', 'João'] },
      { id: 'atos', label: 'Atos', books: ['Atos'] },
      { id: 'cartas_paulinas', label: 'Cartas Paulinas', books: ['Romanos', 'Coríntios', 'Gálatas', 'Efésios', 'Filipenses', 'Colossenses', 'Tessalonicenses', 'Timóteo', 'Tito', 'Filemon', 'Filemão'] },
      { id: 'cartas_gerais', label: 'Cartas Gerais', books: ['Hebreus', 'Tiago', 'Pedro', 'João', 'Judas'] },
      { id: 'apocalipse', label: 'Apocalipse', books: ['Apocalipse'] },
    ],
    at: [
      { id: 'pentateuco', label: 'Pentateuco', books: ['Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio'] },
      { id: 'historicos', label: 'Históricos', books: ['Josué', 'Juízes', 'Rute', 'Samuel', 'Reis', 'Crônicas', 'Esdras', 'Neemias', 'Ester'] },
      { id: 'poeticos', label: 'Poéticos', books: ['Jó', 'Salmo', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cantares'] },
      { id: 'profetas', label: 'Profetas', books: ['Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel', 'Oséias', 'Joel', 'Amós', 'Abdias', 'Jonas', 'Miquéias', 'Naum', 'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias'] },
    ],
  }

  /** Colunas do diagrama (por fase) */
  const COLUNAS = [
    {
      id: 'completo',
      titulo: 'Completo',
      trilhas: [{ id: 'completo', label: 'Completo', tipo: 'completo' }],
    },
    {
      id: 'nt',
      titulo: 'Novo Testamento',
      trilhas: [
        { id: 'nt_completo', label: 'Completo', tipo: 'nt', modo: 'completo' },
        { id: 'nt_livros', label: 'Livros', tipo: 'nt', modo: 'livros' },
        { id: 'nt_grupos', label: 'Grupo de Livros', tipo: 'nt', modo: 'grupos' },
      ],
    },
    {
      id: 'at',
      titulo: 'Antigo Testamento',
      trilhas: [
        { id: 'at_completo', label: 'Completo', tipo: 'at', modo: 'completo' },
        { id: 'at_livros', label: 'Livros', tipo: 'at', modo: 'livros' },
        { id: 'at_grupos', label: 'Grupo de Livros', tipo: 'at', modo: 'grupos' },
      ],
    },
  ]

  function buildPhases() {
    if (window.questionsPhases?.length) return window.questionsPhases
    const all = unifiedPool()
    const phases = []
    for (let i = 0; i < all.length; i += QUESTIONS_PER_PHASE) {
      phases.push(all.slice(i, i + QUESTIONS_PER_PHASE))
    }
    return phases.length ? phases : [[]]
  }

  /** @deprecated use buildPhases */
  function buildPhases130() {
    return buildPhases()
  }

  function unifiedPool() {
    if (window.questionsUnified?.length) return window.questionsUnified
    const parts = [
      ...(window.questionsPhase1 || window.questions || []),
      ...(window.questionsPhase2 || []),
      ...(window.questionsPhase3 || window.questionsFase2 || []),
      ...(window.questionsTeologia || []),
    ]
    const seen = new Set()
    const out = []
    for (const q of parts) {
      const key = QuizQuestionId.id(q)
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(q)
    }
    return out.sort((a, b) => {
      const na = Number(a.number) || 0
      const nb = Number(b.number) || 0
      if (na !== nb) return na - nb
      return String(a.reference || '').localeCompare(String(b.reference || ''), 'pt-BR')
    })
  }

  function poolForFase(fase) {
    const phases = buildPhases()
    return phases[(Number(fase) || 1) - 1] || []
  }

  function numFases() {
    return buildPhases().length
  }

  function isTeologia(q) {
    return q.category === 'teologia'
  }

  function isNT(q) {
    if (isTeologia(q)) return false
    return QuizCategories.matchesCategory(q, 'novo_testamento')
  }

  function isAT(q) {
    if (isTeologia(q)) return false
    const cats = QuizCategories.getCategoriesForQuestion(q)
    return cats.includes('antigo_testamento') || cats.includes('profetas')
  }

  function matchBook(q, book) {
    const ref = String(q.reference || '')
    const b = QuizCategories.extractBook?.(ref) || ref.split(/[\d]/)[0].trim()
    if (!b) return false
    return b.toLowerCase().startsWith(book.toLowerCase()) || book.toLowerCase().startsWith(b.toLowerCase())
  }

  function booksInPool(pool) {
    const set = new Set()
    for (const q of pool) {
      const b = QuizCategories.extractBook(q.reference)
      if (b) set.add(b)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }

  function filterTrilha(pool, trilhaId, subId = null) {
    if (!pool?.length) return []

    if (trilhaId === 'completo') return [...pool]

    const meta = findTrilha(trilhaId)
    if (!meta) return [...pool]

    if (meta.tipo === 'nt') {
      const list = pool.filter(isNT)
      if (meta.modo === 'completo') return list
      if (meta.modo === 'grupos' && subId) {
        const grupo = GRUPOS.nt.find((g) => g.id === subId)
        if (!grupo) return []
        return list.filter((q) => grupo.books.some((b) => matchBook(q, b)))
      }
      if (meta.modo === 'livros' && subId) {
        return list.filter((q) => matchBook(q, subId))
      }
      return list.filter(isNT)
    }

    if (meta.tipo === 'at') {
      let list = pool.filter(isAT)
      if (meta.modo === 'completo') return list
      if (meta.modo === 'grupos' && subId) {
        const grupo = GRUPOS.at.find((g) => g.id === subId)
        if (!grupo) return []
        return list.filter((q) => grupo.books.some((b) => matchBook(q, b)))
      }
      if (meta.modo === 'livros' && subId) {
        return list.filter((q) => matchBook(q, subId))
      }
      return list
    }

    return [...pool]
  }

  function findTrilha(trilhaId) {
    for (const col of COLUNAS) {
      const t = col.trilhas.find((x) => x.id === trilhaId)
      if (t) return t
    }
    return null
  }

  function trilhaLabel(trilhaId, subId = null) {
    const meta = findTrilha(trilhaId)
    if (!meta) return trilhaId
    if (subId) {
      if (meta.modo === 'livros') return subId
      const grupos = GRUPOS[meta.tipo] || []
      const g = grupos.find((x) => x.id === subId)
      if (g) return g.label
    }
    return meta.label
  }

  function pathKey(fase, trilhaId, subId) {
    return `${fase}:${trilhaId}${subId ? ':' + subId : ''}`
  }

  function gruposParaTrilha(trilhaId) {
    const meta = findTrilha(trilhaId)
    if (!meta || meta.modo !== 'grupos') return []
    return GRUPOS[meta.tipo] || []
  }

  function precisaSubescolha(trilhaId) {
    const meta = findTrilha(trilhaId)
    return meta && (meta.modo === 'livros' || meta.modo === 'grupos')
  }

  return {
    QUESTIONS_PER_PHASE,
    COLUNAS,
    GRUPOS,
    unifiedPool,
    buildPhases,
    buildPhases130,
    poolForFase,
    numFases,
    filterTrilha,
    findTrilha,
    trilhaLabel,
    pathKey,
    gruposParaTrilha,
    precisaSubescolha,
    booksInPool,
  }
})()

window.QuizTrilhas = QuizTrilhas
