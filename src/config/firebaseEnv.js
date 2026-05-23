/** Variáveis de ambiente do Firebase (sem importar o pacote `firebase/*`). */

export const FIREBASE_REQUIRED_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_PROJECT_ID'
]

/** Lê env do Vite com trim e sem aspas acidentais no `.env`. */
export function readViteEnv(key) {
  let v = import.meta.env[key]
  if (typeof v !== 'string') return ''
  v = v.trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim()
  }
  return v
}

export function isFirebaseConfigured() {
  return FIREBASE_REQUIRED_ENV_KEYS.every((k) => readViteEnv(k).length > 0)
}
