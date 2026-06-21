import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  startTransition
} from 'react'
import { ConfirmarSaidaDialog } from '../components/ConfirmarSaidaDialog'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useLocation, useNavigate } from 'react-router-dom'

const isNative = () => typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()
import { 
  saveToStorage, 
  loadFromStorage, 
  isDevelopment, 
  isPWA, 
  forceStorageSync,
  detectStorageIssues,
  fixStorageIssues,
  backupImportantData,
  restoreFromBackup
} from '../utils/storageUtils'
import { getLeituraPaginaKey, mergeLeituraPagina } from '../utils/leituraPorPaginaKey'
import { migrarLegadoSeNecessario, instanciaAtivaId, obterInstancia } from '../utils/planoLeituraUsuario'
import { carregarFonteLeitura } from '../utils/fontLoader'
import { migrarConclusoesLegadoLocalStorage } from '../utils/discipuladoConclusao'
import { notificarDiscipuladoLocal } from '../services/discipuladoCloudSync'
import { normalizarDevocionaisConcluidos } from '../utils/devocionalConcluidos'
import { notificarDevocionalLocal } from '../services/devocionalCloudSync'

/** Desfaz gravações antigas com JSON.stringify duplo antes de saveToStorage (que já serializa). */
function normalizeLeituraPorPaginaRaw(raw) {
  if (raw == null) return null
  let v = raw
  for (let i = 0; i < 4 && typeof v === 'string'; i++) {
    try {
      v = JSON.parse(v)
    } catch {
      return null
    }
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) return v
  return null
}

/**
 * Migra a fatia de leitura por seção de versões anteriores. Cada chave roda
 * **uma única vez por dispositivo/navegador** — o passo é registrado em
 * `localStorage` e nunca volta a executar nesse mesmo storage.
 *
 * Migrações disponíveis:
 * - `biblia-zoom-default-120-v1`: remove `fontSize` 120 legado (antigo padrão).
 * - `biblia-leitura-defaults-v2`: remove `fontSize` 120 e `lineHeight` 160 legados
 *   para Bíblia/plano adotarem 100% e entrelinhas 1,50.
 */
function aplicarMigracoesLeituraPorPagina(map) {
  if (!map || typeof map !== 'object') return map
  let resultado = map
  try {
    const FLAG_V1 = 'leituraPorPagina_migracao_biblia_zoom_default_v1'
    const jaV1 = loadFromStorage(FLAG_V1) === true || loadFromStorage(FLAG_V1) === 'true'
    if (!jaV1) {
      const novo = { ...resultado }
      for (const chave of ['biblia', 'plano-leitura-biblia']) {
        if (novo[chave] && Object.prototype.hasOwnProperty.call(novo[chave], 'fontSize')) {
          const { fontSize: _ignored, ...resto } = novo[chave]
          if (Object.keys(resto).length === 0) {
            const copia = { ...novo }
            delete copia[chave]
            Object.assign(novo, copia)
            delete novo[chave]
          } else {
            novo[chave] = resto
          }
        }
      }
      resultado = novo
      saveToStorage(FLAG_V1, true)
    }
  } catch (_) {
    /* Em caso de erro de storage, mantemos o map original. */
  }
  try {
    const FLAG_V2 = 'leituraPorPagina_migracao_biblia_leitura_defaults_v2'
    const jaV2 = loadFromStorage(FLAG_V2) === true || loadFromStorage(FLAG_V2) === 'true'
    if (!jaV2) {
      const novo = { ...resultado }
      for (const chave of ['biblia', 'plano-leitura-biblia']) {
        const slice = novo[chave]
        if (!slice || typeof slice !== 'object') continue
        const next = { ...slice }
        let mudou = false
        if (next.fontSize === 120) {
          delete next.fontSize
          mudou = true
        }
        if (next.lineHeight === 160) {
          delete next.lineHeight
          mudou = true
        }
        if (!mudou) continue
        if (Object.keys(next).length === 0) {
          delete novo[chave]
        } else {
          novo[chave] = next
        }
      }
      resultado = novo
      saveToStorage(FLAG_V2, true)
    }
  } catch (_) {
    /* ignore */
  }
  return resultado
}

function loadLeituraPorPaginaInitial() {
  try {
    const raw = loadFromStorage('leituraPorPagina')
    const parsed = normalizeLeituraPorPaginaRaw(raw)
    if (parsed) return aplicarMigracoesLeituraPorPagina(parsed)
  } catch (_) {}
  const migrated = {}
  const fs = loadFromStorage('fontSize')
  const ta = loadFromStorage('textAlign')
  const ff = loadFromStorage('fontFamily')
  if (fs != null || ta != null || ff != null) {
    migrated.biblia = {
      ...(fs != null ? { fontSize: parseInt(String(fs), 10) || 100 } : {}),
      ...(ta != null ? { textAlign: String(ta) } : {}),
      ...(ff != null ? { fontFamily: String(ff) } : {}),
    }
  }
  return aplicarMigracoesLeituraPorPagina(migrated)
}

const AppContext = createContext()

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp deve ser usado dentro de um AppProvider')
  }
  return context
}

export function AppProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Default explícito: novos usuários sempre abrem no tema CLARO. Não
    // respeitamos `prefers-color-scheme` do sistema para evitar que um
    // celular configurado em "escuro" force o app a abrir escuro na
    // primeira visita. O usuário pode trocar para o modo escuro pelo
    // próprio app — e essa escolha persiste no localStorage.
    const saved = loadFromStorage('darkMode')
    if (typeof saved === 'boolean') return saved
    return false
  })

  const [ultimaLeitura, setUltimaLeitura] = useState(() => {
    const saved = loadFromStorage('ultimaLeitura')
    return saved || {
      livro: 1, // Gênesis
      capitulo: 1,
      versiculo: 1
    }
  })

  const [planoLeitura, setPlanoLeitura] = useState(() => {
    const saved = loadFromStorage('planoLeitura')
    const base = saved && typeof saved === 'object' ? saved : {}
    return {
      planoAtual: base.planoAtual ?? null,
      dataInicio: base.dataInicio ?? null,
      ultimaLeitura: base.ultimaLeitura ?? null,
      instanciaAtivaId: base.instanciaAtivaId ?? null,
      capitulosLidos: Array.isArray(base.capitulosLidos) ? base.capitulosLidos : [],
    }
  })

  /** Preferências de leitura (zoom, alinhamento, fonte, entrelinhas) por seção — ver `getLeituraPaginaKey`. */
  const [leituraPorPagina, setLeituraPorPagina] = useState(loadLeituraPorPaginaInitial)

  // Estados do discipulado
  const [discipuladoTema, setDiscipuladoTema] = useState(() => {
    const saved = loadFromStorage('discipulado_tema')
    return saved ? parseInt(saved) : null
  })
  
  const [discipuladoQuestoes, setDiscipuladoQuestoes] = useState(() => {
    const saved = loadFromStorage('discipulado_questoes')
    return saved || {}
  })

  const [discipuladoRespostas, setDiscipuladoRespostas] = useState(() => {
    const saved = loadFromStorage('discipulado_respostas')
    return saved || {}
  })

  const [discipuladoMeditacao, setDiscipuladoMeditacao] = useState(() => {
    const saved = loadFromStorage('discipulado_meditacao')
    return saved || {}
  })

  const [discipuladoConcluidos, setDiscipuladoConcluidos] = useState(() => {
    const saved = loadFromStorage('discipulado_concluidos', {})
    return migrarConclusoesLegadoLocalStorage(saved || {})
  })

  const [devocionaisConcluidos, setDevocionaisConcluidos] = useState(() =>
    normalizarDevocionaisConcluidos(loadFromStorage('devocionaisConcluidos', []))
  )

  const [ultimaLeituraCFW, setUltimaLeituraCFW] = useState(() => {
    const saved = loadFromStorage('ultimaLeituraCFW')
    return saved || {
      capitulo: 1
    }
  })

  const [confirmarSaida, setConfirmarSaida] = useState(false)

  const backButtonHandlerRef = useRef(null)
  const lastHardwareBackAtRef = useRef(0)

  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const rehidratarPlano = () => {
      migrarLegadoSeNecessario()
      const id = instanciaAtivaId()
      if (!id) return
      const inst = obterInstancia(id)
      setPlanoLeitura((prev) => ({
        ...prev,
        instanciaAtivaId: id,
        planoAtual: inst?.templateId ?? prev.planoAtual,
      }))
    }

    rehidratarPlano()

    // Quando a nuvem aplica um plano (ou qualquer ajuste em `planoLeituraUsuario`),
    // atualiza o state do AppContext para refletir imediatamente na UI.
    const onPlanoAtualizado = () => rehidratarPlano()
    window.addEventListener('salvation-plano-leitura-atualizado', onPlanoAtualizado)
    window.addEventListener('focus', onPlanoAtualizado)
    document.addEventListener('visibilitychange', onPlanoAtualizado)
    return () => {
      window.removeEventListener('salvation-plano-leitura-atualizado', onPlanoAtualizado)
      window.removeEventListener('focus', onPlanoAtualizado)
      document.removeEventListener('visibilitychange', onPlanoAtualizado)
    }
  }, [])

  const leituraPaginaKey = useMemo(() => getLeituraPaginaKey(location.pathname), [location.pathname])
  const { fontSize, textAlign, fontFamily, lineHeight, semEspacoEntreVersiculos } = useMemo(
    () => mergeLeituraPagina(leituraPorPagina[leituraPaginaKey], leituraPaginaKey),
    [leituraPorPagina, leituraPaginaKey]
  )

  // Carrega sob demanda o CSS da família de leitura quando muda — assim o
  // bundle inicial não carrega 8 famílias de `@fontsource` desnecessárias.
  useEffect(() => {
    if (!fontFamily) return
    carregarFonteLeitura(fontFamily).catch(() => {})
  }, [fontFamily])

  const setFontSize = useCallback(
    (next) => {
      setLeituraPorPagina((prev) => {
        const key = getLeituraPaginaKey(location.pathname)
        const cur = mergeLeituraPagina(prev[key], key)
        const val = typeof next === 'function' ? next(cur.fontSize) : next
        return { ...prev, [key]: { ...(prev[key] || {}), fontSize: val } }
      })
    },
    [location.pathname]
  )

  const setTextAlign = useCallback(
    (next) => {
      setLeituraPorPagina((prev) => {
        const key = getLeituraPaginaKey(location.pathname)
        const cur = mergeLeituraPagina(prev[key], key)
        const val = typeof next === 'function' ? next(cur.textAlign) : next
        return { ...prev, [key]: { ...(prev[key] || {}), textAlign: val } }
      })
    },
    [location.pathname]
  )

  const setFontFamily = useCallback(
    (next) => {
      setLeituraPorPagina((prev) => {
        const key = getLeituraPaginaKey(location.pathname)
        const cur = mergeLeituraPagina(prev[key], key)
        const val = typeof next === 'function' ? next(cur.fontFamily) : next
        return { ...prev, [key]: { ...(prev[key] || {}), fontFamily: val } }
      })
    },
    [location.pathname]
  )

  const setLineHeight = useCallback(
    (next) => {
      setLeituraPorPagina((prev) => {
        const key = getLeituraPaginaKey(location.pathname)
        const cur = mergeLeituraPagina(prev[key], key)
        const val = typeof next === 'function' ? next(cur.lineHeight) : next
        return { ...prev, [key]: { ...(prev[key] || {}), lineHeight: val } }
      })
    },
    [location.pathname]
  )

  const setSemEspacoEntreVersiculos = useCallback(
    (next) => {
      setLeituraPorPagina((prev) => {
        const key = getLeituraPaginaKey(location.pathname)
        const cur = mergeLeituraPagina(prev[key], key)
        const val = typeof next === 'function' ? next(cur.semEspacoEntreVersiculos) : Boolean(next)
        return { ...prev, [key]: { ...(prev[key] || {}), semEspacoEntreVersiculos: val } }
      })
    },
    [location.pathname]
  )

  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/'
  const [navigationStack, setNavigationStack] = useState([initialPath])

  useEffect(() => {
    setNavigationStack(prev => {
      if (prev[prev.length - 1] === location.pathname) {
        return prev
      }
      const updated = [...prev, location.pathname]
      return updated.length > 30 ? updated.slice(updated.length - 30) : updated
    })
  }, [location.pathname])

  // Detectar atualizações do app + retorno do background (PWA)
  useEffect(() => {
    const handleAppUpdate = () => {
      forceStorageSync()
    }

    const currentVersion = loadFromStorage('app_version')
    const packageVersion = '0.0.1'

    if (currentVersion !== packageVersion) {
      handleAppUpdate()
      saveToStorage('app_version', packageVersion)
    }

    const handleAppResume = () => {
      forceStorageSync()
    }

    // Wrapper nomeado para `visibilitychange` — antes era arrow anônima e o
    // cleanup só removia o `focus`, vazando esse listener a cada re-mount.
    const handleVisibilityChange = () => {
      if (!document.hidden) handleAppResume()
    }

    const ativo = isPWA()
    if (ativo) {
      window.addEventListener('focus', handleAppResume)
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      if (ativo) {
        window.removeEventListener('focus', handleAppResume)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [])

  // Inicializa o state especial no histórico ao carregar (web/PWA)
  useEffect(() => {
    window.history.replaceState({ noBackExitsApp: true }, '')
  }, [])

  // Intercepta popstate de forma refinada (web/PWA)
  useEffect(() => {
    const handlePopState = (event) => {
      // Se houver um diálogo da Bíblia aberto (Livros/Capítulos/Versículos), o
      // próprio diálogo cuida do popstate (fecha/recua); não exibir "Deseja
      // realmente sair?" aqui — caso contrário a seta de voltar do diálogo
      // dispararia o popup de saída do app.
      if (typeof window !== 'undefined' && (window.__bibliaDialogOpen || 0) > 0) {
        return
      }
      // Só intercepta se estiver na tela principal
      if (event.state?.noBackExitsApp && (location.pathname === '/biblia' || location.pathname === '/')) {
        setConfirmarSaida(true)
        window.history.pushState({ noBackExitsApp: true }, '')
        event.preventDefault && event.preventDefault()
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [location.pathname])

  // Suporte ao botão físico de voltar do Android (Capacitor/Cordova)
  const voltarParaPaginaAnterior = useCallback((fallbackPath = '/') => {
    setNavigationStack(prev => {
      // Prioriza o histórico real do browser/webview quando disponível.
      if (typeof window !== 'undefined' && window.history.length > 1) {
        navigate(-1)
        return prev.length > 1 ? prev.slice(0, -1) : prev
      }

      if (prev.length > 1) {
        const novoStack = prev.slice(0, -1)
        navigate(-1)
        return novoStack
      }

      if (location.pathname !== fallbackPath) {
        navigate(fallbackPath, { replace: true })
      } else {
        setConfirmarSaida(true)
      }
      return prev
    })
  }, [navigate, location.pathname])

  // MainActivity (Android) intercepta KEYCODE_BACK e dispara `androidBack` no WebView; o plugin
  // `App.backButton` pode não receber o evento. Mesma lógica nos dois, com debounce anti-duplo.
  const tratarBotaoVoltarNativo = useCallback(() => {
    const now = Date.now()
    if (now - lastHardwareBackAtRef.current < 380) return
    lastHardwareBackAtRef.current = now
    if (backButtonHandlerRef.current) {
      backButtonHandlerRef.current()
      return
    }
    if (location.pathname === '/biblia' || location.pathname === '/') {
      setConfirmarSaida(true)
    } else {
      voltarParaPaginaAnterior()
    }
  }, [location.pathname, voltarParaPaginaAnterior])

  useEffect(() => {
    if (!isNative()) return
    window.addEventListener('androidBack', tratarBotaoVoltarNativo)
    return () => window.removeEventListener('androidBack', tratarBotaoVoltarNativo)
  }, [tratarBotaoVoltarNativo])

  // Botão físico / gesto voltar (Capacitor), quando o evento chega ao plugin
  useEffect(() => {
    try {
      if (!isNative()) return
      const listenerPromise = App.addListener('backButton', tratarBotaoVoltarNativo)

      return () => {
        listenerPromise?.then?.(listener => listener?.remove?.()).catch(() => {})
      }
    } catch (_) {
      // Ignora em ambiente web/PWA onde Capacitor não está disponível
    }
  }, [tratarBotaoVoltarNativo])

  const handleConfirmarSaida = useCallback(() => {
    saveToStorage('darkMode', isDarkMode)
    saveToStorage('ultimaLeitura', ultimaLeitura)
    saveToStorage('planoLeitura', planoLeitura)
    saveToStorage('leituraPorPagina', leituraPorPagina)
    saveToStorage('discipulado_tema', discipuladoTema)
    saveToStorage('discipulado_questoes', discipuladoQuestoes)
    saveToStorage('discipulado_respostas', discipuladoRespostas)
    saveToStorage('discipulado_meditacao', discipuladoMeditacao)
    saveToStorage('ultimaLeituraCFW', ultimaLeituraCFW)

    forceStorageSync()

    setConfirmarSaida(false)
    if (isNative()) {
      try {
        App.exitApp()
      } catch (error) {
        console.error('Erro ao fechar o app:', error)
        window.history.go(-1)
      }
    } else {
      window.history.go(-1)
    }
  }, [
    isDarkMode,
    ultimaLeitura,
    planoLeitura,
    leituraPorPagina,
    discipuladoTema,
    discipuladoQuestoes,
    discipuladoRespostas,
    discipuladoMeditacao,
    ultimaLeituraCFW
  ])

  const handleCancelarSaida = useCallback(() => {
    setConfirmarSaida(false)
  }, [])

  // Salvar alterações no localStorage usando funções utilitárias
  useEffect(() => {
    saveToStorage('darkMode', isDarkMode)
  }, [isDarkMode])

  useEffect(() => {
    saveToStorage('ultimaLeitura', ultimaLeitura)
  }, [ultimaLeitura])

  useEffect(() => {
    saveToStorage('planoLeitura', planoLeitura)
  }, [planoLeitura])

  useEffect(() => {
    saveToStorage('leituraPorPagina', leituraPorPagina)
  }, [leituraPorPagina])

  // Salvar progresso do discipulado
  useEffect(() => {
    saveToStorage('discipulado_tema', discipuladoTema)
  }, [discipuladoTema])

  useEffect(() => {
    saveToStorage('discipulado_questoes', discipuladoQuestoes)
  }, [discipuladoQuestoes])

  useEffect(() => {
    saveToStorage('discipulado_respostas', discipuladoRespostas)
    notificarDiscipuladoLocal()
  }, [discipuladoRespostas])

  useEffect(() => {
    saveToStorage('discipulado_meditacao', discipuladoMeditacao)
    notificarDiscipuladoLocal()
  }, [discipuladoMeditacao])

  useEffect(() => {
    saveToStorage('discipulado_concluidos', discipuladoConcluidos)
    notificarDiscipuladoLocal()
  }, [discipuladoConcluidos])

  useEffect(() => {
    saveToStorage('devocionaisConcluidos', devocionaisConcluidos)
    notificarDevocionalLocal()
  }, [devocionaisConcluidos])

  useEffect(() => {
    saveToStorage('ultimaLeituraCFW', ultimaLeituraCFW)
  }, [ultimaLeituraCFW])

  const toggleDarkMode = useCallback(() => setIsDarkMode((prev) => !prev), [])

  /** Aplica preferências vindas do RTDB (`users/{uid}/appPrefs`). Usado por `UserCloudSync`.
   *  As atualizações são marcadas como `startTransition` para que dados grandes vindos da
   *  nuvem (contas com muito conteúdo) não bloqueiem o paint do capítulo após o splash. */
  const hydratePrefsFromCloud = useCallback((val) => {
    if (!val || typeof val !== 'object') return
    startTransition(() => {
      if (typeof val.darkMode === 'boolean') {
        setIsDarkMode((prev) => (prev === val.darkMode ? prev : val.darkMode))
      }
      if (
        val.leituraPorPagina != null &&
        typeof val.leituraPorPagina === 'object' &&
        !Array.isArray(val.leituraPorPagina)
      ) {
        setLeituraPorPagina((prev) => {
          const inc = val.leituraPorPagina
          let mudou = false
          const out = { ...prev }
          for (const key of Object.keys(inc)) {
            const chunk = inc[key]
            if (chunk == null || typeof chunk !== 'object' || Array.isArray(chunk)) continue
            const merged = { ...(prev[key] || {}), ...chunk }
            const antigo = prev[key]
            if (!antigo) {
              out[key] = merged
              mudou = true
              continue
            }
            let igual = true
            for (const k of Object.keys(merged)) {
              if (antigo[k] !== merged[k]) {
                igual = false
                break
              }
            }
            if (!igual) {
              out[key] = merged
              mudou = true
            }
          }
          return mudou ? out : prev
        })
      }
    })
  }, [])

  /** Mescla progresso do Discipulado vindo do RTDB (conta logada). */
  const aplicarDiscipuladoDaNuvem = useCallback((remoto) => {
    if (!remoto || typeof remoto !== 'object') return
    startTransition(() => {
      if (remoto.respostas && typeof remoto.respostas === 'object') {
        setDiscipuladoRespostas((prev) => ({ ...prev, ...remoto.respostas }))
      }
      if (remoto.meditacao && typeof remoto.meditacao === 'object') {
        setDiscipuladoMeditacao((prev) => ({ ...prev, ...remoto.meditacao }))
      }
      if (remoto.concluidos && typeof remoto.concluidos === 'object') {
        setDiscipuladoConcluidos((prev) => ({ ...prev, ...remoto.concluidos }))
      }
    })
  }, [])

  /** Mescla devocionais lidos vindos do RTDB (conta logada). */
  const aplicarDevocionalDaNuvem = useCallback((remoto) => {
    if (!remoto || !Array.isArray(remoto.concluidos)) return
    startTransition(() => {
      setDevocionaisConcluidos((prev) =>
        normalizarDevocionaisConcluidos([...prev, ...remoto.concluidos])
      )
    })
  }, [])
  
  const atualizarUltimaLeitura = useCallback((livro, capitulo, versiculo) => {
    setUltimaLeitura({ livro, capitulo, versiculo })
  }, [])

  const marcarCapituloLido = useCallback((livroId, capitulo) => {
    const key = `${livroId}-${capitulo}`
    setPlanoLeitura((prev) => {
      const arr = Array.isArray(prev.capitulosLidos) ? prev.capitulosLidos : []
      const capitulosLidos = arr.includes(key) ? arr.filter((cap) => cap !== key) : [...arr, key]
      return {
        ...prev,
        capitulosLidos,
        ultimaLeitura: new Date().toISOString()
      }
    })
  }, [])

  const isCapituloLido = useCallback(
    (livroId, capitulo) => {
      const lista = planoLeitura.capitulosLidos
      return Array.isArray(lista) && lista.includes(`${livroId}-${capitulo}`)
    },
    [planoLeitura.capitulosLidos]
  )

  const aumentarFonte = useCallback(() => {
    setFontSize((size) => Math.min(size + 10, 200))
  }, [setFontSize])

  const diminuirFonte = useCallback(() => {
    setFontSize((size) => Math.max(size - 10, 100))
  }, [setFontSize])

  const setBackButtonHandler = useCallback((handler) => {
    backButtonHandlerRef.current = handler
  }, [])

  // `value` memoizado: evita criar um objeto novo a cada render do provider e
  // limita re-renders de consumidores quando o pai (rota/AppProvidersShell)
  // rerenderiza sem que o estado interno tenha mudado. Para um split real por
  // domínio (tema vs prefs vs discipulado) é candidato a refactor maior — aqui
  // ficamos com um único contexto memoizado, que é seguro.
  const value = useMemo(
    () => ({
      isDarkMode,
      setIsDarkMode,
      toggleDarkMode,
      ultimaLeitura,
      atualizarUltimaLeitura,
      planoLeitura,
      setPlanoLeitura,
      isCapituloLido,
      marcarCapituloLido,
      fontSize,
      setFontSize,
      fontFamily,
      setFontFamily,
      textAlign,
      setTextAlign,
      lineHeight,
      setLineHeight,
      semEspacoEntreVersiculos,
      setSemEspacoEntreVersiculos,
      leituraPaginaKey,
      aumentarFonte,
      diminuirFonte,
      discipuladoTema,
      setDiscipuladoTema,
      discipuladoQuestoes,
      setDiscipuladoQuestoes,
      discipuladoRespostas,
      setDiscipuladoRespostas,
      discipuladoMeditacao,
      setDiscipuladoMeditacao,
      discipuladoConcluidos,
      setDiscipuladoConcluidos,
      devocionaisConcluidos,
      setDevocionaisConcluidos,
      ultimaLeituraCFW,
      setUltimaLeituraCFW,
      voltarParaPaginaAnterior,
      setBackButtonHandler,
      confirmarSaida,
      setConfirmarSaida,
      handleConfirmarSaida,
      handleCancelarSaida,
      hydratePrefsFromCloud,
      aplicarDiscipuladoDaNuvem,
      aplicarDevocionalDaNuvem
    }),
    [
      isDarkMode,
      toggleDarkMode,
      ultimaLeitura,
      atualizarUltimaLeitura,
      planoLeitura,
      isCapituloLido,
      marcarCapituloLido,
      fontSize,
      setFontSize,
      fontFamily,
      setFontFamily,
      textAlign,
      setTextAlign,
      lineHeight,
      setLineHeight,
      semEspacoEntreVersiculos,
      setSemEspacoEntreVersiculos,
      leituraPaginaKey,
      aumentarFonte,
      diminuirFonte,
      discipuladoTema,
      discipuladoQuestoes,
      discipuladoRespostas,
      discipuladoMeditacao,
      discipuladoConcluidos,
      devocionaisConcluidos,
      ultimaLeituraCFW,
      voltarParaPaginaAnterior,
      setBackButtonHandler,
      confirmarSaida,
      handleConfirmarSaida,
      handleCancelarSaida,
      hydratePrefsFromCloud,
      aplicarDiscipuladoDaNuvem,
      aplicarDevocionalDaNuvem
    ]
  )

  return (
    <AppContext.Provider value={value}>
      {children}
      <ConfirmarSaidaDialog 
        open={confirmarSaida} 
        onConfirm={handleConfirmarSaida} 
        onCancel={handleCancelarSaida} 
      />
    </AppContext.Provider>
  )
} 