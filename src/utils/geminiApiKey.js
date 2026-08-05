import { geminiProxyConfigurado } from '../services/geminiProxyService'
import { isFirebaseConfigured } from '../config/firebaseEnv'

export function iaGeminiChaveConfigurada() {
  return geminiProxyConfigurado()
}

export function mensagemErroChaveGeminiAusente() {
  if (!isFirebaseConfigured()) return 'Firebase não configurado para o proxy de IA.'
  return 'Inicie sessão para usar recursos de IA.'
}
