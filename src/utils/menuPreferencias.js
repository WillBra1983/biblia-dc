export const CHAVE_MENU_PREFERENCIAS = 'menu-preferencias-v1'
const PADRAO = { visualizacao: 'cards', metricas: false }

export function lerPreferenciasMenu(storage) {
  try {
    const valor = JSON.parse((storage || globalThis.localStorage)?.getItem(CHAVE_MENU_PREFERENCIAS) || 'null')
    return { visualizacao: valor?.visualizacao === 'lista' ? 'lista' : 'cards', metricas: valor?.metricas === true }
  } catch { return { ...PADRAO } }
}

export function salvarPreferenciasMenu(valor, storage) {
  try {
    ;(storage || globalThis.localStorage)?.setItem(CHAVE_MENU_PREFERENCIAS, JSON.stringify({
      visualizacao: valor.visualizacao === 'lista' ? 'lista' : 'cards', metricas: valor.metricas === true,
    }))
  } catch { /* Navegação continua quando o armazenamento estiver indisponível. */ }
}

