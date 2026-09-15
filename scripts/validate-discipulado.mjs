import { discipuladoData } from '../src/data/discipulado.js'
import { breveCatecismo } from '../src/data/breveCatecismo.js'
import { catecismoMaior } from '../src/data/catecismoMaior.js'
import { catecismoHeidelberg } from '../src/data/catecismoHeidelberg.js'
import devocionalDefault, {
  devocionalData,
  devocionalMeta,
  devocionalSecoes,
} from '../src/data/devocional.js'
import { REGEX_CONF_LINK, parseNumeroRomanOuArabico } from '../src/utils/confissaoReferenciasLite.js'

const EXPECTED = Object.freeze({ temas: 4, unidades: 23, questoes: 177, meditacoes: 105 })
const erros = []
const unidades = []
const perguntasBreve = new Set(breveCatecismo.map((item) => Number(item.numero)))
const perguntasMaior = new Set(catecismoMaior.map((item) => Number(item.numero)))
const perguntasHeidelberg = new Set(catecismoHeidelberg.map((item) => Number(item.numero)))

function validarDevocional() {
  const camposObrigatorios = ['id', 'ordem', 'secao', 'titulo', 'leitura', 'texto', 'pense_bem', 'oracao']
  const ids = new Set()
  const ordens = new Set()

  if (devocionalDefault !== devocionalData) erros.push('devocional: exportacao padrao diverge de devocionalData')
  if (devocionalData.length !== 90) erros.push(`devocional: esperados 90 itens; encontrados ${devocionalData.length}`)
  if (devocionalMeta?.versaoEditorial !== 4) erros.push('devocional: versao editorial deve ser 4')
  if (devocionalMeta?.totalDias !== 90) erros.push('devocional: metadado totalDias deve ser 90')
  if (!devocionalMeta?.introducao?.trim()) erros.push('devocional: introducao geral vazia')
  if (!devocionalMeta?.avisoPastoral?.trim()) erros.push('devocional: aviso pastoral vazio')

  for (const [indice, item] of devocionalData.entries()) {
    const contexto = `devocional id ${item.id ?? '?'} (indice ${indice})`
    for (const campo of camposObrigatorios) {
      if (!String(item[campo] ?? '').trim()) erros.push(`${contexto}: campo ${campo} vazio`)
    }
    if (ids.has(item.id)) erros.push(`${contexto}: id duplicado`)
    if (ordens.has(item.ordem)) erros.push(`${contexto}: ordem duplicada`)
    ids.add(item.id)
    ordens.add(item.ordem)
    if (item.ordem !== indice + 1) erros.push(`${contexto}: array fora da ordem editorial`)
    if (!String(item.pense_bem || '').trim().endsWith('?')) erros.push(`${contexto}: Pense bem deve terminar como pergunta`)
    if (!/(Cristo|Jesus|evangelho|cruz|Cordeiro|Salvador)/i.test(item.texto)) {
      erros.push(`${contexto}: resposta pastoral sem referencia cristocentrica explicita`)
    }
  }

  for (let numero = 1; numero <= 90; numero += 1) {
    if (!ids.has(numero)) erros.push(`devocional: id ${numero} ausente`)
    if (!ordens.has(numero)) erros.push(`devocional: ordem ${numero} ausente`)
  }

  if (devocionalSecoes.length !== 6) {
    erros.push(`devocional: esperadas 6 secoes; encontradas ${devocionalSecoes.length}`)
  }
  for (const secao of devocionalSecoes) {
    const itens = devocionalData.filter((item) => item.secao === secao.id)
    if (itens.length !== 15) erros.push(`devocional: secao ${secao.id} deve conter 15 itens; encontrados ${itens.length}`)
    if (itens.some((item) => item.ordem < secao.inicio || item.ordem > secao.fim)) {
      erros.push(`devocional: secao ${secao.id} contem item fora do intervalo ${secao.inicio}-${secao.fim}`)
    }
  }
}

function validarMarcacaoEditorial(texto, contexto) {
  let negrito = false
  let italico = false
  // O asterisco que inicia uma lista Markdown (`* item`) não é itálico.
  // Removemos somente esse marcador no início de cada linha antes de auditar
  // os pares de negrito/itálico do conteúdo.
  const textoSemMarcadoresDeLista = String(texto || '')
    .split('\n')
    .map((linha) => linha.replace(/^\s*\*\s+(?=\S)/, ''))
    .join('\n')
  for (const marcador of textoSemMarcadoresDeLista.match(/\*\*|\*/g) || []) {
    if (marcador === '**') negrito = !negrito
    else italico = !italico
  }
  if (negrito) erros.push(`${contexto}: marcacao de negrito sem fechamento`)
  if (italico) erros.push(`${contexto}: marcacao de italico sem fechamento`)
}

function validarReferenciasConfessionais(texto, contexto) {
  const regex = new RegExp(REGEX_CONF_LINK.source, REGEX_CONF_LINK.flags)
  for (const match of String(texto || '').matchAll(regex)) {
    const nome = String(match[1] || '').toUpperCase()
    const numero = parseNumeroRomanOuArabico(match[2])
    const fim = parseNumeroRomanOuArabico(match[4])
    if (!numero) {
      erros.push(`${contexto}: referencia confessional invalida: ${match[0]}`)
      continue
    }

    if (nome === 'CH' || nome.includes('HEIDELBERG')) {
      if (!perguntasHeidelberg.has(numero)) erros.push(`${contexto}: Heidelberg ${numero} nao esta disponivel`)
      if (fim && !perguntasHeidelberg.has(fim)) erros.push(`${contexto}: Heidelberg ${fim} nao esta disponivel`)
    } else if (nome === 'CMW' || nome.includes('CATECISMO MAIOR')) {
      if (!perguntasMaior.has(numero)) erros.push(`${contexto}: Catecismo Maior ${numero} nao esta disponivel`)
      if (fim && !perguntasMaior.has(fim)) erros.push(`${contexto}: Catecismo Maior ${fim} nao esta disponivel`)
    } else if (
      nome === 'CBW' ||
      nome === 'BCW' ||
      nome.includes('BREVE CATECISMO') ||
      nome.includes('CATECISMO BREVE')
    ) {
      if (!perguntasBreve.has(numero)) erros.push(`${contexto}: Catecismo Breve ${numero} nao esta disponivel`)
      if (fim && !perguntasBreve.has(fim)) erros.push(`${contexto}: Catecismo Breve ${fim} nao esta disponivel`)
    } else if (numero < 1 || numero > 33) {
      erros.push(`${contexto}: capitulo ${numero} da CFW nao existe`)
    }
  }
}

function auditarTextos(valor, contexto) {
  if (typeof valor === 'string') {
    validarMarcacaoEditorial(valor, contexto)
    validarReferenciasConfessionais(valor, contexto)
    return
  }
  if (Array.isArray(valor)) {
    valor.forEach((item, indice) => auditarTextos(item, `${contexto}[${indice}]`))
    return
  }
  if (valor && typeof valor === 'object') {
    Object.entries(valor).forEach(([chave, item]) => auditarTextos(item, `${contexto}.${chave}`))
  }
}

for (const tema of discipuladoData) {
  const estudos = Array.isArray(tema.estudos) ? tema.estudos : [tema]
  for (const estudo of estudos) {
    unidades.push(estudo)
    const contexto = `tema ${tema.id}, estudo ${estudo.id} (${estudo.titulo})`
    const apenasLeitura = estudo.tipo === 'leitura'

    if (!estudo.introducao?.texto?.trim()) erros.push(`${contexto}: introducao vazia`)
    if (!apenasLeitura && (!Array.isArray(estudo.questoes) || estudo.questoes.length === 0)) {
      erros.push(`${contexto}: sem questoes`)
    }

    const idsQuestoes = new Set()
    for (const questao of estudo.questoes || []) {
      if (idsQuestoes.has(questao.id)) erros.push(`${contexto}: questao ${questao.id} duplicada`)
      idsQuestoes.add(questao.id)
      if (!Array.isArray(questao.alternativas) || questao.alternativas.length < 2) {
        erros.push(`${contexto}, questao ${questao.id}: menos de duas alternativas`)
      }
      const corretas = (questao.alternativas || []).filter((alternativa) => alternativa.correta)
      if (corretas.length !== 1) {
        erros.push(`${contexto}, questao ${questao.id}: esperada uma resposta correta; encontradas ${corretas.length}`)
      }
      if (!questao.explicacao?.trim()) erros.push(`${contexto}, questao ${questao.id}: explicacao vazia`)
    }

    if (!apenasLeitura && (!Array.isArray(estudo.meditacao) || estudo.meditacao.length !== 7)) {
      erros.push(`${contexto}: esperadas sete meditacoes`)
    }
  }
}

const totais = {
  temas: discipuladoData.length,
  unidades: unidades.length,
  questoes: unidades.reduce((total, estudo) => total + (estudo.questoes?.length || 0), 0),
  meditacoes: unidades.reduce((total, estudo) => total + (estudo.meditacao?.length || 0), 0),
}

for (const [campo, esperado] of Object.entries(EXPECTED)) {
  if (totais[campo] !== esperado) erros.push(`${campo}: esperado ${esperado}; encontrado ${totais[campo]}`)
}

validarDevocional()
auditarTextos(discipuladoData, 'discipulado')
auditarTextos(devocionalData, 'devocional')
auditarTextos(breveCatecismo, 'catecismo-breve')
auditarTextos(catecismoMaior, 'catecismo-maior')
auditarTextos(catecismoHeidelberg, 'catecismo-heidelberg')

if (erros.length) {
  console.error(['Falha na integridade do discipulado:', ...erros.map((erro) => `- ${erro}`)].join('\n'))
  process.exitCode = 1
} else {
  console.log(`Discipulado valido: ${totais.temas} temas, ${totais.unidades} unidades, ${totais.questoes} questoes e ${totais.meditacoes} meditacoes. Devocional v4 valido: 90 dias em 6 secoes.`)
}
