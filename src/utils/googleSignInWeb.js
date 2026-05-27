/**
 * Login Google no navegador (PWA / foundcine.com).
 * Em celular o popup costuma falhar; redirect é mais confiável.
 */
export function prefersGoogleSignInRedirect() {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * @returns {Promise<'popup'|'redirect'>} — em redirect a página navega e o fluxo
 *   termina em getRedirectResult (FirebaseAuthContext).
 */
export async function signInWithGoogleWeb(auth, provider) {
  const { signInWithPopup, signInWithRedirect } = await import('firebase/auth')

  if (prefersGoogleSignInRedirect()) {
    await signInWithRedirect(auth, provider)
    return 'redirect'
  }

  try {
    await signInWithPopup(auth, provider)
    return 'popup'
  } catch (e) {
    const code = String(e?.code ?? '')
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/popup-closed-by-user'
    ) {
      throw e
    }
    await signInWithRedirect(auth, provider)
    return 'redirect'
  }
}
