import { useSyncExternalStore } from 'react'
import {
  obterVersiculosMarcados,
  CORES_DISPONIVEIS
} from '../services/versiculosMarcadosService'

/**
 * Estado global das marcações de versículo, com um único listener global.
 *
 * Antes: cada `VersiculoMarcavel` registrava o seu próprio
 * `window.addEventListener('versiculosMarcadosChange', …)` e chamava
 * `versiculoEstaMarcado(...)`, que faz `JSON.parse` no localStorage. Para um
 * capítulo com 176 versículos (Salmos 119) eram 176 listeners + 176
 * `JSON.parse` a cada evento. Aqui mantemos **1 listener** e **1 parse** por
 * mudança; cada chamada de hook só faz lookup `O(1)` num objeto memoizado.
 */

let mapaCache = null
const listeners = new Set()
let registrouEvento = false

function recarregar() {
  mapaCache = obterVersiculosMarcados() || {}
}

function notificar() {
  recarregar()
  for (const l of listeners) {
    try { l() } catch (e) { console.warn('[useVersiculoMarcado]', e) }
  }
}

function garantirEvento() {
  if (registrouEvento || typeof window === 'undefined') return
  registrouEvento = true
  window.addEventListener('versiculosMarcadosChange', notificar)
}

function subscribe(cb) {
  garantirEvento()
  if (mapaCache == null) recarregar()
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function obterMapa() {
  if (mapaCache == null) recarregar()
  return mapaCache
}

const CORES_POR_ID = new Map(CORES_DISPONIVEIS.map((c) => [c.id, c]))

/**
 * Retorna `{ marcado, corInfo }` para um versículo. `marcado` é o objeto
 * gravado (ou `null`); `corInfo` é o objeto de `CORES_DISPONIVEIS` (ou `null`).
 *
 * Referências ficam estáveis entre renders enquanto a marcação não muda — o
 * que permite que `VersiculoMarcavel` seja `React.memo` sem re-renderizar
 * desnecessariamente.
 */
export function useVersiculoMarcado(livroId, capitulo, versiculo) {
  const chave = `${livroId}-${capitulo}-${versiculo}`
  const getSnapshot = () => {
    const m = obterMapa()[chave] || null
    return m
  }
  const marcado = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const corInfo = marcado ? (CORES_POR_ID.get(marcado.corId) || CORES_DISPONIVEIS[0]) : null
  return { marcado, corInfo }
}
