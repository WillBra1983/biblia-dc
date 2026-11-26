// Rola somente o painel do menu, sem deslocar a página que está atrás dele.
export function alinharOpcaoMenu(alvo, espacoFinal) {
  if (!alvo?.isConnected || !espacoFinal) return
  let painel = alvo.parentElement
  while (painel && !/(auto|scroll)/.test(getComputedStyle(painel).overflowY)) {
    painel = painel.parentElement
  }
  if (!painel) return

  espacoFinal.style.height = '0px'
  const topo = Math.max(0, painel.scrollTop + alvo.getBoundingClientRect().top
    - painel.getBoundingClientRect().top - painel.clientTop - 8)
  // Mesmo o último grupo precisa de espaço para alcançar o topo ao recolher.
  const falta = Math.max(0, topo - (painel.scrollHeight - painel.clientHeight))
  espacoFinal.style.height = `${Math.ceil(falta)}px`
  painel.scrollTo({ top: topo, behavior: 'instant' })
}
