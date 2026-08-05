import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import {
  normalizeAndroidAppOpenUrl,
  parseNativeAppDeepLinkUrl,
  getPublicWebPathPrefix
} from '../services/bibliaEstudosService'

let launchUrlChecked = false

/**
 * Remove o path público do site (ex.: /biblia) e o BASE_URL do Vite do pathname de um URL https.
 * Sem isto, no APK (BASE_URL=/), um App Link como .../biblia/?livro=1 ia para a rota `/biblia/` — inexistente → tela branca.
 */
export function parsePublicUrlToRoute(urlString) {
  const u = new URL(urlString)
  let pathname = u.pathname

  const webPrefix = getPublicWebPathPrefix()
  if (webPrefix && (pathname === webPrefix || pathname.startsWith(`${webPrefix}/`))) {
    pathname = pathname.slice(webPrefix.length) || '/'
  }

  const base = import.meta.env.BASE_URL || '/'
  const baseNorm = base === '/' ? '' : base.replace(/\/$/, '')
  if (baseNorm && pathname.startsWith(baseNorm)) {
    pathname = pathname.slice(baseNorm.length) || '/'
  }
  if (!pathname.startsWith('/')) pathname = `/${pathname}`
  return { pathname, search: u.search, hash: u.hash || '' }
}

/**
 * No app nativo (Android App Links / iOS Universal Links ou scheme customizado),
 * o Capacitor notifica aqui para navegar dentro do React Router.
 */
export default function NativeDeepLinkHandler() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationRef = useRef(location)
  const lastHandledUrlRef = useRef('')

  useEffect(() => {
    locationRef.current = location
  }, [location])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined

    const isSameTarget = (target) => {
      const normalize = (s) => String(s || '').replace(/\/+$/, '') || '/'
      const current = locationRef.current
      const currentPath = normalize(current.pathname)
      const targetPath = normalize(target.pathname)
      return (
        currentPath === targetPath &&
        (current.search || '') === (target.search || '') &&
        (current.hash || '') === (target.hash || '')
      )
    }

    const go = (url) => {
      if (!url || typeof url !== 'string') return
      if (lastHandledUrlRef.current === url) return
      try {
        flushSync(() => {
          window.dispatchEvent(new Event('salvation-native-deep-link-opening'))
          window.dispatchEvent(new Event('salvation-biblia-fechar-selecao-versiculos'))
        })
        const normalized = normalizeAndroidAppOpenUrl(url)
        const nat = parseNativeAppDeepLinkUrl(normalized)
        if (nat) {
          if (isSameTarget(nat)) {
            lastHandledUrlRef.current = url
            navigate(
              { pathname: nat.pathname, search: nat.search, hash: nat.hash || undefined },
              { replace: true, state: { fromExternalDeepLink: true } }
            )
            return
          }
          lastHandledUrlRef.current = url
          navigate(
            { pathname: nat.pathname, search: nat.search, hash: nat.hash || undefined },
            { replace: true, state: { fromExternalDeepLink: true } }
          )
          return
        }
        if (!/^https?:\/\//i.test(normalized)) return
        const { pathname, search, hash } = parsePublicUrlToRoute(normalized)
        if (isSameTarget({ pathname, search, hash })) {
          lastHandledUrlRef.current = url
          navigate(
            { pathname, search, hash: hash || undefined },
            { replace: true, state: { fromExternalDeepLink: true } }
          )
          return
        }
        lastHandledUrlRef.current = url
        navigate(
          { pathname, search, hash: hash || undefined },
          { replace: true, state: { fromExternalDeepLink: true } }
        )
      } catch (e) {
        console.warn('NativeDeepLinkHandler:', e)
      }
    }

    let handle
    App.addListener('appUrlOpen', ({ url }) => go(url)).then((h) => {
      handle = h
    })

    if (!launchUrlChecked) {
      launchUrlChecked = true
      App.getLaunchUrl()
        .then((ret) => {
          if (ret?.url) go(ret.url)
        })
        .catch(() => {})
    }

    return () => {
      handle?.remove?.()
    }
  }, [navigate])

  return null
}
