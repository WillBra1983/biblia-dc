/**
 * Login Google no navegador (PWA / foundcine.com).
 *
 * IMPORTANTE — por que popup e não redirect:
 *   O `authDomain` (biblia-dc.firebaseapp.com) é diferente do domínio do app
 *   (foundcine.com). Desde o Safari (ITP) e o Chrome 115+ (particionamento de
 *   armazenamento de terceiros), o `signInWithRedirect` cross-domain perde o
 *   estado: ao voltar do Google, `getRedirectResult` devolve null e o usuário
 *   cai de volta na tela de login — o "loop" relatado no celular.
 *   O `signInWithPopup` não sofre esse problema porque a janela do Firebase
 *   conclui o login e devolve a credencial via postMessage para a página de
 *   origem, sem depender de armazenamento cross-domain persistente.
 *   Ref.: https://firebase.google.com/docs/auth/web/redirect-best-practices
 */
export const GOOGLE_REDIRECT_PENDING_KEY = 'salvation-google-redirect-pending'

/** Código de erro sintético para navegador embutido (webview de apps). */
export const EMBEDDED_BROWSER_ERROR_CODE = 'salvation/embedded-browser'

/**
 * Detecta navegadores embutidos (webview dentro de apps como Instagram,
 * Facebook, Messenger, TikTok, WhatsApp, etc.). O Google bloqueia o OAuth
 * nessas webviews (`disallowed_useragent`, 403) — a tela de login não abre.
 */
export function isEmbeddedBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''

  // Apps que injetam token próprio no UA.
  const padroesEmbedded = [
    'FBAN', 'FBAV', 'FB_IAB', 'FBIOS', // Facebook / Messenger
    'Instagram',
    'Line/',
    'Twitter', 'TwitterAndroid',
    'MicroMessenger', // WeChat
    'WhatsApp',
    'TikTok', 'BytedanceWebview', 'musical_ly',
    'Snapchat',
    'Pinterest',
    'LinkedInApp',
    'KAKAOTALK',
    'GSA/', // Google Search App (algumas versões bloqueiam OAuth)
  ]
  if (padroesEmbedded.some((p) => ua.includes(p))) return true

  // Android WebView genérico: "; wv)" no UA (não é o Chrome standalone).
  if (/\bwv\b/.test(ua) && /Android/.test(ua)) return true

  return false
}

export function isEmbeddedBrowserIos() {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
}

/**
 * No Android, abre a mesma rota no Chrome fora do navegador interno. Mantém
 * query string e, quando possível, o fragmento para não perder o destino do
 * link compartilhado. O iOS não oferece uma URL pública confiável para forçar
 * o Safari; nesse caso a interface orienta o usuário a usar o menu do app.
 */
export function abrirPaginaAtualNoChrome(urlAlvo) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  if (!/Android/i.test(navigator.userAgent || '')) return false

  const atual = new URL(urlAlvo || window.location.href)
  const caminho = `${atual.host}${atual.pathname}${atual.search}`
  const fallback = encodeURIComponent(atual.href)
  window.location.href =
    `intent://${caminho}#Intent;scheme=${atual.protocol.replace(':', '')};` +
    `package=com.android.chrome;S.browser_fallback_url=${fallback};end`
  return true
}

export async function copiarUrlAtual(urlAlvo) {
  if (typeof window === 'undefined') return false
  const url = String(urlAlvo || window.location.href)
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    return false
  }
}

function marcarRedirectGooglePendente() {
  try {
    sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

export function limparRedirectGooglePendente() {
  try {
    sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY)
  } catch {
    /* ignore */
  }
}

export function redirectGoogleEstaPendente() {
  try {
    return Boolean(sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY))
  } catch {
    return false
  }
}

function criarErroEmbedded() {
  const err = new Error(
    'Para entrar com o Google, abra o site no Chrome ou no Safari — ' +
      'o navegador interno deste app não é aceito pelo Google.'
  )
  err.code = EMBEDDED_BROWSER_ERROR_CODE
  return err
}

/**
 * Login Google na web. Estratégia: popup primeiro (imune ao particionamento de
 * armazenamento cross-domain); redirect apenas como último recurso quando o
 * popup é bloqueado de fato pelo navegador.
 *
 * @returns {Promise<'popup'|'redirect'>}
 */
export async function signInWithGoogleWeb(auth, provider) {
  if (isEmbeddedBrowser()) {
    throw criarErroEmbedded()
  }

  const { signInWithPopup, signInWithRedirect } = await import('firebase/auth')

  try {
    await signInWithPopup(auth, provider)
    return 'popup'
  } catch (e) {
    const code = String(e?.code ?? '')

    // Usuário fechou/cancelou: não force redirect, apenas propague.
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw e
    }

    // Popup bloqueado pelo navegador → tenta redirect como fallback.
    // (Em domínio cruzado o redirect pode falhar no retorno, mas é a única
    //  alternativa quando o popup não é permitido.)
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      marcarRedirectGooglePendente()
      await signInWithRedirect(auth, provider)
      return 'redirect'
    }

    throw e
  }
}
