/**
 * Fachada pública do Firebase: **não** importa `firebase/*` de forma estática.
 * O runtime pesado vive em `firebaseRuntime.js` e só entra no bundle após
 * `loadFirebaseModules()` (ou o primeiro `getFirebase*` após o load).
 */
import { isFirebaseConfigured } from './firebaseEnv'

export { isFirebaseConfigured } from './firebaseEnv'

let runtime = null
let loadPromise = null

/**
 * Garante que `firebase/app`, auth, database e storage foram carregados.
 * Resolve `null` se o projeto não tiver `.env` completo.
 */
export function loadFirebaseModules() {
  if (!isFirebaseConfigured()) return Promise.resolve(null)
  if (runtime) return Promise.resolve(runtime)
  if (!loadPromise) {
    loadPromise = import('./firebaseRuntime.js').then((m) => {
      runtime = m
      return m
    })
  }
  return loadPromise
}

function R() {
  return runtime
}

export function getFirebaseApp() {
  return R()?.getFirebaseApp?.() ?? null
}

export function getFirebaseAuth() {
  return R()?.getFirebaseAuth?.() ?? null
}

export function getFirebaseDatabase() {
  return R()?.getFirebaseDatabase?.() ?? null
}

export function getFirebaseStorage() {
  return R()?.getFirebaseStorage?.() ?? null
}

export function getFirebaseFunctions() {
  return R()?.getFirebaseFunctions?.() ?? null
}

export function getFirebaseDiagnostics() {
  if (!isFirebaseConfigured()) {
    return {
      configured: false,
      projectId: '',
      authDomain: '',
      databaseUrlSet: false,
      storageBucketSet: false,
      apiKeyLength: 0,
      apiKeyPrefix: '(não configurado)',
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      isNativeCapacitor: false
    }
  }
  return R()?.getFirebaseDiagnostics?.() ?? {
    configured: true,
    projectId: '',
    authDomain: '',
    databaseUrlSet: false,
    storageBucketSet: false,
    apiKeyLength: 0,
    apiKeyPrefix: '(a carregar…)',
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    isNativeCapacitor: false
  }
}
