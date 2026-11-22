import { getFirebaseDatabase, isFirebaseConfigured, loadFirebaseModules } from '../config/firebase'
import { lerOptInRankingQuiz } from './quizBiblicoRankingService'
import { openNativeShareSheet } from '../utils/nativeShare'
import { linkCompartilhamentoConteudo } from '../utils/compartilhamentoConteudo'

// O Quiz usa a sessão e o SDK da Bíblia. Nenhuma credencial é copiada para o jogo.
export function criarQuizIntegradoBridge({ getUser, openProfile }) {
  const listeners = new Set()
  const subscriptions = new Set()
  let disposed = false
  let api, db
  const ready = async () => {
    await loadFirebaseModules()
    api ||= await import('firebase/database')
    db = getFirebaseDatabase()
    return Boolean(db)
  }
  const database = () => ({ ref(path) {
    if (!api || !db || disposed) throw new Error('Banco indisponível')
    const target = api.ref(db, path)
    const callbacks = new Map()
    return {
      once: () => api.get(target),
      set: value => api.set(target, value),
      update: value => api.update(target, value),
      remove: () => api.remove(target),
      transaction: fn => api.runTransaction(target, fn),
      on(event, callback, error) {
        if (event !== 'value') throw new Error('Evento não suportado')
        const unsub = api.onValue(target, callback, error)
        callbacks.set(callback, unsub)
        subscriptions.add(unsub)
      },
      off(event, callback) {
        const unsub = callbacks.get(callback)
        unsub?.()
        subscriptions.delete(unsub)
        callbacks.delete(callback)
      },
    }
  } })
  return {
    ready, database, isConfigured: isFirebaseConfigured,
    getUser: () => {
      const user = getUser()
      return user ? { uid: user.uid, displayName: user.displayName, email: user.email, emailVerified: user.emailVerified, photoURL: user.photoURL } : null
    },
    onAuth(callback) { listeners.add(callback); callback(this.getUser()); return () => listeners.delete(callback) },
    notifyAuth() { for (const callback of listeners) callback(this.getUser()) },
    rankingOptIn: lerOptInRankingQuiz,
    openProfile,
    publicUrl: 'https://foundcine.com/biblia/quiz-retiro',
    shareUrl: linkCompartilhamentoConteudo('secao', 'quiz'),
    async share(payload) {
      try {
        if (await openNativeShareSheet(payload)) return true
        await navigator.clipboard.writeText([payload.text, payload.url].filter(Boolean).join('\n'))
        return true
      } catch (error) {
        if (error?.name === 'AbortError') return false
        throw error
      }
    },
    dispose() { disposed = true; subscriptions.forEach(stop => stop()); subscriptions.clear(); listeners.clear() },
  }
}
