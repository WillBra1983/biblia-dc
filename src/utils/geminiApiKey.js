import { Capacitor } from '@capacitor/core'

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
  return obterChaveGeminiApi().length >= 8
}

export function nomeEnvChaveGeminiPreferida() {
  const plat = plataformaGeminiAtual()
  return ENV_POR_PLATAFORMA[plat]
}

export function mensagemErroChaveGeminiAusente() {
  const nome = nomeEnvChaveGeminiPreferida()
  return `Defina ${nome} (ou VITE_GEMINI_API_KEY) no .env e gere o build de novo.`
}
