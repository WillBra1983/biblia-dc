/**
 * Cache local de SQLite (`ara.sqlite`, `nt_prova.sqlite`, `ot_strong.sqlite`)
 * em IndexedDB. Evita refazer download a cada abertura.
 *
 * Chave: `<assetName>@<revisão>` (revisão = `VITE_SQLITE_ASSET_REV`).
 * Mudou a revisão? a próxima abertura busca da rede e regrava.
 */

const DB_NAME = 'biblia-dc-sqlite-cache'
const DB_VERSION = 1
const STORE = 'assets'

let openDbPromise = null

function openDb() {
  if (openDbPromise) return openDbPromise
  openDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      openDbPromise = null
      reject(req.error)
    }
    req.onblocked = () => {
      openDbPromise = null
      reject(new Error('IndexedDB bloqueado'))
    }
  })
  return openDbPromise
}

function chave(assetName, revision) {
  return `${assetName}@${revision || 'noversion'}`
}

/** Lê o `Uint8Array` cacheado, ou `null` se não existir/ versão diferente. */
export async function lerSqliteCacheado(assetName, revision) {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const req = store.get(chave(assetName, revision))
      req.onsuccess = () => {
        const row = req.result
        if (!row || !row.bytes) return resolve(null)
        // Garante Uint8Array (algumas implementações restauram como ArrayBuffer)
        const bytes = row.bytes instanceof Uint8Array
          ? row.bytes
          : new Uint8Array(row.bytes)
        resolve(bytes)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

/** Grava o `Uint8Array` no cache, removendo entradas antigas do mesmo asset. */
export async function gravarSqliteCacheado(assetName, revision, bytes) {
  if (!(bytes instanceof Uint8Array)) return
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      // limpa versões antigas do mesmo asset (assetName@*)
      const cursorReq = store.openCursor()
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (cursor) {
          const k = String(cursor.value?.key || '')
          if (k.startsWith(`${assetName}@`) && k !== chave(assetName, revision)) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          // grava a versão atual
          store.put({ key: chave(assetName, revision), bytes })
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } catch {
    /* falha ao gravar não é crítica — apenas perde o ganho de cache */
  }
}

/** Tenta cache primeiro; se falhar, usa o fetcher e grava no cache. */
export async function obterSqliteAssetBytes(assetName, revision, fetcher) {
  const cached = await lerSqliteCacheado(assetName, revision)
  if (cached) return cached
  const bytes = await fetcher()
  void gravarSqliteCacheado(assetName, revision, bytes)
  return bytes
}
