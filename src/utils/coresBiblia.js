/**
 * Sistema de cores para livros e capítulos da Bíblia
 * Organizados por grupos bíblicos com tons similares
 */

// Grupos bíblicos e suas cores base
// As 5 partes do AT usam as mesmas cores das 5 partes do NT (na mesma ordem)
// Cores escolhidas para evitar tons similares consecutivos
const GRUPOS_CORES = {
  // Antigo Testamento - 1ª parte
  PENTATEUCO: {
    livros: [1, 2, 3, 4, 5], // Gênesis, Êxodo, Levítico, Números, Deuteronômio
    // Mesma cor de EVANGELHOS (1ª parte do NT)
    corBase: '#0277bd', // Azul
    tons: [
      '#01579b', // Mais escuro
      '#0277bd', // Base
      '#0288d1', // Médio
      '#0277bd', // Evita tons muito claros
      '#0288d1', // Alterna com médio
    ],
  },
  // Antigo Testamento - 2ª parte
  HISTORICOS_AT: {
    livros: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], // Josué até Ester
    // Mesma cor de HISTORICOS_NT (2ª parte do NT) - Verde para diferenciar do azul anterior
    corBase: '#2e7d32', // Verde
    tons: [
      '#1b5e20', // Mais escuro
      '#2e7d32', // Base
      '#388e3c', // Médio
      '#2e7d32', // Evita tons muito claros
      '#388e3c', // Alterna com médio
    ],
  },
  // Antigo Testamento - 3ª parte
  POETICOS: {
    livros: [18, 19, 20, 21, 22], // Jó, Salmos, Provérbios, Eclesiastes, Cantares
    // Mesma cor de CARTAS_PAULINAS (3ª parte do NT) - Laranja para diferenciar
    corBase: '#f57c00', // Laranja
    tons: [
      '#e65100', // Mais escuro
      '#f57c00', // Base
      '#fb8c00', // Médio
      '#f57c00', // Evita tons muito claros
      '#fb8c00', // Alterna com médio
    ],
  },
  // Antigo Testamento - 4ª parte
  PROFETAS_MAIORES: {
    livros: [23, 24, 25, 26, 27], // Isaías, Jeremias, Lamentações, Ezequiel, Daniel
    // Mesma cor de CARTAS_GERAIS (4ª parte do NT)
    corBase: '#7b1fa2', // Roxo
    tons: [
      '#6a1b9a', // Mais escuro
      '#7b1fa2', // Base
      '#8e24aa', // Médio
      '#7b1fa2', // Evita tons muito claros
      '#8e24aa', // Alterna com médio
    ],
  },
  // Antigo Testamento - 5ª parte
  PROFETAS_MENORES: {
    livros: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39], // Oséias até Malaquias
    // Mesma cor de APOCALIPTICO (5ª parte do NT)
    corBase: '#616161', // Cinza
    tons: [
      '#424242', // Mais escuro
      '#616161', // Base
      '#757575', // Médio
      '#616161', // Evita tons muito claros
      '#757575', // Alterna com médio
    ],
  },
  // Novo Testamento - 1ª parte
  EVANGELHOS: {
    livros: [40, 41, 42, 43], // Mateus, Marcos, Lucas, João
    // Mesma cor de PENTATEUCO (1ª parte do AT)
    corBase: '#0277bd', // Azul
    tons: [
      '#01579b', // Mais escuro
      '#0277bd', // Base
      '#0288d1', // Médio
      '#0277bd', // Evita tons muito claros
      '#0288d1', // Alterna com médio
    ],
  },
  // Novo Testamento - 2ª parte
  HISTORICOS_NT: {
    livros: [44], // Atos
    // Mesma cor de HISTORICOS_AT (2ª parte do AT)
    corBase: '#2e7d32', // Verde
    tons: [
      '#1b5e20', // Mais escuro
      '#2e7d32', // Base
      '#388e3c', // Médio
      '#2e7d32', // Evita tons muito claros
      '#388e3c', // Alterna com médio
    ],
  },
  // Novo Testamento - 3ª parte
  CARTAS_PAULINAS: {
    livros: [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57], // Romanos até Filemom
    // Mesma cor de POETICOS (3ª parte do AT)
    corBase: '#f57c00', // Laranja
    tons: [
      '#e65100', // Mais escuro
      '#f57c00', // Base
      '#fb8c00', // Médio
      '#f57c00', // Evita tons muito claros
      '#fb8c00', // Alterna com médio
    ],
  },
  // Novo Testamento - 4ª parte
  CARTAS_GERAIS: {
    livros: [58, 59, 60, 61, 62, 63, 64, 65], // Hebreus até Judas
    // Mesma cor de PROFETAS_MAIORES (4ª parte do AT)
    corBase: '#7b1fa2', // Roxo
    tons: [
      '#6a1b9a', // Mais escuro
      '#7b1fa2', // Base
      '#8e24aa', // Médio
      '#7b1fa2', // Evita tons muito claros
      '#8e24aa', // Alterna com médio
    ],
  },
  // Novo Testamento - 5ª parte
  APOCALIPTICO: {
    livros: [66], // Apocalipse
    // Mesma cor de PROFETAS_MENORES (5ª parte do AT)
    corBase: '#616161', // Cinza
    tons: [
      '#424242', // Mais escuro
      '#616161', // Base
      '#757575', // Médio
      '#616161', // Evita tons muito claros
      '#757575', // Alterna com médio
    ],
  },
}

/**
 * Obtém o grupo bíblico de um livro pelo ID
 */
function obterGrupo(livroId) {
  for (const [grupo, dados] of Object.entries(GRUPOS_CORES)) {
    if (dados.livros.includes(livroId)) {
      return { nome: grupo, ...dados }
    }
  }
  // Fallback para cores padrão
  return {
    nome: 'DESCONHECIDO',
    corBase: '#616161',
    tons: ['#424242', '#616161', '#757575', '#9e9e9e', '#bdbdbd'],
  }
}

/**
 * Obtém a cor de um livro.
 *
 * Todos os livros do mesmo grupo (Pentateuco, Históricos, Poéticos, etc.)
 * recebem **a mesma cor base** — evita a sensação de "alguns laranjas mais
 * escuros que outros". As variações ficam reservadas aos capítulos
 * (`obterCorCapitulo`), onde a alternância faz sentido visualmente.
 */
export function obterCorLivro(livroId) {
  const grupo = obterGrupo(livroId)
  return grupo.corBase
}

/**
 * Gradiente uniforme do livro: usa a cor base com uma sutil variação para
 * leve relevo de glassmorphism, mantendo a unidade visual do grupo.
 */
export function obterGradienteLivro(livroId) {
  const grupo = obterGrupo(livroId)
  return `linear-gradient(135deg, ${grupo.corBase} 0%, ${grupo.corBase} 100%)`
}

/**
 * Obtém a cor de um capítulo baseada no livro
 * Usa tons similares ao livro, mas variados
 */
export function obterCorCapitulo(livroId, capitulo) {
  const grupo = obterGrupo(livroId)
  const indiceLivro = grupo.livros.indexOf(livroId)
  const indiceCorBase = indiceLivro % grupo.tons.length
  
  // Varia a cor baseada no número do capítulo
  // Usa módulo para garantir que sempre use uma cor do grupo
  const variacao = (capitulo - 1) % grupo.tons.length
  const indiceCor = (indiceCorBase + variacao) % grupo.tons.length
  
  return grupo.tons[indiceCor]
}

/**
 * Obtém um gradiente para um capítulo
 */
export function obterGradienteCapitulo(livroId, capitulo) {
  const grupo = obterGrupo(livroId)
  const indiceLivro = grupo.livros.indexOf(livroId)
  const indiceCorBase = indiceLivro % grupo.tons.length
  
  // Varia a cor baseada no número do capítulo
  const variacao = (capitulo - 1) % grupo.tons.length
  const indiceCor = (indiceCorBase + variacao) % grupo.tons.length
  
  // Usa a cor escolhida e a próxima para criar gradiente
  const cor1 = grupo.tons[indiceCor]
  const cor2 = grupo.tons[Math.min(indiceCor + 1, grupo.tons.length - 1)]
  
  return `linear-gradient(135deg, ${cor1} 0%, ${cor2} 100%)`
}

/**
 * Obtém o nome do grupo de um livro
 */
export function obterNomeGrupo(livroId) {
  return obterGrupo(livroId).nome
}

