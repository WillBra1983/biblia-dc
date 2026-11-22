// Complementa overscroll-behavior em WebViews que ainda deixam a página
// acompanhar o gesto ao atingir o começo/fim do menu.
export function conterRolagemMenu(menu) {
  let inicio = null
  const iniciar = evento => {
    inicio = evento.touches.length === 1 ? { x: evento.touches[0].clientX, y: evento.touches[0].clientY } : null
  }
  const mover = evento => {
    if (!inicio || evento.touches.length !== 1) return
    const toque = evento.touches[0]
    const dx = toque.clientX - inicio.x
    const dy = toque.clientY - inicio.y
    inicio = { x: toque.clientX, y: toque.clientY }
    if (Math.abs(dx) > Math.abs(dy)) {
      if (evento.cancelable) evento.preventDefault()
      return
    }
    // Respeita listas internas roláveis, além da rolagem principal.
    for (let alvo = evento.target; alvo; alvo = alvo.parentElement) {
      const limite = alvo.scrollHeight - alvo.clientHeight
      if (limite > 1 && ((dy > 0 && alvo.scrollTop > 0) || (dy < 0 && alvo.scrollTop < limite - 1))) return
      if (alvo === menu) break
    }
    if (dy !== 0 && evento.cancelable) evento.preventDefault()
  }
  const terminar = () => { inicio = null }
  menu.addEventListener('touchstart', iniciar, { passive: true })
  menu.addEventListener('touchmove', mover, { passive: false })
  menu.addEventListener('touchend', terminar)
  menu.addEventListener('touchcancel', terminar)
  return () => {
    menu.removeEventListener('touchstart', iniciar)
    menu.removeEventListener('touchmove', mover)
    menu.removeEventListener('touchend', terminar)
    menu.removeEventListener('touchcancel', terminar)
  }
}
