import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { salvationBeastiesPlugin } from './vite-plugin-beasties.js'
import { stripBiblicalAudioFromDist } from './vite-plugin-strip-biblical-audio.js'

// Versão de build (timestamp em base 36). Injetada como `__APP_VERSION__` no
// código; o `appVersionGuard` usa esse valor para detectar deploy novo e
// forçar reset de caches do SW no próximo acesso — sem precisar de "Limpar
// dados do app" manual. Cada `vite build` produz um valor diferente.
const APP_BUILD_VERSION = Date.now().toString(36)
const lowMemoryBuild = String(process.env.VITE_LOW_MEMORY_BUILD || '').toLowerCase() === '1'

export default defineConfig({
  base: process.env.VITE_BASE_URL || '/', // '/' = APK/Android; '/biblia/' = foundcine.com/biblia
  resolve: {
    // Um único `react` no grafo — lazy chunks com `@fs/...` no dev podiam carregar outra cópia.
    dedupe: ['react', 'react-dom'],
  },
  define: {
    __APP_VERSION__: JSON.stringify(APP_BUILD_VERSION)
  },
  plugins: [
    stripBiblicalAudioFromDist(),
    react(),
    // PWA: só ativo no build; no Android (Capacitor) o SW não é registrado (ver main.jsx)
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        /** Predefinição Workbox 2 MiB — o bundle principal ultrapassa (ex.: ~2,17 MB). */
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm}'],
        // Limpa caches de versões antigas do SW pra liberar storage do usuário
        // (caso contrário acumula deploy após deploy).
        cleanupOutdatedCaches: true,
        // Aplica o SW novo já na primeira navegação após o update,
        // sem precisar fechar todas as abas. `clientsClaim` faz o SW assumir
        // controle imediatamente em vez de esperar próxima visita.
        skipWaiting: true,
        clientsClaim: true,
        // index.html no precache = app abre offline. Atualizações vêm quando o SW atualiza (próxima abertura com rede).
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          // Ficheiros .sqlite: cache primeiro (são grandes, ~10–60 MB).
          // A invalidação é feita via querystring `?v=` (VITE_SQLITE_ASSET_REV) — ao mudar a versão
          // o navegador pede um URL novo, ignorando o cache antigo. Sem rede primeiro: evita
          // espera de 15 s quando conectado em rede lenta.
          {
            urlPattern: ({ request }) => {
              try {
                return new URL(request.url).pathname.endsWith('.sqlite')
              } catch {
                return false
              }
            },
            handler: 'CacheFirst',
            options: {
              cacheName: 'biblia-sqlite',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200, 206] },
              rangeRequests: true
            }
          },
          // Imagens estáticas em `public/` (banners, fotos). Cache primeiro com
          // janela curta (30 d) — assets raramente mudam mas se mudarem o
          // hash do nome (Vite) já invalida o cache; ficam aqui apenas os
          // PNG/JPG que **não** passam pelo hashing (servidos por path absoluto).
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'image' && url.origin === self.location.origin,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'imagens-app',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      },
      injectRegister: false, // não injetar script no index; registramos em main.jsx só no navegador
      manifest: {
        name: 'Bíblia DC',
        short_name: 'Bíblia DC',
        start_url: '.',
        display: 'standalone',
        theme_color: '#000000',
        background_color: '#ffffff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    }),
    // Depois do PWA: inline de CSS crítico no HTML final (Beasties).
    ...(lowMemoryBuild ? [] : [salvationBeastiesPlugin()])
  ],
  server: {
    port: 3000
  },
  publicDir: 'public',
  build: {
    chunkSizeWarningLimit: 2000,
    minify: lowMemoryBuild ? false : 'esbuild',
    // O grafo do entry ainda referencia `import('firebase/...')` (auth listener).
    // O Vite, por defeito, injeta `modulepreload` para esses chunks — o browser
    // baixa ~84 kB gzip em paralelo ao primeiro capítulo, competindo por banda e
    // CPU. O Firebase só é necessário após o paint / login; carregar sob demanda
    // melhora o boot da Bíblia.
    modulePreload: {
      resolveDependencies: (_filename, deps) =>
        deps.filter(
          (file) =>
            !/vendor-firebase|firebaseRuntime|firebase-env|vendor-pdf/i.test(String(file))
        )
    },
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'ara.sqlite' ||
              assetInfo.name === 'sql-wasm.wasm' ||
              assetInfo.name === 'sql-wasm.js') {
            return `assets/${assetInfo.name}`
          }
          return 'assets/[name]-[hash][extname]'
        },
        /**
         * Splits the initial bundle into stable vendor chunks. Before, tudo
         * caía no `index-*.js` (~1,4 MB). Separar libs estáveis:
         * - melhora **cache HTTP** (deploy só invalida o chunk que mudou);
         * - permite ao browser **baixar em paralelo**;
         * - reduz o **JS executado** no boot (chunks lazy só rodam quando a rota os pede).
         *
         * Heurística por id (caminho do módulo) — chunks pequenos porque cada
         * lib tem perfil de uso muito diferente:
         *   • `vendor-react`     — react / react-dom / scheduler (núcleo).
         *   • `vendor-mui`       — @mui/material, @mui/system, @emotion (UI base).
         *   • `vendor-mui-icons` — @mui/icons-material (centenas de ícones tree-shaken).
         *   • `vendor-firebase`  — firebase/{app,auth,database} (auth + RTDB).
         *   • `vendor-router`    — react-router-dom + history.
         *   • `vendor-sqljs`     — sql.js (compatível com `optimizeDeps.exclude`).
         *   • `vendor-utils`     — outras libs npm que sobrarem.
         *
         * Note: `canvas-confetti` é dynamic import e fica num chunk próprio
         * automaticamente; não precisa estar aqui.
         */
        manualChunks(id) {
          // Ambiente Firebase sem SDK — chunk minúsculo partilhado pelo `index` e
          // pelo `firebaseRuntime`, evitando `firebaseRuntime` importar o bundle
          // principal (ciclo index ↔ runtime).
          if (/[\\/]src[\\/]config[\\/]firebaseEnv\.js$/.test(id)) {
            return 'firebase-env'
          }
          // ── Dados estáticos grandes (catecismos, discipulado, hinos) ────
          // Separar do bundle de página/componente que os importa evita que
          // `TextoComReferencias` (importado por várias rotas) carregue 270+ KB
          // de catecismos só para resolver "(CFW 1.1)" num popup raro.
          if (/[\\/]src[\\/]data[\\/](catecismoMaior|breveCatecismo|confissaoFe)\.js$/.test(id)) {
            return 'data-westminster'
          }
          if (/[\\/]src[\\/]data[\\/](discipulado|discipuladoModulo3\.partial)\.js$/.test(id)) {
            return 'data-discipulado'
          }
          if (/[\\/]src[\\/]data[\\/]hinos\.js$/.test(id)) {
            return 'data-hinos'
          }
          if (/[\\/]src[\\/]data[\\/]devocional\.js$/.test(id)) {
            return 'data-devocional'
          }
          if (/[\\/]src[\\/]data[\\/]MaisDeDeusData\.js$/.test(id)) {
            return 'data-maisdeus'
          }

          if (!id.includes('node_modules')) return undefined

          // ── Bibliotecas vendor ───────────────────────────────────────────
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react'
          }
          if (/[\\/]node_modules[\\/]@mui[\\/]icons-material[\\/]/.test(id)) {
            return 'vendor-mui-icons'
          }
          if (/[\\/]node_modules[\\/]@mui[\\/]x-tree-view[\\/]/.test(id)) {
            // TreeView é usado só em ferramentas de estudo (lazy). Em chunk
            // próprio evita inchar `vendor-mui`.
            return 'vendor-mui-tree'
          }
          if (/[\\/]node_modules[\\/](@mui|@emotion)[\\/]/.test(id)) {
            return 'vendor-mui'
          }
          if (/[\\/]node_modules[\\/](@firebase|firebase)[\\/]/.test(id)) {
            return 'vendor-firebase'
          }
          if (/[\\/]node_modules[\\/](react-router|react-router-dom|@remix-run[\\/]router|history)[\\/]/.test(id)) {
            return 'vendor-router'
          }
          if (/[\\/]node_modules[\\/]sql\.js[\\/]/.test(id)) {
            return 'vendor-sqljs'
          }
          if (/[\\/]node_modules[\\/]pdfjs-dist[\\/]/.test(id)) {
            // Hinário/cifras carrega PDF.js via `import()` dinâmico; chunk
            // próprio mantém o bundle inicial leve.
            return 'vendor-pdf'
          }
          if (/[\\/]node_modules[\\/]react-window[\\/]/.test(id)) {
            return 'vendor-react-window'
          }
          return 'vendor-utils'
        }
      },
      maxParallelFileOps: 2
    }
  },
  // `sql.js-httpvfs` é carregado por `import()` dinâmico só quando a flag
  // VITE_USE_SQLITE_HTTPVFS=1 está ativa. Forçar `include` aqui faz o esbuild
  // pré-otimizar a lib (worker + WASM) já no `vite dev`, e em máquinas com pouca
  // memória isso resulta em "VirtualAlloc errno=1455 / out of memory" — o esbuild
  // morre, o `main.jsx` nunca é servido e o app fica preso no splash inicial.
  // Excluímos para que ela só seja resolvida quando (e se) for realmente usada.
  optimizeDeps: {
    exclude: ['sql.js-httpvfs']
  },
  assetsInclude: ['**/*.wasm'],
}) 