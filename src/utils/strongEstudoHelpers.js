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

export function montarTwotPesquisaUrl(twotCode) {
  return `https://www.google.com/search?q=${encodeURIComponent(`TWOT ${String(twotCode || '').trim()}`)}`
}

const SECOES_RESUMO_LEXICAL =
  /^(?:Identificação|Definição|Uso e ocorrências|Contexto bíblico \(exemplos\)|Ligações nos dados|Rede léxica e âncoras no índice)\b/i

/** Remove instruções internas do prompt que o modelo às vezes repete no texto final. */
export function limparResumoLexicalParaExibicao(texto) {
  let s = String(texto || '').trim()
  if (!s) return ''

  s = s.replace(
    /REGRA DE CONCLUSÃO\s*\([^)]*\)[\s\S]*?(?=^\s*(?:Identificação|Definição|Uso e ocorrências|Contexto bíblico|Rede léxica|Ligações nos dados)\b)/im,
    ''
  )

  s = s.replace(
    /^(?:Responde em português brasileiro|És um assistente de estudos bíblicos|Com base APENAS nos dados|Usa os dados lexicais abaixo|DADOS DO VERBETE:)[\s\S]*?(?=^\s*(?:Identificação|Definição|Uso e ocorrências|Contexto bíblico|Rede léxica|Ligações nos dados)\b)/im,
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
  ]

  s = s
    .split('\n')
    .filter((linha) => {
      const t = linha.trim()
      if (!t) return true
      return !linhasProibidas.some((rx) => rx.test(t))
    })
    .join('\n')

  const idx = s.search(SECOES_RESUMO_LEXICAL)
  if (idx > 0) {
    const antes = s.slice(0, idx).trim()
    if (antes.length > 0 && !SECOES_RESUMO_LEXICAL.test(antes)) {
      s = s.slice(idx)
    }
  }

  return s.replace(/\n{3,}/g, '\n\n').trim()
}
