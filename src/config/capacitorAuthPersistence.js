/**
 * Persistência Firebase Auth só com localStorage — evita IndexedDB no WKWebView
 * (Capacitor iOS), que pode pendurar e deixar user === undefined para sempre.
 *
 * @typedef {import('firebase/auth').Persistence} Persistence
 */

/** @type {Persistence} */
export const capacitorLocalStoragePersistence = {
  type: 'LOCAL',
  async _isAvailable() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false
      const probe = '__salvation_auth_probe__'
      window.localStorage.setItem(probe, '1')
      window.localStorage.removeItem(probe)
      return true
    } catch {
      return false
    }
  },
  async _set(key, value) {
    window.localStorage.setItem(key, value)
  },
  async _get(key) {
    const v = window.localStorage.getItem(key)
    return v ?? null
  },
  async _remove(key) {
    window.localStorage.removeItem(key)
  },
  _addListener(_key, listener) {
    if (typeof window === 'undefined') return
    window.addEventListener('storage', listener)
  },
  _removeListener(_key, listener) {
    if (typeof window === 'undefined') return
    window.removeEventListener('storage', listener)
  },
}
