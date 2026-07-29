/* eslint-disable */
/**
 * Service Worker dedicado ao Firebase Cloud Messaging (Web Push).
 *
 * Recebe a configuração via query string ao ser registrado, ex.:
 *   /firebase-messaging-sw.js?apiKey=...&projectId=biblia-dc&messagingSenderId=...&appId=...
 *
 * O cliente faz isso em `src/services/notificacoesPushService.js`. Assim
 * evitamos hardcode de credenciais e mantemos um único `.env`.
 *
 * Este SW é independente do Workbox/vite-plugin-pwa — eles convivem porque
 * cada um tem seu próprio escopo/arquivo.
 */

importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js')

const sp = new URL(self.location).searchParams
const cfg = {}
;['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'databaseURL']
  .forEach((k) => {
    const v = sp.get(k)
    if (v) cfg[k] = v
  })

if (cfg.projectId && cfg.messagingSenderId) {
  firebase.initializeApp(cfg)
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const titulo = payload?.notification?.title || 'Bíblia DC'
    const corpo = payload?.notification?.body || ''
    const url = (payload?.data && payload.data.url) || '/'
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url, ...(payload?.data || {}) },
      tag: payload?.data?.tipo || 'salvation-push'
    })
  })
}

// Ao clicar na notificação: foca a janela existente ou abre nova.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification?.data || {}
  let url = data.url || '/'
  if (data.acao === 'atualizar_app') {
    const ua = String(self.navigator?.userAgent || '')
    if (/android/i.test(ua)) {
      url = 'https://play.google.com/store/apps/details?id=com.bibliadc.app'
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      url = 'https://apps.apple.com/br/app/biblia-do-discipulo-cristao/id6772898342'
    } else {
      url = 'https://foundcine.com/biblia/'
    }
  }
  event.waitUntil((async () => {
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of wins) {
      try {
        await w.focus()
        if ('navigate' in w) await w.navigate(url)
        return
      } catch (_) { /* tenta a próxima */ }
    }
    if (clients.openWindow) await clients.openWindow(url)
  })())
})
