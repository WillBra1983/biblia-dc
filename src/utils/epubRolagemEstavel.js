export function cancelarLimpezaEpub(manager) {
  clearTimeout(manager.limpezaRolagemTimer)
  manager.geracaoLimpezaRolagem = (manager.geracaoLimpezaRolagem || 0) + 1
}

export function atualizarPaginasEpub(manager, offset = manager.settings.offset || 0) {
  cancelarLimpezaEpub(manager)
  const geracao = manager.geracaoLimpezaRolagem
  const bounds = manager.bounds()
  const tarefas = manager.views.all().filter((view) => manager.isVisible(view, offset, offset, bounds)).map(async (view) => {
    if (!view.displayed) await view.display(manager.request)
    view.show()
  })

  // Não descarte iframes durante a inércia do gesto. A fila antiga podia
  // destruir uma seção que já tinha voltado à tela no sentido contrário.
  manager.limpezaRolagemTimer = setTimeout(() => {
    manager.q.enqueue(() => {
      if (geracao === manager.geracaoLimpezaRolagem) return limparPaginasEpub(manager, offset)
    })
  }, 500)
  return Promise.all(tarefas)
}

export function limparPaginasEpub(manager, offset) {
  const bounds = manager.bounds()
  for (const view of manager.views.all()) {
    if (view.displayed && !manager.isVisible(view, offset, offset, bounds)) view.destroy()
  }
  if (manager.views.all().some((view) => view.displayed)) return manager.trim()
}
