import { useEffect, useRef, useState } from 'react'

export function useControlesLeitura(immersive, ampliar) {
  const [barraVisivel, setBarraVisivel] = useState(true)
  const ultimo = useRef(null)
  const bloqueadoAte = useRef(0)
  const atual = useRef({ immersive, ampliar })
  atual.current = { immersive, ampliar }
  useEffect(() => {
    setBarraVisivel(true)
    ultimo.current = null
  }, [immersive])
  const registrarToque = () => {
    const agora = Date.now()
    if (agora < bloqueadoAte.current) return
    if (atual.current.immersive) {
      setBarraVisivel(v => !v)
      bloqueadoAte.current = agora + 350
      return
    }
    if (ultimo.current !== null && agora - ultimo.current < 350) {
      ultimo.current = null
      bloqueadoAte.current = agora + 500
      atual.current.ampliar?.()
    } else ultimo.current = agora
  }
  return { barraVisivel, registrarToque }
}
