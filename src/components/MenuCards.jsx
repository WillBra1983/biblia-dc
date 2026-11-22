import { useState, useEffect } from 'react'
import { Avatar, Box, Button, ButtonBase, Stack, Card, Typography, Grid, Collapse, Switch, FormControlLabel, ToggleButtonGroup, ToggleButton, IconButton, Tooltip } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import ExpandMore from '@mui/icons-material/ExpandMore'
import BibliaIcon from '@mui/icons-material/MenuBook'
import DiscipuladoIcon from '@mui/icons-material/People'
import EstudosBiblicosIcon from '@mui/icons-material/Groups'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import WestminsterIcon from '@mui/icons-material/Church'
import ConfissaoIcon from '@mui/icons-material/Article'
import CatecismoMaiorIcon from '@mui/icons-material/LibraryBooks'
import CatecismoBreveIcon from '@mui/icons-material/Quiz'
import DevocionalIcon from './icons/DevocionalKneelingIcon'
import AddIcon from '@mui/icons-material/Add'
import YouTubeIcon from '@mui/icons-material/YouTube'
import HinarioLetraIcon from '@mui/icons-material/Lyrics'
import HinarioCifrasIcon from '@mui/icons-material/Piano'
import HinarioPaiIcon from '@mui/icons-material/MusicNote'
import CanticosIcon from '@mui/icons-material/QueueMusic'
import QuizRetiroIcon from '@mui/icons-material/EmojiEvents'
import ChatIcon from '@mui/icons-material/Chat'
import PersonIcon from '@mui/icons-material/Person'
import InfoIcon from '@mui/icons-material/Info'
import EventNoteIcon from '@mui/icons-material/EventNote'
import CampaignIcon from '@mui/icons-material/Campaign'
import TuneIcon from '@mui/icons-material/Tune'
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined'
import BookmarkAddedOutlinedIcon from '@mui/icons-material/BookmarkAddedOutlined'
import MenuAcessoCard from './MenuAcessoCard'
import LivrariaMenuDestaque from './LivrariaMenuDestaque'
import { lerPreferenciasMenu, salvarPreferenciasMenu } from '../utils/menuPreferencias'
import { useMaisVistos } from '../hooks/useMaisVistos'
import { registrarUsoMaisVistos } from '../utils/menuMaisVistos'
import ContextoPassagemDialog from './ContextoPassagemDialog'
import { useApp } from '../contexts/AppContext'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { abrirCanalYoutube } from '../utils/youtubeChannel'
import { ensureUserForFeature } from '../utils/chatExportSend'
import AdminSectionViewCounts from './AdminSectionViewCounts'
import PeopleIcon from '@mui/icons-material/People'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import IosShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import { chavesMetricaParaPathMenu, registarVisualizacaoSecaoSeNecessario } from '../utils/sectionViewKeys'
import { prefetchRota, prefetchRotasComuns } from '../utils/routePrefetch'
import { urlFundoVersiculo } from '../utils/versiculoImagem'
import { abrirVersiculoDoDia, linkPaginaVersiculoDoDia, obterVersiculoDoDia } from '../services/versiculoDoDiaService'
import CompartilharVersiculoImagemDialog from './CompartilharVersiculoImagemDialog'
import DestaquesMenu from './DestaquesMenu'
import { alternarCurtida, assinarDestaqueVersiculoDoDia, assinarCurtidaDoUsuario, registrarCompartilhamentoVersiculoDoDia } from '../services/versiculosCompartilhadosService'

const ICON_SIZE = 26

function VersiculoDoDiaMenu({ mostrarMetricas, onNavigate, onExpandidoChange }) {
  const { user } = useFirebaseAuth()
  const [item, setItem] = useState(null)
  const [interacoes, setInteracoes] = useState({ likesCount: 0, sharesCount: 0 })
  const [curtido, setCurtido] = useState(false)
  const [compartilhar, setCompartilhar] = useState(false)
  const [contextoAberto, setContextoAberto] = useState(false)
  useEffect(() => { onExpandidoChange?.(contextoAberto || compartilhar) }, [contextoAberto, compartilhar, onExpandidoChange])
  useEffect(() => {
    let ativo = true
    obterVersiculoDoDia({ selecionarSeAusente: true })
      .then((valor) => {
        if (ativo && valor) setItem(valor)
        return abrirVersiculoDoDia()
      })
      .then((pronto) => { if (ativo && pronto) setItem(pronto) })
      .catch(() => {})
    return () => { ativo = false }
  }, [])
  useEffect(() => {
    let ativo = true
    if (!item?.data) return () => { ativo = false }
    let unsubscribe = () => {}
    let pararCurtida = () => {}
    assinarDestaqueVersiculoDoDia(
      item.data,
      (destaque) => ativo && setInteracoes({
        likesCount: Number(destaque?.likesCount || 0),
        sharesCount: Number(destaque?.sharesCount || 0),
      }),
      () => {}
    )
      .then((parar) => {
        if (ativo) unsubscribe = parar
        else parar?.()
      })
      .catch(() => {})
    setCurtido(false)
    if (user?.uid) assinarCurtidaDoUsuario(user.uid, `versiculo-dia-${item.data}`, valor => {
      if (ativo) setCurtido(valor)
    }, () => {}).then(parar => {
      if (ativo) pararCurtida = parar
      else parar?.()
    }).catch(() => {})
    return () => {
      ativo = false
      unsubscribe?.()
      pararCurtida?.()
    }
  }, [item?.data, user?.uid])

  async function curtir(event) {
    event.stopPropagation()
    if (!user?.uid || !item?.data) return
    const antes = curtido
    setCurtido(!antes)
    setInteracoes((atual) => ({ ...atual, likesCount: Math.max(0, atual.likesCount + (antes ? -1 : 1)) }))
    try { await alternarCurtida(user.uid, `versiculo-dia-${item.data}`) } catch (_) {
      setCurtido(antes)
      setInteracoes((atual) => ({ ...atual, likesCount: Math.max(0, atual.likesCount + (antes ? 1 : -1)) }))
    }
  }

  function abrirCompartilhamento(event) {
    event.stopPropagation()
    setCompartilhar(true)
  }
  const fundoArquivo = 'amanhecer.webp'
  return (
    <Grid item xs={12}>
      <Box component="article" aria-label="Versículo do dia" sx={{
        position: 'relative', borderRadius: 2.5, overflow: 'hidden', color: '#fff',
        width: '100%', textAlign: 'left',
        backgroundImage: `linear-gradient(110deg, rgba(0,28,24,.78), rgba(0,28,24,.62)), url("${urlFundoVersiculo({ arquivo: fundoArquivo })}")`,
        backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid rgba(222,205,165,.65)',
        boxShadow: '0 4px 14px rgba(0,0,0,.16)', px: { xs: 1.5, sm: 2 }, py: 1.25, boxSizing: 'border-box',
      }}>
        <Typography variant="overline" sx={{ display: 'block', minHeight: 34, pr: 10, color: '#f0d58d', fontWeight: 800, fontSize: '.66rem', lineHeight: 1.3, letterSpacing: 1 }}>Versículo do dia</Typography>
        <Typography component="blockquote" sx={{ m: 0, mt: .65, fontFamily: 'Georgia, serif', fontSize: { xs: '1rem', sm: '1.08rem' }, lineHeight: 1.3, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,.4)' }}>
          <ButtonBase
            disabled={!item}
            aria-label="Ler explicação do versículo do dia"
            onClick={() => onNavigate({ path: `/versiculo-do-dia${item?.data ? '?data=' + encodeURIComponent(item.data) : ''}` })}
            sx={{ display: 'block', width: '100%', minHeight: 44, textAlign: 'left', font: 'inherit', lineHeight: 'inherit', color: 'inherit', textShadow: 'inherit', borderRadius: .5, '&.Mui-focusVisible': { outline: '2px solid #f0d58d', outlineOffset: 3 } }}
          >
          {item?.texto || 'Preparando o versículo do dia…'}
          </ButtonBase>
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: .65, fontWeight: 700, fontSize: '.75rem', textAlign: 'right', color: '#f2e7c5' }}>{item ? `${item.referencia}${item.versao ? ' · ' + item.versao : ''}` : ''}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: .25, mt: .45 }}>
          <Button size="small" disabled={!item} onClick={() => setContextoAberto(true)} sx={{ minHeight: 44, minWidth: 0, px: .5, mr: 'auto', color: '#fff', fontWeight: 700, fontSize: '.79rem', textTransform: 'none', '&.Mui-disabled': { color: '#d0dcd4' } }}>Entender a passagem</Button>
          <Tooltip title={user?.uid ? (curtido ? 'Remover curtida' : 'Curtir') : 'Entre na conta para curtir'}>
            <span style={{ display: 'inline-flex' }}><IconButton onClick={curtir} disabled={!user?.uid || !item} aria-label={curtido ? 'Remover curtida' : 'Curtir versículo do dia'} aria-pressed={curtido} sx={{ minWidth: 44, height: 44, px: 1, gap: .5, color: curtido ? '#ffb7bb' : '#fff', '&.Mui-disabled': { color: '#c3d0c9' } }}>{curtido ? <FavoriteIcon sx={{ fontSize: 20 }} /> : <FavoriteBorderIcon sx={{ fontSize: 20 }} />}{interacoes.likesCount > 0 && <Box component="span" sx={{ fontSize: '.75rem', fontWeight: 700 }}>{interacoes.likesCount}</Box>}</IconButton></span>
          </Tooltip>
          <Tooltip title="Compartilhar"><span style={{ display: 'inline-flex' }}><IconButton disabled={!item} onClick={abrirCompartilhamento} aria-label="Compartilhar versículo do dia" sx={{ width: 44, height: 44, color: '#fff', '&.Mui-disabled': { color: '#c3d0c9' } }}><IosShareOutlinedIcon sx={{ fontSize: 20 }} /></IconButton></span></Tooltip>
        </Box>
        {mostrarMetricas && <AdminSectionViewCounts ehAdmin keys={['versiculo_do_dia']} />}
      </Box>
      {contextoAberto && <ContextoPassagemDialog open item={item} onClose={() => setContextoAberto(false)} onNavigate={onNavigate} />}
      <CompartilharVersiculoImagemDialog
        open={compartilhar}
        onClose={() => setCompartilhar(false)}
        referencia={item?.referencia || ''}
        texto={item?.texto || ''}
        url={item ? linkPaginaVersiculoDoDia(item) : ''}
        fundoFixoId={item?.fundoId || ''}
        modoDireto
        registrarEnvio={false}
        onShared={() => {
          if (item?.data && user?.uid) {
            void registrarCompartilhamentoVersiculoDoDia(item.data)
              .then((sharesCount) => setInteracoes((atual) => ({ ...atual, sharesCount })))
              .catch(() => {})
          }
        }}
        onActionComplete={() => setCompartilhar(false)}
      />
    </Grid>
  )
}

const menuItems = [
  {
    text: 'Bíblia',
    icon: <BibliaIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/biblia',
    description: 'Leia e estude a Palavra de Deus',
    fundo: 'menu-fundos/biblia.webp'
  },
  {
    text: 'Livraria Cristã',
    icon: <StorefrontOutlinedIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/biblioteca',
    description: 'Adquira nossos livros e use nossa biblioteca.',
    accentRing: 'rgba(227, 189, 104, 0.78)',
    fundo: 'menu-fundos/biblioteca-digital.webp',
  },
  {
    text: 'Plano de leitura',
    icon: <EventNoteIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/plano-leitura-biblia',
    description: 'Sua agenda diária de leitura bíblica',
    fundo: 'menu-fundos/plano-leitura.webp'
  },
  {
    text: 'Discipulado',
    icon: <DiscipuladoIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/discipulado',
    description: 'Material de estudo e formação',
    fundo: 'menu-fundos/discipulado.webp'
  },
  {
    text: 'Estudos Compartilhados',
    icon: <EstudosBiblicosIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/estudos-biblicos',
    description: 'Crie e compartilhe estudos (acesso por link ou salvos)',
    accentRing: 'rgba(255, 255, 255, 0.45)',
    fundo: 'menu-fundos/estudos-compartilhados.webp'
  },
  {
    text: 'Comentários bíblicos',
    icon: <LibraryBooksIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/biblioteca-estudos',
    description: 'Comentários sobre passagens e versículos',
    requerLogin: true,
    accentRing: 'rgba(255, 255, 255, 0.45)',
    fundo: 'menu-fundos/biblia-comentada.webp'
  },
  {
    text: 'Devocional',
    icon: <DevocionalIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/devocional',
    description: 'Meditações diárias',
    accentRing: 'rgba(255, 255, 255, 0.45)',
    fundo: 'menu-fundos/devocional.webp'
  },
  {
    text: 'Conteúdos teológicos',
    icon: <AddIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/mais-de-deus',
    description: 'Aprofunde seu conhecimento da fé',
    accentRing: 'rgba(255, 255, 255, 0.45)',
    fundo: 'menu-fundos/mais-de-deus.webp'
  },
  {
    text: 'Versículos marcados',
    icon: <BookmarkAddedOutlinedIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/versiculos-marcados',
    description: 'Suas marcações por cor',
    fundo: 'menu-fundos/versiculos-marcados.webp'
  },
  {
    text: 'Mural de versículos',
    icon: <CollectionsBookmarkOutlinedIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/versiculos-compartilhados',
    description: 'Mural anônimo e seus compartilhamentos',
    requerLogin: true,
    accentRing: 'rgba(255, 255, 255, 0.45)',
    fundo: 'menu-fundos/versiculos-compartilhados.webp'
  },
  {
    text: 'Vídeos',
    icon: <YouTubeIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/youtube',
    description: 'Canal Bíblia do Discípulo Cristão',
    accentRing: 'rgba(255, 255, 255, 0.45)',
    fundo: 'menu-fundos/youtube.webp'
  },
  {
    text: 'Quiz bíblico',
    icon: <QuizRetiroIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/quiz-retiro',
    description: 'Quiz bíblico',
    accentRing: 'rgba(255, 255, 255, 0.45)',
    fundo: 'menu-fundos/quiz.webp'
  },
  {
    text: 'Sobre',
    icon: <InfoIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/sobre',
    description: 'Informações do app e créditos de uso',
    accentRing: 'rgba(255, 255, 255, 0.45)',
    fundo: 'menu-fundos/sobre.webp'
  },
]


const notificacoesSubItemAdmin = Object.freeze({
  text: 'Enviar aviso',
  icon: <CampaignIcon sx={{ fontSize: ICON_SIZE }} />,
  path: '/admin/notificar',
  description: 'Notificar todos os usuários sobre novidades',
  requerLogin: true
})

const notificacoesSubItemUsuarios = Object.freeze({
  text: 'Usuários',
  icon: <PeopleIcon sx={{ fontSize: ICON_SIZE }} />,
  path: '/admin/usuarios',
  description: 'Contas registradas (Firebase Auth)',
  requerLogin: true
})

const hinarioPai = {
  text: 'Cânticos',
  icon: <HinarioPaiIcon sx={{ fontSize: ICON_SIZE }} />,
  description: 'Hinos, Salmos e Outras canções',
  fundo: 'menu-fundos/hinario.webp'
}

const hinarioSubItens = [
  {
    text: 'Hinos',
    icon: <HinarioLetraIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/hinario/letra',
    description: 'Letras e cifras do Hinário Novo Cântico'
  },
  {
    text: 'Salmos',
    icon: <CanticosIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/hinario/salmos',
    description: 'Comissão Brasileira de Salmodia'
  },
  {
    text: 'Outras canções',
    icon: <HinarioCifrasIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/hinario/outras-cancoes',
    description: 'Cole e guarde cifras encontradas na internet'
  }
]

const westminsterPai = {
  text: 'Padrões de Westminster',
  icon: <WestminsterIcon sx={{ fontSize: ICON_SIZE }} />,
  description: 'Confissão de Fé | Catecismo Maior | Catecismo Breve',
  fundo: 'menu-fundos/westminster-abbey.webp'
}

const westminsterSubItens = [
  {
    text: 'Confissão de Fé',
    icon: <ConfissaoIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/confissao',
    description: 'Confissão de Fé de Westminster'
  },
  {
    text: 'Catecismo Maior',
    icon: <CatecismoMaiorIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/catecismo-maior',
    description: 'Catecismo Maior de Westminster',
    accentRing: 'rgba(255, 255, 255, 0.45)'
  },
  {
    text: 'Catecismo Breve',
    icon: <CatecismoBreveIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/catecismo-breve',
    description: 'Breve Catecismo de Westminster',
    accentRing: 'rgba(255, 255, 255, 0.45)'
  }
]

function rotaCorrespondeItemMenu(menuPath, pathname) {
  if (!menuPath) return false
  if (menuPath === '/biblia') {
    return pathname === '/' || pathname === '/biblia'
  }
  return pathname === menuPath || pathname.startsWith(`${menuPath}/`)
}

function nomeContaCurto(user) {
  if (!user) return ''
  const n = user.displayName?.trim()
  if (n) return n
  if (user.email) return user.email
  return `Conta (${user.uid?.slice(0, 8) ?? '…'}…)`
}

function nomePrefetchPorPath(path) {
  if (!path) return null
  if (path === '/chat') return 'chat'
  if (path.startsWith('/discipulado')) return 'discipulado'
  if (path.startsWith('/biblioteca') && !path.startsWith('/biblioteca-estudos')) return 'bibliotecaLivros'
  if (path.startsWith('/hinario/editor') || path.startsWith('/hinario-editor')) return 'hinarioEditor'
  if (path.startsWith('/hinario/salmos') || path.startsWith('/hinario/canticos')) return 'canticos'
  if (path.startsWith('/hinario/outras-cancoes')) return 'canticos'
  if (path.startsWith('/hinario')) return 'hinario'
  if (path.startsWith('/confissao')) return 'confissao'
  if (path.startsWith('/catecismo-maior')) return 'catecismoMaior'
  if (path.startsWith('/catecismo-breve')) return 'catecismoBreve'
  if (path.startsWith('/devocional')) return 'devocional'
  if (path.startsWith('/plano-leitura-biblia')) return 'planoLeituraBiblia'
  if (path.startsWith('/plano')) return 'planoLeitura'
  if (path.startsWith('/mais-de-deus')) return 'maisDeDeus'
  if (path.startsWith('/youtube')) return 'youtube'
  if (path.startsWith('/versiculos-marcados')) return 'versiculosMarcados'
  if (path.startsWith('/versiculos-compartilhados')) return 'versiculosCompartilhados'
  if (path.startsWith('/quiz-retiro')) return 'quizRetiro'
  if (path.startsWith('/estudos-biblicos/gerir')) return 'estudosBiblicosGerir'
  if (path.startsWith('/estudos-biblicos/novo')) return 'estudoBiblicoEditor'
  if (path.startsWith('/estudos-biblicos/abrir')) return 'estudoBiblicoVer'
  if (path.startsWith('/estudos-biblicos')) return 'estudosBiblicosHub'
  if (path.startsWith('/estudo-strong/') && path.endsWith('/resumo')) return 'strongEstudoResumo'
  if (path.startsWith('/estudo-strong')) return 'strongEstudo'
  if (path.startsWith('/sobre')) return 'sobre'
  return null
}

const porPath = Object.fromEntries(menuItems.map(item => [item.path, item]))
const atalhosMaisVistos = Object.fromEntries([
  ...menuItems,
  ...hinarioSubItens.map(item => ({ ...item, fundo: hinarioPai.fundo })),
  ...westminsterSubItens.map(item => ({ ...item, fundo: westminsterPai.fundo })),
].map(item => [item.path, item]))
const gruposMenu = [
  { id: 'seu-dia', titulo: 'Seu dia na Palavra', itens: ['/biblia', '/plano-leitura-biblia', '/devocional', '/versiculos-marcados'].map(path => porPath[path]) },
  { id: 'estudo', titulo: 'Estudo e formação', itens: [porPath['/discipulado'], { ...westminsterPai, id: 'westminster', filhos: westminsterSubItens, metricas: ['confissao', 'catecismo_maior', 'catecismo_breve'] }, porPath['/biblioteca-estudos'], porPath['/estudos-biblicos']] },
  { id: 'recursos', titulo: 'Recursos e ferramentas', itens: [porPath['/biblioteca'], { ...hinarioPai, id: 'canticos', filhos: hinarioSubItens, metricas: ['hinario_letra', 'hinario_cifras', 'salmos', 'outras_cancoes'] }, porPath['/mais-de-deus'], porPath['/quiz-retiro']] },
  { id: 'comunidade', titulo: 'Comunidade e vídeos', itens: [porPath['/versiculos-compartilhados'], porPath['/youtube']] },
]

export default function MenuCards({ onItemClick, unreadChatCount = 0, menuOpen }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useFirebaseAuth()
  const { isDarkMode } = useApp()
  const caminhosMaisVistos = useMaisVistos(user?.uid)
  const maisVistos = user === undefined ? [] : caminhosMaisVistos.map(path => atalhosMaisVistos[path]).filter(Boolean)
  const [conectarExpanded, setConectarExpanded] = useState(false)
  const [opcoesMenuAbertas, setOpcoesMenuAbertas] = useState(false)
  const [expandidos, setExpandidos] = useState({})
  const [ehAdmin, setEhAdmin] = useState(false)
  const [preferencias, setPreferencias] = useState(() => lerPreferenciasMenu())
  const mostrarMetricas = ehAdmin && preferencias.metricas
  const lista = preferencias.visualizacao === 'lista'

  useEffect(() => {
    setConectarExpanded(false)
    setExpandidos({})
    if (menuOpen !== false) {
      prefetchRotasComuns()
    }
  }, [menuOpen])

  useEffect(() => {
    let cancelado = false
    setEhAdmin(false)
    if (!user?.uid) return undefined
    void (async () => {
      try {
        const { getFirebaseDatabase, loadFirebaseModules } = await import('../config/firebase')
        await loadFirebaseModules()
        const db = getFirebaseDatabase()
        if (!db || cancelado) return
        const { ref, get } = await import('firebase/database')
        const snap = await get(ref(db, `users/${user.uid}/admin`))
        if (!cancelado) setEhAdmin(snap.val() === true)
      } catch { if (!cancelado) setEhAdmin(false) }
    })()
    return () => { cancelado = true }
  }, [user?.uid])

  function mudarPreferencias(alteracoes) {
    const novas = { ...preferencias, ...alteracoes }
    setPreferencias(novas)
    salvarPreferenciasMenu(novas)
  }
  function fecharMenuPai() { onItemClick?.() }
  function handleClick(item) {
    if (item.path === '/youtube') {
      registrarUsoMaisVistos(item.path, user?.uid)
      void registarVisualizacaoSecaoSeNecessario('youtube', user?.uid)
      void abrirCanalYoutube(isDarkMode)
      fecharMenuPai()
      return
    }
    if (item.requerLogin && !ensureUserForFeature(user, navigate, {
      mensagem: 'Entre na sua conta para usar este recurso.', redirectTo: item.path,
    })) { fecharMenuPai(); return }
    registrarUsoMaisVistos(item.path, user?.uid)
    const nomePrefetch = nomePrefetchPorPath(item.path)
    if (nomePrefetch) prefetchRota(nomePrefetch)
    if (!rotaCorrespondeItemMenu(item.path, location.pathname)) navigate(item.path)
    fecharMenuPai()
  }
  function renderAcesso(item, compacto = lista) {
    const filhos = item.filhos
    const ativo = filhos ? filhos.some(sub => rotaCorrespondeItemMenu(sub.path, location.pathname)) : rotaCorrespondeItemMenu(item.path, location.pathname)
    return <MenuAcessoCard key={item.id || item.path} item={item} ativo={ativo} lista={compacto} escuro={isDarkMode}
      aberto={Boolean(expandidos[item.id])} painelId={filhos ? `menu-opcoes-${item.id}` : undefined}
      onToggle={() => setExpandidos(atual => ({ ...atual, [item.id]: !atual[item.id] }))}
      onNavigate={handleClick} mostrarMetricas={mostrarMetricas}
      filhos={filhos ? filhos.map(sub => renderAcesso(sub, true)) : undefined} />
  }

  return <Box sx={{ p: { xs: 1.25, sm: 2 }, width: '100%', minWidth: 0, maxWidth: 1180, mx: 'auto', boxSizing: 'border-box', bgcolor: '#004d40', minHeight: '100%', overflowX: 'clip', pb: 3 }}>
    <Card elevation={0} sx={{ mb: 1.5, borderRadius: 2.5, bgcolor: '#042d26', color: '#fff', border: '1px solid rgba(230,210,155,.25)' }}>
      <Button fullWidth onClick={() => setConectarExpanded(atual => !atual)} aria-expanded={conectarExpanded} aria-controls="menu-opcoes-conta"
        sx={{ p: 1.5, minHeight: 72, color: 'inherit', textTransform: 'none', textAlign: 'left', justifyContent: 'flex-start', gap: 1.25, '&.Mui-focusVisible': { outline: '3px solid #e6c779', outlineOffset: -3 } }}>
        <Avatar src={user?.photoURL || undefined} alt="" sx={{ width: 42, height: 42, bgcolor: '#e7d5a7', color: '#163e35' }}><PersonIcon /></Avatar>
        <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="span" sx={{ display: 'block', fontWeight: 800, fontSize: '1rem', overflowWrap: 'anywhere' }}>{user ? nomeContaCurto(user) : 'Minha conta'}</Typography>
          <Typography component="span" sx={{ display: 'block', fontSize: '.84rem', color: '#e6d7ac' }}>{user ? 'Que bom ter você por aqui!' : 'Entre para sincronizar suas leituras e conversar'}</Typography>
        </Box>
        {Number(unreadChatCount) > 0 && <Box component="span" aria-label={`${unreadChatCount} mensagens não lidas`} sx={{ px: 1, py: .25, borderRadius: 4, bgcolor: '#b54120', color: '#fff', fontWeight: 800 }}>{Number(unreadChatCount) > 99 ? '99+' : unreadChatCount}</Box>}
        <ExpandMore sx={{ transform: conectarExpanded ? 'rotate(180deg)' : 'none' }} />
      </Button>
      <Collapse in={conectarExpanded} timeout="auto">
        <Stack id="menu-opcoes-conta" spacing={1} sx={{ p: 1.5, pt: 0 }}>
          {[{ text: 'Meu perfil', path: '/perfil', icon: <PersonIcon /> }, { text: user ? 'Mensagens' : 'Entrar ou criar conta', path: '/chat', icon: <ChatIcon /> }, { text: 'Configurações', path: '/configuracoes', icon: <TuneIcon /> }].map(item => <Button key={item.path} startIcon={item.icon} variant="outlined" onClick={() => handleClick(item)} sx={{ minHeight: 44, justifyContent: 'flex-start', color: '#fff', borderColor: 'rgba(255,255,255,.4)', textTransform: 'none' }}>{item.text}</Button>)}
          {ehAdmin && <>
            <Typography sx={{ color: '#e6d7ac', fontSize: '.8rem', fontWeight: 700, pt: 1 }}>Administração</Typography>
            {[notificacoesSubItemUsuarios, notificacoesSubItemAdmin].map(item => <Button key={item.path} startIcon={item.icon} variant="outlined" onClick={() => handleClick(item)} sx={{ minHeight: 44, justifyContent: 'flex-start', color: '#fff', borderColor: 'rgba(255,255,255,.4)', textTransform: 'none' }}>{item.text}</Button>)}
          </>}
        </Stack>
      </Collapse>
    </Card>

    <Grid container spacing={1}><DestaquesMenu ehAdmin={ehAdmin} livraria={<LivrariaMenuDestaque item={porPath['/biblioteca']} onNavigate={handleClick} mostrarMetricas={mostrarMetricas} />}><VersiculoDoDiaMenu mostrarMetricas={mostrarMetricas} onNavigate={handleClick} /></DestaquesMenu></Grid>

    <Typography component="h1" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>Menu do aplicativo</Typography>
    {maisVistos.length > 0 && <Box component="section" aria-labelledby="menu-mais-vistos" sx={{ mt: 1.5, mb: 2 }}>
      <Typography id="menu-mais-vistos" component="h2" sx={{ mb: 1, color: '#f0dfac', fontWeight: 700, fontSize: '.9rem' }}>Mais vistos</Typography>
      <Grid container spacing={1.25}>
        {maisVistos.map(item => <Grid item key={item.path} xs={6} sx={{ display: 'flex' }}>{renderAcesso(item, false)}</Grid>)}
      </Grid>
    </Box>}
    {gruposMenu.map(grupo => <Box component="section" key={grupo.id} aria-labelledby={`menu-grupo-${grupo.id}`} sx={{ mt: 1, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: .75 }}>
        <Typography id={`menu-grupo-${grupo.id}`} component="h2" sx={{ color: '#f0dfac', fontWeight: 700, fontSize: '.9rem' }}>{grupo.titulo}</Typography>
        {grupo.id === 'seu-dia' && <Tooltip title="Opções do menu"><IconButton aria-label="Opções do menu" aria-expanded={opcoesMenuAbertas} aria-controls="menu-preferencias" onClick={() => setOpcoesMenuAbertas(valor => !valor)} sx={{ color: '#e6d6a7', width: 40, height: 40 }}><TuneIcon sx={{ fontSize: 21 }} /></IconButton></Tooltip>}
      </Box>
      {grupo.id === 'seu-dia' && <Collapse in={opcoesMenuAbertas}><Box id="menu-preferencias" sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25, pb: 1.5, color: '#fff' }}>
      <ToggleButtonGroup exclusive size="small" value={preferencias.visualizacao} onChange={(_, valor) => valor && mudarPreferencias({ visualizacao: valor })} aria-label="Visualização do menu" sx={{ bgcolor: '#07392f', '& .MuiToggleButton-root': { color: '#fff', borderColor: '#82a398', textTransform: 'none', px: 1.5, minHeight: 44 }, '& .MuiToggleButton-root.Mui-selected': { bgcolor: '#f0dfac', color: '#163e35', '&:hover': { bgcolor: '#e7d5a7' } } }}>
        <ToggleButton value="cards">Cartões</ToggleButton><ToggleButton value="lista">Lista</ToggleButton>
      </ToggleButtonGroup>
      {ehAdmin && <FormControlLabel sx={{ m: 0 }} control={<Switch checked={preferencias.metricas} onChange={(_, checked) => mudarPreferencias({ metricas: checked })} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#f0dfac' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#f0dfac' } }} />} label={<Typography sx={{ fontSize: '.84rem' }}>Estatísticas de acesso</Typography>} />}
      </Box></Collapse>}
      <Grid container spacing={1.25}>{grupo.itens.map(item => <Grid item key={item.id || item.path} xs={lista || expandidos[item.id] ? 12 : 6} md={lista || expandidos[item.id] ? 12 : 3} sx={{ display: 'flex' }}>{renderAcesso(item)}</Grid>)}</Grid>
    </Box>)}
    <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} sx={{ pt: 1, borderTop: '1px solid rgba(230,210,155,.3)' }}>
      {[{ text: 'Sobre o aplicativo', path: '/sobre', icon: <InfoIcon /> }, { text: 'Privacidade', path: '/privacidade' }].map(item => <Button key={item.path} startIcon={item.icon} onClick={() => handleClick(item)} sx={{ color: '#fff', textTransform: 'none', minHeight: 44 }}>{item.text}</Button>)}
    </Stack>
  </Box>
}
