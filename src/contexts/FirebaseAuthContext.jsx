import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import {
  getFirebaseAuth,
  getFirebaseFunctions,
  isFirebaseConfigured,
  loadFirebaseModules,
} from '../config/firebase'
import {
  buildCadastroEmailLinkContinueUrl,
  guardarEmailParaCadastroLink,
  lerEmailParaCadastroLink,
  limparEmailParaCadastroLink,
} from '../utils/cadastroEmailLink'
import { hintForFirebaseAuthError, isAuthCancelError } from '../utils/firebaseAuthErrors'
import { aguardarPosSplash } from '../utils/posSplash'
import {
  MSG_EMAIL_NAO_VERIFICADO,
  MSG_CADASTRO_LINK_ENVIADO,
  estaRegistroEmailSenhaEmCurso,
  marcarRegistroEmailSenhaEmCurso,
  usuarioPrecisaVerificarEmail,
} from '../utils/emailVerificationAuth'
import { validarNomeExibicaoCadastro } from '../utils/emailCadastro'
import {
  limparRedirectGooglePendente,
  redirectGoogleEstaPendente,
  signInWithGoogleWeb,
} from '../utils/googleSignInWeb'

const ERRO_EMAIL_NAO_VERIFICADO = 'salvation/email-not-verified'
/** Se a persistência do Auth travar no WebView, libera login após este tempo. */
const AUTH_INIT_TIMEOUT_MS = isNativeApp() ? 6000 : 9000
const REDIRECT_RESULT_TIMEOUT_MS = 5000

const isNativeApp = () =>
  typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.() === true

async function aguardarAuthPronto(auth) {
  if (!auth) return
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady()
  }
}

let nativeGoogleInitPromise = null

async function ensureNativeGoogleAuthInitialized() {
  if (!isNativeApp()) return
  if (!nativeGoogleInitPromise) {
    nativeGoogleInitPromise = GoogleAuth.initialize()
  }
  await nativeGoogleInitPromise
}

const FirebaseAuthContext = createContext(null)

export function FirebaseAuthProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const [lastError, setLastError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUser(null)
      return
    }

    let cancelled = false
    let cancelRedirectWait = () => {}
    let unsubAuth = () => {}
    let authStateRecebido = false
    let timeoutId = 0

    const aplicarUsuarioAuth = (u) => {
      if (cancelled) return
      authStateRecebido = true
      if (estaRegistroEmailSenhaEmCurso() && u && usuarioPrecisaVerificarEmail(u)) {
        return
      }
      setUser(u ?? null)
    }

    const liberarSeAuthTravado = () => {
      if (cancelled || authStateRecebido) return
      console.warn('[auth] tempo esgotado ao restaurar sessão — exibindo tela de login')
      setUser(null)
    }

    void (async () => {
      try {
        await loadFirebaseModules()
        if (cancelled) return
        const auth = getFirebaseAuth()
        if (!auth) {
          setUser(null)
          return
        }

        const { onAuthStateChanged, getRedirectResult } = await import('firebase/auth')

        // Listener primeiro: no iOS/WKWebView `getRedirectResult` pode demorar ou
        // travar; sem isso o app fica em "A preparar…" / "verificando sua sessão".
        unsubAuth = onAuthStateChanged(auth, aplicarUsuarioAuth)
        timeoutId = window.setTimeout(liberarSeAuthTravado, AUTH_INIT_TIMEOUT_MS)

        if (typeof auth.authStateReady === 'function') {
          void auth.authStateReady().catch(() => {
            liberarSeAuthTravado()
          })
        }

        // Redirect OAuth só no navegador web — no app da App Store usa GoogleAuth nativo.
        if (!isNativeApp()) {
          const redirectPendente = redirectGoogleEstaPendente()
          try {
            await Promise.race([
              getRedirectResult(auth),
              new Promise((resolve) => {
                window.setTimeout(resolve, REDIRECT_RESULT_TIMEOUT_MS)
              }),
            ])
          } catch (e) {
            if (redirectPendente) {
              setLastError(hintForFirebaseAuthError(e))
            }
          } finally {
            limparRedirectGooglePendente()
          }

          cancelRedirectWait = aguardarPosSplash(() => {
            void getRedirectResult(auth)
              .catch((e) => {
                if (redirectGoogleEstaPendente()) {
                  setLastError(hintForFirebaseAuthError(e))
                }
              })
              .finally(() => {
                limparRedirectGooglePendente()
              })
          })
        }
      } catch (e) {
        if (cancelled) return
        setLastError(hintForFirebaseAuthError(e))
        setUser(null)
      }
    })()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      cancelRedirectWait()
      unsubAuth()
    }
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured() || !isNativeApp()) return
    ensureNativeGoogleAuthInitialized().catch((e) => {
      setLastError(hintForFirebaseAuthError(e))
    })
  }, [])

  const registerWithEmail = useCallback(async (email, password, displayName) => {
    setLastError(null)
    const { validarEmailParaCadastro } = await import('../utils/emailCadastro')
    const val = validarEmailParaCadastro(email)
    if (!val.ok) {
      const err = new Error(val.mensagem)
      setLastError(val.mensagem)
      throw err
    }
    const valNome = validarNomeExibicaoCadastro(displayName)
    if (!valNome.ok) {
      setLastError(valNome.mensagem)
      throw new Error(valNome.mensagem)
    }
    await loadFirebaseModules()
    const auth = getFirebaseAuth()
    const fns = getFirebaseFunctions()
    if (!auth || !fns) throw new Error('Firebase não configurado')
    await aguardarAuthPronto(auth)
    const { httpsCallable } = await import('firebase/functions')
    const { sendSignInLinkToEmail } = await import('firebase/auth')
    marcarRegistroEmailSenhaEmCurso(true)
    try {
      const emailTrim = val.email
      const actionCodeSettings = {
        url: buildCadastroEmailLinkContinueUrl(),
        handleCodeInApp: true,
      }
      const iniciar = httpsCallable(fns, 'iniciarCadastroEmailSenha')
      const res = await iniciar({
        email: emailTrim,
        password,
        displayName: valNome.nome,
      })
      await sendSignInLinkToEmail(auth, emailTrim, actionCodeSettings)
      guardarEmailParaCadastroLink(emailTrim)
      const message =
        res?.data?.message || MSG_CADASTRO_LINK_ENVIADO
      return { emailVerificationSent: true, email: emailTrim, message }
    } catch (e) {
      setLastError(hintForFirebaseAuthError(e))
      throw e
    } finally {
      marcarRegistroEmailSenhaEmCurso(false)
    }
  }, [])

  /** Conclui cadastro quando o utilizador abre o link do e-mail (cria a conta Auth + senha). */
  const concluirCadastroPorLinkEmail = useCallback(async (linkUrl) => {
    await loadFirebaseModules()
    const auth = getFirebaseAuth()
    const fns = getFirebaseFunctions()
    if (!auth || !fns) throw new Error('Firebase não configurado')
    const { isSignInWithEmailLink, signInWithEmailLink } = await import('firebase/auth')
    const href =
      linkUrl || (typeof window !== 'undefined' ? window.location.href : '')
    if (!href || !isSignInWithEmailLink(auth, href)) {
      return { handled: false }
    }

    const email = lerEmailParaCadastroLink()
    if (!email) {
      throw new Error('Abra o link no mesmo aparelho em que pediu o cadastro, ou crie a conta de novo.')
    }

    marcarRegistroEmailSenhaEmCurso(true)
    try {
      await signInWithEmailLink(auth, email, href)
      limparEmailParaCadastroLink()
      const { httpsCallable } = await import('firebase/functions')
      await httpsCallable(fns, 'finalizarCadastroEmailLink')()
      const { reload } = await import('firebase/auth')
      if (auth.currentUser) {
        await reload(auth.currentUser)
      }
      setUser(auth.currentUser)
      return { handled: true }
    } finally {
      marcarRegistroEmailSenhaEmCurso(false)
    }
  }, [])

  const loginWithEmail = useCallback(async (email, password) => {
    setLastError(null)
    const { validarEmailParaCadastro } = await import('../utils/emailCadastro')
    const val = validarEmailParaCadastro(email)
    if (!val.ok) {
      setLastError(val.mensagem)
      throw new Error(val.mensagem)
    }
    await loadFirebaseModules()
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase não configurado')
    const { signInWithEmailAndPassword } = await import('firebase/auth')
    try {
      const cred = await signInWithEmailAndPassword(auth, val.email, password)
      if (usuarioPrecisaVerificarEmail(cred.user)) {
        await aguardarAuthPronto(auth)
        try {
          const { sendEmailVerification } = await import('firebase/auth')
          const alvo = auth.currentUser || cred.user
          if (alvo) await sendEmailVerification(alvo)
        } catch (e) {
          console.warn('[auth] Falha ao enviar verificação no login:', e?.message || e)
        }
        const err = new Error(MSG_EMAIL_NAO_VERIFICADO)
        err.code = ERRO_EMAIL_NAO_VERIFICADO
        setLastError(
          'Enviamos um e-mail de confirmação. Abra o link (verifique o spam) e toque em "Já confirmei".'
        )
        throw err
      }
    } catch (e) {
      if (e?.code !== ERRO_EMAIL_NAO_VERIFICADO) {
        setLastError(hintForFirebaseAuthError(e))
      }
      throw e
    }
  }, [])

  const resendVerificationEmail = useCallback(async () => {
    setLastError(null)
    await loadFirebaseModules()
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase não configurado')
    await aguardarAuthPronto(auth)
    if (!auth.currentUser) {
      throw new Error('Aguarde um instante e tente de novo, ou entre com e-mail e senha.')
    }
    const { sendEmailVerification } = await import('firebase/auth')
    await sendEmailVerification(auth.currentUser)
  }, [])

  const reloadAuthUser = useCallback(async () => {
    await loadFirebaseModules()
    const auth = getFirebaseAuth()
    const u = auth?.currentUser
    if (!u) return false
    const { reload } = await import('firebase/auth')
    await reload(u)
    const atualizado = auth.currentUser
    if (!atualizado?.emailVerified) return false
    setUser(atualizado)
    return true
  }, [])

  const logout = useCallback(async () => {
    setLastError(null)
    await loadFirebaseModules()
    const auth = getFirebaseAuth()
    if (!auth) return
    const { signOut } = await import('firebase/auth')
    if (isNativeApp()) {
      try {
        await ensureNativeGoogleAuthInitialized()
        await GoogleAuth.signOut()
      } catch {
        /* ignora */
      }
    }
    await signOut(auth)
  }, [])

  /**
   * No navegador: usa popup/redirect web.
   * No APK: usa Google Sign-In nativo e converte o idToken em credencial Firebase.
   */
  const loginWithGoogle = useCallback(async () => {
    setLastError(null)
    await loadFirebaseModules()
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase não configurado')
    const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth')
    const provider = new GoogleAuthProvider()
    try {
      if (isNativeApp()) {
        await ensureNativeGoogleAuthInitialized()
        const googleUser = await GoogleAuth.signIn()
        const idToken = googleUser?.authentication?.idToken
        if (!idToken) {
          throw new Error('O login Google nativo não devolveu idToken.')
        }
        const credential = GoogleAuthProvider.credential(idToken)
        await signInWithCredential(auth, credential)
        return
      }
      await signInWithGoogleWeb(auth, provider)
    } catch (e) {
      setLastError(hintForFirebaseAuthError(e))
      throw e
    }
  }, [])

  /**
   * Sign in with Apple (Firebase OAuth). iOS nativo usa plugin; web usa popup.
   * Ative o provedor Apple no Firebase Console e a capability no App ID.
   */
  const loginWithApple = useCallback(async () => {
    setLastError(null)
    await loadFirebaseModules()
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase não configurado')
    const { OAuthProvider, signInWithCredential, signInWithPopup } = await import('firebase/auth')
    const provider = new OAuthProvider('apple.com')
    provider.addScope('email')
    provider.addScope('name')

    try {
      if (Capacitor.isNativePlatform?.() && Capacitor.getPlatform() === 'ios') {
        const { criarNonceAppleSignIn } = await import('../utils/appleSignInNonce')
        const { rawNonce, hashedNonce } = await criarNonceAppleSignIn()
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')
        const result = await SignInWithApple.authorize({
          clientId: 'com.bibliadc.app',
          redirectURI: '',
          scopes: 'email name',
          nonce: hashedNonce
        })
        const idToken = result?.response?.identityToken
        if (!idToken) {
          throw new Error('A Apple não devolveu identityToken.')
        }
        const credential = provider.credential({ idToken, rawNonce })
        await signInWithCredential(auth, credential)
        return
      }
      await signInWithPopup(auth, provider)
    } catch (e) {
      if (isAuthCancelError(e)) return
      setLastError(hintForFirebaseAuthError(e))
      throw e
    }
  }, [])

  /**
   * @returns {Promise<{ ok: boolean, trocou?: boolean, cancelado?: boolean, manteveConta?: boolean, mesmaConta?: boolean }>}
   */
  const tentarAcessarComOutraConta = useCallback(async ({ tipo = 'google', email, password } = {}) => {
    setLastError(null)
    await loadFirebaseModules()
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase não configurado')
    const uidAntes = auth.currentUser?.uid ?? null

    try {
      if (tipo === 'google') {
        const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth')
        const provider = new GoogleAuthProvider()
        if (isNativeApp()) {
          await ensureNativeGoogleAuthInitialized()
          const googleUser = await GoogleAuth.signIn()
          const idToken = googleUser?.authentication?.idToken
          if (!idToken) {
            throw new Error('O login Google nativo não devolveu idToken.')
          }
          const credential = GoogleAuthProvider.credential(idToken)
          await signInWithCredential(auth, credential)
        } else {
          await signInWithGoogleWeb(auth, provider)
        }
      } else {
        const { validarEmailParaCadastro } = await import('../utils/emailCadastro')
        const val = validarEmailParaCadastro(email)
        if (!val.ok) {
          setLastError(val.mensagem)
          return { ok: false, manteveConta: true, erro: val.mensagem }
        }
        const { signInWithEmailAndPassword } = await import('firebase/auth')
        const cred = await signInWithEmailAndPassword(auth, val.email, password)
        if (usuarioPrecisaVerificarEmail(cred.user)) {
          const err = new Error(MSG_EMAIL_NAO_VERIFICADO)
          err.code = ERRO_EMAIL_NAO_VERIFICADO
          setLastError(MSG_EMAIL_NAO_VERIFICADO)
          throw err
        }
      }

      const uidDepois = auth.currentUser?.uid ?? null
      if (uidDepois && uidAntes && uidDepois !== uidAntes) {
        return { ok: true, trocou: true }
      }
      if (uidDepois && uidDepois === uidAntes) {
        return { ok: true, trocou: false, mesmaConta: true }
      }
      return { ok: true, trocou: Boolean(uidDepois && !uidAntes) }
    } catch (e) {
      if (isAuthCancelError(e)) {
        return { ok: false, cancelado: true, manteveConta: true }
      }
      if (e?.code === ERRO_EMAIL_NAO_VERIFICADO) {
        return { ok: true, trocou: true }
      }
      const aindaNaMesma = uidAntes && auth.currentUser?.uid === uidAntes
      if (aindaNaMesma) {
        setLastError(hintForFirebaseAuthError(e))
        return { ok: false, manteveConta: true, erro: hintForFirebaseAuthError(e) }
      }
      setLastError(hintForFirebaseAuthError(e))
      throw e
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      lastError,
      setLastError,
      isConfigured: isFirebaseConfigured(),
      registerWithEmail,
      concluirCadastroPorLinkEmail,
      loginWithEmail,
      logout,
      loginWithGoogle,
      loginWithApple,
      tentarAcessarComOutraConta,
      resendVerificationEmail,
      reloadAuthUser,
      usuarioPrecisaVerificarEmail,
    }),
    [
      user,
      lastError,
      registerWithEmail,
      concluirCadastroPorLinkEmail,
      loginWithEmail,
      logout,
      loginWithGoogle,
      loginWithApple,
      tentarAcessarComOutraConta,
      resendVerificationEmail,
      reloadAuthUser,
    ]
  )

  return <FirebaseAuthContext.Provider value={value}>{children}</FirebaseAuthContext.Provider>
}

export function useFirebaseAuth() {
  const ctx = useContext(FirebaseAuthContext)
  if (!ctx) {
    throw new Error('useFirebaseAuth deve ser usado dentro de FirebaseAuthProvider')
  }
  return ctx
}
