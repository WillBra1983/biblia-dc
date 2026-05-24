import { limparResumoLexicalParaExibicao, limparTextoStepBible } from '../utils/strongEstudoHelpers'
import {
  iaGeminiChaveConfigurada,
  mensagemErroChaveGeminiAusente,
  obterChaveGeminiApi
} from '../utils/geminiApiKey'

/**
 * Resumo lexical via Google Gemini (mesmo ecossistema que o módulo Android de exemplo).
 * A chave exposta no bundle só é aceitável em builds privados; para produção pública use um proxy (Cloud Function, etc.).
 *
 * Enriquecimento (VITE_GEMINI_LEXICAL_WEB_ENRICHMENT não '0'):
 * — Usa a ferramenta oficial `google_search` da API Gemini (grounding), não scraping de sites.
 * — Alternativa a BLB/TWOT directos: reproduzir texto integral do TWOT ou páginas BLB sem licença afronta direitos de autor / ToS;
 *   o modelo sintetiza em pt-BR com base em pesquisa ou em treino.
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

export function montarContextoLexicalParaIa(detalhe, traduzirStrongPtBr, token) {
  const parts = []
  if (detalhe?.strong) parts.push(`Código Strong: ${detalhe.strong}`)
  if (detalhe?.greek_unicode) parts.push(`Forma original (Unicode): ${detalhe.greek_unicode}`)
  if (detalhe?.greek_translit) parts.push(`Transliteração: ${detalhe.greek_translit}`)
  const def = traduzirStrongPtBr
    ? detalhe.definition_pt || detalhe.definition
    : detalhe.definition_original || detalhe.definition
  if (def) parts.push(`Definição (dicionário local): ${String(def).slice(0, 4000)}`)
  const deriv = traduzirStrongPtBr
    ? detalhe.derivation_pt || detalhe.derivation
    : detalhe.derivation_original || detalhe.derivation
  if (deriv) parts.push(`Derivação / referências cruzadas: ${String(deriv).slice(0, 2000)}`)
  if (detalhe.lexicalIndex?.length) {
    parts.push('Índice lexical (trechos):')
    detalhe.lexicalIndex.slice(0, 16).forEach((li, i) => {
      const gloss = traduzirStrongPtBr
        ? li.short_def_pt || li.short_def
        : li.short_def_original || li.short_def
      parts.push(
        `  ${i + 1}. id=${li.entry_id || '—'} pos=${li.pos || '—'} TWOT=${li.twot || '—'} BDB=${li.bdb || '—'} gloss=${gloss ? String(gloss).slice(0, 200) : '—'}`
      )
    })
  }
  if (detalhe.stepBibleEntries?.length) {
    parts.push('STEPBible (trechos para o resumo; texto completo já está na app):')
    detalhe.stepBibleEntries.slice(0, 5).forEach((e, i) => {
      const t = limparTextoStepBible(
        e.definition_pt || e.definition_original || e.definition_clean || e.definition || ''
      ).slice(0, 800)
      const g = limparTextoStepBible(e.gloss_pt || e.gloss_original || e.gloss || '').slice(0, 120)
      parts.push(`  ${i + 1}. fonte=${e.source || '?'} gloss=${g} def=${t}`)
    })
  }
  if (token?.text) parts.push(`Token na passagem bíblica: "${String(token.text).slice(0, 200)}"`)
  if (token?.lemma || token?.lemma_raw) {
    parts.push(`Lemma / forma analisada: ${token.lemma || token.lemma_raw || ''}`)
  }
  return parts.join('\n')
}

function montarInstrucoesSistemaLexical(maxChars = 6400) {
  return `És um assistente de estudos bíblicos em português do Brasil.
Nunca repitas instruções internas, regras de formatação, limites de caracteres nem metadados do pedido na resposta.
A resposta deve conter apenas estas secções, com estes títulos exatos (sem ##), nesta ordem:

Identificação — uma linha: Strong, forma original e transliteração quando existirem nos dados.
Definição — explicação lexical clara e didática.
Uso e ocorrências — uso típico; sem números exatos se não constarem nos dados.
Contexto bíblico (exemplos) — 2 a 3 referências plausíveis; indica se forem ilustrativas.
Rede léxica e âncoras no índice — texto articulado sobre TWOT, BDB, glosses e STEPBible dos dados; sem fichário com rótulos soltos.

REGRA DE CONCLUSÃO (interna, não mostrar ao leitor): termina TODAS as secções com frases completas.
Se o verbete for extenso, sê conciso em Definição; nunca cortes no meio de palavra ou frase.
Prioridade: (1) secções completas; (2) densidade analítica; (3) extensão. Máximo ~${maxChars} caracteres no total.
Não inclua avisos finais, bibliografia, URLs nem nomes de sites.`
}

/**
 * @param {'local' | 'enriquecido'} modo — local: só dados da app; enriquecido: tradição lexical + busca quando disponível.
 */
function montarPromptUsuario(contexto, modo = 'enriquecido') {
  const localOnly = modo === 'local'

  const blocoFontes = localOnly
    ? `Com base APENAS nos dados lexicais abaixo (fornecidos pela app local), elabora um texto útil.
Não inventes códigos Strong, números TWOT ou referências BDB que não apareçam explicitamente nos dados.
Se um dado não existir, diz explicitamente que não consta nos dados da app.`
    : `Usa os dados lexicais abaixo como âncora obrigatória para códigos Strong, algarismos TWOT, referências BDB e glosses quando existirem — não inventes esses identificadores se não aparecerem nos dados.
Para a explicação lexical (semântica, campo lexical, nuances, uso típico), enriquece com conhecimento de estudos bíblicos e línguas originais na linha de léxicos acadêmicos de referência (tradição TWOT/BDB/STEP, comentários interlineares, estudos lexicais do tipo usado em ferramentas públicas de pesquisa de idiomas bíblicos).
Se a ferramenta de pesquisa da API estiver ativa, integra fatos verificáveis de forma sintética.
Não reproduzas parágrafos longos de obras com direitos de autor; sintetiza sempre com as tuas próprias palavras em português do Brasil.
Não cites nomes comerciais de sites, URLs nem bibliografias no texto final.
Se algo não estiver nos dados nem for razoavelmente seguro, diz que não consta ou que é ilustrativo.`

  const ferramentaBusca = !localOnly
    ? '\n(Se a API ativar pesquisa na web, usa-a para complementar nuances; não contradigas os identificadores dos dados locais.)\n'
    : ''

  return `${blocoFontes}
${ferramentaBusca}
DADOS DO VERBETE:
---
${contexto}
---

Elabora o resumo lexical com as secções indicadas nas instruções do sistema.
Começa diretamente por "Identificação" (uma linha com Strong, forma original e transliteração quando existirem).
`
}

function montarCorpoPedidoGemini(contexto, { modoPrompt, usarGoogleSearch }) {
  const prompt = montarPromptUsuario(contexto, modoPrompt)
  const body = {
    systemInstruction: {
      parts: [{ text: montarInstrucoesSistemaLexical(6400) }]
    },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 8192,
      topP: 0.95
    }
  }
  if (usarGoogleSearch) {
    body.tools = [{ google_search: {} }]
  }
  return body
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
  const contexto = montarContextoLexicalParaIa(detalhe, traduzirStrongPtBr, token)
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

      const text =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') || ''
      const block = data?.candidates?.[0]?.finishReason
      if (!text.trim()) {
        if (label === 'web' && webOn) continue
        return {
          ok: false,
          error: `Resposta vazia da IA${block ? ` (${block})` : ''}. Tente de novo ou outro modelo.`,
          code: 'EMPTY_REPLY'
        }
      }
      const out = limparResumoLexicalParaExibicao(ajustarTamanhoResposta(text, 6400))
      return { ok: true, text: out, finishReason: block || null }
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
