/**
 * Ranking público do plano «Bíblia completa» (um plano, mesma meta de capítulos).
 * Cada utilizador publica o próprio registo em `planoLeituraRanking/{uid}` (opt-in).
 */

import { ref, get, set, remove, update, onValue, off } from 'firebase/database'
import { getFirebaseDatabase, isFirebaseConfigured, loadFirebaseModules } from '../config/firebase'
import { ensurePublicProfileMirrorAuth } from './chatService'
import { PLANO_BIBLIA_COMPLETA_ID } from '../data/planos'
import { gravatarPhotoUrl } from '../utils/gravatarUrl'
import {
  instanciaAtivaId,
  obterInstancia,
  obterMetricasResumo,
  obterProgressoInstancia,
  obterTemplate,
} from '../utils/planoLeituraUsuario'

const OPTIN_KEY = 'salvation-plano-ranking-optin'

export function lerOptInRankingPlano() {
  try {
    const v = localStorage.getItem(OPTIN_KEY)
    if (v === '0' || v === 'false') return false
    if (v === '1' || v === 'true') return true
  } catch {
    /* ignore */
  }
  return true
}

export function gravarOptInRankingPlano(ativo) {
  try {
    localStorage.setItem(OPTIN_KEY, ativo ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Espelha opt-in no perfil RTDB para a Cloud Function respeitar a escolha. */
export async function gravarOptInRankingPlanoNaNuvem(uid, ativo) {
  gravarOptInRankingPlano(ativo)
  if (!uid || !isFirebaseConfigured()) return
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return
  try {
    await update(ref(db, `users/${uid}/profile`), { rankingPlanoOptIn: Boolean(ativo) })
  } catch (err) {
    console.warn('[planoLeituraRanking] opt-in perfil:', err?.message || err)
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

/** Nome no ranking: @apelido, ou parte antes do @ no e-mail, ou nome do perfil. */
export function resolverNomeRanking(perfil = {}, authUser = null) {
  const p = mergePerfilComAuth(perfil, authUser)
  const handle =
    typeof p.handle === 'string' ? p.handle.trim().replace(/^@+/, '').toLowerCase() : ''
  if (handle) return `@${handle}`.slice(0, 80)

  const email = typeof p.email === 'string' ? p.email.trim() : ''
  if (email.includes('@')) {
    const parte = email.split('@')[0].trim()
    if (parte) return parte.slice(0, 80)
  }

  const dn = typeof p.displayName === 'string' ? p.displayName.trim() : ''
  if (dn) return dn.slice(0, 80)

  return 'Leitor'
}

export function resolverPhotoURLRanking(perfil = {}, authUser = null) {
  const p = mergePerfilComAuth(perfil, authUser)
  const fromProfile = typeof p.photoURL === 'string' ? p.photoURL.trim() : ''
  if (fromProfile) return fromProfile.slice(0, 600)
  const email = typeof p.email === 'string' ? p.email.trim() : ''
  return gravatarPhotoUrl(email) || ''
}

function resolverInstanciaId(instanciaIdPreferida) {
  const id = instanciaIdPreferida || instanciaAtivaId()
  if (!id) return null
  const inst = obterInstancia(id)
  if (!inst) return null
  const t = obterTemplate(inst.templateId)
  if (!t?.capitulos) return null
  return id
}

function mapEntradaRanking(uid, data) {
  return {
    uid,
    displayName: typeof data?.displayName === 'string' ? data.displayName : 'Leitor',
    handle: typeof data?.handle === 'string' ? data.handle : '',
    photoURL: typeof data?.photoURL === 'string' ? data.photoURL : '',
    capitulosLidos: Math.max(0, Number(data?.capitulosLidos) || 0),
    progressoPct: Math.max(0, Number(data?.progressoPct) || 0),
    diasLeitura: Math.max(0, Number(data?.diasLeitura) || 0),
    diasConsecutivos: Math.max(0, Number(data?.diasConsecutivos) || 0),
    updatedAt: Number(data?.updatedAt) || 0,
  }
}

function ordenarLinhasRanking(rows) {
  return [...rows]
    .filter((r) => r.capitulosLidos > 0)
    .sort((a, b) => {
      if (b.capitulosLidos !== a.capitulosLidos) return b.capitulosLidos - a.capitulosLidos
      if (b.diasConsecutivos !== a.diasConsecutivos) return b.diasConsecutivos - a.diasConsecutivos
      return b.progressoPct - a.progressoPct
    })
}

/**
 * Snapshot a partir dos números já exibidos na tela do plano (fonte mais fiável).
 */
export function montarSnapshotRankingDeProgresso(
  uid,
  { capitulosLidos = 0, totalCapitulos = 1189, progressoPct = null } = {},
  perfil = {},
  authUser = null,
  instanciaIdPreferida = null
) {
  const lidos = Math.max(0, Number(capitulosLidos) || 0)
  if (!uid || lidos < 1) return null

  const instId = resolverInstanciaId(instanciaIdPreferida)
  const metricas = instId ? obterMetricasResumo(instId) : null
  const total = Math.max(1, Number(totalCapitulos) || 1189)
  const pct =
    progressoPct != null && Number.isFinite(Number(progressoPct))
      ? Number(progressoPct)
      : (lidos / total) * 100

  const p = mergePerfilComAuth(perfil, authUser)
  const handle =
    typeof p.handle === 'string' ? p.handle.trim().replace(/^@+/, '').toLowerCase() : ''

  return {
    uid,
    displayName: resolverNomeRanking(p, authUser),
    handle: handle.slice(0, 30),
    photoURL: resolverPhotoURLRanking(p, authUser),
    capitulosLidos: lidos,
    progressoPct: Math.round(Math.max(0, Math.min(100, pct)) * 10) / 10,
    totalCapitulos: total,
    diasLeitura: Math.max(0, Number(metricas?.diasLeitura) || 0),
    diasConsecutivos: Math.max(0, Number(metricas?.diasConsecutivos) || 0),
    updatedAt: Date.now(),
    planoId: PLANO_BIBLIA_COMPLETA_ID,
  }
}

/**
 * Snapshot local (sem gravar na nuvem) — usado para posição fantasma com opt-out.
 */
export function montarSnapshotRankingLocal(uid, perfil = {}, authUser = null, instanciaIdPreferida = null) {
  const instId = resolverInstanciaId(instanciaIdPreferida)
  if (!instId) return null

  const { pct, lidos, total } = obterProgressoInstancia(instId)
  return montarSnapshotRankingDeProgresso(
    uid,
    { capitulosLidos: lidos, totalCapitulos: total, progressoPct: pct },
    perfil,
    authUser,
    instId
  )
}

/**
 * Publica ou remove o registo do utilizador no ranking conforme opt-in e plano ativo.
 */
export async function sincronizarMeuRankingPlano(
  uid,
  { perfil = null, authUser = null, instanciaId = null, progresso = null } = {}
) {
  if (!uid || !isFirebaseConfigured()) return
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return

  const rankingRef = ref(db, `planoLeituraRanking/${uid}`)

  if (!lerOptInRankingPlano()) {
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

  const payload =
    (progresso?.capitulosLidos > 0
      ? montarSnapshotRankingDeProgresso(uid, progresso, p, authUser, instanciaId)
      : null) || montarSnapshotRankingLocal(uid, p, authUser, instanciaId)
  if (!payload || payload.capitulosLidos < 1) {
    await remove(rankingRef).catch(() => {})
    return
  }

  try {
    await set(rankingRef, payload)
  } catch (err) {
    console.warn('[planoLeituraRanking] falha ao publicar:', err?.message || err)
    throw err
  }
}

export async function removerMeuRankingPlano(uid) {
  if (!uid || !isFirebaseConfigured()) return
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return
  await remove(ref(db, `planoLeituraRanking/${uid}`)).catch(() => {})
}

/** Inclui o snapshot local na lista se ainda não chegou do RTDB (evita lista vazia após marcar capítulos). */
export function mesclarRankingComSnapshotLocal(rows, snapshot) {
  if (!snapshot?.uid || snapshot.capitulosLidos < 1) return rows
  if (rows.some((r) => r.uid === snapshot.uid)) return rows
  return ordenarLinhasRanking([...rows, snapshot]).slice(0, 50)
}

export function calcularPosicaoNoRanking(rows, meuUid) {
  if (!meuUid || !Array.isArray(rows)) return null
  const idx = rows.findIndex((r) => r.uid === meuUid)
  return idx >= 0 ? idx + 1 : null
}

/** Onde o utilizador ficaria se participasse (mescla lista pública + snapshot local). */
export function calcularPosicaoFantasma(rows, snapshot) {
  if (!snapshot?.uid || snapshot.capitulosLidos < 1) return null
  const merged = ordenarLinhasRanking([
    ...rows.filter((r) => r.uid !== snapshot.uid),
    { ...snapshot, fantasma: true },
  ])
  const idx = merged.findIndex((r) => r.uid === snapshot.uid)
  return idx >= 0 ? idx + 1 : null
}

export async function carregarRankingPlanoLeitura(limite = 25) {
  if (!isFirebaseConfigured()) return []
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return []

  const snap = await get(ref(db, 'planoLeituraRanking'))
  const v = snap.val()
  if (!v || typeof v !== 'object') return []

  return ordenarLinhasRanking(Object.entries(v).map(([uid, data]) => mapEntradaRanking(uid, data))).slice(
    0,
    Math.max(1, Math.min(100, limite))
  )
}

/** Subscrição em tempo real ao ranking (lista ordenada no cliente). */
export function subscribeRankingPlanoLeitura(callback, limite = 50) {
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
    const r = ref(db, 'planoLeituraRanking')
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
      console.warn('[planoLeituraRanking] leitura:', err?.message || err)
      callback([])
    })
    offFn = () => off(r)
  })

  return () => {
    cancelled = true
    offFn()
  }
}
