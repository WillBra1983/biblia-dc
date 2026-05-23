/**
 * Serviço unificado de Push Notifications (FCM).
 *
 * Detecta a plataforma e usa o caminho correto:
 *
 *  - **Capacitor nativo (Android/iOS)**: `@capacitor/push-notifications`
 *    (que internamente fala com FCM no Android e APNs → FCM bridge no iOS).
 *  - **Web/PWA**: `firebase/messaging` + Service Worker
 *    (`/firebase-messaging-sw.js`).
 *
 * Em ambos os casos, registramos o token resultante em
 * `/users/{uid}/fcmTokens/{chaveCurta}` no RTDB. As Cloud Functions usam
 * essa lista para mandar push para todos os aparelhos do usuário.
 *
 * IMPORTANTE: este módulo NÃO chama `requestPermissions` automaticamente.
 * Quem pede permissão é a tela de Configurações (ou outro fluxo
 * acionado pelo usuário). Pedir sem gesto explícito leva navegadores
 * (Chrome/Edge) a bloquearem silenciosamente o aplicativo.
 */

import { Capacitor } from '@capacitor/core'
import { getFirebaseApp, getFirebaseDatabase, loadFirebaseModules } from '../config/firebase'

/** Token FCM atualmente ativo (na sessão atual). */
let tokenAtual = null
let listenerInbound = null

/**
 * Converte qualquer string para uma chave segura do RTDB
 * (não pode conter `.`, `#`, `$`, `[`, `]`, `/`).
 */
function chaveSegura(s) {
  return btoa(unescape(encodeURIComponent(String(s))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
    .slice(0, 128)
}

function plataformaAtual() {
  if (Capacitor.isNativePlatform?.()) {
    return Capacitor.getPlatform() // 'android' | 'ios'
  }
  return 'web'
}

/**
 * Lê a VAPID public key para Web Push do `.env`. Você precisa gerar
 * essa chave no Firebase Console → Project Settings → Cloud Messaging
 * → Web configuration → Generate key pair.
 */
function vapidKey() {
  const k = import.meta.env?.VITE_FIREBASE_VAPID_KEY
  return typeof k === 'string' ? k.trim() : ''
}

/** Status interno do registro. */
export function getTokenAtual() {
  return tokenAtual
}

/**
 * Salva (ou atualiza) o token FCM do usuário no RTDB.
 * @param {string} uid
 * @param {string} token
 */
async function persistirToken(uid, token) {
  if (!uid || !token) return
  const db = getFirebaseDatabase()
  if (!db) return
  const { ref, update, serverTimestamp } = await import('firebase/database')
  const key = chaveSegura(token)
  await update(ref(db, `users/${uid}/fcmTokens/${key}`), {
    token,
    plataforma: plataformaAtual(),
    userAgent: typeof navigator !== 'undefined' ? String(navigator.userAgent).slice(0, 240) : '',
    criadoEm: serverTimestamp()
  })
}

/**
 * Remove o token do RTDB (ao deslogar ou desativar push).
 * @param {string} uid
 * @param {string} token
 */
async function removerToken(uid, token) {
  if (!uid || !token) return
  const db = getFirebaseDatabase()
  if (!db) return
  const { ref, remove } = await import('firebase/database')
  const key = chaveSegura(token)
  await remove(ref(db, `users/${uid}/fcmTokens/${key}`)).catch(() => {})
}

/**
 * Ativa push notifications para o usuário (pede permissão se ainda
 * não tiver, registra o token e começa a escutar mensagens). Idempotente.
 *
 * @param {object} params
 * @param {string} params.uid
 * @param {(payload: any) => void} [params.onMessage]
 *   Callback chamado quando o app está em primeiro plano e recebe push.
 * @returns {Promise<{ok: true, token: string} | {ok: false, motivo: string}>}
 */
export async function ativarPushNotifications({ uid, onMessage } = {}) {
  if (!uid) return { ok: false, motivo: 'usuario_nao_autenticado' }

  try {
    if (plataformaAtual() === 'web') {
      return await ativarPushWeb({ uid, onMessage })
    }
    return await ativarPushNativo({ uid, onMessage })
  } catch (e) {
    return { ok: false, motivo: e?.message || 'erro_desconhecido' }
  }
}

/**
 * Desativa push notifications: remove token do RTDB e desliga listeners.
 * @param {string} uid
 */
export async function desativarPushNotifications(uid) {
  try {
    if (tokenAtual && uid) {
      await removerToken(uid, tokenAtual)
    }
    if (plataformaAtual() === 'web') {
      // O token continua válido no Firebase; podemos optar por deletá-lo.
      try {
        const { getMessaging, deleteToken } = await import('firebase/messaging')
        const app = getFirebaseApp()
        if (app) await deleteToken(getMessaging(app))
      } catch (_) { /* tudo bem */ }
    } else {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        // Não há `unregister` que apague o token; só removemos listeners.
        await PushNotifications.removeAllListeners?.()
      } catch (_) { /* tudo bem */ }
    }
  } finally {
    tokenAtual = null
    listenerInbound = null
  }
}

// ───────────────────────── WEB / PWA ─────────────────────────

async function ativarPushWeb({ uid, onMessage }) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false, motivo: 'sem_service_worker' }
  }
  if (!('Notification' in window)) {
    return { ok: false, motivo: 'sem_api_notification' }
  }

  await loadFirebaseModules()
  const app = getFirebaseApp()
  if (!app) return { ok: false, motivo: 'firebase_nao_configurado' }

  const key = vapidKey()
  if (!key) return { ok: false, motivo: 'vapid_key_ausente' }

  // Permissão (gesto do usuário deve ter sido feito antes desta chamada)
  let perm = Notification.permission
  if (perm === 'default') perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, motivo: 'permissao_negada' }

  // Registra o Service Worker dedicado ao FCM, passando a config
  // via query string (assim evitamos hardcode no SW e mantemos um
  // único `.env`). Veja `public/firebase-messaging-sw.js`.
  const params = new URLSearchParams()
  const envCfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
  }
  for (const [k, v] of Object.entries(envCfg)) {
    if (typeof v === 'string' && v.trim()) params.set(k, v.trim())
  }
  if (!params.get('messagingSenderId')) {
    return { ok: false, motivo: 'messaging_sender_id_ausente' }
  }
  const swUrl = `${import.meta.env.BASE_URL || '/'}firebase-messaging-sw.js?${params.toString()}`
  const reg = await navigator.serviceWorker.register(swUrl)

  const { getMessaging, getToken, onMessage: onMsg } = await import('firebase/messaging')
  const messaging = getMessaging(app)

  const token = await getToken(messaging, {
    vapidKey: key,
    serviceWorkerRegistration: reg
  })

  if (!token) return { ok: false, motivo: 'token_nao_emitido' }

  tokenAtual = token
  await persistirToken(uid, token)

  if (typeof onMessage === 'function') {
    listenerInbound = onMsg(messaging, onMessage)
  }

  return { ok: true, token }
}

// ────────────────────── ANDROID / iOS ───────────────────────

async function ativarPushNativo({ uid, onMessage }) {
  const { PushNotifications } = await import('@capacitor/push-notifications')

  // Pede permissão (só Android 13+ exige diálogo; iOS sempre exige)
  const perm = await PushNotifications.requestPermissions()
  if (perm.receive !== 'granted') {
    return { ok: false, motivo: 'permissao_negada' }
  }

  // Promise que resolve no primeiro `registration` ou `registrationError`
  const tokenPromise = new Promise((resolve, reject) => {
    const remRegistr = PushNotifications.addListener('registration', (t) => {
      remRegistr.then?.((h) => h.remove())
      resolve(t.value)
    })
    const remErr = PushNotifications.addListener('registrationError', (e) => {
      remErr.then?.((h) => h.remove())
      reject(new Error(e?.error || 'registrationError'))
    })
  })

  await PushNotifications.register()
  const token = await tokenPromise
  tokenAtual = token
  await persistirToken(uid, token)

  // Mensagens em foreground
  if (typeof onMessage === 'function') {
    PushNotifications.addListener('pushNotificationReceived', (n) => {
      onMessage({
        notification: { title: n.title, body: n.body },
        data: n.data || {}
      })
    })
  }

  // Ao tocar na notificação enquanto app está fechado/background
  PushNotifications.addListener('pushNotificationActionPerformed', (e) => {
    try {
      const url = e?.notification?.data?.url
      if (url && typeof window !== 'undefined') {
        // O Capacitor abre o app; navegamos para a tela certa.
        window.dispatchEvent(new CustomEvent('salvation-push-tap', { detail: { url, data: e.notification.data } }))
      }
    } catch (_) { /* noop */ }
  })

  return { ok: true, token }
}
