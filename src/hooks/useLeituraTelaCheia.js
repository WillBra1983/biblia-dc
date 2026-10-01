import { useCallback, useEffect, useMemo } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { useLocation, useNavigate } from 'react-router-dom'

const ReadingFullscreen = registerPlugin('ReadingFullscreen')

export function useLeituraTelaCheia() {
  const location = useLocation()
  const navigate = useNavigate()
  const telaCheia = useMemo(
    () => new URLSearchParams(location.search).get('telaCheia') === '1',
    [location.search]
  )
  const biblioteca = location.pathname.startsWith('/biblioteca')
  useEffect(() => {
    if (!biblioteca || Capacitor.getPlatform() !== 'android') return
    void ReadingFullscreen.setEnabled({ enabled: telaCheia }).catch(() => {})
    return () => { void ReadingFullscreen.setEnabled({ enabled: false }).catch(() => {}) }
  }, [biblioteca, telaCheia])

  const atualizarRota = useCallback((ativa) => {
    const params = new URLSearchParams(location.search)
    if (ativa) params.set('telaCheia', '1')
    else params.delete('telaCheia')
    const search = params.toString()
    navigate(`${location.pathname}${search ? `?${search}` : ''}`, { replace: true })
  }, [location.pathname, location.search, navigate])

  const entrarTelaCheia = useCallback(() => {
    atualizarRota(true)
    if (!document.fullscreenElement && document.documentElement?.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }, [atualizarRota])

  const sairTelaCheia = useCallback(() => {
    atualizarRota(false)
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {})
    }
  }, [atualizarRota])

  useEffect(() => {
    if (!telaCheia) return
    const changed = () => { if (!document.fullscreenElement) atualizarRota(false) }
    document.addEventListener('fullscreenchange', changed)
    return () => document.removeEventListener('fullscreenchange', changed)
  }, [telaCheia, atualizarRota])

  return { telaCheia, entrarTelaCheia, sairTelaCheia }
}
