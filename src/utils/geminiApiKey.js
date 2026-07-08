import { Capacitor } from '@capacitor/core'
import { geminiProxyAtivo, geminiProxyConfigurado } from '../services/geminiProxyService'
import { isFirebaseConfigured } from '../config/firebaseEnv'

function trimKey(valor) {
  const s = typeof valor === 'string' ? valor.trim() : ''
  return s.length >= 8 ? s : ''
}

/** 'web' | 'android' | 'ios' */
export function plataformaGeminiAtual() {
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) {
    const p = Capacitor.getPlatform()
    if (p === 'android' || p === 'ios') return p
  }
  return 'web'
}

const ENV_POR_PLATAFORMA = {
  web: 'VITE_GEMINI_API_KEY_WEB',
  android: 'VITE_GEMINI_API_KEY_ANDROID',
  ios: 'VITE_GEMINI_API_KEY_IOS'
}

/**
 * Chave Gemini com restrição correta no Google Cloud (Sites / Android / iOS).
 * Ordem: variável da plataforma → VITE_GEMINI_API_KEY (legado, um build só).
 */
export function obterChaveGeminiApi() {
  const plat = plataformaGeminiAtual()
  const especifica = trimKey(import.meta.env[ENV_POR_PLATAFORMA[plat]])
  if (especifica) return especifica
  return trimKey(import.meta.env.VITE_GEMINI_API_KEY)
}

export function iaGeminiChaveConfigurada() {
  if (geminiProxyAtivo()) return geminiProxyConfigurado()
  return obterChaveGeminiApi().length >= 8
}

export function nomeEnvChaveGeminiPreferida() {
  const plat = plataformaGeminiAtual()
  return ENV_POR_PLATAFORMA[plat]
}

export function mensagemErroChaveGeminiAusente() {
  if (geminiProxyAtivo()) {
    if (!isFirebaseConfigured()) return 'Firebase não configurado para o proxy de IA.'
    return 'Inicie sessão para usar recursos de IA.'
  }
  const nome = nomeEnvChaveGeminiPreferida()
  return `Defina ${nome} (ou VITE_GEMINI_API_KEY) no .env e gere o build de novo.`
}
