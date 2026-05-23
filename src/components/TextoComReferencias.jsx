import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Box, Typography, Link, useTheme } from '@mui/material'
import { normalizarNomeLivro } from '../utils/biblia'
import { buscarLivroPorNome, buscarIntervaloVersiculos } from '../services/bibliaService'
import VersiculoPopup from './VersiculoPopup'
import CfwParagrafoPopup from './CfwParagrafoPopup'
import CatecismoPerguntaPopup from './CatecismoPerguntaPopup'
// Importamos só a regex (leve) do `lite` — assim este componente não puxa
// os datasets de Westminster (~250 kB) só para renderizar texto.
// Os lookups completos são carregados sob demanda no handler de clique.
import { REGEX_CONF_LINK } from '../utils/confissaoReferenciasLite'

let _confModulePromise = null
function carregarConfissaoReferenciasCompleto() {
  if (!_confModulePromise) {
    _confModulePromise = import('../utils/confissaoReferencias')
  }
  return _confModulePromise
}

/** Insere links clicáveis para CFW/CMW/CBW em trechos sem referência bíblica. */
function expandirConfessionaisNasPartes(partes) {
  if (!partes?.length) return partes
  const out = []
  let c = 0
  const re = new RegExp(REGEX_CONF_LINK.source, REGEX_CONF_LINK.flags)
  for (const p of partes) {
    if (p.isRef) {
      out.push({ ...p, key: p.key ?? `bk-${c++}` })
      continue
    }
    const s = p.conteudo
    if (s == null) continue
    re.lastIndex = 0
    let ultimo = 0
    let found = false
    let m
    while ((m = re.exec(s)) !== null) {
      found = true
      if (m.index > ultimo) {
        out.push({ key: `tx-${c++}`, isRef: false, conteudo: s.slice(ultimo, m.index) })
      }
      out.push({
        key: `cfw-${c++}`,
        isRef: true,
        tipoRef: 'confessional',
        ref: m[0],
        conteudo: m[0],
        confSiglaRaw: m[1],
        confA: m[2],
        confB: m[3]
      })
      ultimo = m.index + m[0].length
    }
    if (!found) out.push({ ...p, key: p.key ?? `tx-${c++}` })
    else if (ultimo < s.length) out.push({ key: `tx-${c++}`, isRef: false, conteudo: s.slice(ultimo) })
  }
  return out.length ? out : partes
}

// Lista de livros válidos para referência
const LIVROS_VALIDOS = [
  'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio',
  'Josué', 'Juízes', 'Rute', 
  '1 Samuel', '2 Samuel', '1 Reis', '2 Reis',
  '1 Crônicas', '2 Crônicas', 'Esdras', 'Neemias', 'Ester',
  'Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cantares',
  'Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel',
  'Oséias', 'Joel', 'Amós', 'Obadias', 'Jonas', 'Miquéias',
  'Naum', 'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias',
  'Mateus', 'Marcos', 'Lucas', 'João', 'Atos do Apóstolos',
  'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas',
  'Efésios', 'Filipenses', 'Colossenses',
  '1 Tessalonicenses', '2 Tessalonicenses',
  '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom',
  'Hebreus', 'Tiago', '1 Pedro', '2 Pedro',
  '1 João', '2 João', '3 João', 'Judas', 'Apocalipse'
]

// Abreviações válidas (atualizadas para incluir mais variações)
const ABREVIACOES_VALIDAS = {
  // Abreviações com ponto
  'gn.': 'Gênesis', 'ex.': 'Êxodo', 'lv.': 'Levítico', 'nm.': 'Números', 'dt.': 'Deuteronômio',
  'js.': 'Josué', 'jz.': 'Juízes', 'rt.': 'Rute',
  '1sm.': '1 Samuel', '2sm.': '2 Samuel', '1rs.': '1 Reis', '2rs.': '2 Reis',
  '1cr.': '1 Crônicas', '2cr.': '2 Crônicas', 'ed.': 'Esdras', 'ne.': 'Neemias', 'et.': 'Ester',
  'jó.': 'Jó', 'sl.': 'Salmos', 'pv.': 'Provérbios', 'ec.': 'Eclesiastes', 'ct.': 'Cantares',
  'is.': 'Isaías', 'jr.': 'Jeremias', 'lm.': 'Lamentações', 'ez.': 'Ezequiel', 'dn.': 'Daniel',
  'os.': 'Oséias', 'jl.': 'Joel', 'am.': 'Amós', 'ob.': 'Obadias', 'jn.': 'Jonas', 'mq.': 'Miquéias',
  'na.': 'Naum', 'hc.': 'Habacuque', 'sf.': 'Sofonias', 'ag.': 'Ageu', 'zc.': 'Zacarias', 'ml.': 'Malaquias',
  'mt.': 'Mateus', 'mc.': 'Marcos', 'lc.': 'Lucas', 'jo.': 'João', 'at.': 'Atos dos Apóstolos',
  'rm.': 'Romanos', '1 co.': '1 Coríntios', '2 Co.': '2 Coríntios', 'gl.': 'Gálatas',
  'ef.': 'Efésios', 'fp.': 'Filipenses', 'cl.': 'Colossenses',
  '1ts.': '1 Tessalonicenses', '2ts.': '2 Tessalonicenses',
  '1tm.': '1 Timóteo', '2tm.': '2 Timóteo', 'tt.': 'Tito', 'fm.': 'Filemom',
  'hb.': 'Hebreus', 'tg.': 'Tiago', '1pe.': '1 Pedro', '2pe.': '2 Pedro',
  '1jo.': '1 João', '2jo.': '2 João', '3jo.': '3 João', 'jd.': 'Judas', 'ap.': 'Apocalipse',

  // Abreviações sem ponto
  'gn': 'Gênesis', 'ex': 'Êxodo', 'lv': 'Levítico', 'nm': 'Números', 'dt': 'Deuteronômio',
  'js': 'Josué', 'jz': 'Juízes', 'rt': 'Rute',
  '1sm': '1 Samuel', '2sm': '2 Samuel', '1rs': '1 Reis', '2rs': '2 Reis',
  '1cr': '1 Crônicas', '2cr': '2 Crônicas', 'ed': 'Esdras', 'ne': 'Neemias', 'et': 'Ester',
  'jó': 'Jó', 'sl': 'Salmos', 'pv': 'Provérbios', 'ec': 'Eclesiastes', 'ct': 'Cantares',
  'is': 'Isaías', 'jr': 'Jeremias', 'lm': 'Lamentações', 'ez': 'Ezequiel', 'dn': 'Daniel',
  'os': 'Oséias', 'jl': 'Joel', 'am': 'Amós', 'ob': 'Obadias', 'jn': 'Jonas', 'mq': 'Miquéias',
  'na': 'Naum', 'hc': 'Habacuque', 'sf': 'Sofonias', 'ag': 'Ageu', 'zc': 'Zacarias', 'ml': 'Malaquias',
  'mt': 'Mateus', 'mc': 'Marcos', 'lc': 'Lucas', 'jo': 'João', 'at': 'Atos dos Apóstolos',
  'rm': 'Romanos', '1 co': '1 Coríntios', '2 Co': '2 Coríntios', 'gl': 'Gálatas',
  'ef': 'Efésios', 'fp': 'Filipenses', 'cl': 'Colossenses',
  '1ts': '1 Tessalonicenses', '2ts': '2 Tessalonicenses',
  '1tm': '1 Timóteo', '2tm': '2 Timóteo', 'tt': 'Tito', 'fm': 'Filemom',
  'hb': 'Hebreus', 'tg': 'Tiago', '1pe': '1 Pedro', '2pe': '2 Pedro',
  '1jo': '1 João', '2jo': '2 João', '3jo': '3 João', 'jd': 'Judas', 'ap': 'Apocalipse',
}

export default function TextoComReferencias({ 
  texto, 
  inline = false, 
  component = 'div',
  variant = 'default',
  titulo = null,
  descricao = null,
  style = {}
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [versiculoSelecionado, setVersiculoSelecionado] = useState(null)
  const [cfwParagrafo, setCfwParagrafo] = useState(null)
  const [catecismoPergunta, setCatecismoPergunta] = useState(null)
  const [partes, setPartes] = useState(null)

  useEffect(() => {
    if (!texto) return

    // Pré-processa o texto para garantir espaços após parênteses seguidos de números
    const textoProcessado = texto.replace(/\((?=\d)/g, '( ')

    const processarTexto = () => {
      const livrosComNumeros = [
        // Livros com números - permite parênteses e espaço entre número e nome
        '(?:^|\\s|\\()(?:[1-3]\\s*(?:' +  // Adicionado \\( para capturar parêntese abrindo
          // Coríntios: Cor/Cor./Coríntios
          '(?:Co(?:\\.|ríntios)?|CO(?:\\.|RINTIOS)?)|' +  

          // João: Jo/Jo./João
          '(?:Jo(?:\\.|ão)?|JO(?:\\.|AO)?)|' +            

          // Pedro: Pe/Pe./Pedro
          '(?:Pe(?:\\.|dro)?|PE(?:\\.|DRO)?)|' +          

          // Tessalonicenses: Ts/Ts./Tes/Tes./Tess/Tess./Tessalonicenses
          '(?:T(?:s|es|ess)(?:\\.|alonicenses)?|T(?:S|ES|ESS)(?:\\.|ALONICENSES)?)|' +

          // Timóteo: Tm/Tm./Tim/Tim./Timóteo
          '(?:T(?:m|im)(?:\\.|óteo)?|T(?:M|IM)(?:\\.|OTEO)?)|' +

          // Crônicas: Cr/Cr./Crônicas
          '(?:Cr(?:\\.|ônicas)?|CR(?:\\.|ONICAS)?)|' +    

          // Samuel: Sm/Sm./Sam/Sam./Samuel
          '(?:Sm(?:\\.)?|SM(?:\\.)?|Sam(?:\\.)?|SAM(?:\\.)?|Samuel|SAMUEL)|' + 

          // Reis: Rs/Rs./Reis
          '(?:Rs(?:\\.)?|RS(?:\\.)?|Reis|REIS)' +                     
        '))(?:\\s|\\)|$)',  // Adicionado \\) para capturar parêntese fechando
      ].join('|')

      const livrosAT = [
        // Gênesis
        '(?:[Gg][ÊêEéÈè][Nn](?:\\.)?|GEN(?:\\.)?|[Gg][Nn](?:\\.)?|GN(?:\\.)?|[Gg][ÊêEéÈè][Nn][Ee][Ss][Ii][Ss]|GENESIS)',
        
        // Êxodo
        '(?:[ÊêEéÈè][Xx](?:\\.)?|EX(?:\\.)?|[ÊêEéÈè][Xx][Oo][Dd][Oo]|EXODO)',
        
        // Levítico
        '(?:[Ll][Vv](?:\\.)?|LV(?:\\.)?|[Ll][Ee][Vv](?:\\.)?|LEV(?:\\.)?|[Ll][Ee][Vv][ÍiIí][Tt][Ii][Cc][Oo]|LEVITICO)',
        
        // Números
        '(?:[Nn][Mm](?:\\.)?|NM(?:\\.)?|[Nn][ÚuUúÙùÛû][Mm](?:\\.)?|NUM(?:\\.)?|[Nn][ÚuUúÙùÛû][Mm][Ee][Rr][Oo][Ss]|NUMEROS)',
        
        // Deuteronômio
        '(?:[Dd][Tt](?:\\.)?|DT(?:\\.)?|[Dd][Ee][Uu][Tt](?:\\.)?|DEUT(?:\\.)?|[Dd][Ee][Uu][Tt][Ee][Rr][OoÔôÓò][Nn][Oo][Mm][Ii][Oo]|DEUTERONOMIO)',
        
        // Reis (com espaço antes e depois ou início/fim de string)
        '(?:^|\\s)(?:[Rr][Ee][Ii][Ss]|REIS)(?:\\s|$)',
        
        // Esdras
        '(?:[Ee][Dd](?:\\.)?|ED(?:\\.)?|[Ee][Ss][Dd](?:\\.)?|ESD(?:\\.)?|[Ee][Ss][Dd][Rr][Aa][Ss]|ESDRAS)',
        
        // Neemias
        '(?:[Nn][Ee](?:\\.)?|NE(?:\\.)?|[Nn][Ee][Ee](?:\\.)?|NEE(?:\\.)?|[Nn][Ee][Ee][Mm][Ii][Aa][Ss]|NEEMIAS)',
        
        // Ester
        '(?:[Ee][Tt](?:\\.)?|ET(?:\\.)?|[Ee][Ss][Tt](?:\\.)?|EST(?:\\.)?|[Ee][Ss][Tt][Ee][Rr]|ESTER)',
        
        // Jó (sempre com acento)
        '(?:[Jj][ÓóÔô]|JÓ)',
        
        // Salmos
        '(?:[Ss][Ll](?:\\.)?|SL(?:\\.)?|[Ss][Aa][Ll](?:\\.)?|SAL(?:\\.)?|[Ss][Aa][Ll][Mm][Oo][Ss]?|SALMOS)',
        
        // Provérbios
        '(?:[Pp][Vv](?:\\.)?|PV(?:\\.)?|[Pp][Rr][Oo][Vv](?:\\.)?|PROV(?:\\.)?|[Pp][Rr][Oo][Vv][ÉéEe][Rr][Bb][Ii][Oo][Ss]|PROVERBIOS)',
        
        // Eclesiastes
        '(?:[Ee][Cc](?:\\.)?|EC(?:\\.)?|[Ee][Cc][Ll](?:\\.)?|ECL(?:\\.)?|[Ee][Cc][Ll][Ee][Ss][Ii][Aa][Ss][Tt][Ee][Ss]|ECLESIASTES)',
        
        // Cantares
        '(?:[Cc][Tt](?:\\.)?|CT(?:\\.)?|[Cc][Aa][Nn][Tt](?:\\.)?|CANT(?:\\.)?|[Cc][Aa][Nn][Tt][Aa][Rr][Ee][Ss]|[Cc][ÂâAa][Nn][Tt][Ii][Cc][Oo][Ss]|CANTARES|CANTICOS)',
        
        // Isaías
        '(?:[Ii][Ss](?:\\.)?|IS(?:\\.)?|[Ii][Ss][Aa](?:\\.)?|ISA(?:\\.)?|[Ii][Ss][Aa][ÍiIí][Aa][Ss]|ISAIAS)',
        
        // Jeremias
        '(?:[Jj][Rr](?:\\.)?|JR(?:\\.)?|[Jj][Ee][Rr](?:\\.)?|JER(?:\\.)?|[Jj][Ee][Rr][Ee][Mm][Ii][Aa][Ss]|JEREMIAS)',
        
        // Lamentações
        '(?:[Ll][Mm](?:\\.)?|LM(?:\\.)?|[Ll][Aa][Mm](?:\\.)?|LAM(?:\\.)?|[Ll][Aa][Mm][Ee][Nn][Tt][Aa][ÇçCc][ÕoOóÒò][Ee][Ss]|LAMENTACOES)',
        
        // Ezequiel
        '(?:[Ee][Zz](?:\\.)?|EZ(?:\\.)?|[Ee][Zz][Ee](?:\\.)?|EZE(?:\\.)?|[Ee][Zz][Ee][Qq][Uu][Ii][Ee][Ll]|EZEQUIEL)',
        
        // Daniel
        '(?:[Dd][Nn](?:\\.)?|DN(?:\\.)?|[Dd][Aa][Nn](?:\\.)?|DAN(?:\\.)?|[Dd][Aa][Nn][Ii][Ee][Ll]|DANIEL)',
        
        // Oséias
        '(?:[Oo][Ss](?:\\.)?|OS(?:\\.)?|[Oo][Ss][ÉéEe](?:\\.)?|OSE(?:\\.)?|[Oo][Ss][ÉéEe][Ii][Aa][Ss]|OSEIAS)',
        
        // Joel
        '(?:[Jj][Ll](?:\\.)?|JL(?:\\.)?|[Jj][Oo][Ee][Ll]|JOEL)',
        
        // Amós
        '(?:[Aa][Mm](?:\\.)?|AM(?:\\.)?|[Aa][Mm][ÓóÔôÒò][Ss]|AMOS)',
        
        // Obadias
        '(?:[Oo][Bb](?:\\.)?|OB(?:\\.)?|[Oo][Bb][Aa][Dd](?:\\.)?|OBAD(?:\\.)?|[Oo][Bb][Aa][Dd][Ii][Aa][Ss]|OBADIAS)',
        
        // Jonas
        '(?:[Jj][Nn](?:\\.)?|JN(?:\\.)?|[Jj][Oo][Nn](?:\\.)?|JON(?:\\.)?|[Jj][Oo][Nn][Aa][Ss]|JONAS)',
        
        // Miquéias
        '(?:[Mm][Qq](?:\\.)?|MQ(?:\\.)?|[Mm][Ii][Qq](?:\\.)?|MIQ(?:\\.)?|[Mm][Ii][Qq][Uu][ÉéEe][Ii][Aa][Ss]|MIQUEIAS)',
        
        // Naum
        '(?:[Nn][Aa](?:\\.)?|NA(?:\\.)?|[Nn][Aa][Uu][Mm]|NAUM)',
        
        // Habacuque
        '(?:[Hh][Cc](?:\\.)?|HC(?:\\.)?|[Hh][Aa][Bb](?:\\.)?|HAB(?:\\.)?|[Hh][Aa][Bb][Aa][Cc][Uu][Qq][Uu][Ee]|HABACUQUE)',
        
        // Sofonias
        '(?:[Ss][Ff](?:\\.)?|SF(?:\\.)?|[Ss][Oo][Ff](?:\\.)?|SOF(?:\\.)?|[Ss][Oo][Ff][Oo][Nn][Ii][Aa][Ss]|SOFONIAS)',
        
        // Ageu
        '(?:[Aa][Gg](?:\\.)?|AG(?:\\.)?|[Aa][Gg][Ee][Uu]|AGEU)',
        
        // Zacarias
        '(?:[Zz][Cc](?:\\.)?|ZC(?:\\.)?|[Zz][Aa][Cc](?:\\.)?|ZAC(?:\\.)?|[Zz][Aa][Cc][Aa][Rr][Ii][Aa][Ss]|ZACARIAS)',
        
        // Malaquias
        '(?:[Mm][Ll](?:\\.)?|ML(?:\\.)?|[Mm][Aa][Ll](?:\\.)?|MAL(?:\\.)?|[Mm][Aa][Ll][Aa][Qq][Uu][Ii][Aa][Ss]|MALAQUIAS)',

        'Deuteron[oôó]m[ií]o'  // Aceita variações de acentuação
      ].join('|')

      const livrosNT = [
        // Mateus
        '(?:[Mm][Tt](?:\\.)?|MT(?:\\.)?|[Mm][Aa][Tt](?:\\.)?|MAT(?:\\.)?|[Mm][Aa][Tt][Ee][Uu][Ss]|MATEUS)',
        
        // Marcos
        '(?:[Mm][Cc](?:\\.)?|MC(?:\\.)?|[Mm][Aa][Rr](?:\\.)?|MAR(?:\\.)?|[Mm][Aa][Rr][Cc][Oo][Ss]|MARCOS)',
        
        // Lucas
        '(?:[Ll][Cc](?:\\.)?|LC(?:\\.)?|[Ll][Uu][Cc](?:\\.)?|LUC(?:\\.)?|[Ll][Uu][Cc][Aa][Ss]|LUCAS)',
        
        // João (sem acento - pode ter ponto ou não)
        '(?:[Jj][Oo](?:\\.)?|JO(?:\\.)?|[Jj][Oo][Aa](?:\\.)?|JOA(?:\\.)?|[Jj][Oo][AaÃã][Oo]|JOAO)',
        
        // Atos / Atos dos Apóstolos
        '(?:[Aa][Tt](?:\\.)?|AT(?:\\.)?|[Aa][Tt][Oo][Ss](?:\\s+[Dd][Oo][Ss]?\\s+[Aa][Pp][ÓóÔô][Ss][Tt][Oo][Ll][Oo][Ss]?)?|ATOS(?:\\s+DOS?\\s+APOSTOLOS?)?)',
        
        // Romanos
        '(?:[Rr][Mm](?:\\.)?|RM(?:\\.)?|[Rr][Oo][Mm](?:\\.)?|ROM(?:\\.)?|[Rr][Oo][Mm][Aa][Nn][Oo][Ss]|ROMANOS)',
        
        // Coríntios (1 e 2 já estão no livrosComNumeros)
        
        // Gálatas
        '(?:[Gg][Ll](?:\\.)?|GL(?:\\.)?|[Gg][AaÁáÀàÂâ][Ll](?:\\.)?|GAL(?:\\.)?|[Gg][AaÁáÀàÂâ][Ll][Aa][Tt][Aa][Ss]|GALATAS)',
        
        // Efésios
        '(?:[Ee][Ff](?:\\.)?|EF(?:\\.)?|[Ee][Ff][EeÉé](?:\\.)?|EFE(?:\\.)?|[Ee][Ff][EeÉé][Ss][Ii][Oo][Ss]|EFESIOS)',
        
        // Filipenses
        '(?:[Ff][Pp](?:\\.)?|FP(?:\\.)?|[Ff][Ll](?:\\.)?|FL(?:\\.)?|[Ff][Ii][Ll](?:\\.)?|FIL(?:\\.)?|[Ff][Ii][Ll][Ii][Pp][Ee][Nn][Ss][Ee][Ss]|FILIPENSES)',
        
        // Colossenses
        '(?:[Cc][Ll](?:\\.)?|CL(?:\\.)?|[Cc][Oo][Ll](?:\\.)?|COL(?:\\.)?|[Cc][Oo][Ll][Oo][Ss]{2}[Ee][Nn][Ss][Ee][Ss]|COLOSSENSES)',
        
        // Tessalonicenses (1 e 2 já estão no livrosComNumeros)
        
        // Timóteo (1 e 2 já estão no livrosComNumeros)
        
        // Tito
        '(?:[Tt][Tt](?:\\.)?|TT(?:\\.)?|[Tt][Ii][Tt](?:\\.)?|TIT(?:\\.)?|[Tt][Ii][Tt][Oo]|TITO)',
        
        // Filemom
        '(?:[Ff][Mm](?:\\.)?|FM(?:\\.)?|[Ff][Ll][Mm](?:\\.)?|FLM(?:\\.)?|[Ff][Ii][Ll][Ee][Mm](?:[Oo][Mm])?|FILEMOM)',
        
        // Hebreus
        '(?:[Hh][Bb](?:\\.)?|HB(?:\\.)?|[Hh][Ee][Bb](?:\\.)?|HEB(?:\\.)?|[Hh][Ee][Bb][Rr][Ee][Uu][Ss]|HEBREUS)',
        
        // Tiago
        '(?:[Tt][Gg](?:\\.)?|TG(?:\\.)?|[Tt][Ii][Aa](?:\\.)?|TIA(?:\\.)?|[Tt][Ii][Aa][Gg][Oo]|TIAGO)',
        
        // Pedro (1 e 2 já estão no livrosComNumeros)
        
        // Judas
        '(?:[Jj][Dd](?:\\.)?|JD(?:\\.)?|[Jj][Uu][Dd](?:\\.)?|JUD(?:\\.)?|[Jj][Uu][Dd][Aa][Ss]|JUDAS)',
        
        // Apocalipse
        '(?:[Aa][Pp](?:\\.)?|AP(?:\\.)?|[Aa][Pp][Cc](?:\\.)?|APC(?:\\.)?|[Aa][Pp][Oo][Cc](?:[Aa][Ll][Ii][Pp][Ss][Ee])?|APOCALIPSE)'
      ].join('|')

      // Regex principal que combina todos os padrões
      const regexReferencia = new RegExp(
        `(?<![a-zA-ZÀ-ú])(?:${livrosComNumeros}|${livrosAT}|${livrosNT})(?![a-zA-ZÀ-ú])` + // Nome do livro
        '\\s*\\.?\\s*' + // Espaço opcional e ponto opcional
        '(\\d+)(?:-\\d+)?' + // Capítulo (ou faixa de capítulos, ex: 29-30)
        '(?:[:.](\\d+)(?:-(\\d+))?(?:\\s*;\\s*\\d+(?:-\\d+)?(?!\\s*[A-Za-zÀ-ú]))*)?', // Aceita "; 17", mas não "; 1 Coríntios..."
        'gi' // global e case insensitive
      )

      let resultado = []
      let ultimoIndice = 0
      let contador = 0

      let match
      while ((match = regexReferencia.exec(texto)) !== null) {
        // Texto antes da referência
        if (match.index > ultimoIndice) {
          resultado.push({
            key: `texto-${contador}`,
            isRef: false,
            conteudo: texto.substring(ultimoIndice, match.index)
          })
          contador++
        }

        // A referência em si
        const referenciaCompleta = match[0]
        resultado.push({
          key: `ref-${contador}`,
          isRef: true,
          ref: referenciaCompleta,
          conteudo: referenciaCompleta
        })
        contador++

        ultimoIndice = match.index + match[0].length
      }

      // Texto restante após a última referência
      if (ultimoIndice < texto.length) {
        resultado.push({
          key: `texto-${contador}`,
          isRef: false,
          conteudo: texto.substring(ultimoIndice)
        })
      }
      setPartes(expandirConfessionaisNasPartes(resultado))
    }

    processarTexto()
  }, [texto])

  const handleClick = useCallback(async (referencia) => {
    try {
      const referenciaLimpa = referencia.replace(/^[\(\)]/g, '').trim();

      // Suporte a forma abreviada: "1 Cor. 2:10-12; 17; 19-20"
      const parseFaixas = (numeracaoRaw) => {
        const faixas = []
        if (!numeracaoRaw) return faixas
        const normalizada = numeracaoRaw.replace(/\s+/g, '')
        const partes = normalizada.split(';').filter(Boolean)
        if (partes.length === 0) return faixas

        const parseParteComCapitulo = (parte) => {
          if (parte.includes(':') || parte.includes('.')) {
            const [capStr, versStr = ''] = parte.split(/[:.]/)
            const cap = Number(capStr)
            if (!Number.isInteger(cap) || cap < 1) return null
            if (!versStr) return { capitulo: cap, inicio: 1, fim: 999 }
            const [iniStr, fimStr] = versStr.split('-')
            const inicio = Number(iniStr)
            const fim = fimStr ? Number(fimStr) : inicio
            if (!Number.isInteger(inicio) || inicio < 1 || !Number.isInteger(fim) || fim < inicio) return null
            return { capitulo: cap, inicio, fim }
          }

          // Exceção rara: faixa de capítulos sem versículo (ex: "29-30")
          if (parte.includes('-')) {
            const [capIniStr, capFimStr] = parte.split('-')
            const capIni = Number(capIniStr)
            const capFim = Number(capFimStr)
            if (!Number.isInteger(capIni) || capIni < 1 || !Number.isInteger(capFim) || capFim < capIni) return null
            const lista = []
            for (let c = capIni; c <= capFim; c++) {
              lista.push({ capitulo: c, inicio: 1, fim: 999 })
            }
            return lista
          }

          const cap = Number(parte)
          if (!Number.isInteger(cap) || cap < 1) return null
          return { capitulo: cap, inicio: 1, fim: 999 }
        }

        const primeira = parseParteComCapitulo(partes[0])
        if (!primeira) return faixas
        const primeiraLista = Array.isArray(primeira) ? primeira : [primeira]
        faixas.push(...primeiraLista)
        const capituloBase = primeiraLista[0].capitulo

        for (let i = 1; i < partes.length; i++) {
          const p = partes[i]
          if (!p) continue

          // Permite também "3:17" em partes subsequentes, se vier explícito
          if (p.includes(':') || p.includes('.')) {
            const faixa = parseParteComCapitulo(p)
            if (faixa) faixas.push(faixa)
            continue
          }

          const [iniStr, fimStr] = p.split('-')
          const inicio = Number(iniStr)
          const fim = fimStr ? Number(fimStr) : inicio
          if (!Number.isInteger(inicio) || inicio < 1 || !Number.isInteger(fim) || fim < inicio) continue
          faixas.push({ capitulo: capituloBase, inicio, fim })
        }

        return faixas
      }

      // Extrai nome do livro e numeração (capítulo e versículo)
      // Permite múltiplas palavras no nome do livro (ex: "Atos dos Apóstolos")
      // A regex captura: número opcional + nome do livro (pode ter múltiplas palavras) + espaço + numeração
      // Usa [A-ZÀ-Úa-zà-ú\s.]+ para capturar palavras com acentos e espaços
      const match = referenciaLimpa.match(/^([1-3]?\s*[A-ZÀ-Úa-zà-ú\s.]+?)\s+([\d.:;\-\s]+)$/);
      if (!match) {
        // Tenta uma regex alternativa mais permissiva
        const matchAlt = referenciaLimpa.match(/^(.+?)\s+([\d.:;\-\s]+)$/);
        if (matchAlt) {
          const [, livroRawAlt, numeracaoAlt] = matchAlt;
          const livroNomeAlt = normalizarNomeLivro(livroRawAlt.trim());
          const livroAlt = await buscarLivroPorNome(livroNomeAlt);
          if (livroAlt) {
            const faixasAlt = parseFaixas(numeracaoAlt)
            const resultadosAlt = []
            for (const faixa of faixasAlt) {
              const r = await buscarIntervaloVersiculos(
                livroAlt.id,
                faixa.capitulo,
                faixa.inicio,
                faixa.fim
              )
              if (r?.versiculos?.length) resultadosAlt.push(...r.versiculos)
            }
            if (resultadosAlt.length) {
              const vistos = new Set()
              const unicos = resultadosAlt.filter((v) => {
                const numero = v.numero ?? v.versiculo
                const k = `${v.capitulo}:${numero}`
                if (vistos.has(k)) return false
                vistos.add(k)
                return true
              })
              setVersiculoSelecionado(unicos.map(v => ({ ...v, livro: livroAlt.nome })))
            }
            return;
          }
        }
        return;
      }

      const [, livroRaw, numeracao] = match;
      const livroNome = normalizarNomeLivro(livroRaw.trim());
      const livro = await buscarLivroPorNome(livroNome);
      if (!livro) {
        return;
      }

      const faixas = parseFaixas(numeracao)
      const resultados = []
      for (const faixa of faixas) {
        const r = await buscarIntervaloVersiculos(
          livro.id,
          faixa.capitulo,
          faixa.inicio,
          faixa.fim
        )
        if (r?.versiculos?.length) resultados.push(...r.versiculos)
      }

      if (resultados.length) {
        const vistos = new Set()
        const unicos = resultados.filter((v) => {
          const numero = v.numero ?? v.versiculo
          const k = `${v.capitulo}:${numero}`
          if (vistos.has(k)) return false
          vistos.add(k)
          return true
        })
        setVersiculoSelecionado(unicos.map(v => ({
          ...v,
          livro: livro.nome
        })));
      }
    } catch (error) {
      console.error('Erro ao processar referência:', error);
    }
  }, [])

  const renderContent = useMemo(() => {
    if (!partes) return texto

    return partes.map(parte => {
      if (parte.isRef) {
        return (
        <Link
          key={parte.key}
            component="span"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (parte.tipoRef === 'confessional') {
                const sigla = String(parte.confSiglaRaw || '').toUpperCase()
                if (sigla.startsWith('CFW') || sigla.startsWith('CONFISSÃO')) {
                  // Aceita CFW VIII; CFW VIII.2; CFW 8.2; parágrafo opcional → 1º do capítulo
                  if (parte.confA) {
                    carregarConfissaoReferenciasCompleto().then((mod) => {
                      const d = mod.buscarParagrafoConfissaoOuInicioCapitulo(parte.confA, parte.confB)
                      if (d) setCfwParagrafo(d)
                    }).catch(() => {})
                  }
                  return
                }
                if (sigla.startsWith('CMW') || sigla.includes('CATECISMO MAIOR')) {
                  carregarConfissaoReferenciasCompleto().then((mod) => {
                    const d = mod.buscarPerguntaCatecismo('CMW', parte.confA)
                    if (d) setCatecismoPergunta(d)
                  }).catch(() => {})
                  return
                }
                if (sigla.startsWith('CBW') || sigla.includes('BREVE CATECISMO')) {
                  carregarConfissaoReferenciasCompleto().then((mod) => {
                    const d = mod.buscarPerguntaCatecismo('CBW', parte.confA)
                    if (d) setCatecismoPergunta(d)
                  }).catch(() => {})
                  return
                }
                return
              }
              handleClick(parte.ref);
            }}
            sx={{
              color: isDark ? theme.palette.primary.light : 'primary.main',
              cursor: 'pointer',
              textDecoration: 'underline',
              position: 'relative',
              zIndex: 1,
              pointerEvents: 'auto',
              fontWeight: isDark ? 600 : 400,
              '&:hover': {
                textDecoration: 'underline',
                opacity: 0.88
              }
            }}
        >
          {parte.conteudo}
        </Link>
        );
      } else {
        return <span key={parte.key}>{parte.conteudo}</span>;
      }
    })
  }, [partes, handleClick, texto, isDark, theme.palette.primary.light])

  return (
    <>
      {/* Usa span quando inline=true para evitar problemas de nesting */}
      <Box 
        component={inline ? 'span' : component}
        sx={{ 
          display: inline ? 'inline' : 'block',
          whiteSpace: inline ? 'normal' : 'pre-line',
          color: 'text.primary',
          ...style
        }}
      >
        {renderContent}
        </Box>
      {versiculoSelecionado && (
        <VersiculoPopup 
          versiculos={versiculoSelecionado}
          onClose={() => setVersiculoSelecionado(null)}
        />
      )}
      <CfwParagrafoPopup
        open={Boolean(cfwParagrafo)}
        onClose={() => setCfwParagrafo(null)}
        dados={cfwParagrafo}
      />
      <CatecismoPerguntaPopup
        open={Boolean(catecismoPergunta)}
        onClose={() => setCatecismoPergunta(null)}
        dados={catecismoPergunta}
      />
    </>
  )
} 