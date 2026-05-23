import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { abrirCanalYoutube } from '../utils/youtubeChannel'

/**
 * Rota reservada: abre o canal no navegador/app YouTube e volta à tela anterior.
 * Pelo menu, o canal também pode abrir direto (sem navegar para esta rota).
 */
export default function YouTube() {
  const navigate = useNavigate()
  const { isDarkMode } = useApp()

  useEffect(() => {
    void (async () => {
      await abrirCanalYoutube(isDarkMode)
      navigate(-1)
    })()
  }, [navigate, isDarkMode])

  return null
}
