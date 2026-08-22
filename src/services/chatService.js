import {
  ref,
  push,
  set,
  onValue,
  off,
  serverTimestamp,
  get,
  remove,
  runTransaction,
  update,
  goOnline,
  query,
  orderByKey,
  startAt,
  endAt,
  limitToFirst
} from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { getFirebaseDatabase, getFirebaseStorage } from '../config/firebase'
import { getRtdbClientId, snapshotEhEcoDoMesmoCliente } from '../utils/rtdbClientId'

/** Apelido público: min 3, max 30, só a-z 0-9 e _ */
export function normalizePublicHandle(raw) {
  const s = String(raw ?? '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
  const cleaned = s.replace(/[^a-z0-9_]/g, '')
  return cleaned
}

export function isValidPublicHandle(h) {
  return typeof h === 'string' && h.length >= 3 && h.length <= 30
}

/** E-mail normalizado para busca e índice (minúsculas, sem espaços). */
export function normalizeEmailForSearch(raw) {
  return String(raw ?? '').trim().toLowerCase()
}

/**
 * Chave RTDB para e-mail: pontos viram vírgula (`.` não é permitido em chaves).
 * Ex.: `maria.silva@gmail.com` → `maria,silva@gmail,com`
 */
export function encodeEmailRtdbKey(email) {
  const e = normalizeEmailForSearch(email)
  if (!e) return ''
  return e.replace(/\./g, ',')
}

/** Mesma ideia do filtro da caixa de entrada do chat (sem acentos, minúsculas). */
export function normalizePeopleSearchTerm(raw) {
  return String(raw ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const PUBLIC_PROFILE_FIELDS = [
  'displayName',
  'handle',
  'photoURL',
  'city',
  'professionOrStudy',
  'church'
]

function publicProfilePayload(profile = {}) {
  const payload = {}
  for (const field of PUBLIC_PROFILE_FIELDS) {
    if (typeof profile[field] === 'string') payload[field] = profile[field]
  }
  return payload
}

async function syncPublicProfile(uid, profile) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return
  await set(ref(db, `publicProfiles/${uid}`), publicProfilePayload(profile))
}

export async function fetchPublicProfile(uid) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return null
  const publicSnap = await get(ref(db, `publicProfiles/${uid}`))
  if (publicSnap.exists()) return publicSnap.val() || null

  const values = await Promise.all(
    PUBLIC_PROFILE_FIELDS.map(async (field) => {
      const snap = await get(ref(db, `users/${uid}/profile/${field}`))
      return [field, snap.val()]
    })
  )
  const profile = Object.fromEntries(values.filter(([, value]) => typeof value === 'string'))
  return Object.keys(profile).length ? profile : null
}

function looksLikeEmailQuery(term) {
  const t = normalizeEmailForSearch(term)
  return t.includes('@') || (t.length >= 3 && /^[a-z0-9._%+-]+@?[a-z0-9.-]*$/.test(t))
}

function looksLikeFirebaseUidToken(t) {
  if (t.length < 20 || t.length > 128) return false
  if (!/^[A-Za-z0-9]+$/.test(t)) return false
  // UIDs costumam ter maiúsculas e ~28 caracteres; evita confundir com @apelido em minúsculas
  return /[A-Z]/.test(t) || t.length >= 28
}

export async function resolvePeerToUid(raw) {
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase Database indisponível')
  const s = String(raw ?? '').trim()
  if (!s) return null

  if (looksLikeFirebaseUidToken(s)) {
    return s
  }

  const asHandle = normalizePublicHandle(s.replace(/^@/, ''))
  if (isValidPublicHandle(asHandle)) {
    const snap = await get(ref(db, `publicHandles/${asHandle}`))
    const uid = snap.val()
    if (typeof uid === 'string' && uid.length > 0) return uid
  }

  const asEmail = normalizeEmailForSearch(s)
  if (asEmail.includes('@')) {
    const uid = await lookupUidByEmail(asEmail)
    if (uid) return uid
  }

  if (/^[A-Za-z0-9_-]{20,128}$/.test(s)) {
    return s
  }

  return null
}

/** Resolve e-mail completo → UID (índice RTDB; fallback opcional via Cloud Function). */
export async function lookupUidByEmail(emailRaw, { allowCloudFallback = true } = {}) {
  const db = getFirebaseDatabase()
  const email = normalizeEmailForSearch(emailRaw)
  if (!db || !email.includes('@')) return null

  const key = encodeEmailRtdbKey(email)
  if (key) {
    try {
      const snap = await get(ref(db, `profileEmails/${key}`))
      const uid = snap.val()
      if (typeof uid === 'string' && uid.length > 0) return uid
    } catch {
      // O índice completo é privado; a Cloud Function resolve e-mails exatos.
    }
  }

  if (!allowCloudFallback) return null

  try {
    const { loadFirebaseModules } = await import('../config/firebase')
    await loadFirebaseModules()
    const { getFirebaseFunctions } = await import('../config/firebaseRuntime')
    const { httpsCallable } = await import('firebase/functions')
    const fns = getFirebaseFunctions()
    if (!fns) return null
    const fn = httpsCallable(fns, 'resolverEmailParaUid')
    const res = await fn({ email })
    const uid = res.data?.uid
    if (typeof uid === 'string' && uid.length > 0) {
      invalidateUserSearchCache()
      return uid
    }
    return null
  } catch {
    return null
  }
}

/** Mantém `profileEmails/{chave}` → uid alinhado ao perfil público. */
export async function syncProfileEmailIndex(uid, email, previousEmail) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return

  const next = normalizeEmailForSearch(email)
  const prev = previousEmail ? normalizeEmailForSearch(previousEmail) : ''

  if (prev && prev !== next && prev.includes('@')) {
    const prevKey = encodeEmailRtdbKey(prev)
    if (prevKey) {
      const prevRef = ref(db, `profileEmails/${prevKey}`)
      const snap = await get(prevRef)
      if (snap.val() === uid) {
        await remove(prevRef)
      }
    }
  }

  if (!next.includes('@')) return

  const key = encodeEmailRtdbKey(next)
  if (!key) return

  const { committed } = await runTransaction(ref(db, `profileEmails/${key}`), (current) => {
    if (current != null && current !== uid) return undefined
    return uid
  })

  if (!committed) {
    throw new Error('Este e-mail já está associado a outra conta.')
  }
}

/**
 * Índice leve para busca de pessoas (e-mail, nome, @apelido) com trecho ≥ 2 caracteres.
 */
export async function syncUserSearchFromProfile(uid, profile) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return

  let p = profile
  if (!p) {
    const snap = await get(ref(db, `users/${uid}/profile`))
    p = snap.val() || {}
  }

  const email = normalizeEmailForSearch(p.email)
  const displayName = normalizePeopleSearchTerm(p.displayName)
  const handle = normalizePublicHandle(p.handle || '')

  const payload = {}
  if (email) payload.email = email.slice(0, 320)
  if (displayName) payload.displayName = displayName.slice(0, 200)
  if (handle) payload.handle = handle

  const publicPayload = {}
  if (displayName) publicPayload.displayName = displayName.slice(0, 200)
  if (handle) publicPayload.handle = handle

  if (!payload.email && !payload.displayName && !payload.handle) {
    try {
      await Promise.all([
        remove(ref(db, `userSearch/${uid}`)),
        remove(ref(db, `publicDirectory/${uid}`))
      ])
    } catch {
      /* ignore */
    }
    return
  }

  await Promise.all([
    set(ref(db, `userSearch/${uid}`), payload),
    Object.keys(publicPayload).length
      ? set(ref(db, `publicDirectory/${uid}`), publicPayload)
      : remove(ref(db, `publicDirectory/${uid}`))
  ])
}

/**
 * Lista @apelidos públicos cujo nome começa por `prefix` (mín. 2 caracteres normalizados).
 * Usa `publicHandles` com query por chave — só encontra quem já reservou apelido.
 */
export async function searchHandlesByPrefix(rawPrefix, limit = 30) {
  const db = getFirebaseDatabase()
  if (!db) return []
  const prefix = normalizePublicHandle(String(rawPrefix ?? '').replace(/^@/, ''))
  if (prefix.length < 2) return []
  const qref = query(
    ref(db, 'publicHandles'),
    orderByKey(),
    startAt(prefix),
    endAt(`${prefix}\uf8ff`),
    limitToFirst(Math.min(50, limit))
  )
  const snap = await get(qref)
  const v = snap.val()
  if (!v || typeof v !== 'object') return []
  return Object.entries(v).map(([handle, uid]) => ({
    handle,
    uid: typeof uid === 'string' ? uid : String(uid ?? '')
  }))
}

let publicHandlesCache = { ts: 0, rows: [] }

/**
 * Busca @apelidos por trecho (contains), não apenas prefixo.
 * Ex.: "wilson" encontra "prwilsonlucas".
 */
export async function searchHandlesByTerm(rawTerm, limit = 30) {
  const db = getFirebaseDatabase()
  if (!db) return []
  const term = normalizePublicHandle(String(rawTerm ?? '').replace(/^@+/, ''))
  if (term.length < 2) return []

  const now = Date.now()
  const ttlMs = 2 * 60 * 1000
  let rows = publicHandlesCache.rows

  if (!rows.length || now - publicHandlesCache.ts > ttlMs) {
    try {
      const snap = await get(ref(db, 'publicHandles'))
      const v = snap.val()
      rows = !v || typeof v !== 'object'
        ? []
        : Object.entries(v).map(([handle, uid]) => ({
            handle: String(handle || ''),
            uid: typeof uid === 'string' ? uid : String(uid ?? '')
          }))
      publicHandlesCache = { ts: now, rows }
    } catch {
      rows = []
    }
  }

  return rows
    .filter((r) => r.uid && r.handle.includes(term))
    .sort((a, b) => {
      const ia = a.handle.indexOf(term)
      const ib = b.handle.indexOf(term)
      if (ia !== ib) return ia - ib
      if (a.handle.length !== b.handle.length) return a.handle.length - b.handle.length
      return a.handle.localeCompare(b.handle, 'pt-BR')
    })
    .slice(0, Math.max(1, Math.min(200, Number(limit) || 30)))
}

/**
 * Busca e-mails no índice `profileEmails` por prefixo (útil ao digitar `joao@hot…`).
 */
/**
 * Busca e-mails por trecho (contains) — ex.: "hotmail" ou parte do nome antes do @.
 */
let userSearchCache = { ts: 0, rows: [] }

function directoryRowMatchesTerm(row, termNorm) {
  if (!termNorm || !row?.uid) return false
  const hay = normalizePeopleSearchTerm(
    [row.displayName, row.handle].filter(Boolean).join(' ')
  )
  return hay.includes(termNorm)
}

/**
 * Busca em `userSearch` por trecho no e-mail, nome ou @apelido (mín. 2 caracteres).
 */
export async function searchUserDirectoryByTerm(rawTerm, limit = 30) {
  const db = getFirebaseDatabase()
  if (!db) return []
  const termNorm = normalizePeopleSearchTerm(String(rawTerm ?? '').replace(/^@+/, ''))
  if (termNorm.length < 2) return []

  const now = Date.now()
  const ttlMs = 2 * 60 * 1000
  let rows = userSearchCache.rows

  if (!rows.length || now - userSearchCache.ts > ttlMs) {
    const snap = await get(ref(db, 'publicDirectory'))
    const v = snap.val()
    rows =
      !v || typeof v !== 'object'
        ? []
        : Object.entries(v).map(([uid, data]) => ({
            uid,
            displayName:
              typeof data?.displayName === 'string' ? normalizePeopleSearchTerm(data.displayName) : '',
            handle: typeof data?.handle === 'string' ? data.handle : '',
          }))
    userSearchCache = { ts: now, rows }
  }

  return rows
    .filter((r) => directoryRowMatchesTerm(r, termNorm))
    .sort((a, b) => {
      const score = (row) => {
        const fields = [row.displayName, row.handle]
        let best = 999
        for (const f of fields) {
          if (!f) continue
          const i = f.indexOf(termNorm)
          if (i >= 0 && i < best) best = i
        }
        return best
      }
      const sa = score(a)
      const sb = score(b)
      if (sa !== sb) return sa - sb
      return (a.displayName || a.handle || '').localeCompare(
        b.displayName || b.handle || '',
        'pt-BR'
      )
    })
    .slice(0, Math.max(1, Math.min(200, Number(limit) || 30)))
}

/** Invalida cache da lista `userSearch` (ex.: após sincronizar o próprio perfil). */
export function invalidateUserSearchCache() {
  userSearchCache = { ts: 0, rows: [] }
}

async function buscaParcialSegura(fn, rotulo) {
  try {
    return await fn()
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn(`[chat] busca parcial falhou (${rotulo})`, e)
    }
    return []
  }
}

/**
 * Combina @apelidos e e-mails para a pesquisa de pessoas no chat.
 */
export async function searchPeopleByTerm(rawTerm, limit = 30) {
  const term = String(rawTerm ?? '').trim()
  const norm = normalizeEmailForSearch(term.replace(/^@+/, ''))
  const termNorm = normalizePeopleSearchTerm(term.replace(/^@+/, ''))
  if (termNorm.length < 2) {
    const e = new Error('SHORT')
    e.code = 'SHORT'
    throw e
  }

  const cap = Math.max(1, Math.min(200, Number(limit) || 30))

  const [handleRows, handlePrefixRows, directoryRows] =
    await Promise.all([
      buscaParcialSegura(() => searchHandlesByTerm(term, cap), 'apelidos'),
      buscaParcialSegura(() => searchHandlesByPrefix(term, cap), 'apelidos-prefixo'),
      buscaParcialSegura(() => searchUserDirectoryByTerm(term, cap), 'diretorio-publico'),
    ])

  const byUid = new Map()

  const addPerson = ({ uid, email = '', handle = '', displayName = '' }) => {
    if (!uid) return
    const prev = byUid.get(uid)
    if (prev) {
      if (!prev.handle && handle) prev.handle = handle
      if (!prev.email && email) prev.email = email
      if (!prev.displayName && displayName) prev.displayName = displayName
      return
    }
    byUid.set(uid, {
      uid,
      handle: handle || '',
      email: email || '',
      displayName: displayName || '',
    })
  }

  const addHandle = ({ handle, uid }) => addPerson({ uid, handle })
  const addEmail = ({ uid, email, handle = '' }) => addPerson({ uid, email, handle })

  for (const row of handleRows) addHandle(row)
  for (const row of handlePrefixRows) addHandle(row)
  for (const row of directoryRows) {
    addPerson({
      uid: row.uid,
      email: row.email,
      handle: row.handle,
      displayName: row.displayName,
    })
  }

  if (norm.includes('@') && norm.length >= 5) {
    const exactUid = await lookupUidByEmail(norm)
    if (exactUid) {
      addEmail({ uid: exactUid, email: norm })
    }
  }

  return [...byUid.values()].slice(0, cap)
}

/** Verifica se uma pessoa enriquecida corresponde ao termo (nome, e-mail ou apelido). */
export function pessoaCorrespondeAoTermo(row, rawTerm) {
  const raw = String(rawTerm ?? '').trim()
  const termNorm = normalizePeopleSearchTerm(raw.replace(/^@+/, ''))
  const termHandle = normalizePublicHandle(raw)
  const termEmail = normalizeEmailForSearch(raw)
  if ((termNorm.length < 2 && termHandle.length < 2) || !row?.uid) return false

  const handleNorm = normalizePublicHandle(row.handle || '')
  const emailNorm = normalizeEmailForSearch(row.email || '')
  const nameNorm = normalizePeopleSearchTerm(row.displayName || '')

  if (termHandle.length >= 2 && handleNorm.includes(termHandle)) return true
  if (termEmail.length >= 2 && emailNorm.includes(termEmail)) return true
  if (termNorm.length >= 2 && nameNorm.includes(termNorm)) return true

  const hay = normalizePeopleSearchTerm(
    [row.handle, row.displayName, row.email].filter(Boolean).join(' ')
  )
  return termNorm.length >= 2 && hay.includes(termNorm)
}

export async function claimPublicHandle(myUid, newHandleRaw, previousHandleRaw) {
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase Database indisponível')
  const h = normalizePublicHandle(newHandleRaw)
  if (!isValidPublicHandle(h)) {
    throw new Error('Apelido: use de 3 a 30 caracteres (letras minúsculas, números ou _).')
  }

  const prev = previousHandleRaw ? normalizePublicHandle(previousHandleRaw) : ''
  if (prev === h) return h

  const handleRef = ref(db, `publicHandles/${h}`)
  const { committed } = await runTransaction(handleRef, (current) => {
    if (current != null && current !== myUid) return undefined
    return myUid
  })

  if (!committed) {
    throw new Error('Este @apelido já está em uso. Escolha outro.')
  }

  if (prev && prev !== h) {
    const oldRef = ref(db, `publicHandles/${prev}`)
    const oldSnap = await get(oldRef)
    if (oldSnap.val() === myUid) {
      await remove(oldRef)
    }
  }

  return h
}

export function subscribeUserProfile(uid, callback) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return () => {}
  const r = ref(db, `users/${uid}/profile`)
  onValue(r, (snap) => {
    callback(snap.val() || {})
  })
  return () => off(r)
}

export async function fetchUserProfile(uid) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return null
  try {
    const snap = await get(ref(db, `users/${uid}/profile`))
    return snap.val() || null
  } catch {
    return fetchPublicProfile(uid)
  }
}

/** Atualizações em tempo real do perfil público de outro usuário (foto, e-mail, etc.). */
export function subscribePeerPublicProfile(uid, callback) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return () => {}
  const r = ref(db, `publicProfiles/${uid}`)
  return onValue(
    r,
    (snap) => {
      const v = snap.val() || {}
      if (snap.exists()) {
        callback(v)
        return
      }
      fetchPublicProfile(uid).then((profile) => callback(profile || {})).catch(() => callback({}))
    },
    () => {
      callback({})
    }
  )
}

export function dmChatId(uidA, uidB) {
  return [uidA, uidB].sort().join('_')
}

function parseUnreadNumber(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(999, Math.floor(n)))
}

/**
 * Lista de conversas: preview em `users/.../chatList`; contador em `chats/{chatId}/unread/{uid}`
 * (o mesmo `update` do envio grava os dois — aqui lemos o nó `chats/.../unread` para o badge não depender só do objeto da lista).
 */
export function subscribeUserChatList(uid, callback) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return () => {}

  const listRows = new Map()
  const unreadByChat = new Map()
  const unreadUnsubs = new Map()
  let lastEmitHash = ''

  // Hash leve evita `JSON.stringify` em contas com muitos chats — só os campos
  // que importam para o consumidor (badge + ordenação + preview).
  const hashRow = (r) =>
    `${r.chatId}|${r.lastTs || 0}|${r.unreadCount}|${r.preview || ''}|${r.peerName || ''}|${r.peerEmail || ''}|${r.peerUid || ''}`

  const emit = () => {
    const rows = []
    for (const [chatId, row] of listRows.entries()) {
      const fromPath = unreadByChat.has(chatId) ? unreadByChat.get(chatId) : 0
      const fromList = row.listUnreadFallback ?? 0
      rows.push({
        chatId,
        peerUid: row.peerUid,
        lastTs: row.lastTs,
        preview: row.preview,
        unreadCount: Math.max(fromPath, fromList),
        peerName: row.peerName,
        peerEmail: row.peerEmail
      })
    }
    rows.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0))
    let h = `${rows.length}`
    for (const r of rows) h += `\n${hashRow(r)}`
    if (h === lastEmitHash) return
    lastEmitHash = h
    callback(rows)
  }

  const detachUnread = (chatId) => {
    const u = unreadUnsubs.get(chatId)
    if (u) {
      u()
      unreadUnsubs.delete(chatId)
    }
    unreadByChat.delete(chatId)
  }

  const attachUnread = (chatId) => {
    if (unreadUnsubs.has(chatId)) return
    const ur = ref(db, `chats/${chatId}/unread/${uid}`)
    get(ur)
      .then((snap) => {
        unreadByChat.set(chatId, parseUnreadNumber(snap.val()))
        emit()
      })
      .catch(() => {})
    const unsub = onValue(
      ur,
      (snap) => {
        unreadByChat.set(chatId, parseUnreadNumber(snap.val()))
        emit()
      },
      (err) => {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[RTDB unread]', chatId, err?.message || err)
        }
        unreadByChat.set(chatId, 0)
        emit()
      }
    )
    unreadUnsubs.set(chatId, unsub)
  }

  const listRef = ref(db, `users/${uid}/chatList`)
  const unsubList = onValue(
    listRef,
    (snap) => {
      const v = snap.val()
      listRows.clear()
      if (!v) {
        for (const cid of [...unreadUnsubs.keys()]) detachUnread(cid)
        lastEmitHash = ''
        callback([])
        return
      }

      const nextIds = new Set(Object.keys(v))
      for (const cid of unreadUnsubs.keys()) {
        if (!nextIds.has(cid)) detachUnread(cid)
      }

      for (const [chatId, data] of Object.entries(v)) {
        listRows.set(chatId, {
          peerUid: data?.peerUid ?? '',
          lastTs: data?.lastTs ?? 0,
          preview: data?.preview ?? '',
          listUnreadFallback: parseUnreadNumber(data?.unreadCount),
          peerName: typeof data?.peerName === 'string' ? data.peerName : undefined,
          peerEmail: typeof data?.peerEmail === 'string' ? data.peerEmail : undefined
        })
        attachUnread(chatId)
      }
      emit()
    },
    (err) => {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[RTDB chatList]', err?.message || err)
      }
      callback([])
    }
  )

  return () => {
    unsubList()
    for (const cid of [...unreadUnsubs.keys()]) detachUnread(cid)
  }
}

/** Marca como lidas: lista + nó `chats/.../unread` (mantidos alinhados). */
export async function markChatAsRead(myUid, chatId) {
  const db = getFirebaseDatabase()
  if (!db || !myUid || !chatId) return
  const rowSnap = await get(ref(db, `users/${myUid}/chatList/${chatId}`))
  const row = rowSnap.val() || {}
  const listPayload = {
    peerUid: row.peerUid ?? '',
    lastTs: typeof row.lastTs === 'number' ? row.lastTs : Date.now(),
    preview: typeof row.preview === 'string' ? row.preview : '',
    unreadCount: 0
  }
  if (typeof row.peerName === 'string' && row.peerName) listPayload.peerName = row.peerName
  if (typeof row.peerEmail === 'string' && row.peerEmail) listPayload.peerEmail = row.peerEmail
  await update(ref(db), {
    [`chats/${chatId}/unread/${myUid}`]: 0,
    [`users/${myUid}/chatList/${chatId}`]: listPayload
  })
}

/**
 * Oculta a conversa só para si: tira da lista e marca `hiddenChats` para não voltar ao reabrir sem mensagem nova.
 * O histórico em `chats/...` mantém-se; a outra pessoa não é afetada.
 */
export async function hideChatOnlyForMe(myUid, chatId) {
  const db = getFirebaseDatabase()
  if (!db || !myUid || !chatId) throw new Error('Firebase Database indisponível')
  await update(ref(db), {
    [`users/${myUid}/chatList/${chatId}`]: null,
    [`users/${myUid}/hiddenChats/${chatId}`]: true,
    [`chats/${chatId}/unread/${myUid}`]: 0
  })
}

/**
 * Apaga o DM para os dois: remove `chats/{chatId}` e as entradas nas listas (e flags hidden).
 */
export async function deleteChatForBoth(myUid, peerUid, chatId) {
  if (dmChatId(myUid, peerUid) !== chatId) {
    throw new Error('ID de conversa inválido para este contacto.')
  }
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase Database indisponível')
  await remove(ref(db, `chats/${chatId}`))
  await update(ref(db), {
    [`users/${myUid}/chatList/${chatId}`]: null,
    [`users/${peerUid}/chatList/${chatId}`]: null,
    [`users/${myUid}/hiddenChats/${chatId}`]: null,
    [`users/${peerUid}/hiddenChats/${chatId}`]: null
  })
}

/** Garante participantes no DM; repõe listas exceto se esta conversa estiver oculta só para mim. */
export async function ensureChatMembership(chatId, myUid, peerUid) {
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase Database indisponível')
  const now = Date.now()
  const hiddenSnap = await get(ref(db, `users/${myUid}/hiddenChats/${chatId}`))
  const skipMyList = hiddenSnap.exists() && hiddenSnap.val() === true

  const updates = {
    [`chats/${chatId}/participants/${myUid}`]: true,
    [`chats/${chatId}/participants/${peerUid}`]: true,
    [`users/${peerUid}/chatList/${chatId}`]: {
      peerUid: myUid,
      lastTs: now,
      preview: '',
      unreadCount: 0
    }
  }
  if (!skipMyList) {
    updates[`users/${myUid}/chatList/${chatId}`] = {
      peerUid,
      lastTs: now,
      preview: '',
      unreadCount: 0
    }
  }
  await update(ref(db), updates)
}

/**
 * Se faltar linha em users/.../chatList (dados antigos ou escrita falhada), repõe participantes + listas.
 * Chamar ao carregar mensagens num DM aberto.
 */
export async function repairDmChatListIfMissing({ chatId, myUid, peerUid, preview, lastTs }) {
  const db = getFirebaseDatabase()
  if (!db || !chatId || !myUid || !peerUid) return
  const [mineSnap, peerSnap, hiddenSnap] = await Promise.all([
    get(ref(db, `users/${myUid}/chatList/${chatId}`)),
    get(ref(db, `users/${peerUid}/chatList/${chatId}`)),
    get(ref(db, `users/${myUid}/hiddenChats/${chatId}`))
  ])
  const skipMine = hiddenSnap.exists() && hiddenSnap.val() === true
  if (mineSnap.exists() && peerSnap.exists()) return
  if (skipMine && peerSnap.exists()) return
  const ts = typeof lastTs === 'number' && !Number.isNaN(lastTs) ? lastTs : Date.now()
  const p = typeof preview === 'string' ? preview.slice(0, 120) : ''
  const updates = {
    [`chats/${chatId}/participants/${myUid}`]: true,
    [`chats/${chatId}/participants/${peerUid}`]: true
  }
  if (!mineSnap.exists() && !skipMine) {
    updates[`users/${myUid}/chatList/${chatId}`] = { peerUid, lastTs: ts, preview: p, unreadCount: 0 }
  }
  if (!peerSnap.exists()) {
    updates[`users/${peerUid}/chatList/${chatId}`] = { peerUid: myUid, lastTs: ts, preview: p, unreadCount: 0 }
  }
  await update(ref(db), updates)
}

/** Ordem cronológica por push id — primeiro remetente do thread. */
export async function getFirstMessageSenderUid(chatId) {
  const db = getFirebaseDatabase()
  if (!db || !chatId) return null
  const msgsSnap = await get(ref(db, `chats/${chatId}/messages`))
  const v = msgsSnap.val()
  if (!v) return null
  const rows = Object.entries(v).map(([id, data]) => ({
    id,
    senderUid: typeof data?.senderUid === 'string' ? data.senderUid : ''
  }))
  rows.sort((a, b) => a.id.localeCompare(b.id))
  return rows[0]?.senderUid || null
}

/**
 * Atualiza listas + participantes e, num segundo passo, a mensagem.
 * Um único `update()` com a mensagem falha nas regras: cada caminho é validado sem ver os irmãos no mesmo update.
 */
export async function sendChatMessage({
  chatId,
  text,
  myUid,
  peerUid,
  senderDisplayName,
  senderEmail,
  exportKind,
  exportPayload
}) {
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase Database indisponível')
  const t = String(text ?? '').trim()
  if (!t && !exportPayload) return
  const safe = t.slice(0, 4000)
  const preview = safe.slice(0, 120) || (exportKind ? '[Envio do aplicativo]' : '')
  const now = Date.now()

  const dn = String(senderDisplayName ?? '').trim().slice(0, 120)
  const em = String(senderEmail ?? '').trim().slice(0, 320)

  const [unreadSnap, myRowSnap, peerProfSnap] = await Promise.all([
    get(ref(db, `chats/${chatId}/unread/${peerUid}`)),
    get(ref(db, `users/${myUid}/chatList/${chatId}`)),
    fetchPublicProfile(peerUid).then((profile) => ({ val: () => profile })).catch(() => ({ val: () => null }))
  ])
  const prevU =
    typeof unreadSnap.val() === 'number' && !Number.isNaN(unreadSnap.val()) ? unreadSnap.val() : 0
  const nextUnread = Math.min(prevU + 1, 999)

  const prevMine = myRowSnap.val() || {}
  const pp =
    peerProfSnap && typeof peerProfSnap.val === 'function' ? peerProfSnap.val() || {} : {}
  let peerProfEmail = ''
  let peerProfName = ''
  if (typeof pp.email === 'string' && pp.email.trim()) peerProfEmail = pp.email.trim().slice(0, 320)
  if (typeof pp.displayName === 'string' && pp.displayName.trim()) {
    peerProfName = pp.displayName.trim().slice(0, 120)
  }

  const myListPatch = {
    peerUid,
    lastTs: now,
    preview,
    unreadCount: 0
  }
  if (typeof prevMine.peerName === 'string' && prevMine.peerName) myListPatch.peerName = prevMine.peerName
  else if (peerProfName) myListPatch.peerName = peerProfName
  if (typeof prevMine.peerEmail === 'string' && prevMine.peerEmail) myListPatch.peerEmail = prevMine.peerEmail
  else if (peerProfEmail) myListPatch.peerEmail = peerProfEmail

  const peerListPatch = {
    peerUid: myUid,
    lastTs: now,
    preview,
    unreadCount: nextUnread
  }
  if (dn) peerListPatch.peerName = dn
  if (em) peerListPatch.peerEmail = em

  await update(ref(db), {
    [`chats/${chatId}/participants/${myUid}`]: true,
    [`chats/${chatId}/participants/${peerUid}`]: true,
    [`users/${myUid}/chatList/${chatId}`]: myListPatch,
    [`users/${peerUid}/chatList/${chatId}`]: peerListPatch,
    [`chats/${chatId}/unread/${peerUid}`]: nextUnread,
    [`users/${myUid}/hiddenChats/${chatId}`]: null,
    [`users/${peerUid}/hiddenChats/${chatId}`]: null
  })

  const msgRef = push(ref(db, `chats/${chatId}/messages`))
  const msgPayload = {
    text: safe || (exportPayload ? '[Envio do aplicativo]' : ''),
    senderUid: myUid,
    ts: serverTimestamp()
  }
  if (dn) msgPayload.senderDisplayName = dn
  if (em) msgPayload.senderEmail = em
  if (typeof exportKind === 'string' && exportKind.trim()) {
    msgPayload.exportKind = exportKind.trim().slice(0, 32)
  }
  if (typeof exportPayload === 'string' && exportPayload.length > 0) {
    msgPayload.exportPayload = exportPayload.slice(0, 12000)
  }
  await set(msgRef, msgPayload)

  const firstUid = await getFirstMessageSenderUid(chatId)
  if (firstUid && firstUid === myUid) {
    await runTransaction(ref(db, `chats/${chatId}/createdByFirstMessage`), (current) => {
      if (current != null && current !== undefined) return current
      return myUid
    })
  }
}

/**
 * Chats antigos sem `createdByFirstMessage`: só o remetente da primeira mensagem pode preencher
 * (regras alinham com a transação do envio).
 */
export async function ensureCreatedByFirstMessageFromHistory(chatId, myUid) {
  const db = getFirebaseDatabase()
  if (!db || !chatId || !myUid) return
  const metaSnap = await get(ref(db, `chats/${chatId}/createdByFirstMessage`))
  if (metaSnap.exists() && metaSnap.val()) return
  const firstSender = await getFirstMessageSenderUid(chatId)
  if (!firstSender || firstSender !== myUid) return
  await runTransaction(ref(db, `chats/${chatId}/createdByFirstMessage`), (current) => {
    if (current != null && current !== undefined) return current
    return firstSender
  })
}

/** IDs `push()` do RTDB codificam o instante nos 8 primeiros caracteres (mensagens antigas sem `ts`). */
const PUSH_ID_CHARS =
  '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'

function pushIdToMillis(id) {
  if (typeof id !== 'string' || id.length < 8) return null
  let time = 0
  for (let i = 0; i < 8; i++) {
    const idx = PUSH_ID_CHARS.indexOf(id.charAt(i))
    if (idx < 0) return null
    time = time * 64 + idx
  }
  return time
}

function messagesSnapshotToRows(snap) {
  const v = snap.val()
  if (!v) return []
  const rows = Object.entries(v).map(([id, data]) => {
    const rawTs = data?.ts
    let ts =
      typeof rawTs === 'number' && !Number.isNaN(rawTs)
        ? rawTs
        : typeof rawTs === 'string' && /^\d+$/.test(rawTs)
          ? Number(rawTs)
          : null
    if (ts == null) {
      const fromId = pushIdToMillis(id)
      if (fromId != null) ts = fromId
    }
    return {
      id,
      text: data?.text ?? '',
      senderUid: data?.senderUid ?? '',
      ts,
      senderDisplayName: typeof data?.senderDisplayName === 'string' ? data.senderDisplayName : '',
      senderEmail: typeof data?.senderEmail === 'string' ? data.senderEmail : '',
      exportKind: typeof data?.exportKind === 'string' ? data.exportKind : '',
      exportPayload: (() => {
        const p = data?.exportPayload
        if (typeof p === 'string') return p
        if (p != null && typeof p === 'object') {
          try {
            return JSON.stringify(p)
          } catch {
            return ''
          }
        }
        return ''
      })()
    }
  })
  rows.sort((a, b) => a.id.localeCompare(b.id))
  return rows
}

/** Leitura pontual (ex.: após enviar ou ao voltar à app) quando o listener em tempo real falha ou está atrasado. */
export async function fetchChatMessages(chatId) {
  const db = getFirebaseDatabase()
  if (!db || !chatId) return []
  goOnline(db)
  const snap = await get(ref(db, `chats/${chatId}/messages`))
  return messagesSnapshotToRows(snap)
}

export function subscribeCreatedByFirstMessage(chatId, callback) {
  const db = getFirebaseDatabase()
  if (!db || !chatId) return () => {}
  const r = ref(db, `chats/${chatId}/createdByFirstMessage`)
  return onValue(
    r,
    (snap) => {
      const v = snap.val()
      callback(typeof v === 'string' && v.length > 0 ? v : null)
    },
    (err) => {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[RTDB createdByFirstMessage]', chatId, err?.message || err)
      }
      callback(null)
    }
  )
}

export async function ensurePublicProfileHasEmail(uid, authEmail) {
  const db = getFirebaseDatabase()
  if (!db || !uid || !authEmail || typeof authEmail !== 'string') return
  const trimmed = authEmail.trim()
  if (!trimmed) return
  const profSnap = await get(ref(db, `users/${uid}/profile`))
  const prof = profSnap.val() || {}
  const existing = typeof prof.email === 'string' ? prof.email.trim() : ''
  if (existing.length > 0) {
    await syncProfileEmailIndex(uid, existing).catch(() => {})
    await syncUserSearchFromProfile(uid, { ...prof, email: existing }).catch(() => {})
    invalidateUserSearchCache()
    return
  }
  const nextProf = { ...prof, email: trimmed }
  await update(ref(db, `users/${uid}/profile`), {
    email: trimmed,
    updatedAt: serverTimestamp(),
    clientId: getRtdbClientId()
  })
  await syncProfileEmailIndex(uid, trimmed).catch(() => {})
  await syncUserSearchFromProfile(uid, nextProf).catch(() => {})
  invalidateUserSearchCache()
}

/**
 * Copia para o perfil público (RTDB) foto e nome do Auth quando ainda não existem —
 * ex.: login Google com foto, para outros usuários verem na lista sem abrir "Editar perfil".
 */
export async function ensurePublicProfileMirrorAuth(uid, { email, photoURL, displayName } = {}) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return
  const snap = await get(ref(db, `users/${uid}/profile`))
  const cur = snap.val() || {}
  const updates = {}
  const em = typeof email === 'string' ? email.trim() : ''
  if (em && (!(typeof cur.email === 'string') || !String(cur.email).trim())) {
    updates.email = em.slice(0, 320)
  }
  const ph = typeof photoURL === 'string' ? photoURL.trim() : ''
  const hasPhoto = typeof cur.photoURL === 'string' && cur.photoURL.trim().length > 0
  if (!hasPhoto && ph) {
    updates.photoURL = ph.slice(0, 2048)
  }
  const dn = typeof displayName === 'string' ? displayName.trim() : ''
  const hasName = typeof cur.displayName === 'string' && cur.displayName.trim().length > 0
  if (!hasName && dn) {
    updates.displayName = dn.slice(0, 120)
  }
  if (Object.keys(updates).length === 0) {
    if (em) await syncProfileEmailIndex(uid, em, cur.email).catch(() => {})
    await syncUserSearchFromProfile(uid, cur).catch(() => {})
    await syncPublicProfile(uid, cur).catch(() => {})
    invalidateUserSearchCache()
    return
  }
  updates.updatedAt = serverTimestamp()
  updates.clientId = getRtdbClientId()
  await update(ref(db, `users/${uid}/profile`), updates)
  const merged = { ...cur, ...updates }
  await syncPublicProfile(uid, merged).catch(() => {})
  const finalEmail =
    typeof updates.email === 'string' && updates.email.trim()
      ? updates.email.trim()
      : typeof cur.email === 'string'
        ? cur.email.trim()
        : em
  if (finalEmail) {
    await syncProfileEmailIndex(uid, finalEmail, cur.email).catch(() => {})
  }
  await syncUserSearchFromProfile(uid, merged).catch(() => {})
  invalidateUserSearchCache()
}

const SESSION_ENTRADA_KEY = 'salvation_user_entry_registered'
const ENTRADA_MIN_INTERVAL_MS = 5 * 60 * 1000

function entradaRegistadaRecentemente(uid, minIntervalMs = ENTRADA_MIN_INTERVAL_MS) {
  if (!uid || typeof sessionStorage === 'undefined') return false
  try {
    const raw = sessionStorage.getItem(`${SESSION_ENTRADA_KEY}:${uid}`)
    const last = Number(raw)
    return Number.isFinite(last) && last > 0 && Date.now() - last < minIntervalMs
  } catch {
    return false
  }
}

function marcarEntradaRegistadaAgora(uid) {
  if (!uid || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(`${SESSION_ENTRADA_KEY}:${uid}`, String(Date.now()))
  } catch {
    /* ignore */
  }
}

/**
 * Regista a entrada do utilizador na app com throttle local:
 * espelha e-mail/nome/foto do Auth se faltarem e grava `lastAccessAt` no perfil RTDB.
 */
export async function registrarEntradaUsuario(
  uid,
  { email, photoURL, displayName } = {},
  { force = false, minIntervalMs = ENTRADA_MIN_INTERVAL_MS } = {}
) {
  if (!uid || (!force && entradaRegistadaRecentemente(uid, minIntervalMs))) return
  const db = getFirebaseDatabase()
  if (!db) return

  try {
    await ensurePublicProfileHasEmail(uid, email)
    await ensurePublicProfileMirrorAuth(uid, { email, photoURL, displayName })
    await update(ref(db, `users/${uid}/profile`), {
      lastAccessAt: serverTimestamp(),
      clientId: getRtdbClientId(),
    })
    marcarEntradaRegistadaAgora(uid)
  } catch {
    /* permissão / rede — nova tentativa na próxima montagem ou login */
  }
}

export function subscribeMessages(chatId, callback) {
  const db = getFirebaseDatabase()
  if (!db || !chatId) return () => {}
  const r = ref(db, `chats/${chatId}/messages`)
  return onValue(
    r,
    (snap) => {
      callback(messagesSnapshotToRows(snap))
    },
    (err) => {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[RTDB messages]', chatId, err?.message || err)
      }
      callback([])
    }
  )
}

/** IDs de mensagens ocultas só para este usuário (não removem o nó em `chats/.../messages`). */
export function subscribeHiddenMessageIds(uid, chatId, callback) {
  const db = getFirebaseDatabase()
  if (!db || !uid || !chatId) return () => {}
  const r = ref(db, `users/${uid}/hiddenChatMessages/${chatId}`)
  return onValue(
    r,
    (snap) => {
      callback(snap.val() || {})
    },
    (err) => {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[RTDB hiddenChatMessages]', chatId, err?.message || err)
      }
      callback({})
    }
  )
}

export async function hideMessageForMe(uid, chatId, msgId) {
  const db = getFirebaseDatabase()
  if (!db || !uid || !chatId || !msgId) throw new Error('Firebase Database indisponível')
  await set(ref(db, `users/${uid}/hiddenChatMessages/${chatId}/${msgId}`), true)
}

/** Remove a mensagem do servidor — nas regras, só o remetente pode apagar o nó. */
export async function deleteMessageForEveryone(chatId, msgId) {
  const db = getFirebaseDatabase()
  if (!db || !chatId || !msgId) throw new Error('Firebase Database indisponível')
  await remove(ref(db, `chats/${chatId}/messages/${msgId}`))
}

/** Denúncia de mensagem (moderação / requisitos App Store). */
export async function reportChatMessage({
  reporterUid,
  chatId,
  messageId,
  reportedUid,
  textPreview
}) {
  const db = getFirebaseDatabase()
  if (!db || !reporterUid || !chatId || !messageId) {
    throw new Error('Dados insuficientes para denunciar.')
  }
  const { push } = await import('firebase/database')
  const nodeRef = push(ref(db, 'chatReports'))
  await set(nodeRef, {
    reporterUid,
    chatId,
    messageId,
    reportedUid: reportedUid || '',
    textPreview: String(textPreview || '').slice(0, 400),
    createdAt: Date.now()
  })
}

export async function writeUserProfilePublic(uid, {
  displayName,
  email,
  handle,
  phoneDisplay,
  photoURL,
  city,
  professionOrStudy,
  church
}) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return
  const purl =
    photoURL != null && String(photoURL).trim().length > 0
      ? String(photoURL).trim().slice(0, 2048)
      : ''
  const cityS = city != null ? String(city).trim().slice(0, 80) : ''
  const profS = professionOrStudy != null ? String(professionOrStudy).trim().slice(0, 120) : ''
  const churchS = church != null ? String(church).trim().slice(0, 120) : ''
  const prevSnap = await get(ref(db, `users/${uid}/profile`))
  const prevEmail = prevSnap.val()?.email
  const emailStr = email != null ? String(email).trim().slice(0, 320) : ''
  const fullProfile = {
    displayName: displayName || '',
    email: emailStr,
    handle: handle != null ? String(handle) : '',
    phoneDisplay: phoneDisplay != null ? String(phoneDisplay).slice(0, 32) : '',
    photoURL: purl,
    city: cityS,
    professionOrStudy: profS,
    church: churchS,
    updatedAt: serverTimestamp(),
    clientId: getRtdbClientId()
  }
  await set(ref(db, `users/${uid}/profile`), fullProfile)
  await syncPublicProfile(uid, fullProfile)
  if (emailStr) {
    await syncProfileEmailIndex(uid, emailStr, prevEmail).catch(() => {})
  }
  await syncUserSearchFromProfile(uid, {
    displayName: displayName || '',
    email: emailStr,
    handle: handle != null ? String(handle) : '',
  }).catch(() => {})
  invalidateUserSearchCache()
}

/** Ficheiro único por UID: `profilePhotos/{uid}`. Requer Storage configurado e `storage.rules`. */
export async function uploadProfilePhoto(uid, jpegBlob) {
  const storage = getFirebaseStorage()
  if (!storage || !uid) throw new Error('Envio de foto indisponível neste aplicativo. Tente de novo mais tarde.')
  const r = storageRef(storage, `profilePhotos/${uid}`)
  await uploadBytes(r, jpegBlob, { contentType: 'image/jpeg' })
  return getDownloadURL(r)
}

export async function deleteProfilePhotoFile(uid) {
  const storage = getFirebaseStorage()
  if (!storage || !uid) return
  try {
    await deleteObject(storageRef(storage, `profilePhotos/${uid}`))
  } catch {
    /* arquivo inexistente ou já apagado */
  }
}

/** --- Favoritos (atalhos, sem pedido) --- */

export async function addFavorite(myUid, peerUid) {
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase Database indisponível')
  if (!myUid || !peerUid || myUid === peerUid) throw new Error('Usuário inválido.')
  await set(ref(db, `users/${myUid}/favorites/${peerUid}`), { addedAt: serverTimestamp() })
}

export async function removeFavorite(myUid, peerUid) {
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase Database indisponível')
  await remove(ref(db, `users/${myUid}/favorites/${peerUid}`))
}

export function subscribeFavorites(uid, callback) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return () => {}
  const r = ref(db, `users/${uid}/favorites`)
  onValue(r, (snap) => {
    const v = snap.val()
    if (!v) {
      callback([])
      return
    }
    const rows = Object.entries(v).map(([peerUid, data]) => ({
      peerUid,
      addedAt: data?.addedAt ?? 0
    }))
    rows.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
    callback(rows)
  })
  return () => off(r)
}

/** --- Pessoas pesquisadas recentemente (sincronizado entre dispositivos) --- */

/** Limite do que mostramos na UI e armazenamos por usuário. */
export const RECENT_PEOPLE_LIMIT = 8

/** Tamanhos suportados pelas regras `database.rules.json` para `recentPeople`. */
const RECENT_FIELD_LIMITS = {
  handle: 80,
  displayName: 200,
  photoURL: 600,
  email: 320,
  city: 120,
  professionOrStudy: 120,
  church: 120
}

function trimFieldForRecent(value, max) {
  if (typeof value !== 'string') return ''
  const s = value.trim()
  if (!s) return ''
  return s.length <= max ? s : s.slice(0, max)
}

/** Grava (ou atualiza) uma pessoa na lista de recentes. */
export async function setRecentPerson(myUid, person) {
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase Database indisponível')
  if (!myUid || !person?.uid || person.uid === myUid) return
  const payload = { addedAt: serverTimestamp() }
  const optional = {
    handle: person.handle,
    displayName: person.displayName,
    photoURL: person.photoURL,
    email: person.email,
    city: person.city,
    professionOrStudy: person.professionOrStudy,
    church: person.church
  }
  for (const [key, raw] of Object.entries(optional)) {
    const v = trimFieldForRecent(raw, RECENT_FIELD_LIMITS[key])
    if (v) payload[key] = v
  }
  await set(ref(db, `users/${myUid}/recentPeople/${person.uid}`), payload)
}

export async function removeRecentPerson(myUid, peerUid) {
  const db = getFirebaseDatabase()
  if (!db || !myUid || !peerUid) return
  await remove(ref(db, `users/${myUid}/recentPeople/${peerUid}`))
}

/** Remove todos os recentes do usuário (filhos um a um — regras RTDB não permitem apagar o nó pai). */
export async function clearRecentPeople(myUid) {
  const db = getFirebaseDatabase()
  if (!db || !myUid) return
  const snap = await get(ref(db, `users/${myUid}/recentPeople`))
  const v = snap.val()
  if (!v || typeof v !== 'object') return
  const updates = {}
  for (const peerUid of Object.keys(v)) {
    updates[`users/${myUid}/recentPeople/${peerUid}`] = null
  }
  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates)
  }
}

/**
 * Subscreve a lista de recentes ordenada por `addedAt` desc, já truncada ao
 * `RECENT_PEOPLE_LIMIT`. Faz a poda automática quando a contagem excede o
 * limite (multi-path delete) — mantém o nó enxuto sem precisar de Cloud Function.
 */
export function subscribeRecentPeople(uid, callback) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return () => {}
  const r = ref(db, `users/${uid}/recentPeople`)
  onValue(r, (snap) => {
    const v = snap.val()
    if (!v) {
      callback([])
      return
    }
    const rows = Object.entries(v).map(([peerUid, data]) => ({
      uid: peerUid,
      handle: typeof data?.handle === 'string' ? data.handle : '',
      displayName: typeof data?.displayName === 'string' ? data.displayName : '',
      photoURL: typeof data?.photoURL === 'string' ? data.photoURL : '',
      email: typeof data?.email === 'string' ? data.email : '',
      city: typeof data?.city === 'string' ? data.city : '',
      professionOrStudy: typeof data?.professionOrStudy === 'string' ? data.professionOrStudy : '',
      church: typeof data?.church === 'string' ? data.church : '',
      addedAt: typeof data?.addedAt === 'number' ? data.addedAt : 0
    }))
    rows.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
    const head = rows.slice(0, RECENT_PEOPLE_LIMIT)
    const overflow = rows.slice(RECENT_PEOPLE_LIMIT)
    if (overflow.length > 0) {
      const updates = {}
      for (const row of overflow) {
        updates[`users/${uid}/recentPeople/${row.uid}`] = null
      }
      update(ref(db), updates).catch(() => {})
    }
    callback(head)
  })
  return () => off(r)
}

/** --- Pedidos de amizade e amigos --- */

export async function sendFriendRequest(myUid, peerUid) {
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase Database indisponível')
  if (!myUid || !peerUid || myUid === peerUid) throw new Error('Usuário inválido.')

  const [friendsSnap, outSnap, inSnap] = await Promise.all([
    get(ref(db, `users/${myUid}/friends/${peerUid}`)),
    get(ref(db, `users/${myUid}/friendRequestsOut/${peerUid}`)),
    get(ref(db, `users/${myUid}/friendRequestsIn/${peerUid}`))
  ])

  if (friendsSnap.exists()) throw new Error('Já são amigos.')
  if (outSnap.exists()) throw new Error('Já enviaste um pedido a esta pessoa.')
  if (inSnap.exists()) throw new Error('Esta pessoa já te enviou um pedido. Aceita na lista abaixo.')

  await update(ref(db), {
    [`users/${peerUid}/friendRequestsIn/${myUid}`]: { createdAt: serverTimestamp() },
    [`users/${myUid}/friendRequestsOut/${peerUid}`]: { createdAt: serverTimestamp() }
  })
}

export async function cancelFriendRequest(myUid, toUid) {
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase Database indisponível')
  await update(ref(db), {
    [`users/${toUid}/friendRequestsIn/${myUid}`]: null,
    [`users/${myUid}/friendRequestsOut/${toUid}`]: null
  })
}

export async function acceptFriendRequest(myUid, fromUid) {
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase Database indisponível')
  if (myUid === fromUid) throw new Error('Inválido.')
  const snap = await get(ref(db, `users/${myUid}/friendRequestsIn/${fromUid}`))
  if (!snap.exists()) throw new Error('Pedido não encontrado.')

  await update(ref(db), {
    [`users/${myUid}/friendRequestsIn/${fromUid}`]: null,
    [`users/${fromUid}/friendRequestsOut/${myUid}`]: null,
    [`users/${myUid}/friends/${fromUid}`]: { since: serverTimestamp() },
    [`users/${fromUid}/friends/${myUid}`]: { since: serverTimestamp() }
  })
}

export async function rejectFriendRequest(myUid, fromUid) {
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase Database indisponível')
  await update(ref(db), {
    [`users/${myUid}/friendRequestsIn/${fromUid}`]: null,
    [`users/${fromUid}/friendRequestsOut/${myUid}`]: null
  })
}

export async function removeFriend(myUid, peerUid) {
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase Database indisponível')
  await remove(ref(db, `users/${myUid}/friends/${peerUid}`))
}

export function subscribeFriendRequestsIn(uid, callback) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return () => {}
  const r = ref(db, `users/${uid}/friendRequestsIn`)
  onValue(r, (snap) => {
    const v = snap.val()
    if (!v) {
      callback([])
      return
    }
    const rows = Object.entries(v).map(([fromUid, data]) => ({
      fromUid,
      createdAt: data?.createdAt ?? 0
    }))
    rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    callback(rows)
  })
  return () => off(r)
}

export function subscribeFriendRequestsOut(uid, callback) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return () => {}
  const r = ref(db, `users/${uid}/friendRequestsOut`)
  onValue(r, (snap) => {
    const v = snap.val()
    if (!v) {
      callback([])
      return
    }
    const rows = Object.entries(v).map(([toUid, data]) => ({
      toUid,
      createdAt: data?.createdAt ?? 0
    }))
    rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    callback(rows)
  })
  return () => off(r)
}

export function subscribeFriends(uid, callback) {
  const db = getFirebaseDatabase()
  if (!db || !uid) return () => {}
  const r = ref(db, `users/${uid}/friends`)
  onValue(r, (snap) => {
    const v = snap.val()
    if (!v) {
      callback([])
      return
    }
    const rows = Object.entries(v).map(([peerUid, data]) => ({
      peerUid,
      since: data?.since ?? 0
    }))
    rows.sort((a, b) => (b.since || 0) - (a.since || 0))
    callback(rows)
  })
  return () => off(r)
}

/** Carrega perfis públicos para vários UIDs (rótulos na lista). */
export async function fetchPeerProfilesMap(uids) {
  const unique = [...new Set(uids.filter(Boolean))]
  const out = {}
  await Promise.all(
    unique.map(async (uid) => {
      const p = await fetchUserProfile(uid)
      out[uid] = p || {}
    })
  )
  return out
}
