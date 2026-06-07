import { useEffect, useRef, useState } from 'react'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { useApp } from '../contexts/AppContext'
import { saveUserAppPrefs, subscribeUserAppPrefs } from '../services/userAppPrefsSync'
import {
  startVersiculosMarcadosCloudSync,
  stopVersiculosMarcadosCloudSync
} from '../services/versiculosMarcadosCloudSync'
import { definirContaVersiculosMarcados } from '../services/versiculosMarcadosService'
import {
  startPlanoLeituraCloudSync,
  stopPlanoLeituraCloudSync
} from '../services/planoLeituraCloudSync'
import { sincronizarMeuRankingPlano, lerOptInRankingPlano } from '../services/planoLeituraRankingService'
import {
  startQuizRetiroCloudSync,
  stopQuizRetiroCloudSync
} from '../services/quizRetiroCloudSync'
import { sincronizarMeuRankingQuiz, lerOptInRankingQuiz } from '../services/quizBiblicoRankingService'
import { VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED } from '../config/featureFlags'
import { loadFirebaseModules } from '../config/firebase'
import { aguardarPosSplash } from '../utils/posSplash'
import { usuarioPrecisaVerificarEmail } from '../utils/emailVerificationAuth'
import { registrarEntradaUsuario } from '../services/chatService'

/**
 * Sincroniza tema, preferências de leitura e versículos marcados com o Realtime Database
 * quando o usuário está autenticado. Mantém localStorage como cache local.
 *
 * IMPORTANTE: nenhuma subscrição RTDB começa antes do splash fechar. Em contas com
 * muito conteúdo, os primeiros callbacks `onValue` fazem `JSON.parse`/`setState`
 * pesados — se isso roda durante a animação do splash, a abertura parece travar.
 */
export default function UserCloudSync() {
  const { user, isConfigured } = useFirebaseAuth()
  const { isDarkMode, leituraPorPagina, hydratePrefsFromCloud } = useApp()

  const lastLocalWriteAt = useRef(0)
  const lastAppliedRemoteAt = useRef(0)
  const prefsRef = useRef({ isDarkMode, leituraPorPagina })

  const [cloudPrefsReady, setCloudPrefsReady] = useState(false)

  useEffect(() => {
    prefsRef.current = { isDarkMode, leituraPorPagina }
  }, [isDarkMode, leituraPorPagina])

  useEffect(() => {
    if (!isConfigured || !user?.uid || usuarioPrecisaVerificarEmail(user)) return

    let cancelled = false
    const cancelarEspera = aguardarPosSplash(() => {
      void loadFirebaseModules().then(() => {
        if (cancelled) return
        void registrarEntradaUsuario(user.uid, {
          email: user.email || '',
          photoURL: user.photoURL || '',
          displayName: user.displayName || '',
        })
      })
    })

    return () => {
      cancelled = true
      cancelarEspera()
    }
  }, [isConfigured, user?.uid, user?.email, user?.photoURL, user?.displayName, user?.emailVerified])

  useEffect(() => {
    if (!isConfigured || !user?.uid || usuarioPrecisaVerificarEmail(user)) {
      setCloudPrefsReady(false)
      lastAppliedRemoteAt.current = 0
      lastLocalWriteAt.current = 0
      return
    }

    setCloudPrefsReady(false)
    const uid = user.uid

    let unsub = null
    let cancelled = false
    const cancelarEspera = aguardarPosSplash(() => {
      void loadFirebaseModules().then(() => {
        if (cancelled) return
        unsub = subscribeUserAppPrefs(uid, (val) => {
          setCloudPrefsReady(true)

          if (val == null) {
            const { isDarkMode: dm, leituraPorPagina: lp } = prefsRef.current
            saveUserAppPrefs(uid, { darkMode: dm, leituraPorPagina: lp })
              .then((at) => {
                if (at) lastLocalWriteAt.current = at
              })
              .catch(() => {})
            return
          }

          const u = typeof val.updatedAt === 'number' ? val.updatedAt : 0
          if (u === lastLocalWriteAt.current) return
          if (u <= lastAppliedRemoteAt.current) return

          hydratePrefsFromCloud(val)
          lastAppliedRemoteAt.current = u
        })
      })
    })

    return () => {
      cancelled = true
      cancelarEspera()
      if (unsub) unsub()
      setCloudPrefsReady(false)
    }
  }, [isConfigured, user?.uid, hydratePrefsFromCloud])

  useEffect(() => {
    if (!isConfigured || !user?.uid || !cloudPrefsReady || usuarioPrecisaVerificarEmail(user)) return

    const timer = window.setTimeout(() => {
      void loadFirebaseModules().then(() => {
        saveUserAppPrefs(user.uid, {
          darkMode: isDarkMode,
          leituraPorPagina
        })
          .then((at) => {
            if (at) lastLocalWriteAt.current = at
          })
          .catch(() => {})
      })
    }, 650)

    return () => window.clearTimeout(timer)
  }, [isConfigured, user?.uid, cloudPrefsReady, isDarkMode, leituraPorPagina])

  useEffect(() => {
    definirContaVersiculosMarcados(user?.uid || null)
  }, [user?.uid])

  useEffect(() => {
    if (!isConfigured || !user?.uid || usuarioPrecisaVerificarEmail(user)) {
      stopVersiculosMarcadosCloudSync()
      stopPlanoLeituraCloudSync()
      stopQuizRetiroCloudSync()
      return
    }

    let started = false
    let cancelledSync = false
    const cancelarEspera = aguardarPosSplash(() => {
      void loadFirebaseModules().then(() => {
        if (cancelledSync || started) return
        started = true
        if (VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED) {
          startVersiculosMarcadosCloudSync(user.uid)
        }
        startPlanoLeituraCloudSync(user.uid)
        startQuizRetiroCloudSync(user.uid)
      })
    })

    return () => {
      cancelledSync = true
      cancelarEspera()
      if (VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED) {
        stopVersiculosMarcadosCloudSync()
      }
      stopPlanoLeituraCloudSync()
      stopQuizRetiroCloudSync()
    }
  }, [isConfigured, user?.uid])

  useEffect(() => {
    if (!isConfigured || !user?.uid || usuarioPrecisaVerificarEmail(user)) return
    if (!lerOptInRankingQuiz()) return

    const authUser = {
      email: user.email || '',
      photoURL: user.photoURL || '',
      displayName: user.displayName || '',
    }
    const syncQuiz = () => {
      void sincronizarMeuRankingQuiz(user.uid, { authUser })
    }
    syncQuiz()
    window.addEventListener('salvation-quiz-ranking-sync', syncQuiz)
    return () => window.removeEventListener('salvation-quiz-ranking-sync', syncQuiz)
  }, [isConfigured, user?.uid, user?.email, user?.photoURL, user?.displayName])

  useEffect(() => {
    if (!isConfigured || !user?.uid || usuarioPrecisaVerificarEmail(user)) return

    const authUser = {
      email: user.email || '',
      photoURL: user.photoURL || '',
      displayName: user.displayName || '',
    }

    const onPlano = () => {
      if (!lerOptInRankingPlano()) return
      void sincronizarMeuRankingPlano(user.uid, { authUser })
    }

    window.addEventListener('salvation-plano-leitura-atualizado', onPlano)
    void sincronizarMeuRankingPlano(user.uid, { authUser })

    return () => {
      window.removeEventListener('salvation-plano-leitura-atualizado', onPlano)
    }
  }, [isConfigured, user?.uid, user?.email, user?.photoURL, user?.displayName])

  return null
}
