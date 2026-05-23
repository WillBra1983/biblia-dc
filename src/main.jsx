import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App, { createAppRouter } from './App'
import { ZoomResetProvider } from './contexts/ZoomResetContext'
import './index.css'
import { initDB as preaquecerBibliaDB } from './services/bibliaService'
import { executarAppVersionGuard } from './utils/appVersionGuard'
import { instalarRecuperacaoChunkPerdido } from './utils/chunkLoadRecovery'
import { removerSplashHtmlInicial } from './utils/posSplash'

instalarRecuperacaoChunkPerdido()
removerSplashHtmlInicial()

// Guard de versão do bundle: se o último build for diferente do que estava
// guardado no `localStorage`, limpa caches do Service Worker e força reload
// antes de inicializar React/Firebase/SQLite. Resolve o caso clássico de
// usuário "preso" na versão antiga do PWA após um deploy.
// Síncrono na maioria das vezes (lê localStorage). Só assincroniza no path
// raro de novo deploy — e aí o reload acontece em sequência.
const versionGuardPromise = executarAppVersionGuard()

// Pré-aquece o SQLite da Bíblia em paralelo ao splash.
// Quando o splash terminar, `initDB()` já estará pronto (ou perto disso),
// reduzindo a janela de "tela preta" entre splash e o primeiro capítulo.
// Evita pré-aquecer se estamos no meio de um reload por upgrade de versão
// (já vai recarregar; gastar IO agora é desperdício).
versionGuardPromise
  .then((vaiRecarregar) => {
    if (!vaiRecarregar) preaquecerBibliaDB().catch(() => {})
  })
  .catch(() => {
    preaquecerBibliaDB().catch(() => {})
  })

// As famílias `@fontsource/*` da leitura saíram do caminho crítico:
// agora são carregadas dinamicamente por `src/utils/fontLoader.js` quando o
// usuário realmente escolhe uma família (ou ao abrir o seletor pela primeira
// vez). Isso tira centenas de KB do bundle inicial.

// Registra Service Worker só no navegador (PWA offline). No Capacitor/APK não registra.
if (typeof window !== 'undefined' && !window.Capacitor) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({ immediate: true })

    // Verifica updates em três momentos para minimizar a janela em que o
    // usuário fica preso em bundle antigo:
    //   1. Ao voltar para a aba (visibilitychange) — caso clássico.
    //   2. Periodicamente a cada 5 minutos (usuário com aba aberta há muito).
    //   3. Ao reconectar à internet (offline → online).
    // `updateSW(true)` força reload se houver SW novo (combinado com
    // `skipWaiting`/`clientsClaim` no Workbox, é instantâneo).
    const checarAtualizacao = () => {
      try {
        updateSW(true)
      } catch {
        /* ignore */
      }
    }

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checarAtualizacao()
    })
    window.addEventListener('online', checarAtualizacao)
    setInterval(checarAtualizacao, 5 * 60 * 1000)
  }).catch(() => {})
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)
}

const basename = (import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/')
  ? import.meta.env.BASE_URL.replace(/\/$/, '')
  : ''

const isNativeApp = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.() === true
const router = createAppRouter(basename, isNativeApp)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ZoomResetProvider>
      <App router={router} />
    </ZoomResetProvider>
  </React.StrictMode>
) 