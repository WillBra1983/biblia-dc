import { onValue, ref, set, get } from 'firebase/database'
import { getFirebaseDatabase, isFirebaseConfigured, loadFirebaseModules } from '../config/firebase'
import { getRtdbClientId, snapshotEhEcoDoMesmoCliente } from '../utils/rtdbClientId'
import {
  aplicarEstadoPlanoLeituraDaNuvem,
  exportarEstadoPlanoLeituraParaNuvem,
  migrarLegadoSeNecessario,
} from '../utils/planoLeituraUsuario'
import { sincronizarMeuRankingPlano, lerOptInRankingPlano } from './planoLeituraRankingService'

const pathPlanoLeitura = (uid) => `users/${uid}/planoLeitura`

let unsubscribe = null
let debounceTimer = null
let activeUid = null
let lastLocalWriteAt = 0
let lastAppliedRemoteAt = 0
let removePlanoListener = null

function snapshotPlanoIgual(a, b) {
  return JSON.stringify(a || {}) === JSON.stringify(b || {})
}

function registrarListenerPlanoAtualizado() {
  if (typeof window === 'undefined') return () => {}
  const handler = () => schedulePlanoLeituraCloudFlush()
  window.addEventListener('salvation-plano-leitura-atualizado', handler)
  return () => window.removeEventListener('salvation-plano-leitura-atualizado', handler)
}

function payloadPlanoAtual() {
  return {
    estado: exportarEstadoPlanoLeituraParaNuvem(),
  }
}

function estadoTemDados(estado) {
  return Boolean(estado && Array.isArray(estado.instancias) && estado.instancias.length > 0)
}

function aposGravarPlano(uid) {
  if (!uid || !lerOptInRankingPlano()) return
  void sincronizarMeuRankingPlano(uid).catch((err) => {
    console.warn('[PlanoCloudSync] ranking:', err?.message || err)
  })
}

export function savePlanoLeitura(uid, payload) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return Promise.resolve(0)
  const updatedAt = Date.now()
  lastLocalWriteAt = updatedAt
  const r = ref(db, pathPlanoLeitura(uid))
  return set(r, {
    ...(payload || payloadPlanoAtual()),
    updatedAt,
    clientId: getRtdbClientId()
  })
    .then(() => {
      aposGravarPlano(uid)
      return updatedAt
    })
}

export function schedulePlanoLeituraCloudFlush(options = {}) {
  if (!activeUid || !isFirebaseConfigured()) return
  if (options.immediate) {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer)
      debounceTimer = null
    }
    const uid = activeUid
    if (!uid) return
    savePlanoLeitura(uid, payloadPlanoAtual())
      .then((at) => {
        if (at) lastLocalWriteAt = at
      })
      .catch((err) => {
        console.error('[PlanoCloudSync] Falha ao gravar planoLeitura (imediato):', err)
      })
    return
  }
  if (debounceTimer) window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null
    const uid = activeUid
    if (!uid) return
    savePlanoLeitura(uid, payloadPlanoAtual())
      .then((at) => {
        if (at) lastLocalWriteAt = at
      })
      .catch((err) => {
        console.error('[PlanoCloudSync] Falha ao gravar planoLeitura:', err)
      })
  }, 650)
}

/**
 * Grava o plano atual na nuvem sem debounce (útil após limpar progresso ou
 * remover instância).
 */
export async function flushPlanoLeituraImmediate(uid) {
  const id = String(uid || activeUid || '').trim()
  if (!id || !isFirebaseConfigured()) return 0
  if (debounceTimer) {
    window.clearTimeout(debounceTimer)
    debounceTimer = null
  }
  try {
    const at = await savePlanoLeitura(id, payloadPlanoAtual())
    return at || 0
  } catch (err) {
    console.error('[PlanoCloudSync] Falha ao gravar planoLeitura (flush imediato):', err)
    return 0
  }
}

/**
 * Após alteração destrutiva local: envia estado imediatamente e lê o nó com
 * `get()` para alinhar `lastAppliedRemoteAt` e o estado com o servidor —
 * substitui um botão manual "recarregar da nuvem".
 */
export async function sincronizarPlanoLeituraAposAlteracaoDestrutiva(uid) {
  const id = String(uid || activeUid || '').trim()
  if (!id || !isFirebaseConfigured()) return

  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return

  const at = await flushPlanoLeituraImmediate(id)
  if (!at) return

  try {
    const snap = await get(ref(db, pathPlanoLeitura(id)))
    if (!snap.exists()) return
    const val = snap.val()
    const u = typeof val.updatedAt === 'number' ? val.updatedAt : 0
    const remoteEstado = val.estado && typeof val.estado === 'object' ? val.estado : {}
    const localEstado = exportarEstadoPlanoLeituraParaNuvem()
    if (!snapshotPlanoIgual(localEstado, remoteEstado)) {
      aplicarEstadoPlanoLeituraDaNuvem(remoteEstado)
      try {
        window.dispatchEvent(new CustomEvent('salvation-plano-leitura-atualizado'))
      } catch {
        /* ignore */
      }
    }
    lastAppliedRemoteAt = u
  } catch (err) {
    console.warn('[PlanoCloudSync] Reconciliação pós-gravação:', err)
  }
}

export function stopPlanoLeituraCloudSync() {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  if (debounceTimer) {
    window.clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (removePlanoListener) {
    removePlanoListener()
    removePlanoListener = null
  }
  activeUid = null
  lastLocalWriteAt = 0
  lastAppliedRemoteAt = 0
}

export function startPlanoLeituraCloudSync(uid) {
  stopPlanoLeituraCloudSync()
  if (!uid || !isFirebaseConfigured()) return
  // Garante que planos legados no localStorage sejam convertidos antes do primeiro sync.
  migrarLegadoSeNecessario()
  const db = getFirebaseDatabase()
  if (!db) return

  activeUid = uid
  removePlanoListener = registrarListenerPlanoAtualizado()
  const r = ref(db, pathPlanoLeitura(uid))

  unsubscribe = onValue(r, (snap) => {
    const val = snap.exists() ? snap.val() : null

    // Descarta eco da própria escrita deste cliente.
    if (val && snapshotEhEcoDoMesmoCliente(val.clientId)) return

    if (val == null) {
      const localEstado = exportarEstadoPlanoLeituraParaNuvem()
      // Evita sobrescrever nuvem com estado vazio no primeiro bootstrap de um navegador novo.
      if (estadoTemDados(localEstado)) {
        savePlanoLeitura(uid, { estado: localEstado })
          .then((at) => {
            if (at) lastLocalWriteAt = at
          })
          .catch((err) => {
            console.error('[PlanoCloudSync] Falha ao criar planoLeitura inicial:', err)
          })
      }
      return
    }

    const u = typeof val.updatedAt === 'number' ? val.updatedAt : 0
    if (u === lastLocalWriteAt) return
    if (u <= lastAppliedRemoteAt) return

    const remoteEstado = val.estado && typeof val.estado === 'object' ? val.estado : {}
    const localEstado = exportarEstadoPlanoLeituraParaNuvem()
    if (!snapshotPlanoIgual(localEstado, remoteEstado)) {
      aplicarEstadoPlanoLeituraDaNuvem(remoteEstado)
    }
    lastAppliedRemoteAt = u
  })
}
