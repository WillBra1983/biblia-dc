import {
  get,
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  runTransaction,
  set,
  update,
} from 'firebase/database'
import { getFirebaseDatabase, loadFirebaseModules } from '../config/firebase'

const LIMITE_FEED = 120

export async function registrarCompartilhamentoVersiculoDoDia(data) {
  await loadFirebaseModules()
  const { getFirebaseFunctions } = await import('../config/firebase')
  const { httpsCallable } = await import('firebase/functions')
  const fns = getFirebaseFunctions()
  if (!fns) throw new Error('Serviço indisponível no momento.')
  const resultado = await httpsCallable(fns, 'registrarCompartilhamentoVersiculoDoDia', { timeout: 30_000 })({ data })
  return Number(resultado?.data?.sharesCount || 0)
}

export async function obterDestaqueVersiculoDoDia(data) {
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  const chave = String(data || '').trim()
  if (!db || !/^\d{4}-\d{2}-\d{2}$/.test(chave)) return null
  const item = await get(ref(db, `versiculosCompartilhadosPublicos/versiculo-dia-${chave}`))
  return item.exists() ? { id: `versiculo-dia-${chave}`, ...item.val() } : null
}

export async function assinarDestaqueVersiculoDoDia(data, callback, onError) {
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  const chave = String(data || '').trim()
  if (!db || !/^\d{4}-\d{2}-\d{2}$/.test(chave)) return () => {}
  const postId = `versiculo-dia-${chave}`
  return onValue(
    ref(db, `versiculosCompartilhadosPublicos/${postId}`),
    (snap) => callback(snap.exists() ? { id: postId, ...snap.val() } : null),
    onError
  )
}

async function contexto(uid) {
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db || !uid) throw new Error('Entre na sua conta para guardar este compartilhamento.')
  return db
}

function limparTexto(value, max) {
  return String(value || '').trim().slice(0, max)
}

export async function registrarVersiculoCompartilhado(uid, dados) {
  const db = await contexto(uid)
  const postId = push(ref(db, `users/${uid}/versiculosCompartilhados`)).key
  const agora = Date.now()
  const item = {
    referencia: limparTexto(dados.referencia, 140),
    texto: limparTexto(dados.texto, 5000),
    fundoId: limparTexto(dados.fundoId, 60) || 'amanhecer',
    url: limparTexto(dados.url, 1000),
    publico: Boolean(dados.publico),
    createdAt: agora,
    likesCount: 0,
    sharesCount: 1,
  }

  // O vínculo com o autor existe apenas no ramo privado do usuário.
  await set(ref(db, `versiculosCompartilhadosDonos/${postId}`), uid)
  await set(ref(db, `users/${uid}/versiculosCompartilhados/${postId}`), item)
  const { publico, ...anonimo } = item
  await set(ref(db, `versiculosCompartilhadosPorLink/${postId}`), anonimo)
  await set(ref(db, `versiculosCompartilhadosInteracoes/${postId}/compartilhamentos/${uid}`), {
    count: 1,
    lastAt: agora,
  })
  if (item.publico) {
    try {
      await set(ref(db, `versiculosCompartilhadosPublicos/${postId}`), anonimo)
    } catch (error) {
      await update(ref(db, `users/${uid}/versiculosCompartilhados/${postId}`), { publico: false }).catch(() => {})
      throw error
    }
  }
  return { id: postId, ...item }
}

export async function obterPreferenciaPublicacao(uid) {
  const db = await contexto(uid)
  const snap = await get(ref(db, `users/${uid}/versiculosCompartilhadosPrefs/publicoPadrao`))
  return snap.val() === true
}

export async function salvarPreferenciaPublicacao(uid, publicoPadrao) {
  const db = await contexto(uid)
  await set(ref(db, `users/${uid}/versiculosCompartilhadosPrefs/publicoPadrao`), Boolean(publicoPadrao))
}

function normalizarLista(value) {
  return Object.entries(value || {})
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
}

export async function assinarFeedPublico(callback, onError) {
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return () => {}
  const q = query(ref(db, 'versiculosCompartilhadosPublicos'), orderByChild('createdAt'), limitToLast(LIMITE_FEED))
  return onValue(q, (snap) => callback(normalizarLista(snap.val())), onError)
}

export async function assinarMeusCompartilhamentos(uid, callback, onError) {
  const db = await contexto(uid)
  return onValue(ref(db, `users/${uid}/versiculosCompartilhados`), (snap) => callback(normalizarLista(snap.val())), onError)
}

export async function obterCompartilhamentoPorLink(postId) {
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  const id = String(postId || '').trim().slice(0, 120)
  if (!db || !id) return null
  const snap = await get(ref(db, `versiculosCompartilhadosPorLink/${id}`))
  return snap.exists() ? { id, ...snap.val(), naoListado: true } : null
}

export async function alternarCurtida(uid, postId) {
  const db = await contexto(uid)
  const likeRef = ref(db, `users/${uid}/versiculosCompartilhadosCurtidas/${postId}`)
  const atual = await get(likeRef)
  const curtido = atual.exists()
  const interacaoRef = ref(db, `versiculosCompartilhadosInteracoes/${postId}/curtidas/${uid}`)
  if (curtido) {
    await Promise.all([remove(likeRef), remove(interacaoRef)])
  } else {
    const agora = Date.now()
    await Promise.all([set(likeRef, agora), set(interacaoRef, agora)])
  }
  await runTransaction(ref(db, `versiculosCompartilhadosPublicos/${postId}/likesCount`), (n) =>
    Math.max(0, Number(n || 0) + (curtido ? -1 : 1))
  )
  return !curtido
}

export async function obterCurtidasDoUsuario(uid) {
  const db = await contexto(uid)
  const snap = await get(ref(db, `users/${uid}/versiculosCompartilhadosCurtidas`))
  return new Set(Object.keys(snap.val() || {}))
}

export async function registrarRecompartilhamento(uid, postId) {
  const db = await contexto(uid)
  const itemUsuarioRef = ref(db, `users/${uid}/versiculosCompartilhados/${postId}`)
  const itemUsuario = await get(itemUsuarioRef)
  await runTransaction(
    ref(db, `versiculosCompartilhadosInteracoes/${postId}/compartilhamentos/${uid}`),
    (atual) => ({ count: Number(atual?.count || 0) + 1, lastAt: Date.now() })
  )

  if (itemUsuario.exists()) {
    const item = itemUsuario.val()
    const linkRef = ref(db, `versiculosCompartilhadosPorLink/${postId}`)
    const linkAtual = await get(linkRef)
    if (!linkAtual.exists()) {
      const { publico: _publico, ...anonimo } = item
      await set(linkRef, anonimo)
    }
    await runTransaction(
      ref(db, `versiculosCompartilhadosPorLink/${postId}/sharesCount`),
      (n) => Number(n || 0) + 1
    )
    await runTransaction(
      ref(db, `users/${uid}/versiculosCompartilhados/${postId}/sharesCount`),
      (n) => Number(n || 0) + 1
    )
    // Um compartilhamento privado nunca deve criar um registro parcial no mural.
    if (item.publico !== true) return
  }

  await runTransaction(
    ref(db, `versiculosCompartilhadosPublicos/${postId}/sharesCount`),
    (n) => Number(n || 0) + 1
  )
}

export async function obterInteracoesCompartilhamentoAdmin(uid, postId) {
  const db = await contexto(uid)
  const id = String(postId || '').trim().slice(0, 120)
  if (!id) return { curtidas: [], compartilhamentos: [] }

  const snap = await get(ref(db, `versiculosCompartilhadosInteracoes/${id}`))
  const valor = snap.val() || {}
  const curtidas = Object.entries(valor.curtidas || {}).map(([userUid, at]) => ({
    uid: userUid,
    count: 1,
    lastAt: Number(at || 0),
  }))
  const compartilhamentos = Object.entries(valor.compartilhamentos || {}).map(([userUid, registro]) => ({
    uid: userUid,
    count: Number(registro?.count || 0),
    lastAt: Number(registro?.lastAt || 0),
  }))
  const uids = [...new Set([...curtidas, ...compartilhamentos].map((item) => item.uid))]
  const perfis = new Map()

  await Promise.all(uids.map(async (userUid) => {
    const perfilSnap = await get(ref(db, `users/${userUid}/profile`))
    const perfil = perfilSnap.val() || {}
    perfis.set(userUid, {
      nome: String(perfil.displayName || perfil.name || perfil.handle || 'Usuário sem nome público'),
      handle: String(perfil.handle || ''),
      foto: String(perfil.photoURL || ''),
    })
  }))

  const completar = (lista) => lista
    .map((item) => ({ ...item, ...(perfis.get(item.uid) || {}) }))
    .sort((a, b) => b.lastAt - a.lastAt)

  return {
    curtidas: completar(curtidas),
    compartilhamentos: completar(compartilhamentos),
  }
}

export async function alterarPrivacidadeCompartilhamento(uid, postId, publico) {
  const db = await contexto(uid)
  const meuRef = ref(db, `users/${uid}/versiculosCompartilhados/${postId}`)
  const snap = await get(meuRef)
  if (!snap.exists()) throw new Error('Compartilhamento não encontrado.')
  const item = snap.val()
  const pubRef = ref(db, `versiculosCompartilhadosPublicos/${postId}`)
  if (!publico) {
    const publicoAtual = await get(pubRef)
    const contadores = publicoAtual.exists()
      ? {
          likesCount: Number(publicoAtual.child('likesCount').val() || 0),
          sharesCount: Number(publicoAtual.child('sharesCount').val() || 0),
        }
      : {}
    await update(meuRef, { publico: false, ...contadores })
    await remove(pubRef)
    return
  }
  await update(meuRef, { publico: true })
  const { publico: _ignorar, ...anonimo } = { ...item, publico: true }
  try {
    await set(pubRef, anonimo)
  } catch (error) {
    await update(meuRef, { publico: false }).catch(() => {})
    throw error
  }
}

export async function excluirCompartilhamento(uid, postId) {
  const db = await contexto(uid)
  // O registro privado comprova a propriedade nas regras durante a exclusão pública.
  await remove(ref(db, `versiculosCompartilhadosPublicos/${postId}`)).catch(() => {})
  await Promise.all([
    remove(ref(db, `users/${uid}/versiculosCompartilhados/${postId}`)),
    remove(ref(db, `users/${uid}/versiculosCompartilhadosCurtidas/${postId}`)),
    remove(ref(db, `versiculosCompartilhadosPorLink/${postId}`)),
    remove(ref(db, `versiculosCompartilhadosDonos/${postId}`)),
  ])
}
