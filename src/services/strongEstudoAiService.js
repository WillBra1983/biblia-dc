import { limparResumoLexicalParaExibicao, limparTextoStepBible, resumoLexicalPareceVazado } from '../utils/strongEstudoHelpers'
import {
  iaGeminiChaveConfigurada,
  mensagemErroChaveGeminiAusente,
  obterChaveGeminiApi
} from '../utils/geminiApiKey'
import { buscarBdbHebraico, buscarOcorrenciasStrongHebraico, contarOcorrenciasStrongHebraico } from './otStrongService'
import { buscarLexiconPtBr } from './lexiconPtBrService'
import { buscarOcorrenciasStrongGrego, contarOcorrenciasStrongGrego } from './ntStrongProvaService'
import { livros as livrosBiblia } from '../data/biblia'

/**
 * Resumo lexical via Google Gemini (mesmo ecossistema que o módulo Android de exemplo).
 * A chave exposta no bundle só é aceitável em builds privados; para produção pública use um proxy (Cloud Function, etc.).
 *
 * Enriquecimento (VITE_GEMINI_LEXICAL_WEB_ENRICHMENT não '0'):
 * — Dados locais como âncora factual (Strong, BDB, STEPBible SQLite, TWOT, ocorrências, léxico PT-BR).
 * — `google_search` do Gemini absorve material de STEPBible.org, Blue Letter Bible e TWOT na síntese final.
 * — O aluno vê prosa integrada em pt-BR, sem URLs nem bibliografia.
 */
export function iaGeminiDisponivel() {
  return iaGeminiChaveConfigurada()
}

function normalizarModelName(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.replace(/^models\//i, '')
}

function obterListaModelosTentativa() {
  const preferred = normalizarModelName(import.meta.env.VITE_GEMINI_MODEL || '')
  const ordered = [
    preferred,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ].filter(Boolean)
  return [...new Set(ordered)]
}

/** `VITE_GEMINI_LEXICAL_WEB_ENRICHMENT` !== '0' → tenta Google Search no Gemini (grounding oficial). */
export function lexicalWebEnrichmentAtivo() {
  const v = import.meta.env.VITE_GEMINI_LEXICAL_WEB_ENRICHMENT
  return v !== '0' && v !== 'false'
}

/**
 * Corte opcional por tamanho (ex.: resumo lexical Strong). Sem aviso ao utilizador.
 * @param {number|null|undefined} maxChars — omitir, 0 ou negativo = não cortar
 */
function ajustarTamanhoResposta(texto, maxChars = null) {
  const s = String(texto || '').trim()
  if (!s) return ''
  const limite = Number(maxChars)
  if (!Number.isFinite(limite) || limite <= 0 || s.length <= limite) return s
  const corte = s.slice(0, limite)
  const ultimoBreak = Math.max(
    corte.lastIndexOf('\n\n'),
    corte.lastIndexOf('\n'),
    corte.lastIndexOf('. ')
  )
  return (ultimoBreak > 300 ? corte.slice(0, ultimoBreak + 1) : corte).trim()
}

const LIMITE_DEF_STRONG = 6000
const LIMITE_DERIVACAO = 3000
const LIMITE_BDB = 3200
const LIMITE_STEPBIBLE_DEF = 2200
const LIMITE_GLOSS_INDICE = 400
const MAX_CHARS_RESUMO = 10000

function nomeLivroPorId(livroId) {
  const id = Number(livroId)
  return livrosBiblia.find((l) => l.id === id)?.nome || `Livro ${id}`
}

function formatarRefBiblica(o) {
  if (!o?.livroId || !o?.capitulo || !o?.versiculo) return ''
  return `${nomeLivroPorId(o.livroId)} ${o.capitulo}:${o.versiculo}`
}

async function carregarOcorrenciasResumoIa(code) {
  const c = String(code || '').trim().toUpperCase()
  if (c.startsWith('H')) {
    const [rows, total] = await Promise.all([
      buscarOcorrenciasStrongHebraico(c, 6),
      contarOcorrenciasStrongHebraico(c)
    ])
    const refs = rows.map(formatarRefBiblica).filter(Boolean)
    return { total, refs, rows }
  }
  if (c.startsWith('G')) {
    const [rows, total] = await Promise.all([
      buscarOcorrenciasStrongGrego(c, 6),
      contarOcorrenciasStrongGrego(c)
    ])
    const refs = rows.map(formatarRefBiblica).filter(Boolean)
    return { total, refs, rows }
  }
  return null
}

/**
 * Acrescenta BDB completo e entradas do léxico PT-BR ao objeto `detalhe` antes do resumo IA.
 */
export async function enriquecerDetalheParaResumoIa(detalhe, { traduzirStrongPtBr = true } = {}) {
  if (!detalhe) return detalhe
  const code = String(detalhe.strong || '').trim().toUpperCase()
  const out = { ...detalhe }

  if (code.startsWith('H') && Array.isArray(detalhe.lexicalIndex) && detalhe.lexicalIndex.length) {
    const bdbCodes = [
      ...new Set(
        detalhe.lexicalIndex
          .map((li) => String(li?.bdb || '').trim())
          .filter(Boolean)
      )
    ].slice(0, 4)
    const bdbEntries = []
    for (const bdbCode of bdbCodes) {
      try {
        const entry = await buscarBdbHebraico(bdbCode)
        if (!entry) continue
        const text = traduzirStrongPtBr
          ? entry.content_text_pt || entry.content_text || entry.content_text_original
          : entry.content_text_original || entry.content_text || entry.content_text_pt
        const limpo = limparTextoStepBible(text).slice(0, LIMITE_BDB)
        if (limpo) {
          bdbEntries.push({
            code: entry.entry_id || bdbCode,
            headword: entry.headword || '',
            text: limpo
          })
        }
      } catch {
        /* ignore */
      }
    }
    if (bdbEntries.length) out.bdbEntriesParaIa = bdbEntries
  }

  if (traduzirStrongPtBr && code) {
    try {
      const ptLex = await buscarLexiconPtBr(code)
      if (ptLex?.definicoes?.length) {
        out.lexiconPtBrDefinicoes = ptLex.definicoes.slice(0, 12)
      }
      if (ptLex?.definicao_expandida && !out.ptCurado) {
        out.definition_pt = ptLex.definicao_expandida
      }
      if (ptLex?.raiz) out.lexiconPtBrRaiz = ptLex.raiz
      if (ptLex?.categoria) out.lexiconPtBrCategoria = ptLex.categoria
    } catch {
      /* ignore */
    }
  }

  try {
    const occ = await carregarOcorrenciasResumoIa(code)
    if (occ?.refs?.length || occ?.total > 0) {
      out.ocorrenciasResumoIa = {
        totalVersiculosDistintos: occ.total,
        primeirasReferencias: occ.refs.slice(0, 6)
      }
    }
  } catch {
    /* ignore */
  }

  return out
}

export function montarContextoLexicalParaIa(detalhe, traduzirStrongPtBr, token) {
  const parts = []
  if (detalhe?.strong) parts.push(`Código Strong: ${detalhe.strong}`)
  if (detalhe?.greek_unicode) parts.push(`Forma original (Unicode): ${detalhe.greek_unicode}`)
  if (detalhe?.greek_translit) parts.push(`Transliteração: ${detalhe.greek_translit}`)
  const def = traduzirStrongPtBr
    ? detalhe.definition_pt || detalhe.definition
    : detalhe.definition_original || detalhe.definition
  if (def) parts.push(`Definição Strong (dicionário local): ${String(def).slice(0, LIMITE_DEF_STRONG)}`)
  const deriv = traduzirStrongPtBr
    ? detalhe.derivation_pt || detalhe.derivation
    : detalhe.derivation_original || detalhe.derivation
  if (deriv) parts.push(`Derivação / referências cruzadas: ${String(deriv).slice(0, LIMITE_DERIVACAO)}`)

  if (detalhe.lexiconPtBrCategoria || detalhe.lexiconPtBrRaiz) {
    parts.push(
      `Léxico PT-BR (metadados): categoria=${detalhe.lexiconPtBrCategoria || '—'} raiz=${detalhe.lexiconPtBrRaiz || '—'}`
    )
  }
  if (detalhe.lexiconPtBrDefinicoes?.length) {
    parts.push('Léxico PT-BR (entradas):')
    detalhe.lexiconPtBrDefinicoes.forEach((item, i) => {
      const linha =
        typeof item === 'string'
          ? item
          : item?.texto || item?.definicao || item?.gloss || JSON.stringify(item)
      parts.push(`  ${i + 1}. ${String(linha).slice(0, 400)}`)
    })
  }

  if (detalhe.lexicalIndex?.length) {
    parts.push('Índice lexical Open Scriptures:')
    detalhe.lexicalIndex.slice(0, 20).forEach((li, i) => {
      const gloss = traduzirStrongPtBr
        ? li.short_def_pt || li.short_def
        : li.short_def_original || li.short_def
      const etym = [li.etym_type, li.etym_value, li.etym_root].filter(Boolean).join(' / ')
      parts.push(
        `  ${i + 1}. id=${li.entry_id || '—'} pos=${li.pos || '—'} TWOT=${li.twot || '—'} BDB=${li.bdb || '—'} etym=${etym || '—'} gloss=${gloss ? String(gloss).slice(0, LIMITE_GLOSS_INDICE) : '—'}`
      )
    })
  }

  if (detalhe.bdbEntriesParaIa?.length) {
    parts.push('BDB (texto local incorporado — base factual):')
    detalhe.bdbEntriesParaIa.forEach((e, i) => {
      parts.push(
        `  ${i + 1}. BDB ${e.code}${e.headword ? ` (${e.headword})` : ''}: ${e.text}`
      )
    })
  }

  if (detalhe.stepBibleEntries?.length) {
    parts.push('STEPBible local (TBESH/TBESG/TFLSJ — base factual):')
    detalhe.stepBibleEntries.slice(0, 14).forEach((e, i) => {
      const t = limparTextoStepBible(
        traduzirStrongPtBr
          ? e.definition_pt || e.definition_original || e.definition_clean || e.definition || ''
          : e.definition_original || e.definition_clean || e.definition || e.definition_pt || ''
      ).slice(0, LIMITE_STEPBIBLE_DEF)
      const g = limparTextoStepBible(
        traduzirStrongPtBr
          ? e.gloss_pt || e.gloss_original || e.gloss || ''
          : e.gloss_original || e.gloss || e.gloss_pt || ''
      ).slice(0, 180)
      parts.push(
        `  ${i + 1}. fonte=${e.source || '?'} lemma=${e.lemma || '—'} gloss=${g}${t ? ` def=${t}` : ''}`
      )
    })
  }

  if (detalhe.ocorrenciasResumoIa) {
    const { totalVersiculosDistintos, primeirasReferencias } = detalhe.ocorrenciasResumoIa
    parts.push('Ocorrências no texto bíblico (base factual — cite só destas, no máximo 2–3 no resumo):')
    if (totalVersiculosDistintos > 0) {
      parts.push(`  Versículos distintos aproximados: ${totalVersiculosDistintos}`)
    }
    ;(primeirasReferencias || []).forEach((ref, i) => {
      parts.push(`  ${i + 1}. ${ref}`)
    })
  }

  if (token?.lemma || token?.lemma_raw) {
    parts.push(`Lemma / forma analisada na passagem: ${token.lemma || token.lemma_raw || ''}`)
  }
  return parts.join('\n')
}

function montarInstrucoesSistemaLexical(maxChars = MAX_CHARS_RESUMO) {
  return `Você explica verbetes léxico-bíblicos em português do Brasil — tom didático, direto e natural, como texto de estudo (NÃO carta pessoal, NÃO diálogo íntimo).

TOM E ABERTURA:
- Proibido vocativos e saudações: "Meu caro", "Caro leitor", "Querido estudante", "Olá", "Amigo", etc.
- Comece imediatamente pelo assunto: palavra original, transliteração, código Strong ou ideia central.

EXTENSÃO (adapte à riqueza deste verbete — não use tamanho fixo):
- Verbetes simples (poucos usos, sentido único): 1–2 parágrafos concisos.
- Verbetes médios: 3–5 parágrafos.
- Verbetes ricos (alta frequência, múltiplos sentidos, rede léxica ampla, teologia densa): desenvolva com profundidade até ~${maxChars} caracteres se o conteúdo justificar.
- Nunca encha texto só para parecer longo; nunca repita a mesma ideia para ocupar espaço; nunca corte abruptamente um ponto que ainda precisa ser explicado.

FORMATO:
- Prosa corrida, sem títulos, cabeçalhos ou secções numeradas.
- Listas com hífen só quando realmente clarificam (máx. uma lista, até 5 itens); prefira frases.
- Referências bíblicas: 1–3 em verbetes simples; até 5 em verbetes ricos — somente as fornecidas em "Ocorrências no texto bíblico".

BASE FACTUAL (obrigatório):
- Parta dos dados locais fornecidos (Strong, BDB, STEPBible local, TWOT, ocorrências, léxico PT-BR). Não invente códigos, transliterações, etimologias nem passagens ausentes dos dados.
- Enriqueça com conteúdo verificável de STEPBible.org e Blue Letter Bible (lexicons, estudos léxicos, TWOT, nuances de uso no AT/NT, relações entre termos) — absorvido na prosa em pt-BR, sem citar sites, URLs ou bibliografia.
- Se fontes externas divergirem dos dados locais, priorize os dados locais e trate a divergência com cautela.

Códigos Strong/TWOT/BDB: no máximo 3 menções entre parênteses, só se indispensável.

PROIBIDO: tool_code, thought, google_search, URLs, metadados do prompt.`
}

/**
 * @param {'local' | 'enriquecido'} modo — local: só dados da app; enriquecido: tradição lexical + busca quando disponível.
 */
function montarPromptUsuario(contexto, { modo = 'enriquecido', usarGoogleSearch = false } = {}) {
  const localOnly = modo === 'local'

  const blocoFontes = localOnly
    ? `Com base APENAS nos dados locais abaixo, escreva uma explicação lexical natural em pt-BR — prosa fluida, sem títulos de secção. Extensão proporcional ao verbete (curto se simples, mais longo se rico). Não invente códigos nem passagens fora das ocorrências fornecidas.`
    : `Explique este verbete em pt-BR com profundidade proporcional à riqueza do assunto — texto de estudo, não ficha com títulos fixos.

PRIORIDADE DE FONTES:
1) Dados locais abaixo (âncora factual: Strong, BDB, STEPBible local, TWOT, ocorrências, léxico PT-BR). Não invente termos, códigos ou passagens fora deles.
2) Material rico de STEPBible.org e Blue Letter Bible sobre este Strong/lemma — glossas, nuances semânticas, usos no AT/NT, rede léxica, notas TWOT/BDB e estudos léxicos disponíveis no BLB. Integre na prosa em pt-BR; o leitor não vê sites nem URLs.
3) Tradição lexical judaico-cristã, como interpretação quando não estiver nos dados.

Verbetes simples: seja conciso. Verbetes densos (ex.: nomes divinos, termos teologicamente carregados): desenvolva com contexto amplo, sem prolixidade vazia.
Referências bíblicas: só das ocorrências fornecidas. Resposta final limpa — sem tool_code nem thought.`

  const ferramentaBusca = usarGoogleSearch
    ? `\nPesquisa web ativa: busque e absorva conteúdo verificável de STEPBible.org, Blue Letter Bible e TWOT para este verbete, sempre compatível com os dados locais.\n`
    : !localOnly
      ? `\n(Sem pesquisa web nesta tentativa: use os dados locais e o conhecimento lexical de STEPBible/BLB já compatível com eles.)\n`
    : ''

  return `${blocoFontes}
${ferramentaBusca}
DADOS DO VERBETE:
---
${contexto}
---

Responda só com o texto final em prosa, sem títulos, cabeçalhos nem saudações. Extensão conforme a riqueza do verbete — não fixe número de parágrafos.`
}

function montarCorpoPedidoGemini(contexto, { modoPrompt, usarGoogleSearch }) {
  const prompt = montarPromptUsuario(contexto, { modo: modoPrompt, usarGoogleSearch })
  const body = {
    systemInstruction: {
      parts: [{ text: montarInstrucoesSistemaLexical(MAX_CHARS_RESUMO) }]
    },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.38,
      maxOutputTokens: 8192,
      topP: 0.92
    }
  }
  if (usarGoogleSearch) {
    body.tools = [{ google_search: {} }]
  }
  return body
}

function resumoLexicalPareceValido(texto) {
  const s = String(texto || '').trim()
  if (s.length < 120) return false
  const frases = s.split(/[.!?]+/).filter((f) => f.trim().length > 12)
  return frases.length >= 2
}

function processarTextoResumoLexical(textoBruto) {
  const out = limparResumoLexicalParaExibicao(ajustarTamanhoResposta(textoBruto, MAX_CHARS_RESUMO))
  if (!out || !resumoLexicalPareceValido(out)) {
    return { ok: false, text: out, vazado: false }
  }
  if (resumoLexicalPareceVazado(out)) {
    return { ok: false, text: out, vazado: true }
  }
  return { ok: true, text: out, vazado: false }
}

function erroIndicaToolIncompativel(msg) {
  return /google_search|grounding|tool|not supported for|Unsupported feature/i.test(String(msg || ''))
}

/**
 * Heurística para distinguir erros transitórios da API:
 *   - `QUOTA_EXCEEDED`: a cota diária/mensal acabou. Tempo de espera longo
 *      (até o reset diário do Gemini ou do plano de billing).
 *   - `RATE_LIMIT`: pedido excedeu o RPM/TPM por minuto. Curto.
 *   - `OVERLOADED`: modelo indisponível temporariamente.
 *   - `null` se não é um caso especial conhecido.
 */
export function classificarErroIa(status, msg) {
  const m = String(msg || '').toLowerCase()
  if (status === 429 || /resource[_ ]?exhausted|quota/i.test(m)) {
    if (/per[_ ]?day|daily|day\b/i.test(m)) return 'QUOTA_EXCEEDED'
    if (/per[_ ]?minute|rpm|rate[_ ]?limit/i.test(m)) return 'RATE_LIMIT'
    // 429 genérico — quase sempre é o limite diário do Free Tier.
    return status === 429 ? 'QUOTA_EXCEEDED' : 'RATE_LIMIT'
  }
  if (status === 503 || /overloaded|unavailable|try again later/i.test(m)) return 'OVERLOADED'
  return null
}

/**
 * @returns {Promise<{ ok: boolean, text?: string, error?: string, code?: string }>}
 */
export async function gerarResumoStrongGemini({ detalhe, traduzirStrongPtBr, token }) {
  if (!iaGeminiDisponivel()) {
    return {
      ok: false,
      error: mensagemErroChaveGeminiAusente(),
      code: 'NO_KEY'
    }
  }
  const detalheEnriquecido = await enriquecerDetalheParaResumoIa(detalhe, { traduzirStrongPtBr })
  const contexto = montarContextoLexicalParaIa(detalheEnriquecido, traduzirStrongPtBr, token)
  if (!String(contexto || '').trim()) {
    return { ok: false, error: 'Sem dados lexicais suficientes para montar o pedido.', code: 'EMPTY' }
  }
  const apiKey = obterChaveGeminiApi()
  const modelos = obterListaModelosTentativa()
  const webOn = lexicalWebEnrichmentAtivo()

  let lastError = ''
  for (const model of modelos) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`

    const tentativas = webOn
      ? [
          {
            body: montarCorpoPedidoGemini(contexto, {
              modoPrompt: 'enriquecido',
              usarGoogleSearch: true
            }),
            label: 'web'
          },
          {
            body: montarCorpoPedidoGemini(contexto, {
              modoPrompt: 'enriquecido',
              usarGoogleSearch: false
            }),
            label: 'enriquecido_sem_busca'
          }
        ]
      : [
          {
            body: montarCorpoPedidoGemini(contexto, {
              modoPrompt: 'local',
              usarGoogleSearch: false
            }),
            label: 'local'
          }
        ]

    for (const { body, label } of tentativas) {
      let res
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      } catch (e) {
        return { ok: false, error: e?.message || 'Falha de rede ao chamar a IA.', code: 'NETWORK' }
      }

      let data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error?.message || res.statusText || 'Erro da API Gemini'
        lastError = msg
        const tipo = classificarErroIa(res.status, msg)
        if (tipo) {
          return { ok: false, error: msg, code: tipo, status: res.status }
        }
        const isModelNotFound =
          /not found|is not supported|unsupported|unknown model/i.test(msg || '')
        if (isModelNotFound) break
        if (label === 'web' && webOn && erroIndicaToolIncompativel(msg)) {
          continue
        }
        return {
          ok: false,
          error: `${msg}. Verifique o modelo (VITE_GEMINI_MODEL) e a chave.`,
          code: 'API'
        }
      }

      const partsBrutos = data?.candidates?.[0]?.content?.parts || []
      const text = partsBrutos
        .map((p) => (typeof p?.text === 'string' ? p.text : ''))
        .filter((t) => t && !/^\s*tool_code\b/i.test(t) && !/^\s*thought\s*$/im.test(t))
        .join('\n')
      const block = data?.candidates?.[0]?.finishReason
      if (!text.trim()) {
        if (label === 'web' && webOn) continue
        return {
          ok: false,
          error: `Resposta vazia da IA${block ? ` (${block})` : ''}. Tente de novo ou outro modelo.`,
          code: 'EMPTY_REPLY'
        }
      }
      const processado = processarTextoResumoLexical(text)
      if (!processado.ok) {
        if (label === 'web' && webOn) continue
        if (processado.vazado) {
          return {
            ok: false,
            error: 'A IA devolveu metadados internos em vez do resumo. Tente gerar novamente.',
            code: 'LEAK'
          }
        }
        return {
          ok: false,
          error: 'Resposta incompleta ou inválida. Tente gerar novamente.',
          code: 'INVALID_REPLY'
        }
      }
      return { ok: true, text: processado.text, finishReason: block || null }
    }
  }

  return {
    ok: false,
    error: `${lastError || 'Nenhum modelo disponível respondeu.'}. Ajuste VITE_GEMINI_MODEL para um modelo válido da sua conta.`,
    code: 'API'
  }
}

const PROMPT_CONTINUACAO_ESTUDO =
  'Continue o texto exatamente de onde parou. Não repita parágrafos já escritos. Complete seções e itens que ficaram incompletos (incluindo perguntas para reflexão em grupo, se faltarem).'

async function chamarGeminiGenerateContent(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText || 'Erro da API Gemini'
    return { ok: false, status: res.status, msg }
  }
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') || ''
  const finishReason = data?.candidates?.[0]?.finishReason || null
  return { ok: true, text, finishReason }
}

/**
 * Chamada genérica à API `generateContent` do Gemini (corpo já montado pelo chamador).
 * Útil para prompts com `systemInstruction` + `contents`, sem ferramentas de grounding.
 *
 * @param {object} body — JSON enviado ao endpoint (ex.: systemInstruction, contents, generationConfig).
 * @param {{ maxContinuacoes?: number }} [options] — se a API parar por MAX_TOKENS, pede continuação (sem aviso no texto).
 * @returns {Promise<{ ok: boolean, text?: string, error?: string, code?: string }>}
 */
export async function gerarConteudoGemini(body, options = {}) {
  if (!iaGeminiDisponivel()) {
    return {
      ok: false,
      error: mensagemErroChaveGeminiAusente(),
      code: 'NO_KEY'
    }
  }
  const maxContinuacoes = Math.max(0, Math.min(3, Number(options.maxContinuacoes) || 0))
  const apiKey = obterChaveGeminiApi()
  const modelos = obterListaModelosTentativa()
  let lastError = ''
  for (const model of modelos) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`

    let corpo = body
    let textoCompleto = ''
    let finishReason = null

    for (let parte = 0; parte <= maxContinuacoes; parte++) {
      let resultado
      try {
        resultado = await chamarGeminiGenerateContent(url, corpo)
      } catch (e) {
        return { ok: false, error: e?.message || 'Falha de rede ao chamar a IA.', code: 'NETWORK' }
      }

      if (!resultado.ok) {
        const msg = resultado.msg
        lastError = msg
        const tipo = classificarErroIa(resultado.status, msg)
        if (tipo) {
          return { ok: false, error: msg, code: tipo, status: resultado.status }
        }
        break
      }

      const { text, finishReason: block } = resultado
      if (!String(text || '').trim()) {
        return {
          ok: false,
          error: `Resposta vazia da IA${block ? ` (${block})` : ''}. Tente de novo.`,
          code: 'EMPTY_REPLY'
        }
      }

      textoCompleto = textoCompleto
        ? `${textoCompleto.trimEnd()}\n\n${String(text).trim()}`
        : String(text).trim()
      finishReason = block

      if (block !== 'MAX_TOKENS' || parte >= maxContinuacoes) {
        return {
          ok: true,
          text: ajustarTamanhoResposta(textoCompleto),
          finishReason: finishReason || null
        }
      }

      corpo = {
        ...body,
        contents: [
          ...(body.contents || []),
          { role: 'model', parts: [{ text }] },
          { role: 'user', parts: [{ text: PROMPT_CONTINUACAO_ESTUDO }] }
        ]
      }
    }
  }
  const tipoFinal = classificarErroIa(0, lastError) || 'API'
  return {
    ok: false,
    error: `${lastError || 'Nenhum modelo disponível respondeu.'}. Ajuste VITE_GEMINI_MODEL.`,
    code: tipoFinal
  }
}
