import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export function useLeituraTelaCheia() {
  const location = useLocation()
  const navigate = useNavigate()
  const telaCheia = useMemo(
    () => new URLSearchParams(location.search).get('telaCheia') === '1',
    [location.search]
  )

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

  return { telaCheia, entrarTelaCheia, sairTelaCheia }
}
