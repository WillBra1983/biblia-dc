import { useEffect, useState } from 'react'
import { estaSemRede } from '../utils/conteudoLocalOffline'

/** `true` quando o navegador reporta conexão disponível. */
export function useRedeDisponivel() {
  const [online, setOnline] = useState(() => !estaSemRede())

  useEffect(() => {
    const atualizar = () => setOnline(!estaSemRede())
    window.addEventListener('online', atualizar)
    window.addEventListener('offline', atualizar)
    return () => {
      window.removeEventListener('online', atualizar)
      window.removeEventListener('offline', atualizar)
    }
  }, [])

  return online
}
