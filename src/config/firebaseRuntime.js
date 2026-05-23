/**
 * Implementação real do Firebase (carregada só via `import()` dinâmico em
 * `firebase.js`). Manter este ficheiro fora do grafo síncrono do `index`
 * reduz o `modulepreload` e o parse inicial em ~80 kB gzip.
 */
import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver
} from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'
import { Capacitor } from '@capacitor/core'
import { isFirebaseConfigured, readViteEnv } from './firebaseEnv'

const isNativeApp = () =>
  typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.() === true

let appSingleton = null
let authSingleton = null
let storageSingleton = null

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null
  if (appSingleton) return appSingleton
  if (getApps().length) {
    appSingleton = getApps()[0]
    return appSingleton
  }
  const opt = {
    apiKey: readViteEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readViteEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    databaseURL: readViteEnv('VITE_FIREBASE_DATABASE_URL'),
    projectId: readViteEnv('VITE_FIREBASE_PROJECT_ID')
  }
  const bucket = readViteEnv('VITE_FIREBASE_STORAGE_BUCKET')
  const sender = readViteEnv('VITE_FIREBASE_MESSAGING_SENDER_ID')
  const appId = readViteEnv('VITE_FIREBASE_APP_ID')
  if (bucket) opt.storageBucket = bucket
  if (sender) opt.messagingSenderId = sender
  if (appId) opt.appId = appId
  appSingleton = initializeApp(opt)
  return appSingleton
}

export function getFirebaseAuth() {
  const app = getFirebaseApp()
  if (!app) return null
  if (authSingleton) return authSingleton
  const persistence = isNativeApp() ? indexedDBLocalPersistence : browserLocalPersistence
  try {
    authSingleton = initializeAuth(app, {
      persistence,
      popupRedirectResolver: browserPopupRedirectResolver
    })
  } catch {
    authSingleton = getAuth(app)
  }
  return authSingleton
}

export function getFirebaseDatabase() {
  const app = getFirebaseApp()
  if (!app) return null
  return getDatabase(app)
}

export function getFirebaseStorage() {
  const app = getFirebaseApp()
  if (!app) return null
  if (!readViteEnv('VITE_FIREBASE_STORAGE_BUCKET')) return null
  if (!storageSingleton) storageSingleton = getStorage(app)
  return storageSingleton
}

let functionsSingleton = null
export function getFirebaseFunctions() {
  const app = getFirebaseApp()
  if (!app) return null
  if (!functionsSingleton) {
    // 'us-central1' é o default e onde nossas funções estão.
    functionsSingleton = getFunctions(app, 'us-central1')
  }
  return functionsSingleton
}

export function getFirebaseDiagnostics() {
  const key = readViteEnv('VITE_FIREBASE_API_KEY')
  return {
    configured: isFirebaseConfigured(),
    projectId: readViteEnv('VITE_FIREBASE_PROJECT_ID'),
    authDomain: readViteEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    databaseUrlSet: readViteEnv('VITE_FIREBASE_DATABASE_URL').length > 0,
    storageBucketSet: readViteEnv('VITE_FIREBASE_STORAGE_BUCKET').length > 0,
    apiKeyLength: key.length,
    apiKeyPrefix: key.length >= 8 ? `${key.slice(0, 8)}…` : '(vazio ou curto demais)',
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    isNativeCapacitor: isNativeApp()
  }
}
