import { Capacitor, registerPlugin } from '@capacitor/core'
import { App } from '@capacitor/app'
import { plataformaGeminiAtual } from './geminiApiKey'

const AppSigning = registerPlugin('AppSigning')

/** @type {Promise<{ packageName?: string, sha1?: string }> | null} */
let cacheIdentidadeAndroid = null

function normalizarSha1(valor) {
  return String(valor || '')
    .trim()
    .replace(/:/g, '')
    .toLowerCase()
}

async function obterIdentidadeAndroid() {
  if (cacheIdentidadeAndroid) return cacheIdentidadeAndroid

  cacheIdentidadeAndroid = (async () => {
    const fallbackPackage = 'com.bibliadc.app'
    const fallbackSha1 = normalizarSha1(import.meta.env.VITE_ANDROID_CERT_SHA1)

    if (Capacitor.isNativePlatform?.() && Capacitor.getPlatform() === 'android') {
      try {
        const info = await AppSigning.getAndroidSigningInfo()
        const packageName = String(info?.packageName || fallbackPackage).trim()
        const sha1 = normalizarSha1(info?.sha1) || fallbackSha1
        if (packageName && sha1) return { packageName, sha1 }
      } catch {
        /* fallback abaixo */
      }
    }

    if (fallbackSha1) {
      return { packageName: fallbackPackage, sha1: fallbackSha1 }
    }

    return {}
  })()

  return cacheIdentidadeAndroid
}

/**
 * Cabeçalhos exigidos pelo Google Cloud quando a chave Gemini está restrita
 * a app Android/iOS e a chamada é feita via fetch no WebView (Capacitor).
 */
export async function obterCabecalhosGeminiApi() {
  const headers = { 'Content-Type': 'application/json' }
  const plat = plataformaGeminiAtual()

  if (plat === 'android') {
    const { packageName, sha1 } = await obterIdentidadeAndroid()
    if (packageName) headers['X-Android-Package'] = packageName
    if (sha1) headers['X-Android-Cert'] = sha1
  } else if (plat === 'ios') {
    try {
      const info = await App.getInfo()
      const bundleId = String(info?.id || 'com.bibliadc.app').trim()
      if (bundleId) headers['X-Ios-Bundle-Identifier'] = bundleId
    } catch {
      headers['X-Ios-Bundle-Identifier'] = 'com.bibliadc.app'
    }
  }

  return headers
}
