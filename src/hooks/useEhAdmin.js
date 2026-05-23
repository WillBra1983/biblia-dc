import { useEffect, useState } from 'react'

/**
 * Hook que verifica se o usuário logado tem a flag `users/{uid}/admin === true`
 * no RTDB. Compartilhado entre as várias páginas que precisam diferenciar
 * permissões administrativas (envio de avisos, curadoria de estudos, etc.).
 *
 * Retorna `{ ehAdmin, carregando }`:
 *   - `ehAdmin`: boolean — `true` apenas após confirmação positiva no servidor.
 *   - `carregando`: indica que ainda estamos verificando (útil para evitar
 *     "flashes" da UI administrativa).
 *
 * Tolerante a usuários deslogados (`!uid` → não admin, sem fetch).
 */
export function useEhAdmin(uid) {
  const [ehAdmin, setEhAdmin] = useState(false)
  const [carregando, setCarregando] = useState(Boolean(uid))

  useEffect(() => {
    let cancelado = false
    async function verificar() {
      if (!uid) {
        setEhAdmin(false)
        setCarregando(false)
        return
      }
      setCarregando(true)
      try {
        const { getFirebaseDatabase, loadFirebaseModules } = await import('../config/firebase')
        await loadFirebaseModules()
        const db = getFirebaseDatabase()
        if (!db) {
          if (!cancelado) {
            setEhAdmin(false)
            setCarregando(false)
          }
          return
        }
        const { ref, get } = await import('firebase/database')
        const snap = await get(ref(db, `users/${uid}/admin`))
        if (!cancelado) {
          setEhAdmin(snap.val() === true)
          setCarregando(false)
        }
      } catch (_) {
        if (!cancelado) {
          setEhAdmin(false)
          setCarregando(false)
        }
      }
    }
    void verificar()
    return () => {
      cancelado = true
    }
  }, [uid])

  return { ehAdmin, carregando }
}
