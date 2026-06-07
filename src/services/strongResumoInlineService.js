import { limparResumoLexicalParaExibicao, resumoTextoPareceCompleto } from '../utils/strongEstudoHelpers'
import { textoCurtoLexicalPt, capitalizarFrasesPtBr } from '../utils/strongTextoPt'
import { strongResumoIaStorageKey } from '../utils/strongResumoIaStorage'
import {
  lerResumoLemmaLocalStrong,
  salvarResumoLemmaLocalStrong,
  lerResumoTokenLocalStrong,
  salvarResumoTokenLocalStrong,
  limparResumoLemmaLocalStrong,
  limparResumoTokenLocalStrong,
} from '../utils/strongResumoLocalCache'
import {
  chaveCacheAnaliseToken,
  formatarReferenciaPassagemToken,
  precisaAnaliseFormaPassagem,
} from '../utils/strongTokenHelpers'
import {
  criarResumoStrongCompartilhavel,
  obterResumoStrongPublicadoPorCodigo,
  atualizarResumoStrongCompartilhavel,
} from './strongResumoShareService'
import {
  gerarResumoLemmaStrongGemini,
  gerarResumoTokenStrongGemini,
  iaGeminiDisponivel,
} from './strongEstudoAiService'
import { estaSemRede, MSG_SEM_INTERNET_RECURSO } from '../utils/conteudoLocalOffline'
import { get, ref } from 'firebase/database'
import { getFirebaseDatabase } from '../config/firebase'

function montarFallbackLexicalCurto(detalhe) {
  if (!detalhe) return ''
  const bruto =
    detalhe.definition_pt ||
    (detalhe.lexicalIndex || []).map((li) => textoCurtoLexicalPt(li)).find(Boolean) ||
    detalhe.definition ||
    ''
  const curto = String(bruto || '')
    .split(/[;|]/)[0]
    .trim()
    .slice(0, 480)
  return curto ? capitalizarFrasesPtBr(curto) : ''
}

function persistirResumoSessao(code, token, lemmaText, tokenText) {
  try {
    sessionStorage.setItem(
      strongResumoIaStorageKey(code, token),
      JSON.stringify({ lemma: lemmaText, token: tokenText || '' })
    )
  } catch {
    /* ignore */
  }
}

function lerResumoSessao(code, token) {
  try {
    const raw = sessionStorage.getItem(strongResumoIaStorageKey(code, token))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return {
        lemma: String(parsed.lemma || '').trim(),
        token: String(parsed.token || '').trim(),
      }
    }
    return { lemma: String(raw).trim(), token: '' }
  } catch {
    return null
  }
}

/**
 * Publica ou atualiza o resumo canônico (`strongResumo_H123`) sem avaliação manual.
 * Só grava se não existir ou se o autor for o mesmo usuário.
 */
export async function publicarResumoStrongAutomatico({ code, resumo, authorUid, authorName }) {
  const uid = String(authorUid || '').trim()
  if (!uid) return null
  const codeNorm = String(code || '').trim().toUpperCase()
  const resumoLimpo = limparResumoLexicalParaExibicao(resumo)
  if (!codeNorm || !resumoLimpo) return null

  const existente = await obterResumoStrongPublicadoPorCodigo(codeNorm).catch(() => null)
  if (existente?.id && existente?.resumo) {
    const db = getFirebaseDatabase()
    if (db) {
      const snap = await get(ref(db, `bibliaEstudos/${existente.id}/authorUid`))
      const autorAtual = String(snap.val() || '').trim()
      if (autorAtual && autorAtual !== uid) return existente.id
    }
    await atualizarResumoStrongCompartilhavel({ id: existente.id, resumo: resumoLimpo })
    return existente.id
  }

  return criarResumoStrongCompartilhavel({
    code: codeNorm,
    resumo: resumoLimpo,
    authorUid: uid,
    authorName: String(authorName || '').trim() || 'Bíblia DC',
  })
}

async function resolverLemmaTexto({ codeNorm, detalhe, user, forcar, aplicarCacheLemma }) {
  if (!forcar) {
    const local = lerResumoLemmaLocalStrong(codeNorm)
    if (local) {
      const limpo = limparResumoLexicalParaExibicao(local)
      if (limpo) return { ok: true, text: limpo, fonte: 'local' }
    }

    if (user?.uid && !estaSemRede()) {
      const publicado = await obterResumoStrongPublicadoPorCodigo(codeNorm).catch(() => null)
      if (publicado?.resumo) {
        const hit = aplicarCacheLemma(publicado.resumo, 'publicado')
        if (hit) return hit
      }
    }
  }

  if (estaSemRede()) {
    const fb = montarFallbackLexicalCurto(detalhe)
    if (fb) return { ok: true, text: fb, fonte: 'fallback' }
    return { ok: false, error: MSG_SEM_INTERNET_RECURSO }
  }

  if (!iaGeminiDisponivel()) {
    const fb = montarFallbackLexicalCurto(detalhe)
    if (fb) return { ok: true, text: fb, fonte: 'fallback' }
    return {
      ok: false,
      error: 'Resumo indisponível offline. Conecte-se à internet para gerar o estudo lexical.',
    }
  }

  const gerado = await gerarResumoLemmaStrongGemini({ detalhe })
  if (!gerado.ok || !gerado.text) {
    const fb = montarFallbackLexicalCurto(detalhe)
    if (fb) return { ok: true, text: fb, fonte: 'fallback' }
    return { ok: false, error: gerado.error || 'Não foi possível gerar o resumo do léma.' }
  }

  const limpo = limparResumoLexicalParaExibicao(gerado.text)
  if (!limpo) return { ok: false, error: 'A IA devolveu um resumo vazio.' }

  aplicarCacheLemma(limpo, 'gemini')

  if (user?.uid) {
    try {
      await publicarResumoStrongAutomatico({
        code: codeNorm,
        resumo: limpo,
        authorUid: user.uid,
        authorName: user.displayName || user.email || 'Usuário',
      })
    } catch {
      /* opcional */
    }
  }

  return { ok: true, text: limpo, fonte: 'gemini' }
}

function tokenResumoCacheValido(texto) {
  const limpo = limparResumoLexicalParaExibicao(texto)
  return limpo && resumoTextoPareceCompleto(limpo) ? limpo : ''
}

async function resolverTokenTexto({
  codeNorm,
  detalhe,
  token,
  ehGrego,
  resumoLemma,
  forcar,
  chaveToken,
}) {
  if (!precisaAnaliseFormaPassagem(token, detalhe, ehGrego)) {
    return { ok: true, text: '', fonte: 'nao-aplicavel' }
  }

  if (!forcar) {
    const local = tokenResumoCacheValido(lerResumoTokenLocalStrong(chaveToken))
    if (local) {
      return { ok: true, text: local, fonte: 'local-token' }
    }
  }

  if (estaSemRede() || !iaGeminiDisponivel()) {
    return { ok: true, text: '', fonte: 'offline-token' }
  }

  const gerado = await gerarResumoTokenStrongGemini({
    detalhe,
    token,
    ehGrego,
    resumoLemma,
  })
  if (!gerado.ok || !gerado.text) {
    return { ok: true, text: '', fonte: 'erro-token', error: gerado.error }
  }

  const limpo = limparResumoLexicalParaExibicao(gerado.text)
  if (limpo && resumoTextoPareceCompleto(limpo)) {
    salvarResumoTokenLocalStrong(chaveToken, limpo)
  }
  return { ok: true, text: limpo, fonte: 'gemini-token' }
}

/**
 * Resolve resumo lexical em duas camadas:
 * - `lemmaText`: significado geral do Strong (cache por código)
 * - `tokenText`: prefixo/flexão nesta passagem (cache por forma+referência)
 *
 * @returns {Promise<{ ok: boolean, lemmaText?: string, tokenText?: string, text?: string, error?: string, fonte?: string, refPassagem?: string }>}
 */
export async function resolverResumoLexicalInline({
  code,
  detalhe,
  token,
  user,
  ehGrego = false,
  forcar = false,
}) {
  const codeNorm = String(code || '').trim().toUpperCase()
  if (!codeNorm || !detalhe) {
    return { ok: false, error: 'Verbete indisponível.' }
  }

  const refPassagem = formatarReferenciaPassagemToken(token)
  const chaveToken = token ? chaveCacheAnaliseToken(codeNorm, token) : ''
  const querToken = precisaAnaliseFormaPassagem(token, detalhe, ehGrego)

  const aplicarCacheLemma = (texto, fonte) => {
    const limpo = limparResumoLexicalParaExibicao(texto)
    if (!limpo) return null
    salvarResumoLemmaLocalStrong(codeNorm, limpo)
    return { ok: true, text: limpo, fonte }
  }

  const montarResultadoCache = (lemmaLimpo, tokenLimpo, fonte) => {
    persistirResumoSessao(codeNorm, querToken ? token : null, lemmaLimpo, tokenLimpo)
    return {
      ok: true,
      lemmaText: lemmaLimpo,
      tokenText: querToken ? tokenLimpo : '',
      text: lemmaLimpo,
      fonte,
      refPassagem,
      tokenIndisponivelOffline: querToken && !tokenLimpo && estaSemRede(),
    }
  }

  let lemmaPreCarregado = null

  if (!forcar) {
    const sessao = lerResumoSessao(codeNorm, querToken ? token : null)
    if (sessao?.lemma) {
      const lemmaLimpo = limparResumoLexicalParaExibicao(sessao.lemma)
      const tokenLimpo = tokenResumoCacheValido(sessao.token)
      if (lemmaLimpo) {
        salvarResumoLemmaLocalStrong(codeNorm, lemmaLimpo)
        if (tokenLimpo && chaveToken) salvarResumoTokenLocalStrong(chaveToken, tokenLimpo)
        if (!querToken || tokenLimpo) {
          return montarResultadoCache(lemmaLimpo, tokenLimpo, 'sessao')
        }
        lemmaPreCarregado = lemmaLimpo
      }
    }

    const lemmaLocal =
      limparResumoLexicalParaExibicao(lerResumoLemmaLocalStrong(codeNorm)) || lemmaPreCarregado
    if (lemmaLocal) {
      const tokenLocal =
        querToken && chaveToken ? tokenResumoCacheValido(lerResumoTokenLocalStrong(chaveToken)) : ''
      if (!querToken || tokenLocal) {
        return montarResultadoCache(lemmaLocal, tokenLocal, 'local')
      }
      const lemmaRes = { ok: true, text: lemmaLocal, fonte: 'local' }
      let tokenText = ''
      if (querToken && token) {
        const tokenRes = await resolverTokenTexto({
          codeNorm,
          detalhe,
          token,
          ehGrego,
          resumoLemma: lemmaLocal,
          forcar: false,
          chaveToken,
        })
        tokenText = tokenRes.text || ''
      }
      persistirResumoSessao(codeNorm, querToken ? token : null, lemmaLocal, tokenText)
      return {
        ok: true,
        lemmaText: lemmaLocal,
        tokenText,
        text: lemmaLocal,
        fonte: 'local+token',
        refPassagem,
        tokenIndisponivelOffline: querToken && !tokenText && estaSemRede(),
      }
    }
  }

  if (forcar) {
    limparResumoLemmaLocalStrong(codeNorm)
    if (chaveToken) limparResumoTokenLocalStrong(chaveToken)
    try {
      sessionStorage.removeItem(strongResumoIaStorageKey(codeNorm, querToken ? token : null))
    } catch {
      /* ignore */
    }
  }

  const lemmaRes = await resolverLemmaTexto({
    codeNorm,
    detalhe,
    user,
    forcar,
    aplicarCacheLemma,
  })
  if (!lemmaRes.ok) {
    return { ok: false, error: lemmaRes.error || 'Não foi possível carregar o estudo lexical.' }
  }

  let tokenText = ''
  if (querToken && token) {
    const tokenRes = await resolverTokenTexto({
      codeNorm,
      detalhe,
      token,
      ehGrego,
      resumoLemma: lemmaRes.text,
      forcar,
      chaveToken,
    })
    tokenText = tokenRes.text || ''
  }

  persistirResumoSessao(codeNorm, querToken ? token : null, lemmaRes.text, tokenText)

  return {
    ok: true,
    lemmaText: lemmaRes.text,
    tokenText,
    text: lemmaRes.text,
    fonte: lemmaRes.fonte,
    refPassagem,
    tokenIndisponivelOffline: querToken && !tokenText && estaSemRede(),
  }
}
