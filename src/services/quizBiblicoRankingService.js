/**
 * Ranking público do Quiz Bíblico (melhor rodada: pontos + acertos).
 * Cada usuário publica em `quizBiblicoRanking/{uid}` com opt-in.
 */

import { ref, get, set, remove, update, onValue, off } from 'firebase/database'
import { getFirebaseDatabase, isFirebaseConfigured, loadFirebaseModules } from '../config/firebase'
import { ensurePublicProfileMirrorAuth } from './chatService'
import { QUIZ_STORAGE_BEST_FASE1 } from '../constants/quizRetiroStorage'
import {
  resolverNomeRanking,
  resolverPhotoURLRanking,
} from './planoLeituraRankingService'

const OPTIN_KEY = 'salvation-quiz-ranking-optin'

export function lerOptInRankingQuiz() {
  try {
    const v = localStorage.getItem(OPTIN_KEY)
    if (v === '0' || v === 'false') return false
    if (v === '1' || v === 'true') return true
  } catch {
    /* ignore */
  }
  return true
}

export function gravarOptInRankingQuiz(ativo) {
  try {
    localStorage.setItem(OPTIN_KEY, ativo ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function notificarOptInRankingQuizAlterado() {
  try {
    window.dispatchEvent(new CustomEvent('salvation-quiz-ranking-optin-changed'))
  } catch {
    /* ignore */
  }
}

/** Aplica opt-in do perfil RTDB ao localStorage deste aparelho (conta logada). */
export async function hidratarOptInRankingQuizDoPerfil(uid) {
  if (!uid || !isFirebaseConfigured()) return lerOptInRankingQuiz()
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return lerOptInRankingQuiz()

  try {
    const snap = await get(ref(db, `users/${uid}/profile/rankingQuizOptIn`))
    if (!snap.exists()) return lerOptInRankingQuiz()

    const ativo = snap.val() === true
    gravarOptInRankingQuiz(ativo)
    notificarOptInRankingQuizAlterado()
    return ativo
  } catch (err) {
    console.warn('[quizBiblicoRanking] hidratar opt-in:', err?.message || err)
    return lerOptInRankingQuiz()
  }
}

export async function gravarOptInRankingQuizNaNuvem(uid, ativo) {
  gravarOptInRankingQuiz(ativo)
  notificarOptInRankingQuizAlterado()
  if (!uid || !isFirebaseConfigured()) return
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return
  try {
    await update(ref(db, `users/${uid}/profile`), { rankingQuizOptIn: Boolean(ativo) })
  } catch (err) {
    console.warn('[quizBiblicoRanking] opt-in perfil:', err?.message || err)
  }
}

function mergePerfilComAuth(perfil = {}, authUser = null) {
  if (!authUser) return { ...perfil }
  return {
    ...perfil,
    email:
      (typeof perfil.email === 'string' && perfil.email.trim()) ||
      (typeof authUser.email === 'string' ? authUser.email.trim() : ''),
    photoURL:
      (typeof perfil.photoURL === 'string' && perfil.photoURL.trim()) ||
      (typeof authUser.photoURL === 'string' ? authUser.photoURL.trim() : ''),
    displayName:
      (typeof perfil.displayName === 'string' && perfil.displayName.trim()) ||
      (typeof authUser.displayName === 'string' ? authUser.displayName.trim() : ''),
  }
}

/** Melhor pontuação guardada localmente (Fase 1). */
export function lerMelhorPontuacaoQuizLocal() {
  try {
    const j = JSON.parse(localStorage.getItem(QUIZ_STORAGE_BEST_FASE1) || '{}')
    return {
      acertos: Math.max(0, Number(j.correct) || 0),
      pontos: Math.max(0, Number(j.points) || 0),
    }
  } catch {
    return { acertos: 0, pontos: 0 }
  }
}

function mapEntradaRanking(uid, data) {
  const total = Math.max(1, Number(data?.totalPerguntas) || 50)
  const acertos = Math.max(0, Number(data?.acertos) || 0)
  const perguntasRespondidas = Math.max(
    0,
    Number(data?.perguntasRespondidas) || acertos
  )
  return {
    uid,
    displayName: typeof data?.displayName === 'string' ? data.displayName : 'Jogador',
    handle: typeof data?.handle === 'string' ? data.handle : '',
    photoURL: typeof data?.photoURL === 'string' ? data.photoURL : '',
    pontos: Math.max(0, Number(data?.pontos) || 0),
    acertos,
    perguntasRespondidas: Math.min(perguntasRespondidas, total),
    totalPerguntas: total,
    updatedAt: Number(data?.updatedAt) || 0,
  }
}

function ordenarLinhasRanking(rows) {
  return [...rows]
    .filter((r) => r.pontos > 0)
    .sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos
      if (b.acertos !== a.acertos) return b.acertos - a.acertos
      return b.updatedAt - a.updatedAt
    })
}

export function montarSnapshotRankingQuiz(
  uid,
  { pontos = 0, acertos = 0, perguntasRespondidas = null, totalPerguntas = 50 } = {},
  perfil = {},
  authUser = null
) {
  const pts = Math.max(0, Number(pontos) || 0)
  if (!uid || pts < 1) return null

  const p = mergePerfilComAuth(perfil, authUser)
  const handle =
    typeof p.handle === 'string' ? p.handle.trim().replace(/^@+/, '').toLowerCase() : ''
  const total = Math.max(1, Number(totalPerguntas) || 50)
  const ac = Math.max(0, Number(acertos) || 0)
  const resp = Math.min(
    total,
    Math.max(0, Number(perguntasRespondidas) ?? ac)
  )

  return {
    uid,
    displayName: resolverNomeRanking(p, authUser),
    handle: handle.slice(0, 30),
    photoURL: resolverPhotoURLRanking(p, authUser),
    pontos: pts,
    acertos: ac,
    perguntasRespondidas: resp,
    totalPerguntas: total,
    updatedAt: Date.now(),
  }
}

function melhorResultado(...fontes) {
  let pontos = 0
  let acertos = 0
  let perguntasRespondidas = 0
  let totalPerguntas = 50
  for (const f of fontes) {
    if (!f) continue
    const p = Math.max(0, Number(f.pontos) || 0)
    const a = Math.max(0, Number(f.acertos) || 0)
    const t = Math.max(1, Number(f.totalPerguntas) || 50)
    const r = Math.min(t, Math.max(0, Number(f.perguntasRespondidas) || a))
    if (p > pontos) {
      pontos = p
      acertos = a
      perguntasRespondidas = r
      totalPerguntas = t
    } else if (p === pontos && p > 0 && a > acertos) {
      acertos = a
      perguntasRespondidas = r
      totalPerguntas = t
    }
  }
  return { pontos, acertos, perguntasRespondidas, totalPerguntas }
}

export async function sincronizarMeuRankingQuiz(
  uid,
  {
    perfil = null,
    authUser = null,
    pontos = null,
    acertos = null,
    perguntasRespondidas = null,
    totalPerguntas = 50,
    rodada = null,
  } = {}
) {
  if (!uid || !isFirebaseConfigured()) return
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return

  const rankingRef = ref(db, `quizBiblicoRanking/${uid}`)

  if (!lerOptInRankingQuiz()) {
    await remove(rankingRef).catch(() => {})
    return
  }

  if (authUser) {
    await ensurePublicProfileMirrorAuth(uid, authUser).catch(() => {})
  }

  let p = perfil
  if (!p) {
    try {
      const snap = await get(ref(db, `users/${uid}/profile`))
      p = snap.val() || {}
    } catch {
      p = {}
    }
  }
  p = mergePerfilComAuth(p, authUser)

  let existente = null
  try {
    const snap = await get(rankingRef)
    if (snap.exists()) existente = mapEntradaRanking(uid, snap.val())
  } catch {
    /* ignore */
  }

  const local = lerMelhorPontuacaoQuizLocal()
  let nuvemMelhor = null
  try {
    const { lerQuizRodadasDaNuvem } = await import('./quizRetiroCloudSync')
    const nuvem = await lerQuizRodadasDaNuvem(uid)
    nuvemMelhor = nuvem.melhor
  } catch {
    /* ignore */
  }

  const rodadaAtual =
    rodada && typeof rodada === 'object'
      ? rodada
      : pontos != null
        ? {
            pontos: Number(pontos) || 0,
            acertos: Number(acertos) || 0,
            perguntasRespondidas:
              perguntasRespondidas != null
                ? Number(perguntasRespondidas) || 0
                : Number(acertos) || 0,
            totalPerguntas: Number(totalPerguntas) || 50,
          }
        : null

  const melhor = melhorResultado(local, existente, nuvemMelhor, rodadaAtual)
  const payload = montarSnapshotRankingQuiz(uid, melhor, p, authUser)
  if (!payload || payload.pontos < 1) {
    await remove(rankingRef).catch(() => {})
    return
  }

  try {
    await set(rankingRef, payload)
  } catch (err) {
    console.warn('[quizBiblicoRanking] falha ao publicar:', err?.message || err)
    throw err
  }
}

export async function removerMeuRankingQuiz(uid) {
  if (!uid || !isFirebaseConfigured()) return
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return
  await remove(ref(db, `quizBiblicoRanking/${uid}`)).catch(() => {})
}

export function mesclarRankingComSnapshotLocal(rows, snapshot) {
  if (!snapshot?.uid || snapshot.pontos < 1) return rows
  if (rows.some((r) => r.uid === snapshot.uid)) return rows
  return ordenarLinhasRanking([...rows, snapshot]).slice(0, 50)
}

export function calcularPosicaoNoRanking(rows, meuUid) {
  if (!meuUid || !Array.isArray(rows)) return null
  const idx = rows.findIndex((r) => r.uid === meuUid)
  return idx >= 0 ? idx + 1 : null
}

export function calcularPosicaoFantasma(rows, snapshot) {
  if (!snapshot?.uid || snapshot.pontos < 1) return null
  const merged = ordenarLinhasRanking([
    ...rows.filter((r) => r.uid !== snapshot.uid),
    { ...snapshot, fantasma: true },
  ])
  const idx = merged.findIndex((r) => r.uid === snapshot.uid)
  return idx >= 0 ? idx + 1 : null
}

export function subscribeRankingQuizBiblico(callback, limite = 50) {
  if (!isFirebaseConfigured()) {
    callback([])
    return () => {}
  }

  let cancelled = false
  let offFn = () => {}

  void loadFirebaseModules().then(() => {
    if (cancelled) return
    const db = getFirebaseDatabase()
    if (!db) {
      callback([])
      return
    }
    const r = ref(db, 'quizBiblicoRanking')
    const emitir = (snap) => {
      const v = snap.val()
      if (!v || typeof v !== 'object') {
        callback([])
        return
      }
      const rows = ordenarLinhasRanking(
        Object.entries(v).map(([uid, data]) => mapEntradaRanking(uid, data))
      ).slice(0, Math.max(1, Math.min(100, limite)))
      callback(rows)
    }
    onValue(r, emitir, (err) => {
      console.warn('[quizBiblicoRanking] leitura:', err?.message || err)
      callback([])
    })
    offFn = () => off(r)
  })

  return () => {
    cancelled = true
    offFn()
  }
}
