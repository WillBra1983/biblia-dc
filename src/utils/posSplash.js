/**
 * Coordenação de tarefas pesadas que NÃO devem competir com a abertura do app.
 *
 * Fluxo:
 *   - `SplashScreen` despacha `app-splash-fechado` após desaparecer de verdade.
 *   - Subscrições do RTDB, prefetch de rotas e `getRedirectResult` esperam esse
 *     evento (ou um fallback de tempo) — assim o primeiro paint do capítulo
 *     bíblico não fica disputando CPU/rede com sincronizações de nuvem.
 *
 * Por que `setTimeout` apenas não basta:
 *   - Em contas com muito conteúdo (chat com várias conversas, marcadores,
 *     planos de leitura sincronizados), as subscrições RTDB disparam vários
 *     callbacks `onValue` em sequência. Cada um faz `JSON.parse`/`setState` que
 *     bloqueia ~50–150 ms. Se isso acontece durante a animação do splash, a
 *     transição parece travada. Aguardar o splash realmente sumir resolve o
 *     contention sem prejudicar a sincronização.
 */

let splashJaFechado = false
/** UI do splash React já concluiu nesta sessão (evita repetir ao remontar AppShell). */
let splashUiConcluido = false
/** Overlay do splash já foi exibido (React 18 Strict Mode remonta sem repetir animação). */
let splashOverlayJaExibido = false
/** `biblia-pronta` já foi sinalizado (listener do splash pode montar depois). */
let bibliaProntaDisparado = false

function jaFechado() {
  return splashJaFechado
}

export function splashUiJaConcluiu() {
  return splashUiConcluido
}

/** Uma única animação de splash por sessão de abertura do app. */
export function deveExibirSplashOverlay() {
  return !splashUiConcluido && !splashOverlayJaExibido
}

export function marcarSplashOverlayExibido() {
  splashOverlayJaExibido = true
}

export function marcarSplashUiConcluido() {
  splashUiConcluido = true
  splashOverlayJaExibido = true
}

export function bibliaJaEstaPronta() {
  return bibliaProntaDisparado
}

/** Dispara `biblia-pronta` no máximo uma vez por sessão de abertura. */
export function notificarBibliaPronta() {
  if (typeof window === 'undefined') return
  if (bibliaProntaDisparado) return
  bibliaProntaDisparado = true
  try {
    window.dispatchEvent(new Event('biblia-pronta'))
  } catch {
    /* ignore */
  }
}

/** Remove splash estático do `index.html`. */
export function removerSplashHtmlInicial(opts = {}) {
  if (typeof document === 'undefined') return
  const fade = opts.fade === true
  try {
    const el = document.getElementById('splash-initial')
    if (!el) return
    if (!fade || el.dataset.splashFading === '1') {
      el.remove()
      return
    }
    el.dataset.splashFading = '1'
    el.style.transition = 'opacity 0.22s ease'
    el.style.opacity = '0'
    el.style.pointerEvents = 'none'
    window.setTimeout(() => {
      try {
        el.remove()
      } catch {
        /* ignore */
      }
    }, 240)
  } catch {
    /* ignore */
  }
}

/**
 * Marca o splash como fechado e dispara o evento global. Chamado pelo splash.
 */
export function marcarSplashFechado(opts = {}) {
  if (splashJaFechado) return
  splashJaFechado = true
  marcarSplashUiConcluido()

  const fade = opts.fade === true
  const el = typeof document !== 'undefined' ? document.getElementById('splash-initial') : null

  const dispatch = () => {
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new Event('app-splash-fechado'))
      } catch {
        /* ignore */
      }
    }
  }

  if (fade && el && el.dataset.splashFading !== '1') {
    removerSplashHtmlInicial({ fade: true })
    window.setTimeout(dispatch, 250)
  } else {
    removerSplashHtmlInicial()
    dispatch()
  }
}

/**
 * Executa `cb` assim que o splash terminar de fechar. Se já fechou, executa
 * em `queueMicrotask` para não rodar dentro do `useEffect` do chamador.
 *
 * Retorna função para cancelar (não dispara mais).
 *
 * Fallback de segurança: chama `cb` após `fallbackMs` (default 3500 ms) mesmo
 * sem evento — protege contra erros que impedem o splash de fechar.
 *
 * @param {() => void} cb
 * @param {{ fallbackMs?: number }} [opts]
 */
export function aguardarPosSplash(cb, opts = {}) {
  if (typeof window === 'undefined') return () => {}
  const fallbackMs = Number.isFinite(opts.fallbackMs) ? opts.fallbackMs : 3500
  if (jaFechado()) {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) cb()
    })
    return () => {
      cancelled = true
    }
  }
  let cancelled = false
  let timeoutId = 0
  const run = () => {
    if (cancelled) return
    cancelled = true
    window.removeEventListener('app-splash-fechado', run)
    window.clearTimeout(timeoutId)
    try {
      cb()
    } catch (e) {
      console.error('[posSplash] erro no callback:', e)
    }
  }
  window.addEventListener('app-splash-fechado', run, { once: true })
  timeoutId = window.setTimeout(run, fallbackMs)
  return () => {
    if (cancelled) return
    cancelled = true
    window.removeEventListener('app-splash-fechado', run)
    window.clearTimeout(timeoutId)
  }
}

/** Útil em testes / cenários onde o splash nunca abre (ex.: ambiente embutido). */
export function jaPassouDoSplash() {
  return splashJaFechado
}
