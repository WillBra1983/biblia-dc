import { useMemo, useSyncExternalStore } from 'react'
import { assinarMaisVistos, lerSnapshotMaisVistos, selecionarMaisVistos } from '../utils/menuMaisVistos.js'

export function useMaisVistos(uid) {
  const raw = useSyncExternalStore(assinarMaisVistos, () => lerSnapshotMaisVistos(uid), () => '{}')
  return useMemo(() => selecionarMaisVistos(raw), [raw])
}
