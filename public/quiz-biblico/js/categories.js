/**
 * Categorização por livro bíblico + pool separado por fase.
 */
const QuizCategories = (() => {
  const NT_COMPLETO = ['profetas', 'evangelhos', 'atos', 'cartas_paulinas', 'novo_testamento']

  const BOOKS = [
    ['1 Tessalonicenses', 'cartas_paulinas'],
    ['2 Tessalonicenses', 'cartas_paulinas'],
    ['1 Coríntios', 'cartas_paulinas'],
    ['2 Coríntios', 'cartas_paulinas'],
    ['1 Timóteo', 'cartas_paulinas'],
    ['2 Timóteo', 'cartas_paulinas'],
    ['1 Samuel', 'antigo_testamento'],
    ['2 Samuel', 'antigo_testamento'],
    ['1 Reis', 'antigo_testamento'],
    ['2 Reis', 'antigo_testamento'],
    ['1 Crônicas', 'antigo_testamento'],
    ['2 Crônicas', 'antigo_testamento'],
    ['1 Pedro', 'novo_testamento'],
    ['2 Pedro', 'novo_testamento'],
    ['1 João', 'novo_testamento'],
    ['2 João', 'novo_testamento'],
    ['3 João', 'novo_testamento'],
    ['Deuteronômio', 'antigo_testamento'],
    ['Gênesis', 'antigo_testamento'],
    ['Êxodo', 'antigo_testamento'],
    ['Levítico', 'antigo_testamento'],
    ['Números', 'antigo_testamento'],
    ['Josué', 'antigo_testamento'],
    ['Juízes', 'antigo_testamento'],
    ['Rute', 'antigo_testamento'],
    ['Esdras', 'antigo_testamento'],
    ['Neemias', 'antigo_testamento'],
    ['Ester', 'antigo_testamento'],
    ['Jó', 'antigo_testamento'],
    ['Salmo', 'antigo_testamento'],
    ['Salmos', 'antigo_testamento'],
    ['Provérbios', 'antigo_testamento'],
    ['Eclesiastes', 'antigo_testamento'],
    ['Cantares', 'antigo_testamento'],
    ['Lamentações', 'antigo_testamento'],
    ['Isaías', 'profetas'],
    ['Jeremias', 'profetas'],
    ['Ezequiel', 'profetas'],
    ['Daniel', 'profetas'],
    ['Oséias', 'profetas'],
    ['Joel', 'profetas'],
    ['Amós', 'profetas'],
    ['Abdias', 'profetas'],
    ['Jonas', 'profetas'],
    ['Miquéias', 'profetas'],
    ['Naum', 'profetas'],
    ['Habacuque', 'profetas'],
    ['Sofonias', 'profetas'],
    ['Ageu', 'profetas'],
    ['Zacarias', 'profetas'],
    ['Malaquias', 'profetas'],
    ['Mateus', 'evangelhos'],
    ['Marcos', 'evangelhos'],
    ['Lucas', 'evangelhos'],
    ['João', 'evangelhos'],
    ['Atos', 'atos'],
    ['Romanos', 'cartas_paulinas'],
    ['Coríntios', 'cartas_paulinas'],
    ['Gálatas', 'cartas_paulinas'],
    ['Efésios', 'cartas_paulinas'],
    ['Filipenses', 'cartas_paulinas'],
    ['Colossenses', 'cartas_paulinas'],
    ['Tessalonicenses', 'cartas_paulinas'],
    ['Timóteo', 'cartas_paulinas'],
    ['Tito', 'cartas_paulinas'],
    ['Filemon', 'cartas_paulinas'],
    ['Filemão', 'cartas_paulinas'],
    ['Hebreus', 'novo_testamento'],
    ['Tiago', 'novo_testamento'],
    ['Judas', 'novo_testamento'],
    ['Apocalipse', 'novo_testamento'],
  ]

  const VARIADOS = new Set([1, 7, 9, 14, 21, 28, 32, 41, 42, 46, 49])

  function getPoolForFase(fase) {
    if (window.questionsPhases?.length) {
      return [...(window.questionsPhases[(Number(fase) || 1) - 1] || [])]
    }
    if (fase === 3) return [...(window.questionsPhase3 || window.questionsFase2 || [])]
    if (fase === 2) return [...(window.questionsPhase2 || [])]
    return [...(window.questionsPhase1 || window.questions || [])]
  }

  function getTeologiaPoolForFase(fase) {
    const pool = getPoolForFase(fase)
    return pool.filter((q) => q.category === 'teologia' || getCategoriesForQuestion(q).includes('teologia'))
  }

  function extractBook(reference) {
    const ref = String(reference || '').trim()
    if (!ref) return null
    if (/livro de ester/i.test(ref)) return 'Ester'
    for (const [book] of BOOKS) {
      if (ref.toLowerCase().startsWith(book.toLowerCase())) return book
    }
    return null
  }

  function detectFromReference(reference) {
    const book = extractBook(reference)
    if (book) {
      const found = BOOKS.find(([b]) => b === book)
      if (found) return found[1]
    }
    const ref = String(reference || '')
    if (/profeta/i.test(ref)) return 'profetas'
    if (/tradição|cânon|canon/i.test(ref)) return 'novo_testamento'
    if (/westminster|catecismo|dort|reforma|calvin|sola scriptura|eleição|tulip|remonstrant|cfw|bcw|cmw|confissão/i.test(ref))
      return 'teologia'
    return 'personagens'
  }

  function isPersonagemQuestion(q) {
    if (q.category && q.category !== 'personagens') return false
    if (q.category === 'personagens') return true
    if (Array.isArray(q.categories) && q.categories.includes('personagens')) return true
    return /^Quem (foi|é|era|são|disse)/i.test(String(q.question || ''))
  }

  function getCategoriesForQuestion(q) {
    const cats = new Set()
    cats.add(q.category || detectFromReference(q.reference))
    if (VARIADOS.has(q.number)) cats.add('variados')
    if (isPersonagemQuestion(q)) cats.add('personagens')
    if (Array.isArray(q.categories)) q.categories.forEach((c) => cats.add(c))
    return [...cats]
  }

  function matchesCategory(q, categoryId) {
    const cats = getCategoriesForQuestion(q)
    if (categoryId === 'todas') return true
    if (categoryId === 'novo_testamento') return cats.some((c) => NT_COMPLETO.includes(c))
    if (categoryId === 'personagens') return isPersonagemQuestion(q)
    if (categoryId === 'teologia') return cats.includes('teologia') || cats.includes('reformado')
    return cats.includes(categoryId)
  }

  function inferDifficulty(q, fase) {
    const tagged = Number(q.difficulty)
    if (tagged >= 1 && tagged <= 3) return tagged

    const t = String(q.question || '')

    if (fase === 3) {
      if (
        /pentateuco|nasceu Jesus|jardim onde Jesus foi preso|duvidou da ressurreição|permanece como a maior|todos pecaram e carecem|Regozijai-vos|sucedeu a Moisés|monte onde Elias matou|mãe de João Batista/i.test(
          t
        )
      ) {
        return 1
      }
      if (
        /superioridade de Cristo|anular a graça|por que fomos salvos|Timóteo orientando sobre a Escritura|discípulos que só tinham recebido o batismo/i.test(
          t
        )
      ) {
        return 2
      }
      return 3
    }

    if (fase === 2) {
      if (
        /parentesco entre Abraão|patriarca disse que Sara|pragas Deus enviou|sarça ardente|nome da esposa de Abraão|irmão mais velho de Moisés|engolido por um grande peixe/i.test(
          t
        )
      ) {
        return 1
      }
      if (
        /doze apóstolos escolhidos|pessoas sobraram dos desastres|318|queixada|Jonas lamentou|fugiu deixando sua roupa|sorteado para ocupar o lugar de Judas|nome hebraico do apóstolo Pedro|animal falou com o profeta Balaão|fechou a porta da arca|conjuntura como esta|Com qual nome Deus abençoou Jacó/i.test(t)
      ) {
        return 3
      }
      return 2
    }

    // Fase 1 — perguntas legadas sem tag
    if (
      /nome hebraico|sogro de Moisés|não menciona o nome de Deus|último livro escrito|quantos anos tinha Matusalém|monte onde Moisés morreu|primeiro homem a construir uma cidade|primeiro mártir do Antigo Testamento|interpretou o sonho de Nabucodonosor|visão do trono de Deus com rodas|sinal que Deus deu a Gideão|primeiro gentio convertido mencionado|profeta que casou com uma prostituta|filho da consolação|discípulo a quem Jesus amava|corpo transformado em corpo de animal|esposa de Acabe/i.test(
        t
      )
    ) {
      return 3
    }

    if (
      /^Quem foi o primeiro (rei|juiz)/i.test(t) ||
      /^Quem foi (lançado na cova dos leões|a primeira pessoa a ser martirizada|a única mulher juíza)/i.test(t) ||
      /^Qual profeta confrontou os profetas de Baal/i.test(t) ||
      /^Qual apóstolo (foi mordido|negou Jesus|foi exilado)/i.test(t) ||
      /^Quem (escreveu a maior parte dos Salmos|é chamado de .amigo de Deus|subiu ao céu em um redemoinho|vendeu sua primogenitura|foi vendido pelos irmãos|profetizou que Jesus nasceria em Belém)/i.test(t) ||
      /^Qual (rei teve sua vida prolongada|rei construiu o primeiro templo|discípulo encontrou primeiro o menino)/i.test(t) ||
      /^Quem reconheceu Jesus como/i.test(t) ||
      /^Qual profeta viu um vale de ossos secos/i.test(t)
    ) {
      return 1
    }

    if (/^Quem (foi|é)|^Qual (profeta|rei|discípulo|apóstolo|o nome)/i.test(t)) return 2

    return 2
  }

  function matchesDifficulty(q, difficulty, fase) {
    if (difficulty == null) return true
    return inferDifficulty(q, fase) === difficulty
  }

  function filterQuestions(pool, categoryId, difficulty = null, fase = 1) {
    let list
    if (categoryId === 'teologia') {
      list = [...getTeologiaPoolForFase(fase)]
    } else if (!categoryId || categoryId === 'todas') {
      list = pool.filter((q) => q.category !== 'teologia')
    } else {
      list = pool.filter((q) => q.category !== 'teologia' && matchesCategory(q, categoryId))
    }
    if (difficulty != null) {
      list = list.filter((q) => matchesDifficulty(q, difficulty, fase))
    }
    return list
  }

  function countByCategoryForFase(fase, difficulty = null) {
    const pool = getPoolForFase(fase)
    const counts = { todas: filterQuestions(pool, 'todas', difficulty, fase).length }
    QuizConfig.CATEGORIES.forEach((cat) => {
      if (cat.id === 'todas') return
      counts[cat.id] = filterQuestions(pool, cat.id, difficulty, fase).length
    })
    return counts
  }

  function difficultyLabel(n) {
    const d = QuizConfig.DIFFICULTY.find((x) => x.id === n)
    return d?.label || ''
  }

  function formatCountLabel(n, pool = null) {
    if (!n) return '0 níveis'
    const lvl = Math.ceil(n / QuizLevels.PER_LEVEL)
    let extra = ''
    if (pool && typeof QuizQuestionSwap !== 'undefined') {
      const fresh = QuizQuestionSwap.contarIneditas(pool)
      if (fresh === 0) extra = ' · esgotada'
      else if (fresh < n) extra = ` · ${fresh} inéditas`
    }
    return `${lvl} ${lvl === 1 ? 'nível' : 'níveis'} · ${n} perg.${extra}`
  }

  function levelCountForCategory(fase, categoryId, difficulty = null) {
    const pool = filterQuestions(getPoolForFase(fase), categoryId, difficulty, fase)
    return QuizLevels.levelCount(pool)
  }

  function shortCategoryLabel(categoriaId) {
    const cat = QuizConfig.CATEGORIES.find((c) => c.id === categoriaId)
    if (!cat) return 'Nível'
    return cat.label
      .replace(/^Apenas /, '')
      .replace(/ \(Completo\)/, '')
      .replace(/^Questões /, '')
  }

  function inferLevelNameFromQuestions(questions, categoriaId, levelIndex, totalLevels) {
    if (!questions?.length) return `Nível ${levelIndex + 1}`

    if (categoriaId === 'teologia') {
      const temas = new Set()
      for (const q of questions) {
        const sub = q.subcategory || ''
        const ref = String(q.reference || '')
        if (sub === 'catecismo' || /BCW|Catecismo/i.test(ref)) temas.add('Breve Catecismo')
        else if (sub === 'confissao' || /CFW|Confissão/i.test(ref)) temas.add('Confissão de Fé')
        else if (sub === 'doutrina') temas.add('Questões Teológicas')
        else if (sub === 'reformado' || /Reforma|Westminster|Dort|TULIP/i.test(ref)) temas.add('Reforma')
        else temas.add('Doutrina')
      }
      const lista = [...temas]
      if (lista.length === 1) {
        return totalLevels === 1 ? lista[0] : `${lista[0]} · ${levelIndex + 1}/${totalLevels}`
      }
      return `Teologia · Parte ${levelIndex + 1}`
    }

    const books = []
    for (const q of questions) {
      const b = extractBook(q.reference)
      if (b && !books.includes(b)) books.push(b)
    }

    if (books.length === 1) {
      return totalLevels === 1 ? books[0] : `${books[0]} · ${levelIndex + 1}/${totalLevels}`
    }
    if (books.length === 2) return `${books[0]} e ${books[1]}`
    if (books.length >= 3) return `${books[0]}, ${books[1]}…`

    const rotulo = shortCategoryLabel(categoriaId)
    if (totalLevels === 1) return rotulo
    return `${rotulo} · Parte ${levelIndex + 1}`
  }

  function nomeNivel(fase, categoriaId, levelIndex, pool) {
    if (categoriaId === 'todas' || categoriaId === 'completo') {
      return QuizConfig.nomeNivel(fase, levelIndex)
    }
    const questions = QuizLevels.questionsForLevel(pool, levelIndex)
    const total = QuizLevels.levelCount(pool)
    return inferLevelNameFromQuestions(questions, categoriaId, levelIndex, total)
  }

  return {
    getPoolForFase,
    getTeologiaPoolForFase,
    extractBook,
    getCategoriesForQuestion,
    matchesCategory,
    inferDifficulty,
    filterQuestions,
    countByCategoryForFase,
    formatCountLabel,
    levelCountForCategory,
    nomeNivel,
    difficultyLabel,
  }
})()

window.QuizCategories = QuizCategories
