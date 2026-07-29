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
let listenerTapNativoPromise = null
let canalPushCriado = false

function idNotificacaoLocal(valor) {
  const texto = String(valor || `${Date.now()}-${Math.random()}`)
  let hash = 0
  for (let i = 0; i < texto.length; i += 1) {
    hash = ((hash << 5) - hash + texto.charCodeAt(i)) | 0
  }
  return Math.max(1000, Math.abs(hash % 2147482000))
}

async function garantirCanalPush(LocalNotifications) {
  if (canalPushCriado || Capacitor.getPlatform?.() !== 'android') return
  await LocalNotifications.createChannel({
    id: 'principal',
    name: 'Avisos da Bíblia DC',
    description: 'Comunicados e novidades do aplicativo',
    importance: 5,
    visibility: 1,
    sound: 'default',
    vibration: true,
  })
  canalPushCriado = true
}

/** Mostra no topo do sistema uma mensagem recebida com o app aberto. */
export async function exibirPushComoNotificacaoSistema(payload) {
  if (!Capacitor.isNativePlatform?.()) return false
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const permissao = await LocalNotifications.checkPermissions()
    if (permissao?.display !== 'granted') return false
    await garantirCanalPush(LocalNotifications)

    const notification = payload?.notification || {}
    const data = payload?.data || {}
    const item = {
      id: idNotificacaoLocal(data.avisoId),
      title: notification.title || 'Bíblia DC',
      body: notification.body || '',
      sound: 'default',
      extra: data,
    }
    if (Capacitor.getPlatform?.() === 'android') item.channelId = 'principal'
    await LocalNotifications.schedule({ notifications: [item] })
    return true
  } catch (_) {
    return false
  }
}

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
 * Registra o listener do toque imediatamente no boot do app nativo.
 * Ele não depende de login nem do registro de um novo token, pois o toque
 * pode ser entregue enquanto o aplicativo ainda está restaurando a sessão.
 */
export function ativarListenerToquePushNativo() {
  if (!Capacitor.isNativePlatform?.()) return Promise.resolve()
  if (listenerTapNativoPromise) return listenerTapNativoPromise

  listenerTapNativoPromise = Promise.all([
    import('@capacitor/push-notifications'),
    import('@capacitor/local-notifications'),
  ]).then(async ([{ PushNotifications }, { LocalNotifications }]) => {
    const despachar = (dataRecebida) => {
      try {
        const data = dataRecebida || {}
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('salvation-push-tap', {
            detail: { url: data.url, data }
          }))
        }
      } catch (_) { /* noop */ }
    }
    const pushHandle = await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (e) => despachar(e?.notification?.data)
    )
    const localHandle = await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (e) => despachar(e?.notification?.extra)
    )
    return { pushHandle, localHandle }
  })
    .catch((erro) => {
      listenerTapNativoPromise = null
      throw erro
    })

  return listenerTapNativoPromise
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
        const handles = await listenerTapNativoPromise?.catch?.(() => null)
        await handles?.localHandle?.remove?.()
        await handles?.pushHandle?.remove?.()
        // Não há `unregister` que apague o token; só removemos listeners.
        await PushNotifications.removeAllListeners?.()
        listenerTapNativoPromise = null
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

  // Precisa existir antes de qualquer registro/renovação do token.
  await ativarListenerToquePushNativo()

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
    PushNotifications.addListener('pushNotificationReceived', async (n) => {
      const payload = {
        notification: { title: n.title, body: n.body },
        data: n.data || {}
      }
      const exibidaNoSistema = await exibirPushComoNotificacaoSistema(payload)
      onMessage({ ...payload, exibidaNoSistema })
    })
  }

  return { ok: true, token }
}
