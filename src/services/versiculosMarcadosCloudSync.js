import { ref, set, onValue, get } from 'firebase/database'
import { getFirebaseDatabase, isFirebaseConfigured, loadFirebaseModules } from '../config/firebase'
import { VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED } from '../config/featureFlags'
import { getRtdbClientId, snapshotEhEcoDoMesmoCliente } from '../utils/rtdbClientId'
import {
  obterVersiculosMarcados,
  obterMapaExclusoesVersiculosMarcados,
  aplicarEstadoSincronizadoMarcadores,
} from './versiculosMarcadosService'

/** RTDB: `users/{uid}/versiculosMarcados` */
const pathVersiculos = (uid) => `users/${uid}/versiculosMarcados`

function normalizaDeletesParaRtdb(deletes) {
  const out = {}
  for (const [k, v] of Object.entries(deletes || {})) {
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) out[k] = n
  }
  return out
}

function handleVersiculosMarcadosSaveError(err) {
  const code = err?.code || err?.message || ''
  if (String(code).includes('PERMISSION_DENIED') || String(code).includes('permission_denied')) {
    console.warn(
      '[versiculosMarcados] Gravação na nuvem negada (regras Firebase ou sessão). Verifique login e `npm run deploy:rules`.',
      err
    )
    return
  }
  console.warn('[versiculosMarcados] Falha ao gravar na nuvem:', err)
}

let unsubscribe = null
let debounceTimer = null
let activeUid = null
let lastLocalWriteAt = 0
let lastAppliedRemoteAt = 0

function tsMarcacao(marker) {
  const t = new Date(marker?.dataMarcacao || 0).getTime()
  return Number.isFinite(t) ? t : 0
}

function mergeMapasExclusao(localDel, remoteDel) {
  const out = { ...(localDel || {}) }
  for (const [k, tv] of Object.entries(remoteDel || {})) {
    const n = Number(tv) || 0
    if (n <= 0) continue
    out[k] = Math.max(Number(out[k]) || 0, n)
  }
  return out
}

/**
 * Mantém marcador só se a marcação for mais recente que qualquer exclusão conhecida.
 */
function mergeMarcadoresComExclusoes(localM, remoteM, localDel, remoteDel) {
  const deletesMerged = mergeMapasExclusao(localDel, remoteDel)
  const keys = new Set([
    ...Object.keys(localM || {}),
    ...Object.keys(remoteM || {}),
  ])

  const marcadosOut = {}
  for (const k of keys) {
    const tomb = Number(deletesMerged[k]) || 0
    const lv = localM?.[k]
    const rv = remoteM?.[k]
    let chosen = null
    if (lv && rv) {
      chosen = tsMarcacao(lv) >= tsMarcacao(rv) ? lv : rv
    } else {
      chosen = lv || rv
    }
    if (!chosen) continue
    if (tsMarcacao(chosen) <= tomb) continue
    marcadosOut[k] = chosen
  }

  const deletesOut = { ...deletesMerged }
  for (const [k, m] of Object.entries(marcadosOut)) {
    if (tsMarcacao(m) > (Number(deletesOut[k]) || 0)) {
      delete deletesOut[k]
    }
  }

  return { marcados: marcadosOut, deletes: deletesOut }
}

function snapshotPacoteIgual(m1, d1, m2, d2) {
  return (
    JSON.stringify(m1 || {}) === JSON.stringify(m2 || {}) &&
    JSON.stringify(d1 || {}) === JSON.stringify(d2 || {})
  )
}

export function pruneDeletesContraMarcados(marcados, deletes) {
  const out = { ...(deletes || {}) }
  for (const [k, m] of Object.entries(marcados || {})) {
    if (tsMarcacao(m) > (Number(out[k]) || 0)) {
      delete out[k]
    }
  }
  return out
}

/**
 * @returns {Promise<number>} `updatedAt` gravado
 */
export function saveVersiculosMarcados(uid, marcadosArg, deletesArg) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return Promise.resolve(0)
  const marcados = marcadosArg ?? obterVersiculosMarcados()
  let deletes = deletesArg ?? obterMapaExclusoesVersiculosMarcados()
  deletes = normalizaDeletesParaRtdb(pruneDeletesContraMarcados(marcados, deletes))
  const updatedAt = Date.now()
  lastLocalWriteAt = updatedAt
  const r = ref(db, pathVersiculos(uid))
  return set(r, {
    marcados: marcados || {},
    deletes,
    updatedAt,
    clientId: getRtdbClientId()
  })
    .then(() => updatedAt)
    .catch((err) => {
      handleVersiculosMarcadosSaveError(err)
      return 0
    })
}

function flushVersiculosMarcadosNow() {
  const uid = activeUid
  if (!uid) return
  const marcados = obterVersiculosMarcados()
  const deletes = obterMapaExclusoesVersiculosMarcados()
  saveVersiculosMarcados(uid, marcados, deletes).then((at) => {
    if (at) lastLocalWriteAt = at
  })
}

export function scheduleVersiculosMarcadosCloudFlush(options = {}) {
  if (!VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED) return
  if (!activeUid || !isFirebaseConfigured()) return
  const immediate = Boolean(options.immediate)
  if (immediate) {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer)
      debounceTimer = null
    }
    flushVersiculosMarcadosNow()
    return
  }
  if (debounceTimer) window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null
    flushVersiculosMarcadosNow()
  }, 650)
}

export function stopVersiculosMarcadosCloudSync() {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  if (debounceTimer) {
    window.clearTimeout(debounceTimer)
    debounceTimer = null
  }
  activeUid = null
  lastLocalWriteAt = 0
  lastAppliedRemoteAt = 0
}

/**
 * Núcleo compartilhado entre `onValue` e `sincronizarVersiculosMarcadosAposAlteracaoDestrutiva`.
 *
 * @param {string} uid
 * @param {object|null} val — valor em `users/{uid}/versiculosMarcados`
 * @param {{ ignorarEco?: boolean }} opts — quando `true`, aplica merge mesmo se o
 *   snapshot for da mesma máquina (útil após `get()` logo após um `set` local).
 */
function processarSnapshotVersiculosMarcados(uid, val, opts = {}) {
  const ignorarEco = Boolean(opts.ignorarEco)

  if (val && !ignorarEco && snapshotEhEcoDoMesmoCliente(val.clientId)) return

  if (val == null) {
    const local = obterVersiculosMarcados()
    const localDel = obterMapaExclusoesVersiculosMarcados()
    if (Object.keys(local).length > 0 || Object.keys(localDel).length > 0) {
      saveVersiculosMarcados(uid, local, localDel).then((at) => {
        if (at) lastLocalWriteAt = at
      })
    }
    return
  }

  const u = typeof val.updatedAt === 'number' ? val.updatedAt : 0
  if (!ignorarEco) {
    if (u === lastLocalWriteAt) return
    if (u <= lastAppliedRemoteAt) return
  }

  const remoteMarcados =
    val.marcados && typeof val.marcados === 'object' ? val.marcados : {}
  const remoteDeletes =
    val.deletes && typeof val.deletes === 'object' ? val.deletes : {}

  const local = obterVersiculosMarcados()
  const localDel = obterMapaExclusoesVersiculosMarcados()
  const merged = mergeMarcadoresComExclusoes(
    local,
    remoteMarcados,
    localDel,
    remoteDeletes
  )

  if (!snapshotPacoteIgual(local, localDel, merged.marcados, merged.deletes)) {
    aplicarEstadoSincronizadoMarcadores(merged.marcados, merged.deletes)
  }

  lastAppliedRemoteAt = u

  if (
    !snapshotPacoteIgual(
      remoteMarcados,
      remoteDeletes,
      merged.marcados,
      merged.deletes
    )
  ) {
    saveVersiculosMarcados(uid, merged.marcados, merged.deletes).then((at) => {
      if (at) lastLocalWriteAt = at
    })
  }
}

/**
 * Após limpar marcadores (ou outra alteração destrutiva): envia o estado local
 * imediatamente e lê de volta o nó no RTDB para reconciliar com o servidor —
 * equivalente a um "recarregar da nuvem" automático, sem botão extra.
 */
export async function sincronizarVersiculosMarcadosAposAlteracaoDestrutiva(uid) {
  if (!VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED) return
  const u = String(uid || '').trim()
  if (!u || !isFirebaseConfigured()) return

  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return

  const marcados = obterVersiculosMarcados()
  const deletes = obterMapaExclusoesVersiculosMarcados()
  const at = await saveVersiculosMarcados(u, marcados, deletes)
  if (!at) return

  try {
    const snap = await get(ref(db, pathVersiculos(u)))
    if (!snap.exists()) return
    processarSnapshotVersiculosMarcados(u, snap.val(), { ignorarEco: true })
  } catch (err) {
    console.warn('[versiculosMarcados] Reconciliação pós-gravação:', err)
  }
}

/**
 * Variante "sem `uid` explícito": usa o `activeUid` interno (definido por
 * `startVersiculosMarcadosCloudSync`). Útil para o `versiculosMarcadosService`
 * disparar a reconciliação a partir de qualquer fluxo destrutivo (popup de
 * marcar/desmarcar na Bíblia, página de marcadores, lote etc.) sem precisar
 * propagar o `user.uid` pelos chamadores.
 *
 * No-op silencioso se: feature flag desligada, Firebase não configurado, ou
 * ainda não houve `start...CloudSync(uid)` neste cliente.
 */
export function reconciliarVersiculosMarcadosComServidor() {
  if (!VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED) return Promise.resolve()
  if (!activeUid) return Promise.resolve()
  return sincronizarVersiculosMarcadosAposAlteracaoDestrutiva(activeUid)
}

/** Subscreve RTDB; merge considera exclusões (tombstones) para não reaplicar versículos apagados. */
export function startVersiculosMarcadosCloudSync(uid) {
  stopVersiculosMarcadosCloudSync()
  if (!VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED) return
  if (!uid || !isFirebaseConfigured()) return

  const db = getFirebaseDatabase()
  if (!db) return

  activeUid = uid
  const r = ref(db, pathVersiculos(uid))

  unsubscribe = onValue(r, (snap) => {
    const val = snap.exists() ? snap.val() : null
    processarSnapshotVersiculosMarcados(uid, val, { ignorarEco: false })
  })
}
