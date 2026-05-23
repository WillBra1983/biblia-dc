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
    authorName: String(authorName || '').trim().slice(0, 160) || 'Utilizador',
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
export async function obterResumoStrongCompartilhavel(id) {
  const rid = String(id || '').trim()
  if (!rid) return null
  const snap = await get(ref(db(), `${BASE}/${rid}`))
  if (!snap.exists()) return null
  const v = snap.val() || {}
  if (String(v.kind || '').trim() !== 'strongResumo') return null
  const resumo = limparTextoResumo(v.resumo || v.introducao || '')
  if (!resumo) return null
  return {
    id: rid,
    code: String(v.code || '').trim().toUpperCase(),
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
  return obterResumoStrongCompartilhavel(resumoStrongId(codeNorm))
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
  if (String(v.kind || '').trim() !== 'strongResumo') {
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
