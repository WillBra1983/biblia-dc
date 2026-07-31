import { discipuladoData } from '../src/data/discipulado.js'
import { breveCatecismo } from '../src/data/breveCatecismo.js'
import { catecismoMaior } from '../src/data/catecismoMaior.js'
import { catecismoHeidelberg } from '../src/data/catecismoHeidelberg.js'
import { devocionalData } from '../src/data/devocional.js'
import { REGEX_CONF_LINK, parseNumeroRomanOuArabico } from '../src/utils/confissaoReferenciasLite.js'

const EXPECTED = Object.freeze({ temas: 3, unidades: 15, questoes: 167, meditacoes: 105 })
const erros = []
const unidades = []
const perguntasBreve = new Set(breveCatecismo.map((item) => Number(item.numero)))
const perguntasMaior = new Set(catecismoMaior.map((item) => Number(item.numero)))
const perguntasHeidelberg = new Set(catecismoHeidelberg.map((item) => Number(item.numero)))

function validarMarcacaoEditorial(texto, contexto) {
  let negrito = false
  let italico = false
  for (const marcador of String(texto || '').match(/\*\*|\*/g) || []) {
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

    if (!estudo.introducao?.texto?.trim()) erros.push(`${contexto}: introducao vazia`)
    if (!Array.isArray(estudo.questoes) || estudo.questoes.length === 0) {
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

    if (!Array.isArray(estudo.meditacao) || estudo.meditacao.length !== 7) {
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

auditarTextos(discipuladoData, 'discipulado')
auditarTextos(devocionalData, 'devocional')
auditarTextos(breveCatecismo, 'catecismo-breve')
auditarTextos(catecismoMaior, 'catecismo-maior')
auditarTextos(catecismoHeidelberg, 'catecismo-heidelberg')

if (erros.length) {
  console.error(['Falha na integridade do discipulado:', ...erros.map((erro) => `- ${erro}`)].join('\n'))
  process.exitCode = 1
} else {
  console.log(`Discipulado valido: ${totais.temas} temas, ${totais.unidades} unidades, ${totais.questoes} questoes e ${totais.meditacoes} meditacoes.`)
}
