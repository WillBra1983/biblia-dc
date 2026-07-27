import { useApp } from '../contexts/AppContext'
import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { 
  Container, 
  Typography, 
  Paper,
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Grid,
  Collapse
} from '@mui/material'
import { discipuladoData, obterEstudosVisiveis } from '../data/discipulado'
import { embaralharQuestoesDiscipulado } from '../utils/discipuladoAlternativas'
import QuestaoDiscipulado from '../components/QuestaoDiscipulado'
import LayoutEstudo from '../components/LayoutEstudo'
import TextoComReferencias from '../components/TextoComReferencias'
import AudioPlayer from '../components/AudioPlayer'
import CheckIcon from '@mui/icons-material/CheckCircle'
import XIcon from '@mui/icons-material/Cancel'
import HandIcon from '@mui/icons-material/TouchApp'
import CheckBoxIcon from '@mui/icons-material/Check'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import BookIcon from '@mui/icons-material/Book'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import NavigateNext from '@mui/icons-material/NavigateNext'
import ShareIcon from '@mui/icons-material/Share'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CloseIcon from '@mui/icons-material/Close'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { getGlassCardStyles } from '../utils/glassCardStyles'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { chaveConclusaoDiscipulado, chaveLocalStorageConclusao } from '../utils/discipuladoConclusao'
import MenuOpcoesCompartilhar from '../components/MenuOpcoesCompartilhar'
import { buildAppShareLink } from '../services/bibliaEstudosService'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { ensureUserForChatExport, pushPendingChatDraft } from '../utils/chatExportSend'
import { montarCorpoCompartilhamento } from '../utils/compartilharOpcoes'

const textoTeste = `
A Bíblia é a Palavra viva e infalível do Deus vivo. Como declara Pedro, "homens falaram da parte de Deus, movidos pelo Espírito Santo" (2 Pedro 1:21). 

Referências importantes:
- Efésios 1:4-5
- (Rm 8:29-30)
- João 6:37
- Gálatas 4:4-7
- Hebreus 12:14
- Filipenses 1:6
`

function parseTemaIdParam(raw) {
  if (raw == null || raw === '') return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

function parseEstudoIdParam(raw) {
  if (raw == null || raw === '') return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : raw
}

function parseAlvoCompartilhado(search) {
  const params = new URLSearchParams(search || '')
  const parte = String(params.get('parte') || '').toLowerCase()
  if (parte === 'questao') {
    const numero = parseInt(params.get('numero'), 10)
    if (Number.isFinite(numero) && numero > 0) return { parte, numero }
  }
  if (parte === 'devocional') {
    const dia = parseInt(params.get('dia'), 10)
    if (Number.isFinite(dia) && dia > 0) return { parte, dia }
  }
  if (parte === 'completo') return { parte }
  return null
}

function persistirUltimaLicao(temaId, estudoId = null) {
  if (!temaId) return
  try {
    localStorage.setItem(
      'discipulado_ultima_licao',
      JSON.stringify({
        temaId,
        estudoId: estudoId ?? null,
      })
    )
  } catch {
    // ignore
  }
}

export default function Discipulado() {
  const { 
    discipuladoTema: temaAtual,
    setDiscipuladoTema: setTemaAtual,
    discipuladoQuestoes,
    setDiscipuladoQuestoes,
    discipuladoRespostas: respostas,
    setDiscipuladoRespostas: setRespostas,
    discipuladoMeditacao,
    setDiscipuladoMeditacao,
    discipuladoConcluidos,
    setDiscipuladoConcluidos,
    fontSize,
    textAlign,
    fontFamily,
    lineHeight,
    isDarkMode
  } = useApp()
  const ff = resolveFontFamily(fontFamily)
  const lh = readingLineHeightToCss(lineHeight)

  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useFirebaseAuth()
  const { temaId, estudoId } = useParams()
  const alvoCompartilhado = useMemo(
    () => parseAlvoCompartilhado(location.search),
    [location.search]
  )

  // ESTADOS PARA FLUXO DE CARDS (URL na carga inicial evita portal/AppBar um frame atrasados)
  const [temaSelecionado, setTemaSelecionado] = useState(() => parseTemaIdParam(temaId))
  const [estudoSelecionado, setEstudoSelecionado] = useState(() => parseEstudoIdParam(estudoId))
  const [showReiniciarDialog, setShowReiniciarDialog] = useState(false)

  // Sincroniza estado com a URL (permite botão voltar do dispositivo e links diretos)
  // estudoId da URL é string - normaliza para number quando for numérico (ids no data são numbers)
  useEffect(() => {
    if (temaId) {
      const temaNum = parseTemaIdParam(temaId)
      setTemaSelecionado(temaNum)
      if (temaNum != null) setTemaAtual(temaNum)
      const parsedEstudo = estudoId ? parseEstudoIdParam(estudoId) : null
      setEstudoSelecionado(parsedEstudo ?? null)
      persistirUltimaLicao(temaNum, parsedEstudo ?? null)
    } else {
      setTemaSelecionado(null)
      setEstudoSelecionado(null)
    }
  }, [temaId, estudoId, setTemaAtual])

  // Atualiza temaAtual do contexto sempre que temaSelecionado mudar
  useEffect(() => {
    if (temaSelecionado) {
      setTemaAtual(temaSelecionado)
    }
  }, [temaSelecionado])

  // Função utilitária para chave de dia
  const getDiaKey = () => {
    return estudoSelecionado 
      ? `discipulado_dia_${temaSelecionado}_${estudoSelecionado}`
      : `discipulado_dia_${temaSelecionado}`
  }

  const getMeditacaoBaseKey = () => {
    return estudoSelecionado
      ? `${temaSelecionado}_${estudoSelecionado}`
      : `${temaSelecionado}`
  }

  const getMeditacaoKey = (dia) => `${getMeditacaoBaseKey()}_${dia}`

  // Estado do dia atual
  const [diaAtual, setDiaAtual] = useState(1)

  // Atualiza diaAtual ao mudar tema/estudo
  useEffect(() => {
    if (!temaSelecionado) return
    const savedDia = localStorage.getItem(getDiaKey())
    if (savedDia) {
      setDiaAtual(parseInt(savedDia))
    } else {
      // Encontrar o primeiro dia não concluído
      let found = false
      for (let dia = 1; dia <= 7; dia++) {
        if (!discipuladoMeditacao[getMeditacaoKey(dia)]) {
          setDiaAtual(dia)
          found = true
          break
        }
      }
      if (!found) setDiaAtual(7)
    }
  }, [temaSelecionado, estudoSelecionado])

  // Função utilitária para chave de conclusão (mapa unificado + legado localStorage)
  const getConclusaoKey = () =>
    chaveLocalStorageConclusao(temaSelecionado, estudoSelecionado)

  const isConclusaoMarcada = (temaId, estudoId = estudoSelecionado) => {
    const key = chaveConclusaoDiscipulado(temaId, estudoId)
    return key ? !!discipuladoConcluidos[key] : false
  }

  // Estado para saber se já concluiu ao menos uma vez
  const [jaConcluiu, setJaConcluiu] = useState(false)
  useEffect(() => {
    if (temaSelecionado) {
      setJaConcluiu(isConclusaoMarcada(temaSelecionado))
    }
  }, [temaSelecionado, estudoSelecionado, discipuladoConcluidos])

  // Persistência do diaAtual
  useEffect(() => {
    if (temaSelecionado) {
      localStorage.setItem(getDiaKey(), diaAtual.toString())
    }
  }, [diaAtual, temaSelecionado, estudoSelecionado])

  // Salvar última lição visitada para "Ir para onde parou"
  useEffect(() => {
    if (temaSelecionado) {
      const payload = {
        temaId: temaSelecionado,
        estudoId: estudoSelecionado ?? null
      }
      localStorage.setItem('discipulado_ultima_licao', JSON.stringify(payload))
    }
  }, [temaSelecionado, estudoSelecionado])

  // Função para selecionar tema e estudo (atualiza URL para o botão voltar do dispositivo funcionar)
  const handleSelectTema = (temaId, estudoId = null) => {
    setTemaSelecionado(temaId)
    setEstudoSelecionado(estudoId)
    setTemaAtual(temaId)
    setQuestaoAtual(1)
    persistirUltimaLicao(temaId, estudoId)
    // Atualiza URL para permitir voltar com o botão do dispositivo
    if (estudoId) {
      navigate(`/discipulado/${temaId}/${estudoId}`, { replace: false })
    } else if (temaId) {
      navigate(`/discipulado/${temaId}`, { replace: false })
    } else {
      navigate('/discipulado', { replace: false })
    }
  }

  // Função para obter o tema e estudo atuais (compara id normalizado: number === number)
  const tema = discipuladoData.find(t => t.id === temaSelecionado)
  const estudo = estudoSelecionado != null && tema?.estudos?.find(e => e.id == estudoSelecionado)
  /**
   * Lista de estudos visíveis do tema atual: filtra os que estão com
   * `oculto: true` no `discipuladoData` (material em revisão / ainda não
   * publicado). O estudo sempre pode ser aberto via link direto se já tiver
   * sido compartilhado, mas some dos menus/cards.
   */
  const estudosVisiveis = obterEstudosVisiveis(tema)

  const questoesEmbaralhadas = useMemo(() => {
    if (!tema) return []
    const brutas = estudoSelecionado
      ? tema.estudos?.find((e) => e.id === estudoSelecionado)?.questoes || []
      : tema.questoes || []
    const seed = `${temaSelecionado ?? ''}-${estudoSelecionado ?? 'tema'}`
    return embaralharQuestoesDiscipulado(brutas, seed)
  }, [tema, temaSelecionado, estudoSelecionado])

  const getQuestoes = () => questoesEmbaralhadas

  // Função para obter o total de questões
  const getTotalQuestoes = () => {
    const questoes = getQuestoes()
    return questoes.length
  }

  // Função para obter o conteúdo do tema ou estudo
  const getConteudoTema = () => {
    if (!tema) return null
    if (tema.estudos && estudoSelecionado) {
      const estudoAtual = tema.estudos.find(e => e.id === estudoSelecionado)
      if (estudoAtual) {
        return {
          titulo: estudoAtual.titulo,
          introducao: estudoAtual.introducao,
          questoes: estudoAtual.questoes,
          meditacao: estudoAtual.meditacao
        }
      }
    }
    return {
      titulo: tema.titulo,
      introducao: tema.introducao,
      questoes: tema.questoes,
      meditacao: tema.meditacao
    }
  }

  const conteudoAtual = getConteudoTema()

  // Função para verificar se um dia está concluído
  const isDiaConcluido = (dia) => {
    return !!discipuladoMeditacao[getMeditacaoKey(dia)]
  }

  // Função para marcar dia como concluído
  const handleDiaConcluido = () => {
    setDiscipuladoMeditacao(prev => ({
      ...prev,
      [getMeditacaoKey(diaAtual)]: true
    }))
    // Avança para o próximo dia não concluído
    for (let dia = diaAtual + 1; dia <= 7; dia++) {
      if (!isDiaConcluido(dia)) {
        setDiaAtual(dia)
        return
      }
    }
  }

  // Função para gerar a chave da questão atual
  const getRespostaKey = (questaoId) => {
    const temaKey = temaSelecionado || ''
    const estudoKey = estudoSelecionado || ''
    return estudoSelecionado
      ? `${temaKey}_${estudoKey}_${questaoId}`
      : `${temaKey}_${questaoId}`
  }

  // Função para verificar se a questão está respondida
  const isQuestaoRespondida = (questaoId) => {
    const chave = getRespostaKey(questaoId)
    const resposta = respostas[chave]
    const questao = getQuestoes()[questaoId - 1]
    if (!questao || resposta === undefined) return false
    const correta = questao.alternativas.find(alt => alt.correta)?.id
    return resposta === correta
  }

  // Estado e persistência das questões - REMOVIDO O LOCALSTORAGE LOCAL
  const [questaoAtual, setQuestaoAtual] = useState(1)
  const [finalizado, setFinalizado] = useState(false)
  const respondeuNaSessaoRef = useRef(false)
  const alvoAplicadoRef = useRef('')
  const [compartilharMenu, setCompartilharMenu] = useState({
    anchorEl: null,
    title: '',
    text: '',
    url: '',
  })

  useEffect(() => {
    respondeuNaSessaoRef.current = false
  }, [temaSelecionado, estudoSelecionado])

  // Restaura progresso ao abrir lição ou quando respostas chegam da nuvem — não ao confirmar resposta.
  useEffect(() => {
    if (!temaSelecionado) return

    const questoes = getQuestoes()
    const totalQuestoes = questoes.length
    if (alvoCompartilhado) {
      const chaveAlvo = `${location.pathname}${location.search}`
      if (alvoAplicadoRef.current !== chaveAlvo) {
        alvoAplicadoRef.current = chaveAlvo
        if (alvoCompartilhado.parte === 'devocional') {
          setFinalizado(true)
          setQuestaoAtual(totalQuestoes + 1)
          setDiaAtual(Math.min(7, Math.max(1, alvoCompartilhado.dia)))
        } else {
          const numero = alvoCompartilhado.parte === 'questao'
            ? Math.min(Math.max(1, alvoCompartilhado.numero), Math.max(1, totalQuestoes))
            : 1
          setFinalizado(false)
          setQuestaoAtual(numero)
        }
      }
      return
    }
    if (respondeuNaSessaoRef.current) return

    const temaConcluido = totalQuestoes > 0 && isConclusaoMarcada(temaSelecionado)

      if (temaConcluido) {
        setFinalizado(true)
      setQuestaoAtual(totalQuestoes + 1)
      return
    }

    setFinalizado(false)

    if (totalQuestoes === 0) {
      setQuestaoAtual(1)
      return
    }

        let temRespostas = false
        let ultimaQuestao = 1

    for (let i = 1; i <= totalQuestoes; i++) {
          const chave = getRespostaKey(i)
          if (respostas[chave] !== undefined) {
            temRespostas = true
            ultimaQuestao = i
          }
        }

    if (!temRespostas) {
      setQuestaoAtual(1)
      return
    }

    const todasRespondidas = questoes.every((_, index) => {
      const chave = getRespostaKey(index + 1)
      return respostas[chave] !== undefined
    })

    if (todasRespondidas) {
      // Não marcar finalizado aqui: usuário deve ler a resposta, ver se acertou, ler a explicação e clicar em "Concluir Lição"
      setQuestaoAtual(totalQuestoes)
    } else {
      // Mostrar a próxima pergunta a responder (não a última já respondida)
      setQuestaoAtual(ultimaQuestao + 1)
    }
  }, [
    temaSelecionado,
    estudoSelecionado,
    discipuladoConcluidos,
    respostas,
    alvoCompartilhado,
    location.pathname,
    location.search,
  ])

  // Função para responder questão
  const handleResponder = (resposta) => {
    respondeuNaSessaoRef.current = true
    const chave = getRespostaKey(questaoAtual)
    setRespostas(prev => ({
      ...prev,
      [chave]: resposta
    }))
  }

  // Navegação entre questões
  const handleNextQuestion = () => {
    const questoes = getQuestoes()
    if (questaoAtual < questoes.length) {
      setQuestaoAtual(prev => prev + 1)
    }
  }
  const handlePrevQuestion = () => {
    if (questaoAtual > 1) {
      setQuestaoAtual(prev => prev - 1)
    }
  }

  // Verifica se todas as questões foram respondidas
  const todasQuestoesRespondidas = () => {
    const questoes = getQuestoes()
    if (!questoes?.length) return false
    return questoes.every((_, index) => {
      const chave = getRespostaKey(index + 1)
      return respostas[chave] !== undefined
    })
  }

  useEffect(() => {
    // Ao entrar na meditação, começa pelo topo. A explicação das questões
    // controla sua própria rolagem somente após o usuário confirmar a resposta.
    if (finalizado && questaoAtual > getQuestoes().length) {
      window.scrollTo(0, 0)
      setTimeout(() => {
        document.querySelectorAll('main.MuiBox-root').forEach(el => {
          el.scrollTop = 0;
        });
      }, 100);
    }
  }, [temaSelecionado, estudoSelecionado, diaAtual, questaoAtual, finalizado])

  // Função para reiniciar lição - ATUALIZADA PARA USAR APENAS O CONTEXTO GLOBAL
  const handleReiniciarLicao = () => {
    // Remover apenas as respostas do tema/estudo atual
    const questoes = getQuestoes()
    const novasRespostas = { ...respostas }
    for (let i = 1; i <= questoes.length; i++) {
      const chave = getRespostaKey(i)
      delete novasRespostas[chave]
    }
    setRespostas(novasRespostas)
    setQuestaoAtual(1)
    setFinalizado(false)
    // Limpar meditações do tema/estudo atual
    const novasMeditacoes = { ...discipuladoMeditacao }
    for (let dia = 1; dia <= 7; dia++) {
      delete novasMeditacoes[getMeditacaoKey(dia)]
    }
    setDiscipuladoMeditacao(novasMeditacoes)
    const conclusaoKey = chaveConclusaoDiscipulado(temaSelecionado, estudoSelecionado)
    if (conclusaoKey) {
      setDiscipuladoConcluidos((prev) => {
        const next = { ...prev }
        delete next[conclusaoKey]
        return next
      })
    }
    // Limpar localStorage específico
    localStorage.removeItem(getDiaKey())
    localStorage.removeItem(getConclusaoKey())
    setShowReiniciarDialog(false)
  }

  // Estado para Drawer dos subtemas
  const [drawerSubtemasAberto, setDrawerSubtemasAberto] = useState(false)
  const [modulosExpandidos, setModulosExpandidos] = useState({})
  const [discAppBarMenuSlot, setDiscAppBarMenuSlot] = useState(null)
  const [discAppBarBackSlot, setDiscAppBarBackSlot] = useState(null)
  const appBarSlotsRafRef = useRef(null)

  const showDiscipuladoMenuPortal = Boolean(temaSelecionado && tema?.estudos?.length > 0)
  const showDiscipuladoBackPortal = Boolean(temaSelecionado)

  useLayoutEffect(() => {
    if (appBarSlotsRafRef.current) {
      cancelAnimationFrame(appBarSlotsRafRef.current)
      appBarSlotsRafRef.current = null
    }

    let tentativas = 0
    const maxTentativas = 18 // ~300ms em 60fps

    const resolverSlots = () => {
      const menu = showDiscipuladoMenuPortal
        ? document.getElementById('discipulado-appbar-menu')
        : null
      const back = showDiscipuladoBackPortal
        ? document.getElementById('discipulado-appbar-back')
        : null

      setDiscAppBarMenuSlot(menu)
      setDiscAppBarBackSlot(back)

      const precisaMenu = showDiscipuladoMenuPortal && !menu
      const precisaBack = showDiscipuladoBackPortal && !back
      tentativas += 1
      if ((precisaMenu || precisaBack) && tentativas < maxTentativas) {
        appBarSlotsRafRef.current = requestAnimationFrame(resolverSlots)
      }
    }

    resolverSlots()
    return () => {
      if (appBarSlotsRafRef.current) {
        cancelAnimationFrame(appBarSlotsRafRef.current)
        appBarSlotsRafRef.current = null
      }
    }
  }, [showDiscipuladoMenuPortal, showDiscipuladoBackPortal, estudoSelecionado, location.pathname])

  // Garante que ao trocar de estudo a página role para o topo em todos os containers principais
  useEffect(() => {
    // Resetar scroll do window (fallback)
    window.scrollTo(0, 0)
    // Resetar scroll de todos os <main class="MuiBox-root">
    setTimeout(() => {
      document.querySelectorAll('main.MuiBox-root').forEach(el => {
        el.scrollTop = 0;
      });
    }, 100);
  }, [estudoSelecionado])

  // Concluir lição manualmente (última questão) — grava conclusão de imediato no contexto
  const handleConcluirLicao = () => {
    const conclusaoKey = chaveConclusaoDiscipulado(temaSelecionado, estudoSelecionado)
    if (conclusaoKey) {
      setDiscipuladoConcluidos((prev) => ({ ...prev, [conclusaoKey]: true }))
      const legacyKey = getConclusaoKey()
      if (legacyKey) localStorage.setItem(legacyKey, 'true')
    }
    setJaConcluiu(true)
    setFinalizado(true)
    setQuestaoAtual(getQuestoes().length + 1)
  }

  useEffect(() => {
    if (temaSelecionado) {
      localStorage.setItem(`discipulado_finalizado_${temaSelecionado}`, finalizado.toString())
    }
  }, [finalizado, temaSelecionado])

  // Função para verificar se um estudo está concluído (menu de subtemas)
  const isEstudoConcluido = (estudoId) => isConclusaoMarcada(temaSelecionado, estudoId)

  // Obter última lição para "Ir para onde parou"
  const getUltimaLicao = () => {
    try {
      const saved = localStorage.getItem('discipulado_ultima_licao')
      if (!saved) return null
      const { temaId, estudoId } = JSON.parse(saved)
      const temaEncontrado = discipuladoData.find(t => t.id === temaId)
      if (!temaEncontrado) return null
      if (estudoId != null && temaEncontrado.estudos) {
        const estudoEncontrado = temaEncontrado.estudos.find(e => e.id == estudoId)
        if (!estudoEncontrado) return null
        return { tema: temaEncontrado, estudo: estudoEncontrado }
      }
      if (estudoId != null && !temaEncontrado.estudos) return null
      return { tema: temaEncontrado, estudo: null }
    } catch {
      return null
    }
  }

  const ultimaLicao = getUltimaLicao()

  const abrirCompartilhamentoDiscipulado = (event, parte, numero = null) => {
    if (!temaSelecionado) return
    const tituloLicao = estudoSelecionado && estudo ? estudo.titulo : tema?.titulo || 'Discipulado'
    const caminho = estudoSelecionado
      ? `/discipulado/${temaSelecionado}/${estudoSelecionado}`
      : `/discipulado/${temaSelecionado}`
    const params = new URLSearchParams({ parte })
    let title = tituloLicao
    let descricao = `Estude comigo: ${tituloLicao}`

    if (parte === 'questao') {
      const questao = getQuestoes()[numero - 1]
      params.set('numero', String(numero))
      title = `${tituloLicao} - Questão ${numero}`
      descricao = [`Questão ${numero} de ${tituloLicao}`, String(questao?.pergunta || '').trim()]
        .filter(Boolean)
        .join('\n\n')
    } else if (parte === 'devocional') {
      const devocional = (conteudoAtual?.meditacao || []).find((item) => item.dia === numero)
      params.set('dia', String(numero))
      title = `${tituloLicao} - Devocional do dia ${numero}`
      descricao = [
        `Devocional do dia ${numero}: ${devocional?.titulo || tituloLicao}`,
        devocional?.leitura ? `Leitura: ${devocional.leitura}` : '',
      ].filter(Boolean).join('\n\n')
    } else {
      title = `Discipulado - ${tituloLicao}`
      descricao = `Estude o discipulado completo: ${tituloLicao}`
    }

    setCompartilharMenu({
      anchorEl: event.currentTarget,
      title,
      text: descricao,
      url: buildAppShareLink(caminho, params.toString()),
    })
  }

  const enviarCompartilhamentoDiscipuladoNoChat = () => {
    if (!ensureUserForChatExport(user, navigate)) return
    const corpo = montarCorpoCompartilhamento({
      text: compartilharMenu.text,
      url: compartilharMenu.url,
    })
    pushPendingChatDraft(navigate, corpo)
  }

  /** AppBar (portal): seta voltar e botão explícito de subtemas */
  const sxDiscAppBarIcon = {
    mx: 0.25,
    my: 0,
    color: 'inherit',
    border: 'none',
    borderRadius: 0,
    p: '2px',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
    '& .MuiSvgIcon-root': { fontSize: '1.28rem' },
  }
  const sxDiscAppBarMenuButton = {
    mx: 0.25,
    my: 0,
    color: 'inherit',
    minWidth: 'auto',
    textTransform: 'none',
    borderColor: 'rgba(255,255,255,0.38)',
    px: 1,
    py: 0.25,
    lineHeight: 1.1,
    fontSize: '0.78rem',
    fontWeight: 600,
    '& .MuiButton-startIcon': { mr: 0.4, ml: 0 },
    '& .MuiSvgIcon-root': { fontSize: '1.05rem' },
    '&:hover': { borderColor: 'rgba(255,255,255,0.75)', bgcolor: 'rgba(255,255,255,0.08)' }
  }

  const discAppBarPortals = (showDiscipuladoMenuPortal || showDiscipuladoBackPortal) ? (
      <>
        {discAppBarMenuSlot
          ? createPortal(
              <Tooltip title="Abrir temas e subtemas" arrow>
                <Button
                  variant="outlined"
                  size="small"
                  color="inherit"
                  aria-label="Abrir temas e subtemas"
                  onClick={() => setDrawerSubtemasAberto(true)}
                  startIcon={<MoreVertIcon />}
                  sx={sxDiscAppBarMenuButton}
                >
                  Temas
                </Button>
              </Tooltip>,
              discAppBarMenuSlot
            )
          : null}
        {discAppBarBackSlot && temaSelecionado != null
          ? createPortal(
              <IconButton
                size="small"
                color="inherit"
                edge="start"
                aria-label="Voltar ao menu do Discipulado"
                onClick={() => {
                  navigate('/discipulado')
                }}
                sx={sxDiscAppBarIcon}
              >
                <ArrowBackIcon />
              </IconButton>,
              discAppBarBackSlot
            )
          : null}
      </>
    ) : null

  // Renderização dos cards dos temas
  if (!temaSelecionado) {
    const menuCardGradient = isDarkMode
      ? 'linear-gradient(135deg, #000000 0%, #000000 100%)'
      : 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)'
    const menuCardTextColor = isDarkMode ? 'white' : '#111'
    const menuCardBorder = isDarkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)'

    return (
      <LayoutEstudo>
        <Box sx={{ pt: 2, pb: 'calc(env(safe-area-inset-bottom, 0px) + 88px)', px: { xs: 1, sm: 3 }, bgcolor: 'background.default', minHeight: '100%', overflowX: 'hidden', touchAction: 'pan-y', fontFamily: ff }}>
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              maxWidth: 760,
              mx: 'auto',
              mb: 2,
              p: { xs: 2.25, sm: 3 },
              borderRadius: 2,
              color: 'white',
              background: 'linear-gradient(135deg, #0f3a1d 0%, #14532d 58%, #1e3a5f 100%)',
              boxShadow: isDarkMode ? '0 18px 48px rgba(0,0,0,0.35)' : '0 18px 48px rgba(15,58,29,0.18)',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: `
                  radial-gradient(circle at 14% 18%, rgba(255,255,255,0.20), transparent 26%),
                  radial-gradient(circle at 88% 18%, rgba(234,179,8,0.18), transparent 28%)
                `,
                pointerEvents: 'none',
              },
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 800 }}>
                Formação cristã
              </Typography>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800, lineHeight: 1.05, mb: 1 }}>
                Discipulado
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.88)', maxWidth: 620, lineHeight: 1.45 }}>
                Escolha um módulo para estudar com leitura, meditação, perguntas e acompanhamento de progresso.
              </Typography>
            </Box>
          </Box>
          {ultimaLicao && (
            <Card
              onClick={() => handleSelectTema(ultimaLicao.tema.id, ultimaLicao.estudo?.id ?? null)}
              aria-label="Ir para onde parou"
              sx={{
                ...getGlassCardStyles('linear-gradient(135deg, rgba(0, 77, 64, 0.9) 0%, rgba(0, 64, 53, 0.9) 100%)', {
                  hover: true,
                  shimmer: false,
                  borderRadius: 2,
                  performance: true,
                }),
                width: '100%',
                maxWidth: 760,
                mx: 'auto',
                mb: 2,
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                cursor: 'pointer',
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pt: 2, px: 2, pb: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)', mb: 0.5 }}>
                    Continuar de onde parou
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'white',
                      fontWeight: 700,
                      lineHeight: 1.25,
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {ultimaLicao.estudo
                      ? `${ultimaLicao.tema.titulo} › ${ultimaLicao.estudo.titulo}`
                      : ultimaLicao.tema.titulo}
                  </Typography>
                </Box>
                <NavigateNext
                  sx={{
                    flexShrink: 0,
                    fontSize: 28,
                    color: 'rgba(255,255,255,0.9)',
                    pointerEvents: 'none',
                  }}
                  aria-hidden
                />
              </CardContent>
            </Card>
          )}
          {discipuladoData.map((tema, index) => {
            const temSubitens = Array.isArray(tema.estudos) && tema.estudos.length > 0
            const expandido = Boolean(modulosExpandidos[tema.id])
            return (
              <Box key={tema.id} sx={{ width: '100%', maxWidth: 760, mx: 'auto', mb: 1.5 }}>
                <Card
                  onClick={() => {
                    if (temSubitens) {
                      setModulosExpandidos((prev) => ({ ...prev, [tema.id]: !prev[tema.id] }))
                    } else {
                      handleSelectTema(tema.id)
                    }
                  }}
                  aria-label={temSubitens ? `Expandir ${tema.titulo}` : `Abrir ${tema.titulo}`}
                  sx={{
                    ...getGlassCardStyles(menuCardGradient, {
                      hover: true,
                      shimmer: false,
                      borderRadius: 2,
                      performance: true,
                    }),
                    color: menuCardTextColor,
                    border: `1px solid ${menuCardBorder}`,
                  }}
                >
                  <CardContent sx={{ pt: 2, px: 2, pb: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ color: menuCardTextColor, fontWeight: 800, mb: 0.35 }}
                        >
                          {index === 0 ? 'Abertura' : `Módulo ${index}`}
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{ color: menuCardTextColor, fontWeight: 700, lineHeight: 1.25 }}
                        >
                          {tema.titulo}
                        </Typography>
                      </Box>
                      {temSubitens && (
                        <ExpandMoreIcon
                          sx={{
                            color: menuCardTextColor,
                            transition: 'transform 0.2s ease',
                            transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {temSubitens && (
                  <Collapse in={expandido} timeout="auto" unmountOnExit={false}>
                    <Box sx={{ mt: 1, pl: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Card
                        onClick={() => handleSelectTema(tema.id)}
                        sx={{
                          ...getGlassCardStyles(menuCardGradient, {
                            hover: true,
                            shimmer: false,
                            borderRadius: 2,
                            performance: true,
                          }),
                          color: menuCardTextColor,
                          border: `1px solid ${menuCardBorder}`,
                          cursor: 'pointer',
                        }}
                      >
                        <CardContent sx={{ py: 1.25, px: 1.5, '&:last-child': { pb: 1.25 } }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Introdução
                          </Typography>
                        </CardContent>
                      </Card>
                      {obterEstudosVisiveis(tema).map((sub) => (
                        <Card
                          key={`${tema.id}-${sub.id}`}
                          onClick={() => handleSelectTema(tema.id, sub.id)}
                          sx={{
                            ...getGlassCardStyles(menuCardGradient, {
                              hover: true,
                              shimmer: false,
                              borderRadius: 2,
                              performance: true,
                            }),
                            color: menuCardTextColor,
                            border: `1px solid ${menuCardBorder}`,
                            cursor: 'pointer',
                          }}
                        >
                          <CardContent sx={{ py: 1.25, px: 1.5, '&:last-child': { pb: 1.25 } }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              {sub.titulo}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </Collapse>
                )}
              </Box>
            )
          })}
        </Box>
      </LayoutEstudo>
    )
  }

  // Se tema tem estudos e nenhum estudo selecionado, mostrar introdução + abas de subtemas
  if (tema?.estudos && (estudoSelecionado === null || estudoSelecionado === undefined)) {
    return (
      <LayoutEstudo>
        {discAppBarPortals}
        <Box sx={{ pt: 2, pb: 'calc(env(safe-area-inset-bottom, 0px) + 88px)', px: { xs: 1, sm: 2 }, bgcolor: 'background.default', minHeight: '100%', overflowX: 'hidden', touchAction: 'pan-y', fontFamily: ff }}>
          {/* Introdução do tema */}
          {tema.introducao && (
            <Box sx={{ mb: 3, color: 'text.primary', textAlign: textAlign || 'left' }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                {tema.titulo}
              </Typography>
              <TextoComReferencias texto={tema.introducao.texto} style={{ fontSize: `${fontSize}%`, color: 'inherit', textAlign: textAlign || 'left', lineHeight: lh }} />
              {tema.introducao.versiculo && (
                <TextoComReferencias 
                  texto={tema.introducao.versiculo}
                  variant="block"
                  style={{ fontSize: `${fontSize}%`, marginTop: 16, fontStyle: 'italic', color: 'inherit', textAlign: textAlign || 'left', lineHeight: lh }}
                />
              )}
              {tema.introducao.audioUrl && (
                <Box sx={{ mt: 2 }}>
                  <AudioPlayer url={tema.introducao.audioUrl} label="Ouvir introdução" />
                </Box>
              )}
            </Box>
          )}
          {/* Drawer dos subtemas - na tela de intro do tema */}
          <Drawer
            anchor="left"
            open={drawerSubtemasAberto}
            onClose={() => setDrawerSubtemasAberto(false)}
            sx={{
              '& .MuiDrawer-paper': {
                width: { xs: '100%', sm: 400, md: 500 },
                maxWidth: '100vw',
                overflow: 'hidden'
              }
            }}
          >
            <Box sx={{ width: '100%', bgcolor: '#004d40', height: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <IconButton onClick={() => {
                  setDrawerSubtemasAberto(false)
                  setTemaSelecionado(null)
                  setEstudoSelecionado(null)
                  navigate('/discipulado')
                }} sx={{ mr: 1 }}>
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {tema ? `${tema.titulo} – Temas` : 'Temas da Lição'}
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  {/* Introdução como primeiro item da lista */}
                  <Grid item xs={12}>
                    <Card
                      onClick={() => {
                        navigate(`/discipulado/${temaSelecionado}`)
                        setDrawerSubtemasAberto(false)
                      }}
                      sx={{
                        ...getGlassCardStyles('linear-gradient(135deg, #37474f 0%, #263238 100%)', {
                          hover: true,
                          border: !estudoSelecionado,
                          shimmer: false,
                          borderRadius: 2,
                          shimmerDelay: 0,
                          performance: true,
                        }),
                        cursor: 'pointer',
                        border: !estudoSelecionado
                          ? '2px solid rgba(255, 255, 255, 0.6)'
                          : '1px solid rgba(255, 255, 255, 0.18)',
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                          Introdução
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  {estudosVisiveis.map(estudo => (
                    <Grid item xs={12} key={estudo.id}>
                      <Card
                        onClick={() => {
                          handleSelectTema(temaSelecionado, estudo.id)
                          setDrawerSubtemasAberto(false)
                        }}
                        sx={{
                          ...getGlassCardStyles('linear-gradient(135deg, #424242 0%, #212121 100%)', {
                            hover: true,
                            border: (estudoSelecionado == estudo.id),
                            shimmer: false,
                            borderRadius: 2,
                            shimmerDelay: Math.random() * 7,
                            performance: true,
                          }),
                          cursor: 'pointer',
                          border: (estudoSelecionado == estudo.id) 
                            ? '2px solid rgba(255, 255, 255, 0.6)' 
                            : '1px solid rgba(255, 255, 255, 0.18)',
                          position: 'relative'
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', flex: 1 }}>
                              {estudo.titulo}
                            </Typography>
                            {isEstudoConcluido(estudo.id) && (
                              <CheckIcon sx={{ color: 'white', ml: 1 }} />
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          </Drawer>
        </Box>
      </LayoutEstudo>
    )
  }

  // Se chegou aqui, mostrar conteúdo do tema ou estudo
  return (
    <LayoutEstudo onSelectTema={handleSelectTema}>
      {discAppBarPortals}
      <MenuOpcoesCompartilhar
        anchorEl={compartilharMenu.anchorEl}
        open={Boolean(compartilharMenu.anchorEl)}
        onClose={() => setCompartilharMenu((prev) => ({ ...prev, anchorEl: null }))}
        title={compartilharMenu.title}
        text={compartilharMenu.text}
        url={compartilharMenu.url}
        onEnviarChat={enviarCompartilhamentoDiscipuladoNoChat}
        chatLabel="Enviar no chat interno"
      />
      <Box sx={{ pt: 2, pb: 'calc(env(safe-area-inset-bottom, 0px) + 88px)', px: { xs: 1, sm: 2 }, bgcolor: 'background.default', minHeight: '100%', overflowX: 'hidden', touchAction: 'pan-y', fontFamily: ff }}>
        {temaSelecionado && (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 0,
              minHeight: '100%',
              width: '100%'
            }}
          >
          <Box sx={{
              width: '100%',
              mx: 0,
              px: 0
            }}>
              {(finalizado && questaoAtual > getQuestoes().length) ? (
                <Box sx={{ width: '100%', mt: 0, mb: 2 }}>
              {/* Meditação */}
                  {((tema.meditacao && !estudoSelecionado) || (estudo?.meditacao && estudoSelecionado)) && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" align="center" sx={{ mb: 3 }}>
                        Parabéns! Você completou todas as questões. Agora vamos para os dias de meditação. <br />
                      </Typography>
                      {jaConcluiu && (
                        <Typography align="center" color="success.main" sx={{ mb: 2, fontWeight: 'bold' }}>
                          ✔ Lição já concluída ao menos uma vez
                </Typography>
                      )}
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        onClick={() => setShowReiniciarDialog(true)} 
                        sx={{ mb: 3 }}
                      >
                        Reiniciar Lição
                      </Button>
                    <Paper sx={{ 
                      p: { xs: 2, sm: 3 },
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {/* Progresso dos dias */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center',
                        mb: 5,
                        flexWrap: 'wrap',
                        gap: 1
                      }}>
                        {[1,2,3,4,5,6,7].map(dia => (
                          <Box
                            key={dia}
                            sx={{
                              position: 'relative',
                              mx: 0,
                              cursor: 'pointer'
                            }}
                            onClick={() => setDiaAtual(dia)}
                          >
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                bgcolor: isDiaConcluido(dia) ? 'success.main' : 'success.light',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: `${fontSize * 0.01}rem`,
                                fontWeight: 'bold'
                              }}
                            >
                              {isDiaConcluido(dia) ? <CheckIcon /> : dia}
                            </Box>
                            {dia === diaAtual && !isDiaConcluido(dia) && (
                              <HandIcon 
                                sx={{ 
                                  position: 'absolute',
                                  bottom: -20,
                                  left: '50%',
                                  transform: 'translateX(-50%) translateY(50%)',
                                  color: 'primary.main',
                                  fontSize: 40,
                                  filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.2))'
                                }} 
                              />
                            )}
                          </Box>
                        ))}
                      </Box>

                      {/* Conteúdo do dia */}
                      <Box sx={{ 
                        position: 'relative',
                        flex: 1,
                      overflow: 'visible'
                      }}>
                        {/* Botão Anterior */}
                        <IconButton
                          color="primary"
                          sx={{
                            position: 'absolute',
                          left: { xs: -20, sm: -40 },
                            top: '50%',
                            transform: 'translateY(-50%)',
                          bgcolor: 'background.paper',
                          boxShadow: 2,
                          zIndex: 2,
                            fontSize: 32,
                            opacity: 0.4,
                            transition: 'opacity 0.2s',
                          '&:hover': {
                              opacity: 0.8,
                              bgcolor: 'background.paper'
                          }
                          }}
                          onClick={() => setDiaAtual(prev => Math.max(1, prev - 1))}
                          disabled={diaAtual === 1}
                        >
                          <NavigateBefore sx={{ fontSize: 32 }} />
                        </IconButton>

                        {/* Botão Próximo */}
                        <IconButton
                          color="primary"
                          sx={{
                            position: 'absolute',
                          right: { xs: -20, sm: -40 },
                            top: '50%',
                            transform: 'translateY(-50%)',
                          bgcolor: 'background.paper',
                          boxShadow: 2,
                          zIndex: 2,
                            fontSize: 32,
                            opacity: 0.4,
                            transition: 'opacity 0.2s',
                          '&:hover': {
                              opacity: 0.8,
                              bgcolor: 'background.paper'
                          }
                          }}
                          onClick={() => setDiaAtual(prev => Math.min(7, prev + 1))}
                          disabled={diaAtual === 7}
                        >
                          <NavigateNext sx={{ fontSize: 32 }} />
                        </IconButton>

                      {/* Container do conteúdo */}
                      <Box sx={{ 
                        position: 'relative',
                        zIndex: 1,
                        mx: 0,
                        px: { xs: 0, sm: 0 }, // Padding lateral mínimo
                        height: '100%',
                        overflow: 'auto'
                      }}>
                    {/* Renderizar a meditação do tema ou do estudo dependendo do contexto */}
                    {(estudoSelecionado ? estudo?.meditacao : tema.meditacao)
                      ?.filter(dia => dia.dia === diaAtual)
                          .map((dia, index) => (
                            <Box key={index} sx={{ 
                                  mx: 0,
                              fontSize: `${fontSize}%`,
                              textAlign: textAlign || 'left',
                              lineHeight: lh,
                            }}>
                              <Typography 
                                variant="h6" 
                                align="center" 
                                gutterBottom
                              >
                                Dia {dia.dia}: {dia.titulo}
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                                <Button
                                  type="button"
                                  variant="outlined"
                                  size="small"
                                  startIcon={<ShareIcon />}
                                  onClick={(event) => abrirCompartilhamentoDiscipulado(event, 'devocional', dia.dia)}
                                >
                                  Compartilhar devocional
                                </Button>
                              </Box>
                              {dia.audioUrl && (
                                <Box sx={{ mb: 2 }}>
                                  <AudioPlayer url={dia.audioUrl} label="Ouvir meditação" />
                                </Box>
                              )}
                                  <Typography 
                                    variant="body2" 
                                    gutterBottom
                                    component="div"
                                    sx={{ textAlign: textAlign || 'left' }}
                                  >
                                    Leitura: <TextoComReferencias 
                                      texto={dia.leitura} 
                                      inline={true} 
                                      component="span"
                                          style={{ fontSize: `${fontSize}%`, textAlign: textAlign || 'left', lineHeight: lh }}
                                    />
                              </Typography>
                                  <Typography 
                                    variant="body1" 
                                    paragraph 
                                    component="div"
                                        sx={{ textAlign: textAlign || 'left', fontSize: `${fontSize}%`, wordBreak: 'break-word', lineHeight: lh }}
                                  >
                                {dia.texto}
                              </Typography>
                                  <Typography 
                                    variant="subtitle2" 
                                    color="text.secondary" 
                                    gutterBottom
                                    component="div"
                                        sx={{ fontSize: `${fontSize}%`, textAlign: textAlign || 'left', lineHeight: lh }}
                                  >
                                Reflexão: {dia.reflexao}
                              </Typography>
                                  <Typography 
                                    variant="subtitle2" 
                                    color="primary" 
                                    paragraph
                                    component="div"
                                        sx={{ fontSize: `${fontSize}%`, textAlign: textAlign || 'left', lineHeight: lh }}
                                  >
                                Oração: {dia.oracao}
                              </Typography>
                                  {dia.desafio && (
                                    <Typography 
                                      variant="subtitle2" 
                                      color="secondary" 
                                      paragraph
                                      component="div"
                                      sx={{ fontStyle: 'italic', mt: 1, fontSize: `${fontSize}%`, textAlign: textAlign || 'left', lineHeight: lh }}
                                    >
                                      Desafio: {dia.desafio}
                                    </Typography>
                                  )}

                              <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                mt: 3,
                                gap: 2
                              }}>
                                {!isDiaConcluido(diaAtual) && (
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleDiaConcluido}
                                    startIcon={<CheckIcon />}
                                  >
                                    Marcar como Concluído
                                  </Button>
                                )}
                                {isDiaConcluido(diaAtual) && (
                                  <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={() => {
                                      setDiscipuladoMeditacao(prev => {
                                        const newState = { ...prev }
                                        delete newState[getMeditacaoKey(diaAtual)]
                                        return newState
                                      })
                                    }}
                                  >
                                    Editar Resposta
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          ))}
                      </Box>
                      </Box>
                    </Paper>
              </Box>
                  )}
                </Box>
              ) : (
                <>
                  {/* Introdução, stepper e questões */}
                  <Box sx={{ width: '100%', mt: 0, mb: 2 }}>
                    <Box sx={{ p: { xs: 0, sm: 3 }, width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        <BookIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                          {estudoSelecionado && estudo ? estudo.titulo : tema.titulo}
                        </Typography>
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ width: '100%', textAlign: textAlign || 'left' }}>
                        <TextoComReferencias 
                          texto={conteudoAtual.introducao.texto} 
                          style={{ fontSize: `${fontSize}%`, textAlign: textAlign || 'left', lineHeight: lh }} 
                        />
                        {conteudoAtual.introducao.versiculo && (
                          <TextoComReferencias 
                            texto={conteudoAtual.introducao.versiculo}
                            variant="block"
                            style={{ 
                              fontSize: `${fontSize}%`, 
                              marginTop: 16, 
                              fontStyle: 'italic',
                              textAlign: textAlign || 'left',
                              lineHeight: lh,
                            }}
                          />
                        )}
                        {conteudoAtual.introducao.audioUrl && (
                          <Box sx={{ mt: 2 }}>
                            <AudioPlayer url={conteudoAtual.introducao.audioUrl} label="Ouvir introdução" />
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                  {/* Stepper com círculos indicadores */}
                  {getQuestoes()?.length > 0 && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5, px: { xs: 1, sm: 2 } }}>
                        <Button
                          type="button"
                          variant="outlined"
                          size="small"
                          startIcon={<ShareIcon />}
                          onClick={(event) => abrirCompartilhamentoDiscipulado(event, 'completo')}
                        >
                          Compartilhar estudo completo
                        </Button>
                      </Box>
                      <Box sx={{ 
                        mb: 2,
                        width: '100%',
                        overflow: 'auto',
                        overflowY: 'hidden'
                      }}>
                        <Box sx={{ 
                          minWidth: 'max-content',
                          px: 2,
                          height: 'auto'
                        }}>
                          <Stepper 
                            activeStep={questaoAtual - 1}
                            alternativeLabel
                          >
                            {getQuestoes().map((_, index) => (
                              <Step key={index}>
                                <StepLabel
                                  StepIconComponent={() => {
                                    const chave = getRespostaKey(index + 1)
                                    const resposta = respostas[chave]
                                    const questao = getQuestoes()[index]
                                    const correta = questao?.alternativas.find(alt => alt.correta)?.id
                                    if (resposta === correta) {
                                      // Círculo verde com número branco
                                      return (
                                        <Box sx={{
                                          bgcolor: '#43a047',
                                          color: 'white',
                                          borderRadius: '50%',
                                          width: 28,
                                          height: 28,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontWeight: 'bold',
                                          fontSize: 16
                                        }}>
                                          {index + 1}
                                        </Box>
                                      )
                                    } else if (resposta !== undefined && resposta !== correta) {
                                      // Círculo vermelho com número branco
                                      return (
                                        <Box sx={{
                                          bgcolor: '#e53935',
                                          color: 'white',
                                          borderRadius: '50%',
                                          width: 28,
                                          height: 28,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontWeight: 'bold',
                                          fontSize: 16
                                        }}>
                                          {index + 1}
                                        </Box>
                                      )
                                    } else if (index + 1 === questaoAtual) {
                                      return <HandIcon color="primary" />
                                    } else {
                                      // Círculo cinza claro com número cinza escuro
                                      return (
                                        <Box sx={{
                                              width: 24, 
                                              height: 24, 
                                              borderRadius: '50%',
                                              border: '2px solid #ccc',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                          color: '#666',
                                          bgcolor: '#f5f5f5',
                                          fontWeight: 'bold',
                                          fontSize: 15
                                        }}>
                                            {index + 1}
                                          </Box>
                                      )
                                    }
                                  }}
                                >
                                  &nbsp;
                                </StepLabel>
                              </Step>
                            ))}
                          </Stepper>
                        </Box>
                      </Box>
                      {/* Questão atual */}
                      {questaoAtual <= getQuestoes().length && (
                        <QuestaoDiscipulado 
                          questao={getQuestoes()[questaoAtual - 1]}
                          numero={questaoAtual}
                          onResponder={handleResponder}
                          resposta={respostas[getRespostaKey(questaoAtual)]}
                          onNext={handleNextQuestion}
                          onPrev={handlePrevQuestion}
                          isFirst={questaoAtual === 1}
                          isLast={questaoAtual === getQuestoes().length}
                          onConcluirLicao={handleConcluirLicao}
                          audioUrl={getQuestoes()[questaoAtual - 1]?.audioUrl}
                          onShare={(event) => abrirCompartilhamentoDiscipulado(event, 'questao', questaoAtual)}
                        />
                      )}
                    </>
                  )}
                </>
              )}
          </Box>
          </Paper>
        )}
        {temaSelecionado && tema?.estudos && (
          <Drawer
            anchor="left"
            open={drawerSubtemasAberto}
            onClose={() => setDrawerSubtemasAberto(false)}
            sx={{
              '& .MuiDrawer-paper': {
                width: { xs: '100%', sm: 400, md: 500 },
                maxWidth: '100vw',
                overflow: 'hidden'
              }
            }}
          >
            <Box sx={{ width: '100%', bgcolor: 'background.default', height: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <IconButton onClick={() => {
                  setDrawerSubtemasAberto(false)
                  setTemaSelecionado(null)
                  setEstudoSelecionado(null)
                  navigate('/discipulado')
                }} sx={{ mr: 1 }}>
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {tema ? `${tema.titulo} – Temas` : 'Temas da Lição'}
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  {/* Introdução como primeiro item da lista */}
                  <Grid item xs={12}>
                    <Card
                      onClick={() => {
                        navigate(`/discipulado/${temaSelecionado}`)
                        setDrawerSubtemasAberto(false)
                      }}
                      sx={{
                        ...getGlassCardStyles('linear-gradient(135deg, #37474f 0%, #263238 100%)', {
                          hover: true,
                          border: !estudoSelecionado,
                          shimmer: false,
                          borderRadius: 2,
                          shimmerDelay: 0,
                          performance: true,
                        }),
                        cursor: 'pointer',
                        border: !estudoSelecionado
                          ? '2px solid rgba(255, 255, 255, 0.6)'
                          : '1px solid rgba(255, 255, 255, 0.18)',
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                          Introdução
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  {estudosVisiveis.map(estudo => (
                    <Grid item xs={12} key={estudo.id}>
                      <Card
                        onClick={() => {
                          handleSelectTema(temaSelecionado, estudo.id)
                          setDrawerSubtemasAberto(false)
                        }}
                        sx={{
                          ...getGlassCardStyles('linear-gradient(135deg, #424242 0%, #212121 100%)', {
                            hover: true,
                            border: (estudoSelecionado == estudo.id),
                            shimmer: false,
                            borderRadius: 2,
                            shimmerDelay: Math.random() * 7,
                            performance: true,
                          }),
                          cursor: 'pointer',
                          border: (estudoSelecionado == estudo.id) 
                            ? '2px solid rgba(255, 255, 255, 0.6)' 
                            : '1px solid rgba(255, 255, 255, 0.18)',
                          position: 'relative'
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', flex: 1 }}>
                              {estudo.titulo}
                            </Typography>
                            {isEstudoConcluido(estudo.id) && (
                              <CheckIcon sx={{ color: 'white', ml: 1 }} />
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          </Drawer>
        )}
      </Box>
      <Dialog
        open={showReiniciarDialog}
        onClose={() => setShowReiniciarDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Reiniciar Lição"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Tem certeza de que deseja reiniciar esta lição? Todos os seus progressos e respostas serão perdidos e não poderão ser recuperados.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReiniciarDialog(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleReiniciarLicao} color="primary" autoFocus>
            Reiniciar
          </Button>
        </DialogActions>
      </Dialog>
    </LayoutEstudo>
  )
}
