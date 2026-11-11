import { useSyncExternalStore } from 'react'
import { assinarVersaoBiblica, obterVersaoBiblica } from '../utils/bibliaVersionStore'
export const useVersaoBiblica = () => useSyncExternalStore(assinarVersaoBiblica, obterVersaoBiblica, () => 'ara')
