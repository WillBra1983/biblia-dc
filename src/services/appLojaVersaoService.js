/**
 * Configuração remota de versões publicadas nas lojas (RTDB).
 *
 * Caminho: `appConfig/lojaVersao/{android|ios}`
 *   - versaoAtual    — versão **publicada** na loja (Play API / admin após publicar)
 *   - versionCode    — versionCode em produção na Play (quando disponível)
 *   - versaoBuild    — último build local registrado (sync antes de publicar; app ignora)
 *   - mensagem       — texto curto no diálogo
 *   - urlLoja        — link Play Store / App Store
 *
 * O aviso de atualização é sempre opcional (nunca bloqueia o app).
 */

import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { getFirebaseDatabase } from '../config/firebase'
import { compararVersoes } from '../utils/semverCompare'
import { abrirUrlExterna } from '../utils/abrirUrlExterna'

const RTDB_PATH = 'appConfig/lojaVersao'
const ANDROID_PACKAGE = 'com.bibliadc.app'

const URL_PLAY_PADRAO = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`
const URL_PLAY_NATIVO = `market://details?id=${ANDROID_PACKAGE}`

const DISMISS_PREFIX = 'salvation:update-dismiss:'

function parseVersionCode(raw) {
  const n = parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function normalizarCfgPlataforma(val) {
  if (!val || typeof val !== 'object') return null
  const versaoAtual = String(val.versaoAtual || '').trim()
  if (!versaoAtual) return null
  return {
    versaoAtual,
    versionCode: parseVersionCode(val.versionCode),
    mensagem: String(val.mensagem || '').trim(),
    urlLoja: String(val.urlLoja || '').trim(),
  }
}

/** Instalado >= loja quando versionCode bate ou semver é igual/maior. */
function instaladoEstaAtualizado(versaoInstalada, buildInstalado, cfg) {
  const buildLoja = cfg.versionCode
  const buildApp = parseVersionCode(buildInstalado)

  if (buildLoja != null && buildApp != null) {
    if (buildApp >= buildLoja) return true
    return false
  }

  return compararVersoes(versaoInstalada, cfg.versaoAtual) >= 0
}


/** Chave única por versão alvo (semver + code quando existir). */
function chaveAvisoVersao(cfg) {
  if (cfg.versionCode != null) return `${cfg.versaoAtual}#${cfg.versionCode}`
  return cfg.versaoAtual
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
      mensagem: String(android.mensagem || '').trim().slice(0, 400),
      urlLoja: String(android.urlLoja || '').trim().slice(0, 512),
    }
  }
  if (ios && typeof ios === 'object') {
    patch.ios = {
      versaoAtual: String(ios.versaoAtual || '').trim(),
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
  if (!versaoAlvo || typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(`${DISMISS_PREFIX}${versaoAlvo}`) === '1'
  } catch {
    return false
  }
}

export function marcarAvisoVersaoDispensado(versaoAlvo) {
  if (!versaoAlvo || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${versaoAlvo}`, '1')
  } catch {
    /* ignore */
  }
}

/**
 * @returns {Promise<null | {
 *   plataforma: 'android'|'ios',
 *   versaoInstalada: string,
 *   versaoAtual: string,
 *   mensagem: string,
 *   urlLoja: string,
 * }>}
 */
export async function avaliarAtualizacaoLoja() {
  if (!Capacitor.isNativePlatform?.()) return null

  const plataforma = Capacitor.getPlatform()
  if (plataforma !== 'android' && plataforma !== 'ios') return null

  let versaoInstalada = ''
  let buildInstalado = ''
  try {
    const info = await App.getInfo()
    versaoInstalada = String(info?.version || '').trim()
    buildInstalado = String(info?.build || '').trim()
  } catch {
    return null
  }
  if (!versaoInstalada) return null

  const config = await obterConfigLojaVersao()
  const cfg = plataforma === 'ios' ? config.ios : config.android
  if (!cfg?.versaoAtual) return null

  if (instaladoEstaAtualizado(versaoInstalada, buildInstalado, cfg)) return null

  const chave = chaveAvisoVersao(cfg)
  if (usuarioDispensouAvisoVersao(chave)) return null

  const urlLoja = cfg.urlLoja || urlLojaPadrao(plataforma)
  if (!urlLoja) return null

  return {
    plataforma,
    versaoInstalada,
    buildInstalado,
    versaoAtual: cfg.versaoAtual,
    chaveAviso: chave,
    mensagem: cfg.mensagem,
    urlLoja,
  }
}

export async function abrirLojaAtualizacao(urlLoja, plataforma) {
  const urlHttps = String(urlLoja || urlLojaPadrao(plataforma) || '').trim()
  if (!urlHttps) return

  const urls =
    plataforma === 'android' && Capacitor.isNativePlatform()
      ? [URL_PLAY_NATIVO, urlHttps]
      : [urlHttps]

  for (const url of urls) {
    try {
      await abrirUrlExterna(url)
      return
    } catch {
      /* tenta próximo */
    }
  }

  try {
    window.open(urlHttps, '_blank', 'noopener,noreferrer')
  } catch {
    /* ignore */
  }
}
