import { get, ref, set, update } from 'firebase/database'
import { getFirebaseDatabase } from '../config/firebase'

/** Mesmo nó que os estudos bíblicos (regras RTDB); distinguir por `kind: 'strongResumo'`. Não entra na pesquisa por tema do hub de estudos. */
const BASE = 'bibliaEstudos'

function db() {
  const d = getFirebaseDatabase()
  if (!d) throw new Error('Firebase Database não configurado.')
  return d
}

function limparTextoResumo(raw) {
  return String(raw || '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, 12000)
}

function resumoStrongId(code) {
  return `strongResumo_${String(code || '').trim().toUpperCase().slice(0, 16)}`
}

/** Id estável no RTDB a partir da chave de cache do token (forma + referência + morfologia). */
export function resumoTokenStrongId(chaveToken) {
  const chave = String(chaveToken || '').trim()
  if (!chave) return ''
  const code = chave.split('@')[0] || 'X'
  let h = 5381
  for (let i = 0; i < chave.length; i++) {
    h = ((h << 5) + h) ^ chave.charCodeAt(i)
  }
  return `strongResumoToken_${String(code).slice(0, 8)}_${(h >>> 0).toString(36)}`
}

/**
 * Cria um resumo Strong compartilhável e retorna o id público.
 */
export async function criarResumoStrongCompartilhavel({ code, resumo, authorUid, authorName }) {
  const codeNorm = String(code || '').trim().toUpperCase().slice(0, 16)
  const resumoLimpo = limparTextoResumo(resumo)
  if (!codeNorm) throw new Error('Código Strong inválido.')
  if (!resumoLimpo) throw new Error('Resumo vazio.')
  const id = resumoStrongId(codeNorm)
  const existing = await get(ref(db(), `${BASE}/${id}`))
  if (existing.exists()) {
    const cur = existing.val() || {}
    if (String(cur.kind || '').trim() === 'strongResumo') return id
    throw new Error('Já existe conteúdo nesse identificador e não é resumo Strong.')
  }
  const now = Date.now()
  await set(ref(db(), `${BASE}/${id}`), {
    kind: 'strongResumo',
    code: codeNorm,
    resumo: resumoLimpo,
    /** Campos exigidos pelas regras atuais de `bibliaEstudos`. */
    authorUid: String(authorUid || '').trim().slice(0, 128),
    authorName: String(authorName || '').trim().slice(0, 160) || 'Usuário',
    tema: `Resumo Strong ${codeNorm}`.slice(0, 400),
    introducao: resumoLimpo,
    citacoes: '',
    publico: false,
    acessoPorLink: true,
    readsCount: 0,
    savesCount: 0,
    createdAt: now,
    updatedAt: now
  })
  return id
}

/**
 * Lê um resumo compartilhado pelo id público.
 */
export async function obterResumoStrongCompartilhavel(id, opts = {}) {
  const rid = String(id || '').trim()
  if (!rid) return null
  const kindsPermitidos =
    opts.kinds instanceof Set
      ? opts.kinds
      : new Set(Array.isArray(opts.kinds) ? opts.kinds : ['strongResumo', 'strongResumoToken'])
  const snap = await get(ref(db(), `${BASE}/${rid}`))
  if (!snap.exists()) return null
  const v = snap.val() || {}
  const kind = String(v.kind || '').trim()
  if (!kindsPermitidos.has(kind)) return null
  const resumo = limparTextoResumo(v.resumo || v.introducao || '')
  if (!resumo) return null
  return {
    id: rid,
    kind,
    code: String(v.code || '').trim().toUpperCase(),
    cacheKey: String(v.cacheKey || '').trim(),
    refPassagem: String(v.refPassagem || '').trim(),
    resumo,
    authorName: String(v.authorName || '').trim(),
    createdAt: Number(v.createdAt || 0) || 0
  }
}

/**
 * Retorna o resumo canônico publicado para o código Strong, quando existir.
 */
export async function obterResumoStrongPublicadoPorCodigo(code) {
  const codeNorm = String(code || '').trim().toUpperCase().slice(0, 16)
  if (!codeNorm) return null
  return obterResumoStrongCompartilhavel(resumoStrongId(codeNorm), { kinds: ['strongResumo'] })
}

/**
 * Resumo canônico do token na passagem (forma + referência), quando já publicado.
 */
export async function obterResumoTokenPublicadoPorChave(chaveToken) {
  const id = resumoTokenStrongId(chaveToken)
  if (!id) return null
  return obterResumoStrongCompartilhavel(id, { kinds: ['strongResumoToken'] })
}

/**
 * Cria resumo de token Strong compartilhável (uma vez por chave de forma+referência).
 */
export async function criarResumoTokenCompartilhavel({
  chaveToken,
  code,
  resumo,
  refPassagem,
  authorUid,
  authorName,
}) {
  const chave = String(chaveToken || '').trim()
  const codeNorm = String(code || '').trim().toUpperCase().slice(0, 16)
  const resumoLimpo = limparTextoResumo(resumo)
  if (!chave || !codeNorm) throw new Error('Chave ou código Strong inválido.')
  if (!resumoLimpo) throw new Error('Resumo vazio.')
  const id = resumoTokenStrongId(chave)
  const existing = await get(ref(db(), `${BASE}/${id}`))
  if (existing.exists()) {
    const cur = existing.val() || {}
    if (String(cur.kind || '').trim() === 'strongResumoToken') return id
    throw new Error('Já existe conteúdo nesse identificador e não é resumo de token Strong.')
  }
  const now = Date.now()
  const refLabel = String(refPassagem || '').trim().slice(0, 80)
  await set(ref(db(), `${BASE}/${id}`), {
    kind: 'strongResumoToken',
    cacheKey: chave.slice(0, 240),
    code: codeNorm,
    refPassagem: refLabel,
    resumo: resumoLimpo,
    authorUid: String(authorUid || '').trim().slice(0, 128),
    authorName: String(authorName || '').trim().slice(0, 160) || 'Usuário',
    tema: `Token Strong ${codeNorm}${refLabel ? ` · ${refLabel}` : ''}`.slice(0, 400),
    introducao: resumoLimpo,
    citacoes: '',
    publico: false,
    acessoPorLink: true,
    readsCount: 0,
    savesCount: 0,
    createdAt: now,
    updatedAt: now,
  })
  return id
}

/** Publica ou atualiza resumo de token (primeiro autor grava; mesmo autor pode atualizar). */
export async function publicarResumoTokenAutomatico({
  chaveToken,
  code,
  resumo,
  refPassagem,
  authorUid,
  authorName,
}) {
  const uid = String(authorUid || '').trim()
  if (!uid) return null
  const chave = String(chaveToken || '').trim()
  const resumoLimpo = limparTextoResumo(resumo)
  if (!chave || !resumoLimpo) return null

  const existente = await obterResumoTokenPublicadoPorChave(chave).catch(() => null)
  if (existente?.id && existente?.resumo) {
    const dbRef = db()
    const snap = await get(ref(dbRef, `${BASE}/${existente.id}/authorUid`))
    const autorAtual = String(snap.val() || '').trim()
    if (autorAtual && autorAtual !== uid) return existente.id
    await atualizarResumoStrongCompartilhavel({ id: existente.id, resumo: resumoLimpo })
    return existente.id
  }

  return criarResumoTokenCompartilhavel({
    chaveToken: chave,
    code,
    resumo: resumoLimpo,
    refPassagem,
    authorUid: uid,
    authorName,
  })
}

/**
 * Atualiza o texto de um resumo Strong já publicado (uso administrativo).
 */
export async function atualizarResumoStrongCompartilhavel({ id, resumo }) {
  const rid = String(id || '').trim()
  const resumoLimpo = limparTextoResumo(resumo)
  if (!rid) throw new Error('Identificador do resumo inválido.')
  if (!resumoLimpo) throw new Error('Resumo vazio.')
  const snap = await get(ref(db(), `${BASE}/${rid}`))
  if (!snap.exists()) throw new Error('Resumo não encontrado.')
  const v = snap.val() || {}
  const kind = String(v.kind || '').trim()
  if (kind !== 'strongResumo' && kind !== 'strongResumoToken') {
    throw new Error('Este conteúdo não é um resumo lexical Strong.')
  }
  const now = Date.now()
  await update(ref(db(), `${BASE}/${rid}`), {
    resumo: resumoLimpo,
    introducao: resumoLimpo,
    updatedAt: now
  })
  return {
    id: rid,
    code: String(v.code || '').trim().toUpperCase(),
    resumo: resumoLimpo,
    authorName: String(v.authorName || '').trim(),
    createdAt: Number(v.createdAt || 0) || 0
  }
}
