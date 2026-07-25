import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { 
  Box, 
  Typography, 
  IconButton,
  CircularProgress,
  AppBar,
  Toolbar,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete
} from '@mui/material'

import CheckCircle from '@mui/icons-material/CheckCircle'
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked'
import SearchIcon from '@mui/icons-material/Search'
import ShareIcon from '@mui/icons-material/Share'
import NavigateNext from '@mui/icons-material/NavigateNext'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import CloseIcon from '@mui/icons-material/Close'
import PapelAmareloIcon from '@mui/icons-material/Description'
import PapelAmareloOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import {
  buscarCapitulo,
  buscarTexto,
  buscarPericopes,
  buscarLivroPorNome,
  contarVersiculosPorLivro
} from '../services/bibliaService'
import { extrairReferenciaBiblica } from '../utils/biblia'
import ReferenciasPericope from '../components/ReferenciasPericope'
import ReferenciasParalelasDialog from '../components/ReferenciasParalelasDialog'
import { useApp } from '../contexts/AppContext'
import LivrosCards from '../components/LivrosCards'
import CapitulosCards from '../components/CapitulosCards'
import VersiculosCards from '../components/VersiculosCards'
import MarcarVersiculos from '../components/MarcarVersiculos'
import VersiculoMarcavel from '../components/VersiculoMarcavel'
import BibliaSelecaoActionBar from '../components/BibliaSelecaoActionBar'
import MenuOpcoesCompartilhar from '../components/MenuOpcoesCompartilhar'
import AppBarMaisMenu from '../components/AppBarMaisMenu'
import PlanoEscadaBarraMedalhas from '../components/PlanoEscadaBarraMedalhas'
import PlanoEscadaCelebracao from '../components/PlanoEscadaCelebracao'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { buildBibliaVersiculosExport } from '../utils/appExportPayload'
import { ensureUserForChatExport, ensureUserForFeature, pushPendingChatExport } from '../utils/chatExportSend'
import {
  sxFullViewportHeight,
  sxMainBelowAppBar,
  sxFullscreenFlexColumn,
  sxFullscreenScrollBody,
  sxSafeAreaTop,
  sxSafeAreaBottom,
} from '../utils/viewportHeight'
import { avisarAsync, mostrarSnackbar, copiarParaAreaTransferencia } from '../utils/uiDialogs'
import { registrarLeituraBibliaHoje } from '../utils/incentivosLeitura'
import { notificarBibliaPronta } from '../utils/posSplash'
import { processarMedalhasAposRegistarLeitura } from '../utils/medalhasGamificacao'
import { obterCorLivro } from '../utils/coresBiblia'
import { resolveFontFamily } from '../utils/fontFamily'
import { livros as livrosData } from '../data/biblia'
import {
  gravarBibliaSessaoCache,
  lerBibliaSessaoCache,
  bibliaSessaoCacheCasa,
} from '../utils/bibliaSessionCache'
import { buildAppShareLink } from '../services/bibliaEstudosService'
import {
  listarInstanciasQueContemCapitulo,
  marcarCapituloEmInstancias,
  obterInstancia,
  instanciaAtivaId,
  obterTemplate,
} from '../utils/planoLeituraUsuario'
import { usePinchNumeric } from '../hooks/usePinchNumeric'
import { salvarTokenPassagem } from '../utils/strongTokenContext'
import { formatarTextoMorphHb, formatarTextoMorphHbVocalizado } from '../utils/strongTokenHelpers'
import { sxHebrewVocalizado } from '../utils/hebrewDisplay'

const loadNtStrongProvaService = () => import('../services/ntStrongProvaService')
const loadOtStrongService = () => import('../services/otStrongService')
function parseVersiculosQuery(raw) {
  return String(raw || '')
    .split(/[;,]/)
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isInteger(x) && x > 0)
}

/** Evita navigate em loop quando a query só difere por encoding (%2C vs vírgulas). */
function searchParamsSemanticallyEqual(searchA, searchB) {
  const norm = (s) => (s || '').replace(/^\?/, '')
  const pa = new URLSearchParams(norm(searchA))
  const pb = new URLSearchParams(norm(searchB))
  const keysA = [...new Set([...pa.keys()])].sort()
  const keysB = [...new Set([...pb.keys()])].sort()
  if (keysA.length !== keysB.length) return false
  return keysA.every((k) => pa.get(k) === pb.get(k))
}

/**
 * Deep link da URL na montagem (`?livro=&capitulo=` do plano, marcados, etc.).
 * Tem prioridade sobre o cache de sessão — senão o efeito estado→URL
 * sobrescreve o destino com o último capítulo lido na Bíblia.
 */
function deepLinkLivroCapDaUrl() {
  try {
    const qs = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    )
    const livroId = Number(qs.get('livro'))
    const capitulo = Number(qs.get('capitulo') ?? qs.get('cap'))
    if (
      Number.isInteger(livroId) &&
      livroId >= 1 &&
      Number.isInteger(capitulo) &&
      capitulo >= 1
    ) {
      return { livroId, capitulo }
    }
  } catch {
    /* ignore */
  }
  return null
}

function estadoInicialBibliaDaSessao() {
  const deep = deepLinkLivroCapDaUrl()
  const cache = lerBibliaSessaoCache()
  const cacheServeDeep =
    Boolean(deep) && bibliaSessaoCacheCasa(deep.livroId, deep.capitulo)
  const usarCache = !deep || cacheServeDeep

  let livroAtual = null
  if (deep) {
    livroAtual =
      cache?.opcoesLivros?.find((l) => l.id === deep.livroId) ||
      (cacheServeDeep ? cache?.livroAtual : null) ||
      null
  } else {
    livroAtual = cache?.livroAtual ?? null
  }

  return {
    resultados: usarCache ? cache?.resultados ?? [] : [],
    versiculosRenderizados: usarCache ? cache?.versiculosRenderizados ?? 0 : 0,
    pericopesCapitulo: usarCache ? cache?.pericopesCapitulo ?? [] : [],
    opcoesLivros: cache?.opcoesLivros ?? [],
    carregandoInicial: usarCache ? !(cache?.resultados?.length > 0) : true,
    livroAtual,
    capitulo: deep?.capitulo ?? cache?.capitulo ?? 1,
  }
}

function isEventoEscadaVisual(e) {
  return e?.tipo === 'plano_dia_bronze' || e?.tipo === 'plano_escada_conversao'
}

function eventoEscadaParaProps(e) {
  if (!e) return { variante: 'bronze', mensagem: '' }
  if (e.tipo === 'plano_dia_bronze') return { variante: 'bronze', mensagem: String(e.mensagem || '') }
  const n = e.meta?.nivel
  if (n === 'prata') return { variante: 'prata', mensagem: String(e.mensagem || '') }
  if (n === 'ouro') return { variante: 'ouro', mensagem: String(e.mensagem || '') }
  if (n === 'trofeu') return { variante: 'trofeu', mensagem: String(e.mensagem || '') }
  if (n === 'superTrofeu') return { variante: 'superTrofeu', mensagem: String(e.mensagem || '') }
  return { variante: 'bronze', mensagem: String(e.mensagem || '') }
}

/** Multiplicadores em % de `fontSizeLeitura` (texto base do versículo). */
const BIBLIA_ESCALA_TITULO_PERICOPE = 1.55
/** Nome do livro no cabeçalho: deve ficar claramente acima do título da perícope. */
const BIBLIA_ESCALA_NOME_LIVRO_CABECALHO = 2.42
/** Número do capítulo no cabeçalho: um pouco maior que o nome do livro. */
const BIBLIA_ESCALA_CAPITULO_CABECALHO = 2.78
function agendarQuandoOcioso(fn, timeout = 1600) {
  if (typeof window === 'undefined') return () => {}
  let cancelado = false
  const run = () => {
    if (!cancelado) fn()
  }
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(run, { timeout })
    return () => {
      cancelado = true
      window.cancelIdleCallback?.(id)
    }
  }
  const id = window.setTimeout(run, 260)
  return () => {
    cancelado = true
    window.clearTimeout(id)
  }
}

function capitulosVizinhosParaPrefetch(livros, livroAtual, capituloAtual) {
  if (!Array.isArray(livros) || !livroAtual?.id || !capituloAtual) return []
  const indexAtual = livros.findIndex((l) => l.id === livroAtual.id)
  if (indexAtual < 0) return []

  const livro = livros[indexAtual]
  const maxCapitulos = Number(livro.maxCapitulos ?? livro.capitulos ?? livroAtual.maxCapitulos ?? 0)
  const cap = Number(capituloAtual)
  const vizinhos = []

  if (cap > 1) {
    vizinhos.push({ livroId: livro.id, capitulo: cap - 1 })
  } else {
    const anterior = livros[indexAtual - 1]
    const capAnterior = Number(anterior?.maxCapitulos ?? anterior?.capitulos ?? 0)
    if (anterior?.id && capAnterior > 0) {
      vizinhos.push({ livroId: anterior.id, capitulo: capAnterior })
    }
  }

  if (maxCapitulos > 0 && cap < maxCapitulos) {
    vizinhos.push({ livroId: livro.id, capitulo: cap + 1 })
  } else {
    const proximo = livros[indexAtual + 1]
    if (proximo?.id) {
      vizinhos.push({ livroId: proximo.id, capitulo: 1 })
    }
  }

  return vizinhos
}

function Biblia({ ultimaLeitura: leituraInicial }) {
  const toRgba = (hex, alpha) => {
    if (!hex || typeof hex !== 'string') return `rgba(30, 122, 53, ${alpha})`
    const normalized = hex.replace('#', '')
    const full = normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized
    const intVal = Number.parseInt(full, 16)
    if (Number.isNaN(intVal) || full.length !== 6) return `rgba(30, 122, 53, ${alpha})`
    const r = (intVal >> 16) & 255
    const g = (intVal >> 8) & 255
    const b = intVal & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const [estadoBoot] = useState(estadoInicialBibliaDaSessao)
  const [resultados, setResultados] = useState(() => estadoBoot.resultados)
  const [versiculosRenderizados, setVersiculosRenderizados] = useState(
    () => estadoBoot.versiculosRenderizados
  )
  const [pericopesCapitulo, setPericopesCapitulo] = useState(() => estadoBoot.pericopesCapitulo)
  const [opcoesLivros, setOpcoesLivros] = useState(() => estadoBoot.opcoesLivros)
  const [loading, setLoading] = useState(false)
  const [carregandoInicial, setCarregandoInicial] = useState(() => estadoBoot.carregandoInicial)
  const [livroAtual, setLivroAtual] = useState(() => estadoBoot.livroAtual)
  const [capitulo, setCapitulo] = useState(() => estadoBoot.capitulo)
  const [erro, setErro] = useState(null)
  const [dialogoBuscaAberto, setDialogoBuscaAberto] = useState(false)
  const [termoBusca, setTermoBusca] = useState('')
  const [tipoBusca] = useState('texto') // Apenas busca por texto (perícopes removidas)
  const [testamentoBusca, setTestamentoBusca] = useState('ambos')
  const [livroBusca, setLivroBusca] = useState(null)
  const [modoPalavraBusca, setModoPalavraBusca] = useState(() => {
    try {
      const salvo = localStorage.getItem('bibliaBuscaModoPalavra')
      return salvo === 'incompleta' ? 'incompleta' : 'literal'
    } catch {
      return 'literal'
    }
  })
  const [resultadosBusca, setResultadosBusca] = useState([])
  const [buscaConcluida, setBuscaConcluida] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [historicoBusca, setHistoricoBusca] = useState(() => {
    const saved = localStorage.getItem('historicoBuscaBiblia')
    return saved ? JSON.parse(saved) : []
  })
  const [versiculoParaScroll, setVersiculoParaScroll] = useState(null)

  // Histórico: busca aberta → texto do resultado → voltar reabre a busca.
  useEffect(() => {
    if (!dialogoBuscaAberto) return
    if (!window.history.state?.dialogType || window.history.state.dialogType !== 'biblia-busca') {
      window.history.pushState({ dialogType: 'biblia-busca' }, '')
    }
  }, [dialogoBuscaAberto])
  const [versiculosSelecionados, setVersiculosSelecionados] = useState([])
  const [dialogoMarcarAberto, setDialogoMarcarAberto] = useState(false)
  const [modoSelecao, setModoSelecao] = useState(false)
  const [modoCompartilharVersiculos, setModoCompartilharVersiculos] = useState(false)
  const [dialogoCompartilharAberto, setDialogoCompartilharAberto] = useState(false)
  const [refParalelaFragmento, setRefParalelaFragmento] = useState(null)
  const versiculoRefs = React.useRef({})
  const elementoDestacadoRef = React.useRef(null)
  const scrollToTopOnChapterChangeRef = React.useRef(false)
  const bibliaProntaNotificadaRef = React.useRef(false)
  const scrollRestaurarRef = React.useRef(null)
  const sessaoSnapshotRef = React.useRef({})
  /** Evita que URL→estado puxe Gênesis enquanto a URL ainda não refletiu um salto vindo da busca/UI. */
  const navegacaoInternaRef = React.useRef(false)
  /** Livro/capítulo antes de abrir livros → capítulos → versículos (restaurado se cancelar). */
  const navegacaoBackupRef = React.useRef(null)
  const buscaConteudoRef = React.useRef(null)
  const buscaListaRef = React.useRef(null)
  const buscaScrollSalvoRef = React.useRef({ conteudo: 0, lista: 0 })
  const restaurarBuscaAoVoltarRef = React.useRef(false)
  const [aguardandoVoltarBusca, setAguardandoVoltarBusca] = useState(false)

  const salvarScrollBusca = useCallback(() => {
    buscaScrollSalvoRef.current = {
      conteudo: buscaConteudoRef.current?.scrollTop ?? 0,
      lista: buscaListaRef.current?.scrollTop ?? 0,
    }
    restaurarBuscaAoVoltarRef.current = true
  }, [])

  const fecharDialogoBusca = useCallback((limparRestauracao = true) => {
    if (limparRestauracao) {
      restaurarBuscaAoVoltarRef.current = false
      buscaScrollSalvoRef.current = { conteudo: 0, lista: 0 }
    }
    setDialogoBuscaAberto(false)
  }, [])
  // (splash interno removido)
  const [livrosDialogOpen, setLivrosDialogOpen] = useState(false)
  const [capitulosDialogOpen, setCapitulosDialogOpen] = useState(false)
  const [versiculosDialogOpen, setVersiculosDialogOpen] = useState(false)
  const [capitulosVemDeLivros, setCapitulosVemDeLivros] = useState(false)
  const [versiculosVemDeCapitulos, setVersiculosVemDeCapitulos] = useState(false)
  const [marcadorMenuAnchor, setMarcadorMenuAnchor] = useState(null)
  const [compartilharVersiculosAnchor, setCompartilharVersiculosAnchor] = useState(null)
  const [bibliaToolbarLeftSlot, setBibliaToolbarLeftSlot] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  useLayoutEffect(() => {
    let raf = null
    let tries = 0
    const max = 18
    const resolve = () => {
      const elToolbarLeft = document.getElementById('biblia-appbar-toolbar-left')
      setBibliaToolbarLeftSlot(elToolbarLeft || null)
      tries += 1
      if (!elToolbarLeft && tries < max) raf = requestAnimationFrame(resolve)
    }
    resolve()
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [location.pathname])
  const { user } = useFirebaseAuth()
  const [deepLinkVerse, setDeepLinkVerse] = useState(null)
  const [versiculosDestaqueLink, setVersiculosDestaqueLink] = useState([])
  const [ntProvaDisponivel, setNtProvaDisponivel] = useState(false)
  const [modoStrongProva, setModoStrongProva] = useState(false)
  const [tokensNtCapitulo, setTokensNtCapitulo] = useState({})
  const [otStrongDisponivel, setOtStrongDisponivel] = useState(false)
  const [tokensOtCapitulo, setTokensOtCapitulo] = useState({})
  const [headwordsOtCapitulo, setHeadwordsOtCapitulo] = useState({})
  const [planoLeituraTick, setPlanoLeituraTick] = useState(0)
  const [filaCelebracaoPlano, setFilaCelebracaoPlano] = useState([])
  /** Só para NT: vários possíveis Strong para o mesmo lema (escolhe e abre a página de estudo). */
  const [strongMatchDialog, setStrongMatchDialog] = useState({
    open: false,
    matches: [],
    token: null,
    loading: false,
    empty: false
  })
  const [strongBadgeErro, setStrongBadgeErro] = useState(false)
  const [modoImersivo] = useState(false)
  const modoImersivoRef = React.useRef(false)
  const scrollUltimoYRef = React.useRef(0)
  // Acumuladores direcionais para o auto-hide do cabeçalho: rolagens lentas
  // somam alguns pixels até atingir o limiar e disparar a transição,
  // garantindo que o cabeçalho volte mesmo em scroll devagar para cima.
  const scrollAcumDownRef = React.useRef(0)
  const scrollAcumUpRef = React.useRef(0)
  const scrollRafRef = React.useRef(null)
  const prevModoImersivoScrollRef = React.useRef(false)
  const toolbarPadPxRef = React.useRef(56)
  const toolbarSpacerRef = React.useRef(null)
  const ignorarScrollImersivoRef = React.useRef(false)
  const LIMITE_ESCONDER_IMERSIVO = 96
  const LIMITE_MOSTRAR_IMERSIVO = 72
  const sxPadToolbarBiblia = sxMainBelowAppBar()
  const pinchLeituraRef = React.useRef(null)
  // Multiplicador local do zoom da leitura aplicado pelo pinch de dedo.
  // É temporário (não persiste): o zoom permanente vive em `fontSize` (via
  // controle de configuração), que já é salvo por seção em `localStorage`.
  const [zoomLeitura, setZoomLeitura] = useState(100)

  const estudoQueryId = React.useMemo(() => {
    const id = new URLSearchParams(location.search).get('estudo')
    return id && id.trim().length > 0 ? id.trim() : null
  }, [location.search])

  const { 
    isDarkMode, 
    fontSize,
    fontFamily,
    textAlign,
    lineHeight,
    semEspacoEntreVersiculos,
    setBackButtonHandler,
    planoLeitura,
    setPlanoLeitura
  } = useApp()
  const fontSizeLeitura = Math.round((Number(fontSize) || 100) * (zoomLeitura / 100))
  const resultadosVisiveis = useMemo(
    () => resultados,
    [resultados]
  )

  const livrosBuscaOpcoes = useMemo(() => {
    if (!opcoesLivros.length) return []
    if (testamentoBusca === 'AT') return opcoesLivros.filter((l) => l.id < 40)
    if (testamentoBusca === 'NT') return opcoesLivros.filter((l) => l.id >= 40)
    return opcoesLivros
  }, [opcoesLivros, testamentoBusca])
  const aplicarModoImersivo = useCallback((proximo) => {
    if (modoImersivoRef.current === proximo) return
    modoImersivoRef.current = proximo
    window.dispatchEvent(
      new CustomEvent('biblia-imersiva-toggle', {
        detail: { hide: proximo },
      })
    )
  }, [])

  const processarScrollImersivo = useCallback(() => {
    if (ignorarScrollImersivoRef.current) return

    const target = versiculoRefs.current.container
    if (!target) return

    const atual = target.scrollTop
    const ultimo = scrollUltimoYRef.current
    const diff = atual - ultimo

    let acumDown = scrollAcumDownRef.current
    let acumUp = scrollAcumUpRef.current

    if (diff > 0) {
      acumDown += diff
      acumUp = 0
    } else if (diff < 0) {
      acumUp += -diff
      acumDown = 0
    }

    const imersivo = modoImersivoRef.current

    if (atual <= 8 && imersivo) {
      aplicarModoImersivo(false)
      acumDown = 0
      acumUp = 0
    } else if (acumDown >= LIMITE_ESCONDER_IMERSIVO && !imersivo) {
      aplicarModoImersivo(true)
      acumDown = 0
    } else if (acumUp >= LIMITE_MOSTRAR_IMERSIVO && imersivo) {
      aplicarModoImersivo(false)
      acumUp = 0
    }

    scrollUltimoYRef.current = atual
    scrollAcumDownRef.current = acumDown
    scrollAcumUpRef.current = acumUp
  }, [aplicarModoImersivo])
  const onPinchLeitura = React.useCallback((v) => setZoomLeitura(v), [])
  usePinchNumeric(pinchLeituraRef, {
    enabled: true,
    value: zoomLeitura,
    onChange: onPinchLeitura,
    min: 100,
    max: 200,
    step: 10,
  })

  const livroCorBase = livroAtual ? obterCorLivro(livroAtual.id) : '#1E7A35'
  const corBibliaSuave = toRgba(livroCorBase, 0.14)
  const corBibliaHover = toRgba(livroCorBase, 0.26)
  const baseAssetUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
  const strongBadgeSrc = `${baseAssetUrl}strong-badge.png`
  const ehNovoTestamento = Number(livroAtual?.id || 0) >= 40
  const ntBookNumProva = ehNovoTestamento ? Number(livroAtual?.id || 0) - 39 : 0
  const sxIconeBarraBiblia = {
    color: livroCorBase,
    bgcolor: corBibliaSuave,
    '&:hover': { bgcolor: corBibliaHover },
  }

  /** Mesma altura para livro, capítulo, ícones e Strong — evita quadros com alturas diferentes. */
  const sxAlturaBarraCtrl = {
    height: { xs: 44, sm: 46 },
    minHeight: { xs: 44, sm: 46 },
    maxHeight: { xs: 44, sm: 46 },
    boxSizing: 'border-box',
  }

  /** Lista de resultados da busca — barra grossa para arrastar (milhares de versículos). */
  const sxListaResultadosBusca = useMemo(
    () => ({
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
      py: 0,
      pr: 0.5,
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'auto',
      scrollbarColor: `${livroCorBase} rgba(0,0,0,0.1)`,
      '&::-webkit-scrollbar': { width: { xs: 16, sm: 14 } },
      '&::-webkit-scrollbar-track': {
        borderRadius: 10,
        bgcolor: 'action.hover',
        my: 0.5,
      },
      '&::-webkit-scrollbar-thumb': {
        borderRadius: 10,
        bgcolor: livroCorBase,
        border: '3px solid transparent',
        backgroundClip: 'padding-box',
        minHeight: 64,
      },
      '&::-webkit-scrollbar-thumb:hover': {
        bgcolor: livroCorBase,
        filter: 'brightness(0.9)',
      },
    }),
    [livroCorBase]
  )

  /**
   * Borda dos controles da barra (Livro, Capítulo, Pesquisa, Strong).
   * O AppBar da Bíblia fica sempre em “casco escuro”; a borda segue o mesmo
   * critério do modo noturno em qualquer tema global.
   */
  const corBordaBotaoBarra = 'rgba(255, 255, 255, 0.55)'
  /** Fundo dos botões chapados da barra (sempre como no tema escuro). */
  const bgBotaoBarraBiblia = 'grey.900'
  const bgBotaoBarraBibliaHover = 'grey.800'
  const hoverStrongNaBarra = 'rgba(255, 255, 255, 0.1)'

  const planoIdOrigem = React.useMemo(() => {
    const id = new URLSearchParams(location.search).get('planoId')
    return id ? String(id) : ''
  }, [location.search])

  const leituraVeioDoPlano = React.useMemo(() => {
    const origem = new URLSearchParams(location.search).get('origem')
    return origem === 'plano'
  }, [location.search])

  const veioDoPlanoContexto = React.useMemo(
    () => leituraVeioDoPlano || Boolean(planoIdOrigem),
    [leituraVeioDoPlano, planoIdOrigem]
  )

  const capituloKeyAtual = React.useMemo(() => {
    if (!livroAtual?.id || !capitulo) return ''
    return `${livroAtual.id}-${capitulo}`
  }, [livroAtual?.id, capitulo])

  const instanciasCompativeis = React.useMemo(() => {
    if (!livroAtual?.id || !capitulo) return []
    return listarInstanciasQueContemCapitulo(livroAtual.id, capitulo)
  }, [livroAtual?.id, capitulo])

  const idsDestinoLeitura = React.useMemo(() => {
    const ids = instanciasCompativeis.map((i) => i.id)
    if (veioDoPlanoContexto && planoIdOrigem && ids.includes(planoIdOrigem)) {
      return [planoIdOrigem]
    }
    return ids
  }, [instanciasCompativeis, veioDoPlanoContexto, planoIdOrigem])

  const capitulosPendentesIds = React.useMemo(() => {
    if (!capituloKeyAtual) return []
    return idsDestinoLeitura.filter((id) => {
      const inst = obterInstancia(id)
      return !inst?.capitulosLidos?.includes(capituloKeyAtual)
    })
  }, [idsDestinoLeitura, capituloKeyAtual, planoLeituraTick])

  const capituloMarcadoNoPlanoContexto = React.useMemo(() => {
    if (!veioDoPlanoContexto || !capituloKeyAtual) return false
    const alvoId = planoIdOrigem || idsDestinoLeitura[0]
    if (!alvoId) return false
    const inst = obterInstancia(alvoId)
    return Boolean(inst?.capitulosLidos?.includes(capituloKeyAtual))
  }, [veioDoPlanoContexto, capituloKeyAtual, planoIdOrigem, idsDestinoLeitura, planoLeituraTick])

  const instanciaEscadaUiId = React.useMemo(() => {
    if (!veioDoPlanoContexto) return null
    return planoIdOrigem || idsDestinoLeitura[0] || null
  }, [veioDoPlanoContexto, planoIdOrigem, idsDestinoLeitura])
  const celebracaoPlanoAtual = filaCelebracaoPlano[0] ?? null
  const propsCelebracaoPlano = React.useMemo(
    () => eventoEscadaParaProps(celebracaoPlanoAtual),
    [celebracaoPlanoAtual]
  )
  const fecharCelebracaoPlano = React.useCallback(() => {
    setFilaCelebracaoPlano((f) => f.slice(1))
  }, [])

  const executarAcaoPlanos = React.useCallback((idsAlvo, acao = 'marcar') => {
    if (!livroAtual?.id || !capitulo || !Array.isArray(idsAlvo) || idsAlvo.length === 0) return false
    const resultadosRegistro = marcarCapituloEmInstancias(idsAlvo, livroAtual.id, capitulo)
    if (resultadosRegistro.length === 0) return false
    setPlanoLeituraTick((t) => t + 1)

    if (acao === 'desmarcar') {
      return true
    }

    const alvoAtivo =
      veioDoPlanoContexto && planoIdOrigem && resultadosRegistro.some((r) => r.instanciaId === planoIdOrigem)
        ? planoIdOrigem
        : resultadosRegistro[0].instanciaId
    const inst = obterInstancia(alvoAtivo)
    if (inst) {
      setPlanoLeitura((prev) => ({
        ...prev,
        planoAtual: inst.templateId,
        instanciaAtivaId: inst.id,
        ultimaLeitura: new Date().toISOString(),
      }))
    }
    queueMicrotask(() => {
      const escada = []
      for (const item of resultadosRegistro) {
        const eventos = Array.isArray(item?.eventos) ? item.eventos : []
        for (const ev of eventos) {
          if (!ev || !ev.mensagem) continue
          if (isEventoEscadaVisual(ev)) {
            escada.push(ev)
            continue
          }
          window.dispatchEvent(new CustomEvent('app-incentivo', { detail: ev }))
        }
      }
      if (escada.length > 0) {
        setFilaCelebracaoPlano((f) => [...f, ...escada])
      }
    })
    return true
  }, [livroAtual?.id, capitulo, veioDoPlanoContexto, planoIdOrigem, setPlanoLeitura])

  /** Volta ao topo do texto bíblico (útil após marcar leitura no rodapé). */
  const scrollLeituraBibliaAoTopo = React.useCallback(() => {
    aplicarModoImersivo(false)
    requestAnimationFrame(() => {
      const c = versiculoRefs.current?.container
      if (c) c.scrollTop = 0
    })
  }, [aplicarModoImersivo])

  const registrarCapituloNosPlanos = React.useCallback(() => {
    if (!livroAtual?.id || !capitulo) return
    if (veioDoPlanoContexto && capituloMarcadoNoPlanoContexto) {
      const alvoId = planoIdOrigem || idsDestinoLeitura[0]
      if (!alvoId) return
      const resultadosRegistro = marcarCapituloEmInstancias([alvoId], livroAtual.id, capitulo)
      if (resultadosRegistro.length > 0) {
        setPlanoLeituraTick((t) => t + 1)
        const inst = obterInstancia(alvoId)
        if (inst) {
          setPlanoLeitura((prev) => ({
            ...prev,
            planoAtual: inst.templateId,
            instanciaAtivaId: inst.id,
            ultimaLeitura: new Date().toISOString(),
          }))
        }
      }
      return
    }
    if (!veioDoPlanoContexto && idsDestinoLeitura.length > 0 && capitulosPendentesIds.length === 0) {
      executarAcaoPlanos(idsDestinoLeitura, 'desmarcar')
      return
    }
    if (capitulosPendentesIds.length === 0) {
      if (!leituraVeioDoPlano) {
        const mensagemInfo =
          idsDestinoLeitura.length > 0
            ? 'Este capítulo já está registrado no plano.'
            : 'Nenhum plano em andamento contém este capítulo agora.'
        window.dispatchEvent(
          new CustomEvent('app-incentivo', {
            detail: {
              tipo: 'plano_registro_capitulo_info',
              chave: `plano_cap_info_${livroAtual.id}_${capitulo}_${Date.now()}`,
              mensagem: mensagemInfo,
              severidade: 'info',
              meta: { confete: 'nenhum' },
            },
          })
        )
      }
      return
    }
    if (executarAcaoPlanos(capitulosPendentesIds, 'marcar')) {
      scrollLeituraBibliaAoTopo()
    }
  }, [livroAtual?.id, capitulo, capituloMarcadoNoPlanoContexto, capitulosPendentesIds, veioDoPlanoContexto, planoIdOrigem, setPlanoLeitura, idsDestinoLeitura, idsDestinoLeitura.length, leituraVeioDoPlano, executarAcaoPlanos, scrollLeituraBibliaAoTopo])

  const abrirPlanoLeitura = React.useCallback(() => {
    const ativo = instanciaAtivaId()
    if (ativo) {
      navigate(`/plano-leitura-biblia?id=${encodeURIComponent(ativo)}`)
      return
    }
    navigate('/plano')
  }, [navigate])

  const voltarParaBibliaPadrao = React.useCallback(() => {
    const params = new URLSearchParams(location.search)
    params.delete('planoId')
    params.delete('origem')
    const next = params.toString()
    navigate(`${location.pathname}${next ? `?${next}` : ''}`)
  }, [location.pathname, location.search, navigate])

  const voltarAoPlanoLeitura = React.useCallback(() => {
    const idPlano = planoIdOrigem || planoLeitura?.instanciaAtivaId
    if (idPlano) {
      navigate(`/plano-leitura-biblia?id=${encodeURIComponent(idPlano)}`)
      return
    }
    voltarParaBibliaPadrao()
  }, [planoIdOrigem, planoLeitura?.instanciaAtivaId, navigate, voltarParaBibliaPadrao])

  const sxBotaoPlanoBarra = React.useMemo(
    () => ({
      minWidth: 'auto',
      textTransform: 'none',
      fontWeight: 700,
      px: { xs: 0.55, sm: 0.85 },
      py: 0.2,
      fontSize: { xs: '0.72rem', sm: '0.82rem' },
      lineHeight: 1.1,
      borderColor: 'rgba(255,255,255,0.38)',
      color: 'grey.100',
      flexShrink: 0,
      '&:hover': { borderColor: 'rgba(255,255,255,0.75)', bgcolor: 'rgba(255,255,255,0.08)' },
    }),
    []
  )

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { verificarBancoNtProva } = await loadNtStrongProvaService()
        const ok = await verificarBancoNtProva()
        if (active) setNtProvaDisponivel(ok)
      } catch {
        if (active) setNtProvaDisponivel(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { verificarBancoOtStrong } = await loadOtStrongService()
        const ok = await verificarBancoOtStrong()
        if (active) setOtStrongDisponivel(ok)
      } catch {
        if (active) setOtStrongDisponivel(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!ntProvaDisponivel || !modoStrongProva || !ehNovoTestamento || !ntBookNumProva || !capitulo) {
      setTokensNtCapitulo({})
      return
    }
    let active = true
    void (async () => {
      try {
        const { buscarTokensNtCapitulo } = await loadNtStrongProvaService()
        const byVerse = await buscarTokensNtCapitulo(ntBookNumProva, capitulo)
        if (active) setTokensNtCapitulo(byVerse || {})
      } catch {
        if (active) setTokensNtCapitulo({})
      }
    })()
    return () => {
      active = false
    }
  }, [ntProvaDisponivel, modoStrongProva, ehNovoTestamento, ntBookNumProva, capitulo])

  useEffect(() => {
    if (!otStrongDisponivel || !modoStrongProva || ehNovoTestamento || !livroAtual?.id || !capitulo) {
      setTokensOtCapitulo({})
      setHeadwordsOtCapitulo({})
      return
    }
    let active = true
    void (async () => {
      try {
        const { buscarTokensOtCapitulo, buscarStrongHebrewMap } = await loadOtStrongService()
        const byVerse = await buscarTokensOtCapitulo(livroAtual.id, capitulo)
        const codes = [
          ...new Set(
            Object.values(byVerse || {})
              .flat()
              .map((t) => String(t?.strong_code || '').trim().toUpperCase())
              .filter(Boolean)
          ),
        ]
        const headwordMap = codes.length ? await buscarStrongHebrewMap(codes) : {}
        if (active) {
          setTokensOtCapitulo(byVerse || {})
          setHeadwordsOtCapitulo(headwordMap || {})
        }
      } catch {
        if (active) {
          setTokensOtCapitulo({})
          setHeadwordsOtCapitulo({})
        }
      }
    })()
    return () => {
      active = false
    }
  }, [otStrongDisponivel, modoStrongProva, ehNovoTestamento, livroAtual?.id, capitulo])

  const abrirStrongPorToken = async (token, meta = {}) => {
    if (!token) return
    const tokenComRef = {
      ...token,
      livroId: meta.livroId ?? token.livroId ?? livroAtual?.id,
      capitulo: meta.capitulo ?? token.capitulo ?? capitulo,
      versiculo: meta.versiculo ?? token.versiculo ?? token.verse,
    }
    if (!ehNovoTestamento) {
      const strongCode = String(token.strong_code || '').trim().toUpperCase()
      if (strongCode) {
        salvarTokenPassagem(strongCode, tokenComRef)
        navigate(`/estudo-strong/${encodeURIComponent(strongCode)}`, { state: { token: tokenComRef } })
      }
      return
    }
    try {
      const lemmaBase = token.lemma || token.normalized_word || token.word || token.text || ''
      const { buscarStrongGregoPorLemma } = await loadNtStrongProvaService()
      const matches = await buscarStrongGregoPorLemma(lemmaBase, 20)
      if (matches.length === 1 && matches[0]?.strong) {
        const strongCode = matches[0].strong
        salvarTokenPassagem(strongCode, tokenComRef)
        navigate(`/estudo-strong/${encodeURIComponent(strongCode)}`, { state: { token: tokenComRef } })
        return
      }
      setStrongMatchDialog({
        open: true,
        matches: matches.length > 1 ? matches : [],
        token: tokenComRef,
        loading: false,
        empty: matches.length === 0,
      })
    } catch {
      setStrongMatchDialog({ open: true, matches: [], token: tokenComRef, loading: false, empty: true })
    }
  }

  /** Layout: hidrata `versiculosDestaqueLink` antes do efeito que sincroniza a URL (evita apagar `versiculos`). */
  useLayoutEffect(() => {
    const qs = new URLSearchParams(location.search)
    const livroQ = Number(qs.get('livro'))
    const capQ = Number(qs.get('capitulo') ?? qs.get('cap'))
    const versiculosQ = parseVersiculosQuery(qs.get('versiculos'))
    if (!Number.isInteger(livroQ) || livroQ < 1 || !Number.isInteger(capQ) || capQ < 1) {
      setVersiculosDestaqueLink([])
      return
    }
    setVersiculosDestaqueLink(versiculosQ)
  }, [location.search])

  /** Estado → URL antes do efeito que aplica a URL ao estado (evita corrida com URL atrasada após loading). */
  useLayoutEffect(() => {
    if (carregandoInicial) return
    if (!livroAtual?.id || !capitulo) return
    const params = new URLSearchParams(location.search)
    params.set('livro', String(livroAtual.id))
    params.set('capitulo', String(capitulo))
    params.delete('cap')
    if (Number.isInteger(deepLinkVerse) && deepLinkVerse > 0) {
      params.set('versiculo', String(deepLinkVerse))
      params.delete('v')
    } else {
      params.delete('versiculo')
      params.delete('v')
    }
    if (versiculosDestaqueLink.length > 0) {
      params.set('versiculos', versiculosDestaqueLink.join(','))
    } else {
      params.delete('versiculos')
    }
    const next = `?${params.toString()}`
    if (!searchParamsSemanticallyEqual(next, location.search || '')) {
      navigate(`${location.pathname}${next}`, { replace: true })
    }
  }, [livroAtual?.id, capitulo, deepLinkVerse, versiculosDestaqueLink, location.pathname, location.search, navigate, carregandoInicial])

  useEffect(() => {
    if (carregandoInicial) return
    const qs = new URLSearchParams(location.search)
    const livroQ = Number(qs.get('livro'))
    const capQ = Number(qs.get('capitulo') ?? qs.get('cap'))
    const vQ = Number(qs.get('versiculo') ?? qs.get('v'))
    const versiculosQ = parseVersiculosQuery(qs.get('versiculos'))
    if (!Number.isInteger(livroQ) || livroQ < 1 || !Number.isInteger(capQ) || capQ < 1) {
      return
    }
    if (!opcoesLivros.length || loading) return
    const livro = opcoesLivros.find((l) => l.id === livroQ)
    if (!livro) return
    if (
      navegacaoInternaRef.current &&
      livroAtual?.id != null &&
      (livroQ !== livroAtual.id || capQ !== capitulo)
    ) {
      return
    }
    if (livroAtual?.id !== livro.id || capitulo !== capQ) {
      const alvoScroll = Number.isInteger(vQ) && vQ > 0 ? vQ : versiculosQ[0] ?? null
      irParaVersiculo(livro.id, capQ, alvoScroll)
      return
    }
    if (Number.isInteger(vQ) && vQ > 0) {
      setVersiculoParaScroll({ livroId: livro.id, cap: capQ, versiculoNum: vQ })
      setDeepLinkVerse(vQ)
    } else if (versiculosQ.length > 0) {
      setVersiculoParaScroll({ livroId: livro.id, cap: capQ, versiculoNum: versiculosQ[0] })
    }
    navegacaoInternaRef.current = false
  }, [location.search, opcoesLivros, loading, carregandoInicial])

  useEffect(() => {
    const onPopState = () => {
      navegacaoInternaRef.current = false
      const tipo = window.history.state?.dialogType
      if (tipo === 'biblia-busca') {
        setDialogoBuscaAberto(true)
        setAguardandoVoltarBusca(false)
      } else if (tipo === 'biblia-pos-busca') {
        setDialogoBuscaAberto(false)
        setAguardandoVoltarBusca(true)
      } else {
        setDialogoBuscaAberto(false)
        setAguardandoVoltarBusca(false)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const onOpenShareSelection = () => {
      setModoSelecao(true)
      setModoCompartilharVersiculos(true)
      setVersiculosSelecionados([])
      setDialogoCompartilharAberto(true)
    }
    window.addEventListener('biblia-share-select', onOpenShareSelection)
    return () => window.removeEventListener('biblia-share-select', onOpenShareSelection)
  }, [])

  const montarQueryEstudoVersiculos = useCallback(() => {
    if (!livroAtual || !versiculosSelecionados.length) return null
    const vers = [...new Set(versiculosSelecionados.map((v) => Number(v.versiculo)))]
      .filter((n) => Number.isInteger(n) && n > 0)
      .sort((a, b) => a - b)
    if (!vers.length) return null
    const returnTo = `${location.pathname}${location.search || ''}`
    const q = new URLSearchParams({
      livro: String(livroAtual.id),
      capitulo: String(capitulo),
      versiculos: vers.join(','),
      returnTo
    })
    return q.toString()
  }, [livroAtual, versiculosSelecionados, capitulo, location.pathname, location.search])

  /**
   * Abre o ecrã que prepara um estudo bíblico (com enquadramento teológico
   * reformado) a partir dos versículos selecionados. A "como" o estudo é
   * preparado fica escondido do usuário: vê apenas "Estudo bíblico".
   */
  const handleEstudoIaPassagem = useCallback(() => {
    setMarcadorMenuAnchor(null)
    const qs = montarQueryEstudoVersiculos()
    if (!qs) return
    const dest = `/estudos-biblicos/ia-passagem?${qs}`
    if (
      !ensureUserForFeature(user, navigate, {
        mensagem: 'Entre na sua conta para preparar o estudo.',
        redirectTo: dest
      })
    ) {
      return
    }
    navigate(dest)
  }, [user, navigate, montarQueryEstudoVersiculos])

  /** Editor manual (fluxo antigo por formulário). */
  const handlePrepararEstudoEditorManual = useCallback(() => {
    setMarcadorMenuAnchor(null)
    const qs = montarQueryEstudoVersiculos()
    if (!qs) return
    const dest = `/estudos-biblicos/novo?${qs}`
    if (
      !ensureUserForFeature(user, navigate, {
        mensagem: 'Entre na sua conta para preparar um estudo.',
        redirectTo: dest
      })
    ) {
      return
    }
    navigate(dest)
  }, [user, navigate, montarQueryEstudoVersiculos])

  /**
   * Descobre a perícope que contém o **primeiro versículo selecionado**,
   * a partir da lista `pericopesCapitulo` já carregada para o capítulo
   * atual. Devolve `{ titulo, inicio, fim }` ou `null` se não há perícopes.
   *
   * O `fim` é deduzido pelo início da próxima perícope (ou pelo total de
   * versículos do capítulo no map em memória `resultados`).
   */
  const pericopeDoVersiculoSelecionado = useMemo(() => {
    if (!livroAtual) return null
    if (!Array.isArray(pericopesCapitulo) || !pericopesCapitulo.length) return null
    const versOrdem = [...new Set(versiculosSelecionados.map((v) => Number(v.versiculo)))]
      .filter((n) => Number.isInteger(n) && n > 0)
      .sort((a, b) => a - b)
    if (!versOrdem.length) return null
    const primeiroVers = versOrdem[0]

    const ordenadas = [...pericopesCapitulo]
      .map((p) => ({
        titulo: String(p?.titulo || '').trim(),
        inicio: Number(p?.versiculo) || 0
      }))
      .filter((p) => p.inicio >= 1)
      .sort((a, b) => a.inicio - b.inicio)
    if (!ordenadas.length) return null

    let idx = -1
    for (let i = 0; i < ordenadas.length; i++) {
      if (ordenadas[i].inicio <= primeiroVers) idx = i
      else break
    }
    if (idx === -1) idx = 0

    const atual = ordenadas[idx]
    const proxima = ordenadas[idx + 1] || null
    let fim
    if (proxima) fim = Math.max(atual.inicio, proxima.inicio - 1)
    else {
      // total de versículos do capítulo é o tamanho de `resultados` no estado atual.
      fim = Math.max(atual.inicio, (resultados || []).length || atual.inicio)
    }
    return {
      titulo: atual.titulo || '(sem título)',
      inicio: atual.inicio,
      fim
    }
  }, [livroAtual, pericopesCapitulo, versiculosSelecionados, resultados])

  /**
   * Abre o estudo expositivo completo da perícope onde o(s) versículo(s)
   * selecionado(s) está(ão) inserido(s).
   */
  const handleEstudarPericopeCompleta = useCallback(() => {
    setMarcadorMenuAnchor(null)
    if (!livroAtual) return
    const peri = pericopeDoVersiculoSelecionado
    if (!peri) return
    const returnTo = `${location.pathname}${location.search || ''}`
    const q = new URLSearchParams({
      livro: String(livroAtual.id),
      capitulo: String(capitulo),
      inicio: String(peri.inicio),
      fim: String(peri.fim),
      titulo: peri.titulo || '',
      returnTo
    })
    const dest = `/estudos-biblicos/ia-pericope?${q.toString()}`
    if (
      !ensureUserForFeature(user, navigate, {
        mensagem: 'Entre na sua conta para abrir o estudo da perícope.',
        redirectTo: dest
      })
    ) {
      return
    }
    navigate(dest)
  }, [
    livroAtual,
    pericopeDoVersiculoSelecionado,
    location.pathname,
    location.search,
    capitulo,
    user,
    navigate
  ])

  const totalSelecionados = Math.max(0, versiculosSelecionados.length)
  const podeAcoesMarcacao = Boolean(modoSelecao && totalSelecionados > 0 && livroAtual)

  const abrirMenuMarcador = useCallback((e) => setMarcadorMenuAnchor(e.currentTarget), [])
  const abrirMenuCompartilharVersiculos = useCallback((e) => setCompartilharVersiculosAnchor(e.currentTarget), [])
  const fecharMenuCompartilharVersiculos = useCallback(() => setCompartilharVersiculosAnchor(null), [])

  const versiculosSelecionadosOrdenados = useMemo(
    () =>
      [...new Set(versiculosSelecionados.map((v) => Number(v.versiculo)))]
        .filter((n) => Number.isInteger(n) && n > 0)
        .sort((a, b) => a - b),
    [versiculosSelecionados]
  )

  // Mapa de chaves selecionadas — torna O(1) o check de "este versículo está
  // selecionado" no `map()` da renderização, em vez do `Array.some` antigo
  // que era O(N) por versículo (O(N²) no total ao alternar seleção).
  const chavesSelecionadas = useMemo(() => {
    const s = new Set()
    for (const v of versiculosSelecionados) {
      s.add(`${v.livroId}-${v.capitulo}-${v.versiculo}`)
    }
    return s
  }, [versiculosSelecionados])

  // Estável: o filho `VersiculoMarcavel` é `React.memo` e precisa que
  // `onToggleSelecao` não mude a cada render do pai.
  const onToggleSelecaoVersiculo = useCallback((versiculo) => {
    setVersiculosSelecionados((prev) => {
      const chave = `${versiculo.livroId}-${versiculo.capitulo}-${versiculo.versiculo}`
      const idx = prev.findIndex(
        (v) => `${v.livroId}-${v.capitulo}-${v.versiculo}` === chave
      )
      let next
      if (idx >= 0) {
        next = prev.slice()
        next.splice(idx, 1)
      } else {
        next = [...prev, versiculo]
      }
      // Mantém `modoSelecao` em sincronia com a presença de seleção.
      // A barra de ações flutuante e ramos legados de UI dependem dessa flag.
      setModoSelecao(next.length > 0)
      return next
    })
  }, [])

  // Sai automaticamente do modo de seleção quando a última seleção é removida.
  // (Cobre caminhos que zeram `versiculosSelecionados` sem passar pelo toggle.)
  useEffect(() => {
    if (versiculosSelecionados.length === 0 && modoSelecao) {
      setModoSelecao(false)
    }
  }, [versiculosSelecionados.length, modoSelecao])

  const limparSelecaoVersiculos = useCallback(() => {
    setVersiculosSelecionados([])
    setModoSelecao(false)
    setModoCompartilharVersiculos(false)
    setMarcadorMenuAnchor(null)
    setCompartilharVersiculosAnchor(null)
    setDialogoMarcarAberto(false)
  }, [])

  useEffect(() => {
    const onFecharSelecao = () => limparSelecaoVersiculos()
    window.addEventListener('salvation-biblia-fechar-selecao-versiculos', onFecharSelecao)
    return () => window.removeEventListener('salvation-biblia-fechar-selecao-versiculos', onFecharSelecao)
  }, [limparSelecaoVersiculos])

  // Ao trocar de livro/capítulo (menu, setas, busca, deep link), encerra a
  // seleção anterior — evita a barra de ações “presa” a versículos do trecho antigo.
  const contextoLeituraSelRef = useRef(
    livroAtual?.id != null ? `${livroAtual.id}:${capitulo}` : null
  )
  useEffect(() => {
    if (livroAtual?.id == null) return
    const ctx = `${livroAtual.id}:${capitulo}`
    const anterior = contextoLeituraSelRef.current
    contextoLeituraSelRef.current = ctx
    if (anterior != null && anterior !== ctx) {
      limparSelecaoVersiculos()
    }
  }, [livroAtual?.id, capitulo, limparSelecaoVersiculos])

  const linkCompartilharVersiculos = useMemo(() => {
    if (!livroAtual || !versiculosSelecionadosOrdenados.length) return ''
    return buildAppShareLink(
      location.pathname,
      `?livro=${livroAtual.id}&capitulo=${capitulo}&versiculos=${versiculosSelecionadosOrdenados.join(',')}`
    )
  }, [livroAtual, versiculosSelecionadosOrdenados, location.pathname, capitulo])

  const payloadCompartilharVersiculos = useMemo(() => {
    if (!livroAtual || !versiculosSelecionados.length) {
      return { title: '', text: '', url: '' }
    }
    const versiculosOrdenados = versiculosSelecionadosOrdenados
    if (!versiculosOrdenados.length) {
      return { title: '', text: '', url: '' }
    }

    const blocos = []
    let ini = versiculosOrdenados[0]
    let fim = versiculosOrdenados[0]
    for (let i = 1; i < versiculosOrdenados.length; i++) {
      const atual = versiculosOrdenados[i]
      if (atual === fim + 1) {
        fim = atual
      } else {
        blocos.push(ini === fim ? `${ini}` : `${ini}-${fim}`)
        ini = atual
        fim = atual
      }
    }
    blocos.push(ini === fim ? `${ini}` : `${ini}-${fim}`)

    const livroMeta = livrosData.find((l) => l.id === livroAtual.id)
    const abreviacao =
      livroMeta?.abreviacao || livroAtual?.abreviacao || String(livroAtual?.nome || '').slice(0, 2)
    const referenciaCompacta = `${abreviacao} ${capitulo}:${blocos.join(';')}`
    const capLink = linkCompartilharVersiculos

    const linhas = versiculosSelecionados
      .slice()
      .sort((a, b) => a.versiculo - b.versiculo)
      .map((sel) => {
        const verso = resultados.find((v, i) => {
          const n = v.numero != null ? v.numero : i + 1
          return n === sel.versiculo
        })
        const bruto = String(verso?.texto || '').trim()
        const texto = bruto.replace(/^[\s\d⁰¹²³⁴⁵⁶⁷⁸⁹.,;:()\-[\]]+/, '').trim()
        if (!texto) return ''
        return `${sel.versiculo}. ${texto}`
      })
      .filter(Boolean)

    const mensagem = `${referenciaCompacta}\n\n${linhas.join('\n')}\n\nLer capítulo: ${capLink}`

    return {
      title: `Bíblia DC - ${referenciaCompacta}`,
      text: mensagem,
      url: capLink,
    }
  }, [
    livroAtual,
    versiculosSelecionados,
    versiculosSelecionadosOrdenados,
    linkCompartilharVersiculos,
    livrosData,
    capitulo,
    resultados,
  ])

  const copiarLinkVersiculosSelecionados = useCallback(async () => {
    if (!linkCompartilharVersiculos) return
    await copiarParaAreaTransferencia(linkCompartilharVersiculos, {
      mensagemSucesso: 'Link dos versículos copiado.',
      tituloFallback: 'Copie este link'
    })
  }, [linkCompartilharVersiculos])

  // Plano: Concluir / Voltar ao plano / "+" ficam no fim da faixa Livro|Cap|🔍 (ml: auto).

  async function handleEnviarVersiculosSelecionadosChat() {
    setMarcadorMenuAnchor(null)
    if (!ensureUserForChatExport(user, navigate)) return
    if (!livroAtual || !versiculosSelecionados.length) return
    const items = versiculosSelecionados.map((sel) => {
      const verso = resultados.find((v, i) => {
        const n = v.numero != null ? v.numero : i + 1
        return n === sel.versiculo
      })
      let texto = ''
      if (verso?.texto) {
        const m = verso.texto.match(/^(\s*\d+\s*)(.*)$/s)
        texto = m ? m[2] : verso.texto
      }
      return {
        livroId: livroAtual.id,
        capitulo,
        versiculo: sel.versiculo,
        texto: texto.slice(0, 2000)
      }
    })
    const { serialized, previewText } = buildBibliaVersiculosExport(items)
    if (serialized.length > 12000) {
      await avisarAsync({
        titulo: 'Volume de dados excedido',
        mensagem: 'O volume de dados excede o limite do chat.',
        severidade: 'warning'
      })
      return
    }
    pushPendingChatExport(navigate, {
      exportKind: 'biblia_versiculos',
      exportPayload: serialized,
      previewText
    })
  }

  const referenciaCompactaCompartilhar = React.useMemo(() => {
    if (!modoCompartilharVersiculos || !livroAtual || !versiculosSelecionados.length) return ''
    const versiculosOrdenados = [...new Set(versiculosSelecionados.map((v) => Number(v.versiculo)))]
      .filter((n) => Number.isInteger(n) && n > 0)
      .sort((a, b) => a - b)
    if (!versiculosOrdenados.length) return ''

    const blocos = []
    let ini = versiculosOrdenados[0]
    let fim = versiculosOrdenados[0]
    for (let i = 1; i < versiculosOrdenados.length; i++) {
      const atual = versiculosOrdenados[i]
      if (atual === fim + 1) fim = atual
      else {
        blocos.push(ini === fim ? `${ini}` : `${ini}-${fim}`)
        ini = atual
        fim = atual
      }
    }
    blocos.push(ini === fim ? `${ini}` : `${ini}-${fim}`)
    const livroMeta = livrosData.find((l) => l.id === livroAtual.id)
    const abreviacao = livroMeta?.abreviacao || livroAtual?.abreviacao || String(livroAtual?.nome || '').slice(0, 2)
    return `${abreviacao} ${capitulo}:${blocos.join(';')}`
  }, [modoCompartilharVersiculos, livroAtual, capitulo, versiculosSelecionados])

  // Splash interno removido — splash global do AppShell é suficiente.

  useEffect(() => {
    modoImersivoRef.current = modoImersivo
  }, [modoImersivo])

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }
      window.dispatchEvent(
        new CustomEvent('biblia-imersiva-toggle', {
          detail: { hide: false },
        })
      )
    }
  }, [])

  /** Barra + espaçador no mesmo frame: sem faixa branca e sem deslocar a linha de leitura. */
  useLayoutEffect(() => {
    modoImersivoRef.current = modoImersivo
    window.dispatchEvent(
      new CustomEvent('biblia-imersiva-toggle', {
        detail: { hide: modoImersivo },
      })
    )

    const el = versiculoRefs.current.container
    const spacer = toolbarSpacerRef.current
    if (!el) return

    const wasImersivo = prevModoImersivoScrollRef.current

    if (wasImersivo !== modoImersivo) {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }

      const pad = toolbarPadPxRef.current
      if (pad > 0) {
        if (modoImersivo) {
          // Espaçador some: conteúdo sobe no fluxo — reduz scroll para manter a mesma linha.
        } else {
          const newPad = spacer?.offsetHeight || pad
          toolbarPadPxRef.current = newPad
        }
      }
      prevModoImersivoScrollRef.current = modoImersivo
      scrollUltimoYRef.current = el.scrollTop
      scrollAcumDownRef.current = 0
      scrollAcumUpRef.current = 0
      ignorarScrollImersivoRef.current = true
      requestAnimationFrame(() => {
        ignorarScrollImersivoRef.current = false
        scrollUltimoYRef.current = el.scrollTop
      })
    } else if (!modoImersivo && spacer) {
      const h = spacer.offsetHeight
      if (h > 0) toolbarPadPxRef.current = h
    }
  }, [modoImersivo])

  sessaoSnapshotRef.current = {
    livroId: livroAtual?.id,
    capitulo,
    livroAtual,
    resultados,
    opcoesLivros,
    pericopesCapitulo,
    versiculosRenderizados,
    scrollTop: versiculoRefs.current.container?.scrollTop ?? 0,
  }

  useEffect(() => {
    return () => {
      const s = sessaoSnapshotRef.current
      if (s.livroId && s.resultados?.length) {
        gravarBibliaSessaoCache(s)
      }
    }
  }, [])

  useLayoutEffect(() => {
    if (scrollRestaurarRef.current == null) return
    const el = versiculoRefs.current.container
    if (!el) return
    const top = scrollRestaurarRef.current
    scrollRestaurarRef.current = null
    requestAnimationFrame(() => {
      el.scrollTop = top
    })
  }, [carregandoInicial, resultados.length])

  useEffect(() => {
    const init = async () => {
      try {
        // Abre por ponto de entrada: carrega só o capítulo provável da leitura atual
        // (sem varrer lista do SQLite na inicialização).
        let palpiteLivroId = null
        let palpiteCapitulo = null
        try {
          const ultimaLeituraSalva = localStorage.getItem('ultimaLeitura')
          if (ultimaLeituraSalva) {
            const { livroId, capitulo: capLS } = JSON.parse(ultimaLeituraSalva)
            if (Number.isInteger(livroId) && livroId > 0 && Number.isInteger(capLS) && capLS > 0) {
              palpiteLivroId = livroId
              palpiteCapitulo = capLS
            }
          }
        } catch {
          /* ignore */
        }

        const promessaCapituloPalpitado = (palpiteLivroId && palpiteCapitulo)
          ? buscarCapitulo(palpiteLivroId, palpiteCapitulo).catch(() => null)
          : Promise.resolve(null)

        // Os dados estáticos (`biblia.js`) expõem o número de capítulos como
        // `capitulos`, mas a UI (CapitulosCards, setas de navegação, etc.) usa
        // `maxCapitulos` — campo que só vinha da listagem via SQLite. Sem
        // normalizar, `livro.maxCapitulos` fica undefined e a grade de
        // capítulos abre vazia. Derivamos `maxCapitulos` a partir de
        // `capitulos`, mantendo a abertura rápida sem tocar no SQLite.
        const livros = livrosData.map((l) => ({
          ...l,
          maxCapitulos: l.maxCapitulos ?? l.capitulos,
        }))
        if (!livros?.length) {
          setErro('Erro ao carregar livros')
          return
        }
        setOpcoesLivros(livros)

        // Define Gênesis como livro inicial
        const genesis = livros[0]
        let livroParaCarregar = genesis
        let capituloParaCarregar = 1
        let versiculoQueryParaScroll = null

        // Tenta carregar última leitura ou versículo para scroll
        try {
          const versiculoParaScroll = localStorage.getItem('versiculoParaScroll')
          if (versiculoParaScroll) {
            const { livroId, cap, versiculoNum } = JSON.parse(versiculoParaScroll)
            const livroParaScroll = livros.find(l => l.id === livroId)
            if (livroParaScroll) {
              livroParaCarregar = livroParaScroll
              capituloParaCarregar = cap
              // Limpa após usar
              localStorage.removeItem('versiculoParaScroll')
            }
          }
          
          const ultimaLeituraSalva = localStorage.getItem('ultimaLeitura')
        if (leituraInicial) {
            // Se tem leitura inicial via props, usa ela
            const livroInicial = livros.find(l => l.id === leituraInicial.livro)
            if (livroInicial) {
              livroParaCarregar = livroInicial
              capituloParaCarregar = leituraInicial.capitulo
            }
          } else if (ultimaLeituraSalva) {
            // Se tem última leitura salva, tenta usar ela
            const { livroId, capitulo } = JSON.parse(ultimaLeituraSalva)
            const livroSalvo = livros.find(l => l.id === livroId)
            if (livroSalvo) {
              livroParaCarregar = livroSalvo
              capituloParaCarregar = capitulo
            }
          }
        } catch (error) {
          console.error('Erro ao carregar última leitura:', error)
          // Em caso de erro, mantém Gênesis 1
        }

        // Deep link externo: ?livro=&capitulo=&versiculo=&versiculos= (compatível cap / v)
        try {
          const qs = new URLSearchParams(location.search)
          const livroQ = Number(qs.get('livro'))
          const capQ = Number(qs.get('capitulo') ?? qs.get('cap'))
          const vQ = Number(qs.get('versiculo') ?? qs.get('v'))
          const versLista = parseVersiculosQuery(qs.get('versiculos'))
          if (Number.isInteger(livroQ) && livroQ > 0 && Number.isInteger(capQ) && capQ > 0) {
            const livroQData = livros.find((l) => l.id === livroQ)
            if (livroQData) {
              livroParaCarregar = livroQData
              capituloParaCarregar = capQ
              if (versLista.length > 0) {
                versiculoQueryParaScroll = versLista[0]
              } else if (Number.isInteger(vQ) && vQ > 0) {
                versiculoQueryParaScroll = vQ
                setDeepLinkVerse(vQ)
              }
            }
          }
        } catch {
          /* ignore */
        }

        // Verifica se há versículo para scroll (vindo de VersiculosMarcados)
        const versiculoParaScrollStorage = localStorage.getItem('versiculoParaScroll')
        let versiculoParaScrollData = null
        if (versiculoParaScrollStorage) {
          try {
            versiculoParaScrollData = JSON.parse(versiculoParaScrollStorage)
            // Se tem versículo para scroll, usa o livro e capítulo dele
            if (versiculoParaScrollData.livroId && versiculoParaScrollData.cap) {
              const livroParaScroll = livros.find(l => l.id === versiculoParaScrollData.livroId)
              if (livroParaScroll) {
                livroParaCarregar = livroParaScroll
                capituloParaCarregar = versiculoParaScrollData.cap
              }
            }
          } catch (error) {
            console.error('Erro ao ler versiculoParaScroll:', error)
          }
        }

        // Carrega o capítulo definido (skipSave = true porque será salvo depois)
        setLivroAtual(livroParaCarregar)
        setCapitulo(capituloParaCarregar)

        if (bibliaSessaoCacheCasa(livroParaCarregar.id, capituloParaCarregar)) {
          const cache = lerBibliaSessaoCache()
          if (cache?.versiculosRenderizados) {
            setVersiculosRenderizados(cache.versiculosRenderizados)
          }
          if (cache?.pericopesCapitulo?.length) {
            setPericopesCapitulo(cache.pericopesCapitulo)
          } else {
            buscarPericopes(livroParaCarregar.id, capituloParaCarregar)
              .then((p) => setPericopesCapitulo(p || []))
              .catch(() => {})
          }
          if (versiculoParaScrollData?.versiculoNum) {
            scrollRestaurarRef.current = null
          } else {
            scrollRestaurarRef.current = cache?.scrollTop ?? 0
          }
          setCarregandoInicial(false)
          setLoading(false)

          if (versiculoParaScrollData?.versiculoNum) {
            setVersiculoParaScroll({
              livroId: versiculoParaScrollData.livroId,
              cap: versiculoParaScrollData.cap,
              versiculoNum: versiculoParaScrollData.versiculoNum,
            })
            localStorage.removeItem('versiculoParaScroll')
          } else if (versiculoQueryParaScroll) {
            setVersiculoParaScroll({
              livroId: livroParaCarregar.id,
              cap: capituloParaCarregar,
              versiculoNum: versiculoQueryParaScroll,
            })
          }

          if (livroParaCarregar?.id && capituloParaCarregar) {
            localStorage.setItem(
              'ultimaLeitura',
              JSON.stringify({ livroId: livroParaCarregar.id, capitulo: capituloParaCarregar })
            )
            window.dispatchEvent(new Event('localStorageChange'))
          }
          return
        }

        // Reaproveita o capítulo palpitado se bateu com a escolha final
        const palpiteServiu =
          palpiteLivroId === livroParaCarregar.id &&
          palpiteCapitulo === capituloParaCarregar
        if (palpiteServiu) {
          const versiculosPalpite = await promessaCapituloPalpitado
          if (Array.isArray(versiculosPalpite) && versiculosPalpite.length > 0) {
            setResultados(versiculosPalpite)
            setVersiculosRenderizados(versiculosPalpite.length)
            // Perícopes em paralelo (não bloqueia paint do capítulo)
            buscarPericopes(livroParaCarregar.id, capituloParaCarregar)
              .then((p) => setPericopesCapitulo(p || []))
              .catch(() => {})
          } else {
            await carregarCapitulo(livroParaCarregar.id, capituloParaCarregar, true)
          }
        } else {
          await carregarCapitulo(livroParaCarregar.id, capituloParaCarregar, true)
        }
        
        // Se tem versículo para scroll, configura para fazer scroll depois
        if (versiculoParaScrollData && versiculoParaScrollData.versiculoNum) {
          setVersiculoParaScroll({
            livroId: versiculoParaScrollData.livroId,
            cap: versiculoParaScrollData.cap,
            versiculoNum: versiculoParaScrollData.versiculoNum
          })
          // Limpa após usar
          localStorage.removeItem('versiculoParaScroll')
        } else if (versiculoQueryParaScroll) {
          setVersiculoParaScroll({
            livroId: livroParaCarregar.id,
            cap: capituloParaCarregar,
            versiculoNum: versiculoQueryParaScroll
          })
        }
        
        // Agora salva uma vez só após tudo carregado
        if (livroParaCarregar?.id && capituloParaCarregar) {
          localStorage.setItem('ultimaLeitura', JSON.stringify({
            livroId: livroParaCarregar.id,
            capitulo: capituloParaCarregar
          }))
          window.dispatchEvent(new Event('localStorageChange'))
        }

      } catch (error) {
        console.error('❌ Erro na inicialização:', error)
        setErro('Erro ao carregar a Biblia DC')
      } finally {
        setCarregandoInicial(false)
      }
    }
    init()
  }, [leituraInicial])

  /** Só sinaliza `biblia-pronta` após o capítulo estar no DOM e pintado (2× rAF). */
  useLayoutEffect(() => {
    if (carregandoInicial || bibliaProntaNotificadaRef.current) return
    const prontoParaPaint = Boolean(erro) || resultados.length > 0
    if (!prontoParaPaint) return

    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (bibliaProntaNotificadaRef.current) return
        bibliaProntaNotificadaRef.current = true
        try {
          notificarBibliaPronta()
        } catch {
          /* ignore */
        }
      })
    })

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [carregandoInicial, resultados.length, erro])

  // Removido: o salvamento já é feito em carregarCapitulo para evitar duplicação

  const carregarCapitulo = React.useCallback(async (livroId, cap, skipSave = false) => {
    try {
      setLoading(true)
      setErro(null)
      setPericopesCapitulo([])
      
      // Limpar destaque anterior quando mudar de capítulo
      if (elementoDestacadoRef.current) {
        elementoDestacadoRef.current.style.backgroundColor = ''
        elementoDestacadoRef.current = null
      }
      
      // Prioriza texto do capítulo no primeiro paint; perícopes podem chegar em seguida.
      const versiculos = await buscarCapitulo(livroId, cap)
      setResultados(versiculos)
      setVersiculosRenderizados(versiculos.length)
      const livroGravado = opcoesLivros.find((l) => l.id === livroId) || livroAtual
      gravarBibliaSessaoCache({
        livroId,
        capitulo: cap,
        livroAtual: livroGravado,
        resultados: versiculos,
        opcoesLivros,
        pericopesCapitulo,
        versiculosRenderizados: versiculos.length,
        scrollTop: versiculoRefs.current.container?.scrollTop ?? 0,
      })
      buscarPericopes(livroId, cap)
        .then((pericopes) => setPericopesCapitulo(pericopes || []))
        .catch(() => {})
      
      // Salvar última leitura apenas se não for skipSave (evita salvamentos desnecessários)
      if (!skipSave) {
        const ultimaLeituraData = {
          livroId,
          capitulo: cap
        }
        localStorage.setItem('ultimaLeitura', JSON.stringify(ultimaLeituraData))
        // Dispara evento customizado apenas uma vez por mudança real
        window.dispatchEvent(new Event('localStorageChange'))
      }
      
      // Retornar os resultados para permitir aguardar o carregamento
      return { versiculos }
    } catch (error) {
      console.error('❌ Erro ao carregar capítulo:', error)
      setErro('Erro ao carregar capítulo')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (carregandoInicial || loading || !livroAtual?.id || !capitulo || !opcoesLivros.length) {
      return undefined
    }

    const vizinhos = capitulosVizinhosParaPrefetch(opcoesLivros, livroAtual, capitulo)
    if (vizinhos.length === 0) return undefined

    return agendarQuandoOcioso(() => {
      contarVersiculosPorLivro(livroAtual.id).catch(() => {})
      vizinhos.forEach(({ livroId, capitulo: capVizinho }) => {
        buscarCapitulo(livroId, capVizinho).catch(() => {})
        buscarPericopes(livroId, capVizinho).catch(() => {})
      })
    })
  }, [carregandoInicial, loading, livroAtual, capitulo, opcoesLivros])

  const salvarSnapshotNavegacao = useCallback(() => {
    if (navegacaoBackupRef.current != null || !livroAtual?.id) return
    navegacaoBackupRef.current = { livroId: livroAtual.id, capitulo }
  }, [livroAtual, capitulo])

  const confirmarNavegacao = useCallback(() => {
    navegacaoBackupRef.current = null
  }, [])

  const restaurarNavegacaoSeCancelada = useCallback(async () => {
    const backup = navegacaoBackupRef.current
    if (!backup) return
    navegacaoBackupRef.current = null

    const livro = opcoesLivros.find((l) => l.id === backup.livroId)
    if (!livro) return

    if (
      livroAtual?.id === backup.livroId &&
      capitulo === backup.capitulo &&
      resultados.length > 0
    ) {
      return
    }

    setLivroAtual(livro)
    setCapitulo(backup.capitulo)
    setDeepLinkVerse(null)
    setVersiculosDestaqueLink([])
    localStorage.setItem(
      'ultimaLeitura',
      JSON.stringify({ livroId: backup.livroId, capitulo: backup.capitulo })
    )
    window.dispatchEvent(new Event('localStorageChange'))
    await carregarCapitulo(backup.livroId, backup.capitulo)
  }, [livroAtual, capitulo, resultados.length, opcoesLivros, carregarCapitulo])

  const encerrarFluxoNavegacao = useCallback(
    (proximo = {}) => {
      const livros = proximo.livros ?? false
      const capitulos = proximo.capitulos ?? false
      const versiculos = proximo.versiculos ?? false
      setLivrosDialogOpen(livros)
      setCapitulosDialogOpen(capitulos)
      setVersiculosDialogOpen(versiculos)
      if (proximo.capitulosVemDeLivros !== undefined) {
        setCapitulosVemDeLivros(proximo.capitulosVemDeLivros)
      }
      if (proximo.versiculosVemDeCapitulos !== undefined) {
        setVersiculosVemDeCapitulos(proximo.versiculosVemDeCapitulos)
      }
      if (!livros && !capitulos && !versiculos) {
        setCapitulosVemDeLivros(false)
        setVersiculosVemDeCapitulos(false)
        void restaurarNavegacaoSeCancelada()
      }
    },
    [restaurarNavegacaoSeCancelada]
  )

  // Botão voltar do celular: diálogos da Bíblia; senão, retorno ao plano quando aplicável.
  useEffect(() => {
    if (!setBackButtonHandler) return
    if (
      versiculosDialogOpen ||
      capitulosDialogOpen ||
      livrosDialogOpen ||
      dialogoBuscaAberto ||
      dialogoMarcarAberto
    ) {
      setBackButtonHandler(() => {
        if (versiculosDialogOpen) {
          if (versiculosVemDeCapitulos) {
            setVersiculosDialogOpen(false)
            setCapitulosDialogOpen(true)
            setVersiculosVemDeCapitulos(false)
          } else {
            encerrarFluxoNavegacao()
          }
        } else if (capitulosDialogOpen) {
          if (capitulosVemDeLivros) {
            setCapitulosDialogOpen(false)
            setLivrosDialogOpen(true)
            setCapitulosVemDeLivros(false)
          } else {
            encerrarFluxoNavegacao()
          }
        } else if (livrosDialogOpen) {
          encerrarFluxoNavegacao()
        } else if (dialogoBuscaAberto) fecharDialogoBusca(true)
        else if (dialogoMarcarAberto) {
          setDialogoMarcarAberto(false)
          setVersiculosSelecionados([])
          setModoSelecao(false)
        }
      })
    } else if (veioDoPlanoContexto) {
      setBackButtonHandler(() => voltarAoPlanoLeitura())
    } else if (aguardandoVoltarBusca) {
      setBackButtonHandler(() => window.history.back())
    } else {
      setBackButtonHandler(null)
    }
    return () => setBackButtonHandler?.(null)
  }, [
    versiculosDialogOpen,
    capitulosDialogOpen,
    livrosDialogOpen,
    dialogoBuscaAberto,
    dialogoMarcarAberto,
    veioDoPlanoContexto,
    voltarAoPlanoLeitura,
    setBackButtonHandler,
    encerrarFluxoNavegacao,
    capitulosVemDeLivros,
    versiculosVemDeCapitulos,
    aguardandoVoltarBusca,
    fecharDialogoBusca,
  ])

  // Bíblia principal: sem incentivos na UI ao carregar capítulo (registo interno mantido).
  useEffect(() => {
    if (loading || resultados.length === 0) return
    registrarLeituraBibliaHoje()
    processarMedalhasAposRegistarLeitura()
  }, [loading, resultados.length])

  const pericopesPorVersiculo = React.useMemo(() => {
    // Vários títulos no mesmo versículo (ex.: Mt 5.21) ficam em ordem no array.
    return (pericopesCapitulo || []).reduce((map, p) => {
      const v = Number(p?.versiculo)
      if (!Number.isFinite(v) || v <= 0) return map
      const titulo = p?.titulo ? String(p.titulo).trim() : ''
      if (!titulo) return map
      const refStr = p?.referencias != null ? String(p.referencias).trim() : ''
      if (!map[v]) map[v] = []
      map[v].push({
        titulo,
        referencias: refStr || null
      })
      return map
    }, {})
  }, [pericopesCapitulo])

  const realizarBusca = async (overrides = {}) => {
    const termo = termoBusca.trim()
    if (!termo) return

    const testamento = overrides.testamento ?? testamentoBusca
    const livroId = overrides.livroId !== undefined
      ? overrides.livroId
      : (livroBusca?.id ?? null)
    const modoPalavra = overrides.modoPalavra ?? modoPalavraBusca

    setBuscando(true)
    try {
      const refs = extrairReferenciaBiblica(termo)
      if (refs.length === 1 && refs[0].capitulo) {
        const ref = refs[0]
        const livroRef = await buscarLivroPorNome(ref.livroNome)
        const livroCompativelTestamento =
          testamento === 'ambos' ||
          (testamento === 'AT' && livroRef?.id < 40) ||
          (testamento === 'NT' && livroRef?.id >= 40)
        const livroCompativelFiltro = !livroId || livroRef?.id === livroId

        if (livroRef && livroCompativelTestamento && livroCompativelFiltro) {
          salvarScrollBusca()
          navegacaoInternaRef.current = true
          await irParaVersiculo(
            livroRef.id,
            ref.capitulo,
            ref.versiculoInicio,
            { daBusca: true }
          )
          return
        }
      }

      const resultados = await buscarTexto(termo, tipoBusca, testamento, livroId, modoPalavra)
      setResultadosBusca(resultados)
      restaurarBuscaAoVoltarRef.current = false
      buscaScrollSalvoRef.current = { conteudo: 0, lista: 0 }
      requestAnimationFrame(() => {
        if (buscaConteudoRef.current) buscaConteudoRef.current.scrollTop = 0
        if (buscaListaRef.current) buscaListaRef.current.scrollTop = 0
      })
      
      // Salvar no histórico
      const novoHistorico = [
        { termo: termoBusca, tipo: 'texto', data: new Date().toISOString() },
        ...historicoBusca.filter(h => h.termo !== termoBusca).slice(0, 9)
      ].slice(0, 10) // Manter apenas as 10 mais recentes
      
      setHistoricoBusca(novoHistorico)
      localStorage.setItem('historicoBuscaBiblia', JSON.stringify(novoHistorico))
      
      // Limpar destaque anterior quando iniciar nova busca
      if (elementoDestacadoRef.current) {
        elementoDestacadoRef.current.style.backgroundColor = ''
        elementoDestacadoRef.current = null
      }
    } catch (error) {
      console.error('❌ Erro na busca:', error)
      setResultadosBusca([])
    } finally {
      setBuscando(false)
      setBuscaConcluida(true)
    }
  }

  const irParaVersiculo = async (livroId, cap, versiculoNum = null, opcoes = {}) => {
    const { daBusca = false } = opcoes
    const livro = opcoesLivros.find(l => l.id === livroId)
    if (livro) {
      setLivroAtual(livro)
      setCapitulo(cap)
      if (versiculoNum !== null) {
        setDeepLinkVerse(versiculoNum)
        setVersiculoParaScroll({ livroId, cap, versiculoNum })
      } else {
        setDeepLinkVerse(null)
        setVersiculoParaScroll(null)
      }
      // Aguarda o capítulo carregar antes de fechar o diálogo
      try {
        await carregarCapitulo(livroId, cap)
        if (daBusca) {
          window.history.pushState({ dialogType: 'biblia-pos-busca' }, '')
          setAguardandoVoltarBusca(true)
        }
        // Fecha o diálogo para mostrar o texto após carregar
        setDialogoBuscaAberto(false)
      } catch (error) {
        console.error('❌ Erro ao carregar capítulo:', error)
        // Ainda fecha o diálogo mesmo em caso de erro
      setDialogoBuscaAberto(false)
      }
    } else {
      console.warn('❌ Livro não encontrado:', livroId)
    }
  }

  // Fazer scroll até o versículo quando o capítulo for carregado
  useEffect(() => {
    if (versiculoParaScroll && resultados.length > 0 && !loading) {
        const { livroId, cap, versiculoNum } = versiculoParaScroll
        if (livroAtual?.id === livroId && capitulo === cap) {
          setTimeout(() => {
            const keyVersiculo = `${livroId}-${cap}-${versiculoNum}`
            const elemento = versiculoRefs.current[keyVersiculo]
            const container = versiculoRefs.current.container
            
            // Limpar destaque anterior se houver
            if (elementoDestacadoRef.current && elementoDestacadoRef.current !== elemento) {
              elementoDestacadoRef.current.style.backgroundColor = ''
            }
            
            if (elemento && container) {
              // Scroll do container principal
              const containerRect = container.getBoundingClientRect()
              const elementRect = elemento.getBoundingClientRect()
              const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - (containerRect.height / 2) + (elementRect.height / 2)
              container.scrollTo({ top: scrollTop, behavior: 'smooth' })
              // Destacar o versículo permanentemente
              elemento.style.backgroundColor = 'rgba(255, 165, 0, 0.3)'
              elemento.style.transition = 'background-color 0.3s ease'
              elementoDestacadoRef.current = elemento
            } else if (elemento) {
              // Fallback: usar scrollIntoView se o container não estiver disponível
              elemento.scrollIntoView({ behavior: 'smooth', block: 'center' })
              elemento.style.backgroundColor = 'rgba(255, 165, 0, 0.3)'
              elemento.style.transition = 'background-color 0.3s ease'
              elementoDestacadoRef.current = elemento
            }
            setVersiculoParaScroll(null)
          }, 500)
        }
    }
  }, [versiculoParaScroll, resultados, loading, livroAtual?.id, capitulo])

  // O capítulo inteiro fica no DOM; este número agora serve apenas para cache/diagnóstico.
  useEffect(() => {
    setVersiculosRenderizados(resultados.length)
  }, [resultados.length, livroAtual?.id, capitulo])

  // Ao trocar de capítulo pelas setas, iniciar no topo da página
  useEffect(() => {
    if (!scrollToTopOnChapterChangeRef.current || resultados.length === 0 || versiculoParaScroll) return
    const container = versiculoRefs.current?.container
    if (container) {
      container.scrollTop = 0
    }
    scrollToTopOnChapterChangeRef.current = false
  }, [resultados, versiculoParaScroll])

  // Carregar histórico quando abrir o diálogo
  useEffect(() => {
    if (dialogoBuscaAberto) {
      const saved = localStorage.getItem('historicoBuscaBiblia')
      if (saved) {
        setHistoricoBusca(JSON.parse(saved))
      }
    }
  }, [dialogoBuscaAberto])

  const irParaProximoCapitulo = React.useCallback(() => {
    if (!livroAtual || loading) return // Evitar múltiplas chamadas simultâneas
    navegacaoInternaRef.current = true
    scrollToTopOnChapterChangeRef.current = true
    if (capitulo < livroAtual.maxCapitulos) {
      // Próximo capítulo do mesmo livro
      const novoCapitulo = capitulo + 1
      setDeepLinkVerse(null)
      setVersiculosDestaqueLink([])
      setCapitulo(novoCapitulo)
      carregarCapitulo(livroAtual.id, novoCapitulo)
    } else {
      // Primeiro capítulo do próximo livro
      const indexLivroAtual = opcoesLivros.findIndex(l => l.id === livroAtual.id)
      if (indexLivroAtual < opcoesLivros.length - 1) {
        const proximoLivro = opcoesLivros[indexLivroAtual + 1]
        setDeepLinkVerse(null)
        setVersiculosDestaqueLink([])
        setLivroAtual(proximoLivro)
        setCapitulo(1)
        carregarCapitulo(proximoLivro.id, 1)
      }
    }
  }, [livroAtual, capitulo, opcoesLivros, loading, carregarCapitulo])

  const irParaCapituloAnterior = React.useCallback(() => {
    if (!livroAtual || loading) return // Evitar múltiplas chamadas simultâneas
    navegacaoInternaRef.current = true
    scrollToTopOnChapterChangeRef.current = true
    if (capitulo > 1) {
      // Capítulo anterior do mesmo livro
      const novoCapitulo = capitulo - 1
      setDeepLinkVerse(null)
      setVersiculosDestaqueLink([])
      setCapitulo(novoCapitulo)
      carregarCapitulo(livroAtual.id, novoCapitulo)
    } else {
      // Último capítulo do livro anterior
      const indexLivroAtual = opcoesLivros.findIndex(l => l.id === livroAtual.id)
      if (indexLivroAtual > 0) {
        const livroAnterior = opcoesLivros[indexLivroAtual - 1]
        setDeepLinkVerse(null)
        setVersiculosDestaqueLink([])
        setLivroAtual(livroAnterior)
        setCapitulo(livroAnterior.maxCapitulos)
        carregarCapitulo(livroAnterior.id, livroAnterior.maxCapitulos)
      }
    }
  }, [livroAtual, capitulo, opcoesLivros, loading, carregarCapitulo])

  const textosBiblicosBusca = resultadosBusca.filter(r => r.texto);

  useLayoutEffect(() => {
    if (!dialogoBuscaAberto || !restaurarBuscaAoVoltarRef.current) return
    if (buscando || textosBiblicosBusca.length === 0) return

    const { conteudo, lista } = buscaScrollSalvoRef.current
    const aplicar = () => {
      if (buscaConteudoRef.current) buscaConteudoRef.current.scrollTop = conteudo
      if (buscaListaRef.current) buscaListaRef.current.scrollTop = lista
    }
    aplicar()
    const frame = requestAnimationFrame(() => {
      aplicar()
      restaurarBuscaAoVoltarRef.current = false
    })
    return () => cancelAnimationFrame(frame)
  }, [dialogoBuscaAberto, buscando, textosBiblicosBusca.length])

  const handleSelectLivro = React.useCallback((livro) => {
    contarVersiculosPorLivro(livro.id).catch(() => {})
    // Só atualizar se for um livro diferente
    if (livroAtual?.id !== livro.id) {
      setLivroAtual(livro)
      setDeepLinkVerse(null)
      setVersiculosDestaqueLink([])
      // Um livro recém-escolhido sempre começa no capítulo 1. O capítulo atual
      // só deve permanecer quando o usuário reabre o mesmo livro.
      const novoCapitulo = 1
      setCapitulo(novoCapitulo)
      // Limpa os resultados anteriores para não mostrar o texto do livro anterior
      setResultados([])
      // Atualiza o localStorage imediatamente para mudar a cor do AppBar
      const ultimaLeituraData = {
        livroId: livro.id,
        capitulo: novoCapitulo
      }
      localStorage.setItem('ultimaLeitura', JSON.stringify(ultimaLeituraData))
      window.dispatchEvent(new Event('localStorageChange'))
      // NÃO carrega o capítulo ainda - só quando escolher o versículo
    }
    // Fecha o diálogo de livros e abre o de capítulos
    // Marca que o diálogo de capítulos veio do diálogo de livros
    setCapitulosVemDeLivros(true)
    setLivrosDialogOpen(false)
    setCapitulosDialogOpen(true)
  }, [livroAtual, capitulo])

  const handleSelectCapitulo = React.useCallback((cap) => {
    // Apenas atualiza o capítulo, sem carregar o texto ainda
    if (livroAtual) {
      setDeepLinkVerse(null)
      setVersiculosDestaqueLink([])
      setCapitulo(cap)
      // Limpa os resultados anteriores para não mostrar o texto do capítulo anterior
      setResultados([])
      // Atualiza o localStorage imediatamente para mudar a cor do AppBar
      const ultimaLeituraData = {
        livroId: livroAtual.id,
        capitulo: cap
      }
      localStorage.setItem('ultimaLeitura', JSON.stringify(ultimaLeituraData))
      window.dispatchEvent(new Event('localStorageChange'))
      // NÃO carrega o capítulo ainda - só quando escolher o versículo
    }
    // Fecha o diálogo de capítulos e abre o de versículos
    setCapitulosDialogOpen(false)
    setVersiculosVemDeCapitulos(true)
    setVersiculosDialogOpen(true)
  }, [livroAtual])

  const handleSelectVersiculo = async (versiculo) => {
    // Limpar destaque anterior
    if (elementoDestacadoRef.current) {
      elementoDestacadoRef.current.style.backgroundColor = ''
      elementoDestacadoRef.current = null
    }
    
    // Fecha o diálogo de versículos primeiro
    setVersiculosDialogOpen(false)
    
    // Agora carrega o capítulo - só carrega quando escolher o versículo
    if (livroAtual) {
      // Carrega o capítulo e depois faz scroll para o versículo
      await carregarCapitulo(livroAtual.id, capitulo)
      confirmarNavegacao()
      // Salva o versículo para fazer scroll depois que carregar
      setDeepLinkVerse(versiculo)
      setVersiculoParaScroll({ livroId: livroAtual.id, cap: capitulo, versiculoNum: versiculo })
    }
  }

  const exibindoLoaderInicial = (carregandoInicial && resultados.length === 0 && !erro) || (loading && resultados.length === 0)

  return (
    <>
      {bibliaToolbarLeftSlot
        ? createPortal(
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'nowrap',
            gap: { xs: 0.4, sm: 0.6 },
            flex: '1 1 auto',
            width: '100%',
            minWidth: 0,
            overflowX: 'auto',
            overflowY: 'hidden',
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            scrollbarWidth: 'none',
          }}>
            <Button
              variant="outlined"
              onClick={() => {
                limparSelecaoVersiculos()
                salvarSnapshotNavegacao()
                // Pré-carrega contagem de versículos do livro atual para que
                // o seletor de versículos abra instantaneamente quando o
                // usuário avançar (livro → capítulo → versículo).
                if (livroAtual?.id) {
                  contarVersiculosPorLivro(livroAtual.id).catch(() => {})
                }
                setLivrosDialogOpen(true)
              }}
              sx={{
                ...sxAlturaBarraCtrl,
                minWidth: 'auto',
                width: 'max-content',
                maxWidth: 'none',
                px: { xs: 0.65, sm: 1.15 },
                py: 0,
                fontSize: { xs: '0.92rem', sm: '1rem' },
                fontWeight: 700,
                textTransform: 'none',
                lineHeight: 1.2,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                borderWidth: 1.5,
                borderStyle: 'solid',
                borderColor: corBordaBotaoBarra,
                bgcolor: bgBotaoBarraBiblia,
                color: 'grey.100',
                boxShadow: 'none',
                letterSpacing: 0.01,
                '&:hover': {
                  borderColor: corBordaBotaoBarra,
                  bgcolor: bgBotaoBarraBibliaHover,
                  boxShadow: 'none',
                },
              }}
            >
              <Box
                component="span"
                sx={{
                  whiteSpace: 'nowrap',
                  color: livroAtual ? livroCorBase : 'text.primary',
                  fontWeight: 700,
                  fontSize: 'inherit',
                }}
              >
                {livroAtual?.nome || 'Selecione'}
              </Box>
            </Button>
            {livroAtual && (
              <Button
                variant="outlined"
                onClick={() => {
                  limparSelecaoVersiculos()
                  salvarSnapshotNavegacao()
                  // Marca que o diálogo de capítulos NÃO veio do diálogo de livros
                  setCapitulosVemDeLivros(false)
                  if (livroAtual?.id) {
                    contarVersiculosPorLivro(livroAtual.id).catch(() => {})
                  }
                  setCapitulosDialogOpen(true)
                }}
                sx={{
                  ...sxAlturaBarraCtrl,
                  minWidth: { xs: 52, sm: 80 },
                  width: { xs: 52, sm: 80 },
                  py: 0,
                  borderWidth: 1.5,
                  borderStyle: 'solid',
                  borderColor: corBordaBotaoBarra,
                  bgcolor: bgBotaoBarraBiblia,
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: corBordaBotaoBarra,
                    bgcolor: bgBotaoBarraBibliaHover,
                    boxShadow: 'none',
                  },
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexShrink: 0,
                  fontWeight: 700,
                  fontSize: { xs: '1.08rem', sm: '1.18rem' },
                  lineHeight: 1.2,
                  color: livroCorBase,
                }}
              >
                {capitulo}
              </Button>
            )}
            <Tooltip title="Buscar na Biblia DC">
              <IconButton
                onClick={() => {
                  restaurarBuscaAoVoltarRef.current = false
                  buscaScrollSalvoRef.current = { conteudo: 0, lista: 0 }
                  setDialogoBuscaAberto(true)
                }}
                sx={{
                  ...sxIconeBarraBiblia,
                  ...sxAlturaBarraCtrl,
                  width: { xs: 44, sm: 46 },
                  minWidth: { xs: 44, sm: 46 },
                  padding: 0,
                  borderRadius: 2,
                  flexShrink: 0,
                  borderWidth: 1.5,
                  borderStyle: 'solid',
                  borderColor: corBordaBotaoBarra,
                  '& .MuiSvgIcon-root': { fontSize: { xs: '1.38rem', sm: '1.48rem' } },
                }}
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>
            {/* Livro, Cap, Pesquisa (+ Strong fora do plano). Plano: Concluir · Voltar · + no canto. */}
            {!veioDoPlanoContexto && ntProvaDisponivel && ehNovoTestamento && (
              <Button
                variant={modoStrongProva ? 'contained' : 'outlined'}
                onClick={() => {
                  if (!modoStrongProva && !ensureUserForFeature(user, navigate, {
                    mensagem: 'Entre na sua conta para usar o Strong.'
                  })) return
                  setModoStrongProva((v) => !v)
                }}
                startIcon={
                  <>
                    {!strongBadgeErro ? (
                      <Box
                        component="img"
                        src={strongBadgeSrc}
                        alt="Strong"
                        onError={() => setStrongBadgeErro(true)}
                        sx={{
                          width: { xs: 28, sm: 30 },
                          height: { xs: 28, sm: 30 },
                          borderRadius: 0.8,
                          objectFit: 'cover',
                          flexShrink: 0,
                          filter: 'contrast(1.08) saturate(1.02)'
                        }}
                      />
                    ) : (
                      <AutoStoriesIcon sx={{ fontSize: { xs: '1.38rem', sm: '1.48rem' } }} />
                    )}
                  </>
                }
                sx={{
                  ...sxAlturaBarraCtrl,
                  minWidth: 'auto',
                  px: { xs: 0.45, sm: 0.75 },
                  py: 0,
                  fontSize: { xs: '0.92rem', sm: '1rem' },
                  fontWeight: 700,
                  textTransform: 'none',
                  letterSpacing: 0.01,
                  lineHeight: 1.2,
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  '& .MuiButton-startIcon': { mr: 0.35, ml: -0.25, alignSelf: 'center' },
                  bgcolor: modoStrongProva ? livroCorBase : 'transparent',
                  color: modoStrongProva ? '#fff' : livroCorBase,
                  borderWidth: 1.5,
                  borderStyle: 'solid',
                  borderColor: modoStrongProva ? livroCorBase : corBordaBotaoBarra,
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: modoStrongProva ? livroCorBase : hoverStrongNaBarra,
                    borderColor: livroCorBase,
                    boxShadow: 'none',
                  },
                }}
              >
                Strong
              </Button>
            )}
            {!veioDoPlanoContexto && otStrongDisponivel && !ehNovoTestamento && (
              <Button
                variant={modoStrongProva ? 'contained' : 'outlined'}
                onClick={() => {
                  if (!modoStrongProva && !ensureUserForFeature(user, navigate, {
                    mensagem: 'Entre na sua conta para usar o Strong.'
                  })) return
                  setModoStrongProva((v) => !v)
                }}
                startIcon={
                  <>
                    {!strongBadgeErro ? (
                      <Box
                        component="img"
                        src={strongBadgeSrc}
                        alt="Strong"
                        onError={() => setStrongBadgeErro(true)}
                        sx={{
                          width: { xs: 28, sm: 30 },
                          height: { xs: 28, sm: 30 },
                          borderRadius: 0.8,
                          objectFit: 'cover',
                          flexShrink: 0,
                          filter: 'contrast(1.08) saturate(1.02)'
                        }}
                      />
                    ) : (
                      <AutoStoriesIcon sx={{ fontSize: { xs: '1.38rem', sm: '1.48rem' } }} />
                    )}
                  </>
                }
                sx={{
                  ...sxAlturaBarraCtrl,
                  minWidth: 'auto',
                  px: { xs: 0.45, sm: 0.75 },
                  py: 0,
                  fontSize: { xs: '0.92rem', sm: '1rem' },
                  fontWeight: 700,
                  textTransform: 'none',
                  letterSpacing: 0.01,
                  lineHeight: 1.2,
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  '& .MuiButton-startIcon': { mr: 0.35, ml: -0.25, alignSelf: 'center' },
                  bgcolor: modoStrongProva ? livroCorBase : 'transparent',
                  color: modoStrongProva ? '#fff' : livroCorBase,
                  borderWidth: 1.5,
                  borderStyle: 'solid',
                  borderColor: modoStrongProva ? livroCorBase : corBordaBotaoBarra,
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: modoStrongProva ? livroCorBase : hoverStrongNaBarra,
                    borderColor: livroCorBase,
                    boxShadow: 'none',
                  },
                }}
              >
                Strong
              </Button>
            )}
            {veioDoPlanoContexto ? (
              <Box
                sx={{
                  ml: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.25,
                  flexShrink: 0,
                  pl: 0.5,
                  color: 'grey.100',
                }}
              >
                <Button variant="outlined" size="small" onClick={voltarParaBibliaPadrao} sx={sxBotaoPlanoBarra}>
                  Concluir
                </Button>
                <Button variant="outlined" size="small" onClick={voltarAoPlanoLeitura} sx={sxBotaoPlanoBarra}>
                  Voltar ao plano
                </Button>
                <AppBarMaisMenu />
              </Box>
            ) : (
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', color: 'grey.100', flexShrink: 0 }}>
                <AppBarMaisMenu />
              </Box>
            )}
          </Box>,
          bibliaToolbarLeftSlot
        )
        : null}
      <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          // Em celulares, `100vh` inclui a área coberta pela barra do
          // navegador (URL bar / menu inferior), fazendo o rodapé da
          // leitura — e o botão "Marcar como lido" — ficar parcialmente
          // escondido. `100dvh` (dynamic viewport height) mede só a área
          // realmente visível.
          ...sxFullViewportHeight(),
          overflow: 'hidden',
          position: 'relative'
        }}>
          {!modoImersivo && estudoQueryId ? (
            <Box sx={{ px: 2, pb: 1 }}>
              <Alert
                severity="info"
                onClose={() => {
                  const p = new URLSearchParams(location.search)
                  p.delete('estudo')
                  const next = p.toString()
                  navigate(next ? `${location.pathname}?${next}` : location.pathname, { replace: true })
                }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() =>
                      navigate(
                        `/estudos-biblicos/abrir?${new URLSearchParams({ estudo: estudoQueryId }).toString()}`
                      )
                    }
                  >
                    Abrir estudo
                  </Button>
                }
              >
                Foi aberto um link de estudo compartilhado. Pode abrir o conteúdo completo (é necessário iniciar sessão).
              </Alert>
            </Box>
          ) : null}

      <Box 
        ref={(el) => {
          if (el) {
            versiculoRefs.current.container = el
          }
          pinchLeituraRef.current = el
        }}
        onScroll={(event) => {
          const target = event.currentTarget

          if (scrollRafRef.current == null) {
            scrollRafRef.current = requestAnimationFrame(() => {
              scrollRafRef.current = null
              processarScrollImersivo()
            })
          }
        }}
        sx={{ 
        flex: 1, 
        overflow: 'auto',
        overflowAnchor: 'none',
        position: 'relative',
        bgcolor: 'background.default',
        WebkitOverflowScrolling: 'touch',
        px: 0,
        // Folga inferior generosa: respeita o safe-area (home indicator
        // do iOS, gestos do Android) e adiciona espaço para que o botão
        // "Marcar como lido" no rodapé seja totalmente alcançável mesmo
        // em telas onde a barra do navegador ocupa parte da viewport.
        pb: 'calc(env(safe-area-inset-bottom, 0px) + 56px)',
        }}
      >
        <Box
          ref={toolbarSpacerRef}
          aria-hidden
          sx={{
            height: sxPadToolbarBiblia,
            flexShrink: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', px: { xs: 0.5, sm: 2.5 }, boxSizing: 'border-box' }}>
        {erro ? (
          <Typography color="error" align="center">
            {erro}
          </Typography>
        ) : exibindoLoaderInicial ? (
          <Box
            sx={{
              minHeight: 'calc(100vh - 180px)',
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              px: 2,
              pt: { xs: 1.5, sm: 2 },
            }}
          >
            <Box sx={{ width: '100%', textAlign: 'center' }}>
              <Typography
                sx={{
                  fontSize: { xs: '2rem', sm: '2.4rem' },
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                Carregando...
              </Typography>
              <Typography
                color="text.secondary"
                sx={{
                  mt: 1.2,
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  fontWeight: 500,
                }}
              >
                A Palavra de Deus será exibida aqui!
              </Typography>
            </Box>
          </Box>
        ) : resultados.length > 0 ? (
          <>
            {livroAtual && (
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography
                  sx={{
                    color: livroCorBase,
                    fontWeight: 700,
                    fontSize: `${Math.round((fontSizeLeitura || 100) * BIBLIA_ESCALA_NOME_LIVRO_CABECALHO)}%`,
                    fontFamily: resolveFontFamily(fontFamily),
                    letterSpacing: 0.3,
                    lineHeight: 1.1
                  }}
                >
                  {livroAtual.nome}
                </Typography>
                <Typography
                  sx={{
                    fontSize: `${Math.round((fontSizeLeitura || 100) * BIBLIA_ESCALA_CAPITULO_CABECALHO)}%`,
                    fontWeight: 700,
                    lineHeight: 1,
                    fontFamily: resolveFontFamily(fontFamily),
                    color: 'text.primary',
                    mt: 0.5
                  }}
                >
                  {capitulo}
                </Typography>
              </Box>
            )}
            {resultadosVisiveis.map((verso, index) => {
              const numeroVersiculo = verso.numero || index + 1;
              const keyAtual = `${livroAtual?.id}-${capitulo}-${numeroVersiculo}`;
              const pericopesVerso = pericopesPorVersiculo[numeroVersiculo]
              const resolvedFontFamily = resolveFontFamily(fontFamily)

              // Expressão regular para separar o número do texto
              const match = verso.texto.match(/^(\s*\d+\s*)(.*)$/s);
              const numero = match ? match[1] : '';
              const textoSemNumero = match ? match[2] : verso.texto;

              return (
                <React.Fragment key={keyAtual}>
                  {pericopesVerso?.length > 0 ? (
                    pericopesVerso.map((pericopeInfo, pi) => (
                      <Box
                        key={`${numeroVersiculo}-${pi}`}
                        sx={{
                          mb: pi < pericopesVerso.length - 1 ? 1.25 : 2,
                          mt:
                            index === 0 && pi === 0
                              ? 0
                              : pi > 0
                                ? 1.5
                                : 3,
                          px: 0.5,
                          textAlign: 'center'
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: `${Math.round((fontSizeLeitura || 100) * BIBLIA_ESCALA_TITULO_PERICOPE)}%`,
                            fontWeight: 600,
                            fontStyle: 'italic',
                            fontFamily: resolvedFontFamily,
                            textAlign: 'center',
                            color: 'text.primary'
                          }}
                        >
                          {pericopeInfo.titulo}
                        </Typography>
                        {pericopeInfo.referencias && (
                          <ReferenciasPericope
                            texto={pericopeInfo.referencias}
                            onClickRef={(seg) => setRefParalelaFragmento(seg)}
                            sx={{
                              fontSize: `${Math.round((fontSizeLeitura || 100) * 1.05)}%`,
                              fontFamily: resolvedFontFamily,
                              textAlign: 'center'
                            }}
                          />
                        )}
                      </Box>
                    ))
                  ) : null}
              <VersiculoMarcavel
                ref={(el) => {
                  if (el) {
                    versiculoRefs.current[keyAtual] = el
                  }
                }}
                id={`versiculo-${keyAtual}`}
                livroId={livroAtual?.id}
                capitulo={capitulo}
                versiculo={numeroVersiculo}
                texto={verso.texto}
                numero={numero}
                textoSemNumero={textoSemNumero}
                modoSelecao={modoSelecao}
                estaSelecionado={chavesSelecionadas.has(
                  `${livroAtual?.id}-${capitulo}-${numeroVersiculo}`
                )}
                onToggleSelecao={onToggleSelecaoVersiculo}
                fontSize={fontSizeLeitura}
                fontFamily={fontFamily}
                textAlign={textAlign}
                lineHeight={lineHeight}
                semEspacoEntreVersiculos={semEspacoEntreVersiculos}
                sx={
                  versiculosDestaqueLink.includes(Number(numeroVersiculo))
                    ? {
                        backgroundColor: 'rgba(255, 165, 0, 0.3)'
                      }
                    : undefined
                }
              />
                  {modoStrongProva && ehNovoTestamento && Array.isArray(tokensNtCapitulo?.[Number(numeroVersiculo)]) && (
                    <Box
                      sx={{
                        mt: 0.6,
                        mb: 0.8,
                        px: 0.3,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5
                      }}
                    >
                      {tokensNtCapitulo[Number(numeroVersiculo)].map((tk) => (
                        <Box
                          key={`${keyAtual}-tk-${tk.token_idx}`}
                          onClick={() =>
                            abrirStrongPorToken(tk, {
                              livroId: livroAtual?.id,
                              capitulo,
                              versiculo: Number(numeroVersiculo),
                            })
                          }
                          role="button"
                          tabIndex={0}
                          sx={{
                            px: 0.55,
                            py: 0.2,
                            borderRadius: 0.8,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            cursor: 'pointer',
                            userSelect: 'none',
                            '&:hover': {
                              borderColor: livroCorBase,
                              bgcolor: 'action.hover'
                            }
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: `${Math.round((fontSizeLeitura || 100) * 0.95)}%`,
                              fontFamily: resolveFontFamily(fontFamily),
                              lineHeight: 1.15
                            }}
                          >
                            {tk.text}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                  {modoStrongProva && !ehNovoTestamento && Array.isArray(tokensOtCapitulo?.[Number(numeroVersiculo)]) && (
                    <Box
                      sx={{
                        mt: 0.6,
                        mb: 0.8,
                        px: 0.3,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        direction: 'rtl',
                        justifyContent: 'flex-start',
                      }}
                    >
                      {tokensOtCapitulo[Number(numeroVersiculo)].map((tk) => (
                        <Box
                          key={`${keyAtual}-ot-${tk.token_idx}`}
                          onClick={() =>
                            abrirStrongPorToken(tk, {
                              livroId: livroAtual?.id,
                              capitulo,
                              versiculo: Number(numeroVersiculo),
                            })
                          }
                          role="button"
                          tabIndex={0}
                          sx={{
                            px: 0.7,
                            py: 0.35,
                            borderRadius: 1.25,
                            border: '1px solid',
                            borderColor: 'rgba(0,0,0,0.10)',
                            bgcolor: 'rgba(255,255,255,0.85)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            '&:hover': {
                              borderColor: livroCorBase,
                              bgcolor: 'action.hover'
                            }
                          }}
                        >
                          <Typography
                            className="hebrew-vocalizado"
                            sx={{
                              ...sxHebrewVocalizado,
                              fontSize: `${Math.round((fontSizeLeitura || 100) * 1.05)}%`,
                              lineHeight: 1.2,
                            }}
                          >
                            {formatarTextoMorphHbVocalizado(
                              String(tk.text || ''),
                              headwordsOtCapitulo[String(tk.strong_code || '').trim().toUpperCase()]?.headword
                            )}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </React.Fragment>
              )
            })}
            {livroAtual && capitulo > 0 ? (
              <Box sx={{ mt: 2.5, mb: 1.5, display: 'flex', justifyContent: 'center', px: 1 }}>
                <Button
                  variant={veioDoPlanoContexto ? (capituloMarcadoNoPlanoContexto ? 'outlined' : 'contained') : (capitulosPendentesIds.length > 0 ? 'contained' : 'outlined')}
                  color="primary"
                  onClick={registrarCapituloNosPlanos}
                  disabled={veioDoPlanoContexto && !capituloMarcadoNoPlanoContexto && capitulosPendentesIds.length === 0}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                  }}
                >
                  {veioDoPlanoContexto
                    ? (capituloMarcadoNoPlanoContexto
                        ? 'Desmarcar como lido'
                        : capitulosPendentesIds.length > 0
                        ? 'Marcar texto como lido'
                        : 'Sem plano compatível para este capítulo')
                    : (idsDestinoLeitura.length > 0 && capitulosPendentesIds.length === 0
                        ? 'Desmarcar leitura do plano'
                        : 'Marcar leitura no plano')}
                </Button>
              </Box>
            ) : null}
            {veioDoPlanoContexto && instanciaEscadaUiId ? (
              <Box sx={{ mt: 0.5, mb: 1.5, px: 1 }}>
                <PlanoEscadaBarraMedalhas
                  instanciaId={instanciaEscadaUiId}
                  tick={planoLeituraTick}
                />
              </Box>
            ) : null}
            <Box
              aria-hidden
              sx={{
                height: `${Math.max((fontSize || 100) / 100, 1)}em`
              }}
            />
          </>
        ) : (
            <Typography align="center" color="text.secondary">
            Selecione um livro e capítulo para começar
          </Typography>
        )}
      </Box>

      {/* Menu do marcador (ancorado em botão do topo ou do toolbar). */}
      {!veioDoPlanoContexto && (
        <Menu
          anchorEl={marcadorMenuAnchor}
          open={Boolean(marcadorMenuAnchor)}
          onClose={() => setMarcadorMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              setMarcadorMenuAnchor(null)
              const saindo = modoSelecao
              setModoCompartilharVersiculos(false)
              setModoSelecao(!modoSelecao)
              if (saindo) setVersiculosSelecionados([])
            }}
          >
            {modoSelecao ? 'Sair do modo marcação' : 'Ativar marcação de versículos'}
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMarcadorMenuAnchor(null)
              navigate('/versiculos-marcados')
            }}
          >
            Ver versículos marcados
          </MenuItem>
          {modoSelecao && versiculosSelecionados.length > 0 && (
            <MenuItem onClick={handleEnviarVersiculosSelecionadosChat} disabled={!livroAtual}>
              Enviar pelo chat
            </MenuItem>
          )}
          {modoSelecao && versiculosSelecionados.length > 0 && (
            <MenuItem onClick={handleEstudoIaPassagem} disabled={!livroAtual}>
              Preparar estudo compartilhado…
            </MenuItem>
          )}
          {modoSelecao && versiculosSelecionados.length > 0 && pericopeDoVersiculoSelecionado && (
            <MenuItem
              onClick={handleEstudarPericopeCompleta}
              disabled={!livroAtual}
            >
              Estudar perícope completa…
            </MenuItem>
          )}
          {modoSelecao && versiculosSelecionados.length > 0 && (
            <MenuItem onClick={handlePrepararEstudoEditorManual} disabled={!livroAtual}>
              Abrir editor em branco…
            </MenuItem>
          )}
        </Menu>
      )}

        <IconButton
          sx={{
            position: 'fixed',
            left: -20,
            top: '50%',
            transform: 'translateY(-50%)',
            bgcolor: 'transparent',
            border: 'none',
            boxShadow: 'none',
            backdropFilter: 'none',
            opacity: 0.55,
            '&:hover': {
              opacity: 1,
              left: -10
            },
            transition: 'all 0.2s',
            zIndex: 3,
            padding: 1,
            borderRadius: '0 8px 8px 0'
          }}
          onClick={irParaCapituloAnterior}
          disabled={!livroAtual || (livroAtual.id === 1 && capitulo === 1)}
        >
          <NavigateBefore sx={{ 
            fontSize: '3rem',
            color: livroCorBase,
            opacity: 0.85,
            filter: (theme) =>
              theme.palette.mode === 'dark'
                ? `drop-shadow(0 0 3px ${toRgba(livroCorBase, 0.45)})`
                : `drop-shadow(0 0 2px ${toRgba(livroCorBase, 0.3)})`,
            transition: 'color 0.3s ease'
          }} />
        </IconButton>

        <IconButton
          sx={{
            position: 'fixed',
            right: -20,
            top: '50%',
            transform: 'translateY(-50%)',
            bgcolor: 'transparent',
            border: 'none',
            boxShadow: 'none',
            backdropFilter: 'none',
            opacity: 0.55,
            '&:hover': {
              opacity: 1,
              right: -10
            },
            transition: 'all 0.2s',
            zIndex: 3,
            padding: 1,
            borderRadius: '8px 0 0 8px'
          }}
          onClick={irParaProximoCapitulo}
          disabled={!livroAtual || (livroAtual.id === 66 && capitulo === livroAtual.maxCapitulos)}
        >
          <NavigateNext sx={{ 
            fontSize: '3rem',
            color: livroCorBase,
            opacity: 0.85,
            filter: (theme) =>
              theme.palette.mode === 'dark'
                ? `drop-shadow(0 0 3px ${toRgba(livroCorBase, 0.45)})`
                : `drop-shadow(0 0 2px ${toRgba(livroCorBase, 0.3)})`,
            transition: 'color 0.3s ease'
          }} />
        </IconButton>
        </Box>

      </Box>

      {!veioDoPlanoContexto && (
        <Menu
          anchorEl={marcadorMenuAnchor}
          open={Boolean(marcadorMenuAnchor)}
          onClose={() => setMarcadorMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              setMarcadorMenuAnchor(null)
              const saindo = modoSelecao
              setModoCompartilharVersiculos(false)
              setModoSelecao(!modoSelecao)
              if (saindo) setVersiculosSelecionados([])
            }}
          >
            {modoSelecao ? 'Sair do modo marcação' : 'Ativar marcação de versículos'}
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMarcadorMenuAnchor(null)
              navigate('/versiculos-marcados')
            }}
          >
            Ver versículos marcados
          </MenuItem>
          {modoSelecao && versiculosSelecionados.length > 0 && (
            <MenuItem onClick={handleEnviarVersiculosSelecionadosChat} disabled={!livroAtual}>
              Enviar pelo chat
            </MenuItem>
          )}
          {modoSelecao && versiculosSelecionados.length > 0 && (
            <MenuItem onClick={handleEstudoIaPassagem} disabled={!livroAtual}>
              Preparar estudo compartilhado…
            </MenuItem>
          )}
          {modoSelecao && versiculosSelecionados.length > 0 && pericopeDoVersiculoSelecionado && (
            <MenuItem
              onClick={handleEstudarPericopeCompleta}
              disabled={!livroAtual}
            >
              Estudar perícope completa…
            </MenuItem>
          )}
          {modoSelecao && versiculosSelecionados.length > 0 && (
            <MenuItem onClick={handlePrepararEstudoEditorManual} disabled={!livroAtual}>
              Abrir editor em branco…
            </MenuItem>
          )}
        </Menu>
      )}

      {!veioDoPlanoContexto && (
        <MenuOpcoesCompartilhar
          anchorEl={compartilharVersiculosAnchor}
          open={Boolean(compartilharVersiculosAnchor)}
          onClose={fecharMenuCompartilharVersiculos}
          title={payloadCompartilharVersiculos.title}
          text={payloadCompartilharVersiculos.text}
          url={payloadCompartilharVersiculos.url}
          onCopiarLink={copiarLinkVersiculosSelecionados}
          onEnviarChat={handleEnviarVersiculosSelecionadosChat}
          disabled={!livroAtual || !versiculosSelecionados.length}
        />
      )}

      <Dialog 
        open={dialogoBuscaAberto} 
        onClose={() => fecharDialogoBusca(true)}
        fullScreen
        PaperProps={{
          sx: sxFullscreenFlexColumn({ bgcolor: 'background.default' }),
        }}
      >
        <DialogTitle sx={{ flexShrink: 0, ...sxSafeAreaTop('16px') }}>
          Buscar na Biblia DC
        </DialogTitle>
        <DialogContent
          ref={buscaConteudoRef}
          sx={{
            ...sxFullscreenScrollBody(),
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            px: 3,
            pt: 1,
          }}
        >
          {/* Histórico de pesquisas */}
          {historicoBusca.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Pesquisas recentes:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {historicoBusca.map((item, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                      '&:hover': {
                        borderColor: livroCorBase
                      }
                    }}
                  >
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        setTermoBusca(item.termo)
                        setTimeout(() => realizarBusca(), 100)
                      }}
                      sx={{ 
                        fontSize: '0.75rem',
                        minWidth: 'auto',
                        px: 1,
                        py: 0.5,
                        textTransform: 'none'
                      }}
                    >
                      {item.termo}
                    </Button>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        const novoHistorico = historicoBusca.filter((_, index) => index !== idx)
                        setHistoricoBusca(novoHistorico)
                        localStorage.setItem('historicoBuscaBiblia', JSON.stringify(novoHistorico))
                      }}
                      sx={{
                        padding: '4px',
                        '&:hover': {
                          bgcolor: 'error.main',
                          color: 'error.contrastText'
                        }
                      }}
                    >
                      <CloseIcon sx={{ fontSize: '0.875rem' }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              value={termoBusca}
              onChange={(e) => {
                setTermoBusca(e.target.value)
                setBuscaConcluida(false)
              }}
              placeholder="Palavra ou referência (ex.: João 3:16, Sl 23)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') realizarBusca()
              }}
            />
            <Button 
              variant="contained" 
              onClick={() => realizarBusca()}
              disabled={buscando || !termoBusca.trim()}
              sx={{
                bgcolor: livroCorBase,
                color: '#fff',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: livroCorBase,
                  filter: 'brightness(1.08)',
                  boxShadow: 'none',
                },
                '&.Mui-disabled': {
                  bgcolor: 'action.disabledBackground',
                  color: 'action.disabled',
                },
              }}
            >
              Buscar
            </Button>
          </Box>

          <ToggleButtonGroup
            value={modoPalavraBusca}
            exclusive
            onChange={(_, valor) => {
              if (!valor) return
              setModoPalavraBusca(valor)
              try {
                localStorage.setItem('bibliaBuscaModoPalavra', valor)
              } catch {
                /* ignore */
              }
              if (termoBusca.trim()) {
                realizarBusca({ modoPalavra: valor })
              }
            }}
            size="small"
            fullWidth
            sx={{
              mb: 1.5,
              flexShrink: 0,
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontSize: { xs: '0.78rem', sm: '0.8125rem' },
                lineHeight: 1.25,
                px: { xs: 0.75, sm: 1.25 },
              },
            }}
          >
            <ToggleButton value="literal">Palavra literal</ToggleButton>
            <ToggleButton value="incompleta">Palavras incompletas</ToggleButton>
          </ToggleButtonGroup>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: -1, mb: 1.5, lineHeight: 1.35 }}
          >
            {modoPalavraBusca === 'literal'
              ? '“ira” encontra a palavra inteira (não “eira” nem “cadeira”).'
              : '“ira” também encontra trechos dentro de outras palavras (ex.: eira, cadeira).'}
          </Typography>

          <ToggleButtonGroup
            value={testamentoBusca}
            exclusive
            onChange={(_, valor) => {
              if (!valor) return
              setTestamentoBusca(valor)
              if (livroBusca) {
                if (valor === 'AT' && livroBusca.id >= 40) setLivroBusca(null)
                if (valor === 'NT' && livroBusca.id < 40) setLivroBusca(null)
              }
              if (termoBusca.trim()) {
                realizarBusca({ testamento: valor })
              }
            }}
            size="small"
            sx={{ mb: 1.5, flexShrink: 0 }}
          >
            <ToggleButton value="ambos">Ambos</ToggleButton>
            <ToggleButton value="AT">Antigo Testamento</ToggleButton>
            <ToggleButton value="NT">Novo Testamento</ToggleButton>
          </ToggleButtonGroup>

          <Autocomplete
            size="small"
            options={livrosBuscaOpcoes}
            value={livroBusca}
            onChange={(_, livro) => {
              setLivroBusca(livro)
              if (termoBusca.trim()) {
                realizarBusca({ livroId: livro?.id ?? null })
              }
            }}
            getOptionLabel={(livro) => livro?.nome || ''}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Livro (opcional)"
                placeholder="Todos os livros"
              />
            )}
            sx={{ mb: 2, flexShrink: 0 }}
          />

          {buscando ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress sx={{ color: livroCorBase }} />
            </Box>
          ) : (
            <>
              {!buscando && buscaConcluida && textosBiblicosBusca.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Nenhum versículo encontrado
                  {livroBusca ? ` em ${livroBusca.nome}` : ''}
                  {testamentoBusca === 'AT'
                    ? ' no Antigo Testamento'
                    : testamentoBusca === 'NT'
                      ? ' no Novo Testamento'
                      : ''}
                  .
                </Typography>
              )}
              {textosBiblicosBusca.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: livroCorBase, fontWeight: 700 }}>
                    Textos Bíblicos ({textosBiblicosBusca.length})
                  </Typography>
                  <List ref={buscaListaRef} sx={sxListaResultadosBusca}>
                    {textosBiblicosBusca.map((resultado, index) => {
                      // Extrair número do versículo: primeiro tenta usar o campo versiculo, depois extrai do texto
                      let numeroVersiculo = resultado.versiculo || null
                      if (!numeroVersiculo && resultado.texto) {
                        const matchVersiculo = resultado.texto.match(/^(\s*)(\d+)(\s+)/);
                        numeroVersiculo = matchVersiculo ? parseInt(matchVersiculo[2]) : null
                      }
                      
                      return (
                <Fragment key={index}>
                          <ListItem 
                            button 
                            onClick={() => {
                              salvarScrollBusca()
                              navegacaoInternaRef.current = true
                              irParaVersiculo(
                                resultado.livroId, 
                                resultado.capitulo, 
                                numeroVersiculo,
                                { daBusca: true }
                              )
                            }}
                          >
                    <ListItemText
                              primary={`${resultado.livro} ${resultado.capitulo}${numeroVersiculo ? `:${numeroVersiculo}` : ''}`}
                              secondary={resultado.texto?.substring(0, 150) + (resultado.texto?.length > 150 ? '...' : '')}
                      secondaryTypographyProps={{
                              sx: { color: 'text.secondary', fontSize: '0.9rem' }
                      }}
                    />
                  </ListItem>
                        <Divider sx={{ height: 4, bgcolor: livroCorBase }} />
                </Fragment>
                      )
                    })}
            </List>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ flexShrink: 0, ...sxSafeAreaBottom('8px') }}>
          <Button onClick={() => fecharDialogoBusca(true)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      <LivrosCards
        livros={opcoesLivros}
        livroAtual={livroAtual}
        onSelectLivro={handleSelectLivro}
        open={livrosDialogOpen}
        onClose={() => encerrarFluxoNavegacao()}
      />

      <CapitulosCards
        livro={livroAtual}
        capituloAtual={capitulo}
        onSelectCapitulo={handleSelectCapitulo}
        open={capitulosDialogOpen}
        onClose={() => encerrarFluxoNavegacao()}
        onBack={() => {
          setCapitulosDialogOpen(false)
          // Só volta para livros se veio de lá
          if (capitulosVemDeLivros) {
            setLivrosDialogOpen(true)
            setCapitulosVemDeLivros(false)
          }
        }}
      />

      <VersiculosCards
        livro={livroAtual}
        capitulo={capitulo}
        versiculoAtual={null}
        onSelectVersiculo={handleSelectVersiculo}
        open={versiculosDialogOpen}
        onClose={() => encerrarFluxoNavegacao()}
        onBack={() => {
          setVersiculosDialogOpen(false)
          // Volta para capítulos se veio de lá
          if (versiculosVemDeCapitulos) {
            setCapitulosDialogOpen(true)
            setVersiculosVemDeCapitulos(false)
          }
        }}
      />

      <MarcarVersiculos
        open={dialogoMarcarAberto}
        onClose={() => {
          setDialogoMarcarAberto(false)
          setVersiculosSelecionados([])
          setModoSelecao(false)
          setModoCompartilharVersiculos(false)
        }}
        versiculosSelecionados={versiculosSelecionados}
        livro={livroAtual}
        capitulo={capitulo}
      />

      <BibliaSelecaoActionBar
        visivel={versiculosSelecionados.length > 0}
        totalSelecionados={versiculosSelecionados.length}
        onAbrirMarcador={() => setDialogoMarcarAberto(true)}
        onAbrirEstudo={handleEstudoIaPassagem}
        onCopiarLink={copiarLinkVersiculosSelecionados}
        onEnviarChat={handleEnviarVersiculosSelecionadosChat}
        onAbrirMarcados={() => navigate('/versiculos-marcados')}
        shareTitle={payloadCompartilharVersiculos.title}
        shareText={payloadCompartilharVersiculos.text}
        shareUrl={payloadCompartilharVersiculos.url}
        shareDisabled={!livroAtual || !versiculosSelecionados.length}
        onLimparSelecao={limparSelecaoVersiculos}
      />
      <Dialog open={dialogoCompartilharAberto} onClose={() => setDialogoCompartilharAberto(false)}>
        <DialogTitle>Selecione versículos para compartilhar</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Marque os versículos desejados no capítulo atual e depois toque em <strong>Compartilhar</strong>.
            O envio inclui os versículos selecionados e um link para abrir este capítulo.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogoCompartilharAberto(false)}>Ok</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={strongMatchDialog.open}
        onClose={() =>
          setStrongMatchDialog({ open: false, matches: [], token: null, loading: false, empty: false })
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 1 }}>
          <span>Escolher código Strong</span>
          <IconButton
            size="small"
            onClick={() =>
              setStrongMatchDialog({ open: false, matches: [], token: null, loading: false, empty: false })
            }
            aria-label="fechar"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {strongMatchDialog.token && (
            <Typography variant="body2" sx={{ mb: 1.25 }}>
              Token: <strong>{strongMatchDialog.token.text || '-'}</strong>
              {strongMatchDialog.token.lemma
                ? ` | Lemma: ${strongMatchDialog.token.lemma}`
                : strongMatchDialog.token.lemma_raw
                  ? ` | Lemma: ${strongMatchDialog.token.lemma_raw}`
                  : ''}
            </Typography>
          )}

          {strongMatchDialog.loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
              <CircularProgress size={22} />
            </Box>
          )}

          {!strongMatchDialog.loading && strongMatchDialog.empty && (
            <Typography variant="body2" color="text.secondary">
              Nenhum Strong encontrado para este lema.
            </Typography>
          )}

          {!strongMatchDialog.loading && strongMatchDialog.matches.length > 0 && (
            <>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.8 }}>
                Possíveis códigos
              </Typography>
              <List dense sx={{ pt: 0 }}>
                {strongMatchDialog.matches.map((m) => (
                  <ListItemButton
                    key={`${m.strong}-${m.lemma_raw || ''}`}
                    onClick={() => {
                      salvarTokenPassagem(m.strong, strongMatchDialog.token)
                      navigate(`/estudo-strong/${encodeURIComponent(m.strong)}`, {
                        state: { token: strongMatchDialog.token }
                      })
                      setStrongMatchDialog({
                        open: false,
                        matches: [],
                        token: null,
                        loading: false,
                        empty: false
                      })
                    }}
                  >
                    <ListItemText
                      primary={`${m.strong}${m.greek_unicode || m.lemma_raw ? ` — ${m.greek_unicode || m.lemma_raw}` : ''}`}
                      secondary={m.definition ? String(m.definition).slice(0, 220) : ''}
                    />
                  </ListItemButton>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setStrongMatchDialog({ open: false, matches: [], token: null, loading: false, empty: false })
            }
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      <ReferenciasParalelasDialog
        open={Boolean(refParalelaFragmento)}
        fragmento={refParalelaFragmento}
        onClose={() => setRefParalelaFragmento(null)}
        fontFamily={fontFamily}
      />
      <PlanoEscadaCelebracao
        aberto={Boolean(celebracaoPlanoAtual)}
        onFechar={fecharCelebracaoPlano}
        mensagem={propsCelebracaoPlano.mensagem}
        variante={propsCelebracaoPlano.variante}
        eventoChave={celebracaoPlanoAtual?.chave || null}
        tipoConfete={celebracaoPlanoAtual?.meta?.confete || 'nenhum'}
      />
    </>
  )
}

export default Biblia
