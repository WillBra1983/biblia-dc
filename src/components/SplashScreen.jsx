import { useEffect, useRef } from 'react'
import {
  bibliaJaEstaPronta,
  marcarSplashFechado,
  splashUiJaConcluiu,
} from '../utils/posSplash'

/**
 * Nativo e web: #splash-initial (só imagem) permanece até `biblia-pronta`; React só faz fade-out.
 */
function SplashImageController({ onComplete, maxMs = 12000 }) {
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  useEffect(() => {
    if (splashUiJaConcluiu()) {
      onCompleteRef.current?.()
      return undefined
    }

    let cancelled = false

    const finalizar = () => {
      if (cancelled || splashUiJaConcluiu()) return
      cancelled = true
      marcarSplashFechado({ fade: true })
      window.setTimeout(() => onCompleteRef.current?.(), 260)
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
  }, [maxMs])

  return null
}

export default function SplashScreen(props) {
  return <SplashImageController {...props} />
}
