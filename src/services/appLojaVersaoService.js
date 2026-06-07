/**
 * Configuração remota de versões publicadas nas lojas (RTDB).
 *
 * Caminho: `appConfig/lojaVersao/{android|ios}`
 *   - versaoAtual    — última versão na loja (aviso opcional se instalada for menor)
 *   - versaoMinima   — abaixo disto: update obrigatório (só botão "Atualizar")
 *   - mensagem       — texto curto no diálogo
 *   - urlLoja        — link Play Store / App Store
 */

import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { getFirebaseDatabase } from '../config/firebase'
import { compararVersoes } from '../utils/semverCompare'

const RTDB_PATH = 'appConfig/lojaVersao'
const ANDROID_PACKAGE = 'com.bibliadc.app'

const URL_PLAY_PADRAO = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`
const URL_PLAY_NATIVO = `market://details?id=${ANDROID_PACKAGE}`

const SESSION_DISMISS_PREFIX = 'salvation:update-dismiss:'

function normalizarCfgPlataforma(val) {
  if (!val || typeof val !== 'object') return null
  const versaoAtual = String(val.versaoAtual || '').trim()
  if (!versaoAtual) return null
  return {
    versaoAtual,
    versaoMinima: String(val.versaoMinima || '').trim(),
    mensagem: String(val.mensagem || '').trim(),
    urlLoja: String(val.urlLoja || '').trim(),
  }
}

export async function obterConfigLojaVersao() {
  const db = getFirebaseDatabase()
  if (!db) return { android: null, ios: null }
  try {
    const { ref, get } = await import('firebase/database')
    const snap = await get(ref(db, RTDB_PATH))
    const val = snap.val() || {}
    return {
      android: normalizarCfgPlataforma(val.android),
      ios: normalizarCfgPlataforma(val.ios),
    }
  } catch {
    return { android: null, ios: null }
  }
}

export async function salvarConfigLojaVersao({ android, ios }) {
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase indisponível')
  const { ref, update } = await import('firebase/database')
  const patch = {}
  if (android && typeof android === 'object') {
    patch.android = {
      versaoAtual: String(android.versaoAtual || '').trim(),
      versaoMinima: String(android.versaoMinima || '').trim(),
      mensagem: String(android.mensagem || '').trim().slice(0, 400),
      urlLoja: String(android.urlLoja || '').trim().slice(0, 512),
    }
  }
  if (ios && typeof ios === 'object') {
    patch.ios = {
      versaoAtual: String(ios.versaoAtual || '').trim(),
      versaoMinima: String(ios.versaoMinima || '').trim(),
      mensagem: String(ios.mensagem || '').trim().slice(0, 400),
      urlLoja: String(ios.urlLoja || '').trim().slice(0, 512),
    }
  }
  await update(ref(db, RTDB_PATH), patch)
}

function urlLojaPadrao(plataforma) {
  if (plataforma === 'android') {
    return import.meta.env.VITE_PLAY_STORE_URL?.trim() || URL_PLAY_PADRAO
  }
  return import.meta.env.VITE_APP_STORE_URL?.trim() || ''
}

export function usuarioDispensouAvisoVersao(versaoAlvo) {
  if (!versaoAlvo || typeof sessionStorage === 'undefined') return false
  try {
    return sessionStorage.getItem(`${SESSION_DISMISS_PREFIX}${versaoAlvo}`) === '1'
  } catch {
    return false
  }
}

export function marcarAvisoVersaoDispensado(versaoAlvo) {
  if (!versaoAlvo || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(`${SESSION_DISMISS_PREFIX}${versaoAlvo}`, '1')
  } catch {
    /* ignore */
  }
}

/**
 * @returns {Promise<null | {
 *   plataforma: 'android'|'ios',
 *   versaoInstalada: string,
 *   versaoAtual: string,
 *   versaoMinima: string,
 *   obrigatoria: boolean,
 *   mensagem: string,
 *   urlLoja: string,
 * }>}
 */
export async function avaliarAtualizacaoLoja() {
  if (!Capacitor.isNativePlatform?.()) return null

  const plataforma = Capacitor.getPlatform()
  if (plataforma !== 'android' && plataforma !== 'ios') return null

  let versaoInstalada = ''
  try {
    const info = await App.getInfo()
    versaoInstalada = String(info?.version || '').trim()
  } catch {
    return null
  }
  if (!versaoInstalada) return null

  const config = await obterConfigLojaVersao()
  const cfg = plataforma === 'ios' ? config.ios : config.android
  if (!cfg?.versaoAtual) return null

  if (compararVersoes(versaoInstalada, cfg.versaoAtual) >= 0) return null

  const versaoMinima = cfg.versaoMinima || cfg.versaoAtual
  const obrigatoria = compararVersoes(versaoInstalada, versaoMinima) < 0

  if (!obrigatoria && usuarioDispensouAvisoVersao(cfg.versaoAtual)) return null

  const urlLoja = cfg.urlLoja || urlLojaPadrao(plataforma)
  if (!urlLoja) return null

  return {
    plataforma,
    versaoInstalada,
    versaoAtual: cfg.versaoAtual,
    versaoMinima,
    obrigatoria,
    mensagem: cfg.mensagem,
    urlLoja,
  }
}

export async function abrirLojaAtualizacao(urlLoja, plataforma) {
  const url = String(urlLoja || '').trim()
  if (!url) return

  if (plataforma === 'android' && Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url: URL_PLAY_NATIVO })
      return
    } catch {
      /* fallback https */
    }
  }

  await Browser.open({ url })
}
