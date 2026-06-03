import { useEffect } from 'react'
import {
  bibliaJaEstaPronta,
  marcarSplashFechado,
  splashUiJaConcluiu,
} from '../utils/posSplash'

/**
 * Nativo e web: #splash-initial (só imagem) permanece até `biblia-pronta`; React só faz fade-out.
 */
function SplashImageController({ onComplete, maxMs = 12000 }) {
  useEffect(() => {
    if (splashUiJaConcluiu()) {
      onComplete?.()
      return undefined
    }

    let cancelled = false

    const finalizar = () => {
      if (cancelled || splashUiJaConcluiu()) return
      cancelled = true
      marcarSplashFechado({ fade: true })
      window.setTimeout(() => onComplete?.(), 260)
    }

    const onPronta = () => finalizar()

    window.addEventListener('biblia-pronta', onPronta)
    const timeoutTeto = window.setTimeout(finalizar, maxMs)

    if (bibliaJaEstaPronta()) {
      finalizar()
    }

    return () => {
      cancelled = true
      window.removeEventListener('biblia-pronta', onPronta)
      window.clearTimeout(timeoutTeto)
    }
  }, [onComplete, maxMs])

  return null
}

export default function SplashScreen(props) {
  return <SplashImageController {...props} />
}
