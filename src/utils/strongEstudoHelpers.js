/** Funções puras partilhadas pela página de estudo Strong (antes no Biblia.jsx). */

export function montarDefinicaoExibicao(detalhe) {
  const deriv = String(detalhe?.derivation || '').trim()
  const def = String(detalhe?.definition || '').trim()
  if (!deriv) return def
  if (!def) return deriv
  const terminaComGancho = /\b(i\.e\.|e\.g\.|i\.e|e\.g)\s*$/i.test(deriv)
  if (!terminaComGancho) return def
  return `${deriv} ${def}`
}

export function limparTextoStepBible(texto) {
  return String(texto || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Para a UI: remove HTML mas preserva quebras de linha. */
export function limparTextoStepBibleExibicao(texto) {
  return String(texto || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function montarTwotPesquisaUrl(twotCode) {
  return `https://www.google.com/search?q=${encodeURIComponent(`TWOT ${String(twotCode || '').trim()}`)}`
}

/** Títulos de secção que o modelo ainda pode emitir — removidos na limpeza. */
const TITULOS_SECAO_ENGESSADOS = [
  'Resumo lexical',
  'Significado principal',
  'Usos secundários',
  'Contexto bíblico',
  'Importância teológica',
  'Primeiras ocorrências',
  'Relações léxicas',
  'Identificação',
  'Definição',
  'Campo semântico e nuances',
  'Rede léxica',
  'Rede léxica e âncoras no índice',
  'Rede léxica e ligações',
]


function linhaEhTituloSecao(linha) {
  const t = String(linha || '')
    .trim()
    .replace(/\s*[—–-]\s*$/, '')
    .trim()
  if (!t) return false
  return TITULOS_SECAO_ENGESSADOS.some(
    (tit) => t.toLowerCase() === tit.toLowerCase() || t.toLowerCase().startsWith(`${tit.toLowerCase()} —`)
  )
}

function removerTitulosSecaoEngessados(s) {
  return String(s || '')
    .split('\n')
    .filter((linha) => !linhaEhTituloSecao(linha))
    .join('\n')
}

/** Detecta vazamento de raciocínio interno / ferramentas da API no texto bruto. */
export function resumoLexicalPareceVazado(texto) {
  const s = String(texto || '')
  if (!s.trim()) return false
  return (
    /\btool_code\b/i.test(s) ||
    /\bgoogle_search\b/i.test(s) ||
    /\bprint\s*\(\s*google_search/i.test(s) ||
    /queries\s*=\s*\[/i.test(s) ||
    /^\s*thought\s*$/im.test(s) ||
    /\bHere's a plan:/i.test(s) ||
    /\bThe user wants\b/i.test(s) ||
    /\bI need to extract information\b/i.test(s) ||
    /```(?:tool|python|json)?[\s\S]*?```/i.test(s)
  )
}

function removerBlocosVazados(s) {
  let out = String(s || '')

  out = out.replace(/```[\s\S]*?```/g, '\n')
  out = out.replace(/^\s*tool_code[\s\S]*?(?=\n\n|\s*$)/gim, '')
  out = out.replace(/^\s*thought\s*$[\s\S]*?(?=\n\n|\s*$)/gim, '')
  out = out.replace(/^\s*print\s*\([\s\S]*?\)\s*$/gim, '')
  out = out.replace(/^\s*google_search[\s\S]*?(?=\n\n|\s*$)/gim, '')

  return out
}

function removerSecaoFontesParaAprofundar(s) {
  const idx = s.search(/^Fontes para aprofundar\b/im)
  if (idx < 0) return s
  return s.slice(0, idx).trim()
}

function removerSaudacaoInformal(s) {
  let out = String(s || '').trim()
  for (let i = 0; i < 2; i++) {
    const m = out.match(
      /^(?:Meu caro|Meu querido|Meu amigo|Caro(?:s)?|Querido(?:a)?|Prezado(?:a)?|Olá|Amigo(?:a)?)\b[^.!?]*[.!?]\s*/iu
    )
    if (!m) break
    out = out.slice(m[0].length).trim()
  }
  return out
}

/** Remove instruções internas do prompt que o modelo às vezes repete no texto final. */
export function limparResumoLexicalParaExibicao(texto) {
  let s = String(texto || '').trim()
  if (!s) return ''

  s = removerBlocosVazados(s)

  s = s.replace(
    /REGRA DE CONCLUSÃO\s*\([^)]*\)[\s\S]*?(?=^\s*(?:Resumo lexical|Significado principal|Identificação|Definição|Campo semântico|Rede léxica|Fontes para aprofundar)\b|\s*$)/im,
    ''
  )

  s = s.replace(
    /^(?:Responde em português brasileiro|És um assistente de estudos bíblicos|Com base APENAS nos dados|Usa os dados lexicais abaixo|DADOS DO VERBETE:|Here's a plan:|The user wants|Elabora uma mini-entrada|Responde só com o texto final)[\s\S]*?(?=\n\n|\s*$)/im,
    ''
  )

  const linhasProibidas = [
    /^REGRA DE CONCLUSÃO\b/i,
    /^Se o verbete for muito extenso\b/i,
    /^mas NUNCA cortes no meio\b/i,
    /^Prioridade:\s*\(1\)/i,
    /^Máximo aproximado de \d+ caracteres/i,
    /^Não inclua aviso final\b/i,
    /^Responde em português brasileiro com estas secções\b/i,
    /^\(Se a API ativar pesquisa\b/i,
    /^---\s*$/,
    /^\s*tool_code\b/i,
    /^\s*thought\s*$/i,
    /^\s*print\s*\(/i,
    /google_search/i,
    /^STEPBible\.org\b/i,
    /^Blue Letter Bible\b/i,
    /^Fontes para aprofundar\b/i,
    /^https?:\/\//i,
    /^www\./i,
  ]

  s = s
    .split('\n')
    .filter((linha) => {
      const t = linha.trim()
      if (!t) return true
      return !linhasProibidas.some((rx) => rx.test(t))
    })
    .join('\n')

  s = removerSecaoFontesParaAprofundar(s)
  s = removerTitulosSecaoEngessados(s)
  s = removerSaudacaoInformal(s)

  // Descarta preâmbulo curto antes do conteúdo (ex.: "Aqui está o resumo:")
  const linhas = s.split('\n')
  const idxConteudo = linhas.findIndex((l) => {
    const t = l.trim()
    return t.length > 40 && !linhaEhTituloSecao(l)
  })
  if (idxConteudo > 0 && idxConteudo <= 3) {
    const antes = linhas.slice(0, idxConteudo).join('\n').trim()
    if (antes.length < 120) s = linhas.slice(idxConteudo).join('\n')
  }

  return s.replace(/\n{3,}/g, '\n\n').trim()
}
