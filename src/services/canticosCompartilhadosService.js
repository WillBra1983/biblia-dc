import { onValue, push, ref, remove, set, update } from 'firebase/database'
import { getFirebaseDatabase, loadFirebaseModules } from '../config/firebase'
import { parsePastedChordSong } from '../utils/chordProParser'

const LIMITE_TITULO = 160
const LIMITE_ARTISTA = 160
const LIMITE_TEXTO = 50000
const LIMITE_NOME = 80

const limpar = (valor, limite) => String(valor || '').trim().slice(0, limite)
const limitarTexto = valor => String(valor || '').slice(0, LIMITE_TEXTO)

async function contexto(uid) {
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) throw new Error('A lista compartilhada não está disponível no momento.')
  if (!uid) throw new Error('Entre na sua conta para publicar uma música.')
  return db
}

function converterItem(id, item) {
  const musica = parsePastedChordSong(item.textoOriginal || '', {
    id,
    title: item.titulo || 'Música sem título',
    artist: item.artista || '',
    source: 'Compartilhada',
  })
  return {
    ...musica,
    compartilhado: true,
    authorUid: item.authorUid || '',
    authorName: item.authorName || 'Usuário',
    createdAt: Number(item.createdAt || 0),
    updatedAt: Number(item.updatedAt || item.createdAt || 0),
  }
}

export async function assinarCanticosCompartilhados(callback, onError) {
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) {
    callback([])
    return () => {}
  }
  return onValue(
    ref(db, 'canticosCompartilhados'),
    snapshot => {
      const lista = Object.entries(snapshot.val() || {})
        .map(([id, item]) => converterItem(id, item))
        .sort((a, b) => b.updatedAt - a.updatedAt)
      callback(lista)
    },
    onError
  )
}

export async function publicarCantico(user, dados) {
  const db = await contexto(user?.uid)
  const itemRef = push(ref(db, 'canticosCompartilhados'))
  const agora = Date.now()
  const item = {
    titulo: limpar(dados.titulo, LIMITE_TITULO),
    artista: limpar(dados.artista, LIMITE_ARTISTA),
    textoOriginal: limitarTexto(dados.textoOriginal),
    authorUid: user.uid,
    authorName: limpar(user.displayName || user.email?.split('@')[0] || 'Usuário', LIMITE_NOME),
    createdAt: agora,
    updatedAt: agora,
  }
  await set(itemRef, item)
  return converterItem(itemRef.key, item)
}

export async function editarCantico(user, musica, dados) {
  if (!musica?.id || musica.authorUid !== user?.uid) {
    throw new Error('Somente quem publicou esta música pode editá-la.')
  }
  const db = await contexto(user.uid)
  const alteracoes = {
    titulo: limpar(dados.titulo, LIMITE_TITULO),
    artista: limpar(dados.artista, LIMITE_ARTISTA),
    textoOriginal: limitarTexto(dados.textoOriginal),
    updatedAt: Date.now(),
  }
  await update(ref(db, `canticosCompartilhados/${musica.id}`), alteracoes)
  return converterItem(musica.id, { ...musica, ...alteracoes })
}

export async function excluirCantico(user, musica) {
  if (!musica?.id || musica.authorUid !== user?.uid) {
    throw new Error('Somente quem publicou esta música pode excluí-la.')
  }
  const db = await contexto(user.uid)
  await remove(ref(db, `canticosCompartilhados/${musica.id}`))
}
