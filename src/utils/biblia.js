import { 
  buscarLivroPorNome, 
  buscarIntervaloVersiculos 
} from '../services/bibliaService'
import { livros } from '../data/biblia'

const LIVROS_VALIDOS = livros.map(l => l.nome)
const ABREVIACOES_VALIDAS = Object.fromEntries(livros.map(l => [l.abreviacao.toLowerCase(), l.nome]))

/** Remove coluna paralela em NVI (trechos entre parênteses no fim da linha), ex.: " (Lc 6.29,30)". */
export function limparReferenciasParalelasARA(s) {
  if (s == null) return ''
  let t = String(s).trim()
  while (/\s*\([^)]*\)\s*$/.test(t)) {
    t = t.replace(/\s*\([^)]*\)\s*$/, '').trim()
  }
  return t.replace(/\s{2,}/g, ' ').trim()
}

export async function buscarVersiculo({ livroId, capitulo, versiculoInicio = 1, versiculoFim }) {
  try {
    return await buscarIntervaloVersiculos(
      livroId,
      parseInt(capitulo),
      versiculoInicio,
      versiculoFim || 999
    )
  } catch (error) {
    console.error('Erro ao buscar versículos:', error)
    return { versiculos: [] }
  }
}

export async function buscarReferencia(referencia) {
  try {
    const db = await initDB()
    
    // Extrai as referências do texto
    const referencias = extrairReferenciaBiblica(referencia)
    if (!referencias.length) {
      console.warn('📖 Referência inválida:', referencia)
      return null
    }

    const ref = referencias[0]

    // Busca o livro
    const livro = await buscarLivroPorNome(ref.livroNome)
    if (!livro) {
      console.warn('📚 Livro não encontrado:', ref.livroNome)
      return null
    }

    // Se não tem versículo específico, busca o capítulo inteiro
    if (!ref.versiculoInicio && !ref.versiculoFim) {
      return await buscarIntervaloVersiculos(
        livro.id,
        ref.capitulo,
        1,  // Começa do versículo 1
        999 // Número grande para pegar todos os versículos
      )
    }

    // Se tem versículos específicos, busca apenas o intervalo
    return await buscarIntervaloVersiculos(
      livro.id,
      ref.capitulo,
      ref.versiculoInicio || 1,
      ref.versiculoFim || ref.versiculoInicio || 1
    )

  } catch (error) {
    console.error('❌ Erro ao buscar referência:', error)
    return null
  }
}

export function extrairReferenciaBiblica(texto) {
  if (!texto) return []

  const textoLimpo = texto
    .replace(/\((?=\d)/g, '( ')
    .replace(/<[^>]*>/g, '')
    .replace(/["""]/g, '"')
    .replace(/(?<!\d)\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const regex = /\(?([1-3]?\s*[A-Za-zÀ-ú.]+)\s+(\d+)([:.]?(\d+))?(?:[\-\u2013\u2014](\d+))?\)?/g
  const referencias = []
  const refEncontradas = new Set()

  const processarReferencia = (textoRef) => {
    let refTexto = textoRef.replace(/^[\s(]+|[\s);,.]+$/g, '').trim()

    // Ignorar se começa com "Cap." ou "Capítulo"
    if (/^cap(ítulo)?\.?/i.test(refTexto)) return

    if (!refTexto || refEncontradas.has(refTexto)) return

    const partes = refTexto.match(
      /^([1-3]?\s*[A-ZÀ-Úa-zà-ú.]+(?:\s+[A-ZÀ-Úa-zà-ú.]+)?)\s*(\d+)(?:[:.](\d+))?(?:[\-\u2013\u2014](\d+))?$/
    )
    if (!partes) return

    const [, livroNome, capitulo, versiculoInicio, versiculoFim] = partes
    const nomeNormalizado = normalizarNomeLivro(livroNome.trim())
    if (nomeNormalizado) {
      refEncontradas.add(refTexto)
      referencias.push({
        textoOriginal: refTexto,
        livroNome: nomeNormalizado,
        capitulo: parseInt(capitulo),
        versiculoInicio: versiculoInicio ? parseInt(versiculoInicio) : null,
        versiculoFim: versiculoFim ? parseInt(versiculoFim) : (versiculoInicio ? parseInt(versiculoInicio) : null)
      })
    }
  }

  let match
  while ((match = regex.exec(textoLimpo)) !== null) {
    match[0].split(/;\s*/).forEach(ref => {
      if (ref.trim()) processarReferencia(ref)
    })
  }

  return referencias
}

export function normalizarNomeLivro(nome) {
  // Normaliza espaços múltiplos e remove espaços extras
  nome = nome.replace(/\s+/g, ' ').trim()
  // Abreviaturas com ponto (Rom., Jo., 1 Cor., etc.): o clique guarda "Rom." e o mapa só tinha "rom"
  nome = nome.replace(/\.+$/g, '').trim()
  nome = nome.replace(/^(\d)\s+([a-zA-Z]+)/, '$1$2').toLowerCase()
  const abreviacoes = {
    // Antigo Testamento
    'gn': 'Gênesis',
    'gen': 'Gênesis',
    'ex': 'Êxodo',
    'exd': 'Êxodo',
    'lv': 'Levítico',
    'lev': 'Levítico',
    'nm': 'Números',
    'num': 'Números',
    'dt': 'Deuteronômio',
    'dt.': 'Deuteronômio',
    'deu': 'Deuteronômio',
    'deut': 'Deuteronômio',
    'deut.': 'Deuteronômio',
    'deuteronomio': 'Deuteronômio',
    'deuteronomío': 'Deuteronômio',
    'deuteronomío.': 'Deuteronômio',
    'deuteronomio.': 'Deuteronômio',
    'js': 'Josué',
    'jos': 'Josué',
    'jz': 'Juízes',
    'jui': 'Juízes',
    'rt': 'Rute',
    'rut': 'Rute',
    '1sm': '1 Samuel',
    '1sa': '1 Samuel',
    '2sm': '2 Samuel',
    '2sa': '2 Samuel',
    '1rs': '1 Reis',
    '1re': '1 Reis',
    '2rs': '2 Reis',
    '2re': '2 Reis',
    '1cr': '1 Crônicas',
    '1ch': '1 Crônicas',
    '2cr': '2 Crônicas',
    '2ch': '2 Crônicas',
    'ed': 'Esdras',
    'esd': 'Esdras',
    'ne': 'Neemias',
    'nee': 'Neemias',
    'et': 'Ester',
    'est': 'Ester',
    'sl': 'Salmos',
    'sal': 'Salmos',
    'pv': 'Provérbios',
    'pro': 'Provérbios',
    'ec': 'Eclesiastes',
    'ecl': 'Eclesiastes',
    'ct': 'Cânticos',
    'can': 'Cânticos',
    'is': 'Isaías',
    'isa': 'Isaías',
    'jr': 'Jeremias',
    'jer': 'Jeremias',
    'lm': 'Lamentações',
    'lam': 'Lamentações',
    'ez': 'Ezequiel',
    'eze': 'Ezequiel',
    'dn': 'Daniel',
    'dan': 'Daniel',
    'os': 'Oséias',
    'ose': 'Oséias',
    'jl': 'Joel',
    'joe': 'Joel',
    'am': 'Amós',
    'amo': 'Amós',
    'ob': 'Obadias',
    'oba': 'Obadias',
    'jn': 'Jonas',
    'jon': 'Jonas',
    'mq': 'Miquéias',
    'miq': 'Miquéias',
    'na': 'Naum',
    'nau': 'Naum',
    'hc': 'Habacuque',
    'hab': 'Habacuque',
    'sf': 'Sofonias',
    'sof': 'Sofonias',
    'ag': 'Ageu',
    'age': 'Ageu',
    'zc': 'Zacarias',
    'zac': 'Zacarias',
    'ml': 'Malaquias',
    'mal': 'Malaquias',

    // Novo Testamento
    'mt': 'Mateus',
    'mat': 'Mateus',
    'mc': 'Marcos',
    'mar': 'Marcos',
    'lc': 'Lucas',
    'luc': 'Lucas',
    'jo': 'João',
    'joa': 'João',
    'at': 'Atos',
    'ato': 'Atos',
    'atos': 'Atos',
    'atos dos apostolos': 'Atos',
    'atos do apostolo': 'Atos',
    'atos dos apóstolos': 'Atos',
    'atos do apóstolo': 'Atos',
    'rm': 'Romanos',
    'rom': 'Romanos',
    '1co': '1 Coríntios',
    '1cor': '1 Coríntios',
    '1cor.': '1 Coríntios',
    '1 cor': '1 Coríntios',
    '1 cor.': '1 Coríntios',
    'i cor': '1 Coríntios',
    'i cor.': '1 Coríntios',
    'primeiro cor': '1 Coríntios',
    'primeiro cor.': '1 Coríntios',
    '1 coríntios': '1 Coríntios',
    '2co': '2 Coríntios',
    '2cor': '2 Coríntios',
    '2cor.': '2 Coríntios',
    '2 cor': '2 Coríntios',
    '2 cor.': '2 Coríntios',
    'ii cor': '2 Coríntios',
    'ii cor.': '2 Coríntios',
    'segundo cor': '2 Coríntios',
    'segundo cor.': '2 Coríntios',
    '2 coríntios': '2 Coríntios',
    '2 Co': '2 Coríntios',
    '2 co.': '2 Coríntios',
    '2co': '2 Coríntios',
    '2co.': '2 Coríntios',
    '2 coríntios': '2 Coríntios',
    '2 co': '2 Coríntios',
    '2 co.': '2 Coríntios',
    'gl': 'Gálatas',
    'gal': 'Gálatas',
    'ef': 'Efésios',
    'efe': 'Efésios',
    'fp': 'Filipenses',
    'fil': 'Filipenses',
    'cl': 'Colossenses',
    'col': 'Colossenses',
    '1ts': '1 Tessalonicenses',
    '1te': '1 Tessalonicenses',
    '1Ts': '1 Tessalonicenses',
    '2ts': '2 Tessalonicenses',
    '2te': '2 Tessalonicenses',
    '2Ts': '2 Tessalonicenses',
    '1tm': '1 Timóteo',
    '1tim': '1 Timóteo',
    '1tim.': '1 Timóteo',
    '1 tim': '1 Timóteo',
    '1 tim.': '1 Timóteo',
    'i tim': '1 Timóteo',
    'i tim.': '1 Timóteo',
    'primeiro tim': '1 Timóteo',
    'primeiro timóteo': '1 Timóteo',
    '2tm': '2 Timóteo',
    '2tim': '2 Timóteo',
    '2tim.': '2 Timóteo',
    '2 tim': '2 Timóteo',
    '2 tim.': '2 Timóteo',
    'ii tim': '2 Timóteo',
    'ii tim.': '2 Timóteo',
    'segundo tim': '2 Timóteo',
    'segundo timóteo': '2 Timóteo',
    'tt': 'Tito',
    'tit': 'Tito',
    'fm': 'Filemom',
    'file': 'Filemom',
    'hb': 'Hebreus',
    'heb': 'Hebreus',
    'tg': 'Tiago',
    'tia': 'Tiago',
    '1pe': '1 Pedro',
    '1ped': '1 Pedro',
    '1Pe': '1 Pedro',
    '2pe': '2 Pedro',
    '2ped': '2 Pedro',
    '2Pe': '2 Pedro',
    '1jo': '1 João',
    '1joa': '1 João',
    '1Jo': '1 João',
    '2jo': '2 João',
    '2joa': '2 João',
    '2Jo': '2 João',
    '3jo': '3 João',
    '3joa': '3 João',
    '3Jo': '3 João',
    'jd': 'Judas',
    'jud': 'Judas',
    'ap': 'Apocalipse',
    'apo': 'Apocalipse',

    // Variações de Jó
    'jo': 'João',
    'jo.': 'João',
    'jó': 'Jó',
    'jó.': 'Jó',
    'job': 'Jó',
    'job.': 'Jó',
    'jób': 'Jó',
    'jób.': 'Jó',
  }

  // Primeiro tenta encontrar uma correspondência exata
  const nomeCompleto = nome.trim()
  if (abreviacoes[nomeCompleto]) {
    return abreviacoes[nomeCompleto]
  }

  // Se não encontrou, tenta em minúsculas
  const nomeMinusculo = nomeCompleto.toLowerCase()
  if (abreviacoes[nomeMinusculo]) {
    return abreviacoes[nomeMinusculo]
  }

  // Se ainda não encontrou, verifica se é um nome completo
  const nomes = Object.values(abreviacoes)
  const nomeEncontrado = nomes.find(n => 
    n.toLowerCase() === nomeMinusculo ||
    n.toLowerCase().replace(/\s+/g, '') === nomeMinusculo.replace(/\s+/g, '') ||
    // Adiciona comparação especial para Jó
    (nomeMinusculo === 'jó' || nomeMinusculo === 'jo' || nomeMinusculo === 'job')
  )
  if (nomeEncontrado) {
    return nomeEncontrado
  }

  // Se não encontrou nenhuma correspondência, retorna o nome original
  return nome
} 