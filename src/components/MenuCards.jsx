import { useState, useEffect } from 'react'
import { Avatar, Box, Card, CardContent, Typography, Grid, Collapse, IconButton } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import ExpandMore from '@mui/icons-material/ExpandMore'
import BibliaIcon from '@mui/icons-material/MenuBook'
import DiscipuladoIcon from '@mui/icons-material/People'
import EstudosBiblicosIcon from '@mui/icons-material/Groups'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
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
import QuizRetiroIcon from '@mui/icons-material/EmojiEvents'
import ChatIcon from '@mui/icons-material/Chat'
import PersonIcon from '@mui/icons-material/Person'
import InfoIcon from '@mui/icons-material/Info'
import EventNoteIcon from '@mui/icons-material/EventNote'
import CampaignIcon from '@mui/icons-material/Campaign'
import TuneIcon from '@mui/icons-material/Tune'
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined'
import BookmarkAddedOutlinedIcon from '@mui/icons-material/BookmarkAddedOutlined'
import { getGlassCardStyles } from '../utils/glassCardStyles'
import { useApp } from '../contexts/AppContext'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { abrirCanalYoutube } from '../utils/youtubeChannel'
import { ensureUserForFeature } from '../utils/chatExportSend'
import AdminSectionViewCounts from './AdminSectionViewCounts'
import PeopleIcon from '@mui/icons-material/People'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined'
import { chavesMetricaParaPathMenu, registarVisualizacaoSecaoSeNecessario } from '../utils/sectionViewKeys'
import { prefetchRota, prefetchRotasComuns } from '../utils/routePrefetch'
import { urlFundoVersiculo, urlLogoApp } from '../utils/versiculoImagem'
import { abrirVersiculoDoDia, linkPaginaVersiculoDoDia, obterVersiculoDoDia } from '../services/versiculoDoDiaService'
import CompartilharVersiculoImagemDialog from './CompartilharVersiculoImagemDialog'
import { alternarCurtida, obterCurtidasDoUsuario, obterDestaqueVersiculoDoDia, registrarCompartilhamentoVersiculoDoDia } from '../services/versiculosCompartilhadosService'

const ICON_BOX = 44
const ICON_SIZE = 26

function VersiculoDoDiaMenu() {
  const navigate = useNavigate()
  const { user } = useFirebaseAuth()
  const [item, setItem] = useState(null)
  const [interacoes, setInteracoes] = useState({ likesCount: 0, sharesCount: 0 })
  const [curtido, setCurtido] = useState(false)
  const [compartilhar, setCompartilhar] = useState(false)
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
    obterDestaqueVersiculoDoDia(item.data)
      .then((destaque) => ativo && setInteracoes({ likesCount: Number(destaque?.likesCount || 0), sharesCount: Number(destaque?.sharesCount || 0) }))
      .catch(() => {})
    if (user?.uid) obterCurtidasDoUsuario(user.uid).then((ids) => ativo && setCurtido(ids.has(`versiculo-dia-${item.data}`))).catch(() => {})
    else setCurtido(false)
    return () => { ativo = false }
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
      <Box component="div" role="button" tabIndex={0} onClick={() => navigate('/versiculo-do-dia')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate('/versiculo-do-dia') }} sx={{
        position: 'relative', minHeight: 184, borderRadius: 2, overflow: 'hidden', color: '#083e35',
        width: '100%', cursor: 'pointer', textAlign: 'left', font: 'inherit',
        backgroundImage: `linear-gradient(90deg, rgba(255,253,246,.99) 0%, rgba(255,253,246,.96) 48%, rgba(255,253,246,.48) 68%, rgba(255,253,246,.08) 100%), url("${urlFundoVersiculo({ arquivo: fundoArquivo })}")`,
        backgroundSize: 'cover', backgroundPosition: 'right center', border: '1px solid rgba(222,205,165,.88)',
        boxShadow: '0 5px 18px rgba(0,0,0,.2)', px: 2, py: 1.6, boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: '24px minmax(0, 1fr)',
        gridTemplateRows: 'auto auto auto',
        columnGap: 1,
        rowGap: 1.1,
      }}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography variant="overline" sx={{ color: '#79581b', fontWeight: 900, lineHeight: 1.2, letterSpacing: 1.2 }}>Versículo do dia</Typography>
          <Box sx={{ width: 38, height: 3, mt: 0.2, borderRadius: 2, background: '#c28a20' }} />
        </Box>
        <Typography
          aria-hidden="true"
          sx={{
            gridColumn: 1,
            alignSelf: 'start',
            color: '#dfbd69',
            fontFamily: 'Georgia, serif',
            fontSize: '2.8rem',
            lineHeight: 0.8,
          }}
        >
          “
        </Typography>
        <Typography sx={{
          gridColumn: 2,
          maxWidth: { xs: '88%', sm: '82%' },
          fontFamily: 'Georgia, serif',
          fontSize: { xs: '1.06rem', sm: '1.22rem' },
          lineHeight: 1.42,
          fontWeight: 700,
        }}>
          {item?.texto || 'A Palavra para o seu dia está sendo escolhida.'}
        </Typography>
        <Box sx={{ gridColumn: 2, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            component="img"
            src={urlLogoApp()}
            alt=""
            sx={{ width: 23, height: 23, borderRadius: 0.6, objectFit: 'cover', flexShrink: 0 }}
          />
          <Typography variant="caption" sx={{ fontWeight: 800 }}>{item?.referencia || 'Toque para abrir'}</Typography>
        </Box>
        <Box sx={{ gridColumn: '2 / -1', display: 'flex', alignItems: 'center', gap: 0.15, mt: -0.35 }}>
          <IconButton size="small" onClick={curtir} disabled={!user?.uid} title={user?.uid ? (curtido ? 'Remover curtida' : 'Curtir') : 'Entre na conta para curtir'} aria-label={curtido ? 'Remover curtida' : 'Curtir'} sx={{ color: curtido ? '#d93025' : '#79581b', p: 0.45 }}>
            {curtido ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
          </IconButton>
          <Typography variant="caption" sx={{ fontWeight: 900, minWidth: 18 }}>{interacoes.likesCount}</Typography>
          <IconButton size="small" onClick={abrirCompartilhamento} title="Compartilhar" aria-label="Compartilhar versículo do dia" sx={{ color: '#79581b', p: 0.45, ml: 0.5 }}>
            <IosShareOutlinedIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" sx={{ fontWeight: 900, minWidth: 18 }}>{interacoes.sharesCount}</Typography>
        </Box>
      </Box>
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

/** Cards do menu lateral: sem blur de vidro para abrir instantaneamente. */
function estilosCartaoMenu(gradient, options = {}) {
  return getGlassCardStyles(gradient, { performance: true, ...options })
}

function urlAssetPublico(caminho) {
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${base}/${String(caminho || '').replace(/^\//, '')}`
}

function urlFundoMenu(fundo) {
  if (!fundo) return ''
  return fundo.includes('/')
    ? urlAssetPublico(fundo)
    : urlFundoVersiculo({ arquivo: fundo })
}

function estilosFundoMenu(fundo, ativo = false) {
  const url = urlFundoMenu(fundo)
  if (!url) return {}
  return {
    backgroundImage: `${ativo
      ? 'linear-gradient(90deg, rgba(237,246,239,.98) 0%, rgba(237,246,239,.92) 42%, rgba(237,246,239,.24) 62%, rgba(237,246,239,.02) 100%)'
      : 'linear-gradient(90deg, rgba(255,253,246,.98) 0%, rgba(255,253,246,.92) 42%, rgba(255,253,246,.2) 62%, rgba(255,253,246,.02) 100%)'}, url("${url}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'right center',
    position: 'relative',
    color: '#083e35',
    minHeight: 116,
    height: '100%',
    width: '100%',
    borderColor: ativo ? 'rgba(190,139,34,.82) !important' : 'rgba(222,205,165,.82) !important',
    boxShadow: ativo
      ? '0 5px 16px rgba(0,55,44,.2), inset 0 0 0 1px rgba(190,139,34,.2)'
      : '0 4px 14px rgba(0,40,32,.15)',
    '& .MuiTypography-root': {
      color: '#083e35 !important',
      textShadow: '-1px -1px 0 rgba(255,255,255,.98), 0 -1px 0 rgba(255,255,255,.98), 1px -1px 0 rgba(255,255,255,.98), -1px 0 0 rgba(255,255,255,.98), 1px 0 0 rgba(255,255,255,.98), -1px 1px 0 rgba(255,255,255,.98), 0 1px 0 rgba(255,255,255,.98), 1px 1px 0 rgba(255,255,255,.98) !important',
      fontStyle: 'normal !important',
    },
    '& .MuiSvgIcon-root': { color: '#f7e8b5 !important' },
  }
}

// Itens do menu principal — note: o gradiente per-item foi removido porque
// nunca era usado (o `Card` sempre recebia `menuCardGradient`, branco no light
// e preto no dark). Manter campos mortos só polui a manutenção.
const menuItems = [
  {
    text: 'Bíblia',
    icon: <BibliaIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/biblia',
    description: 'Leia e estude a Palavra de Deus',
    fundo: 'menu-fundos/biblia.webp'
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
    text: 'Bíblia comentada',
    icon: <LibraryBooksIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/biblioteca-estudos',
    description: 'Perícopes e versículos com comentários',
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
    text: 'Mais de Deus',
    icon: <AddIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/mais-de-deus',
    description: 'Mais conteúdos teológicos',
    accentRing: 'rgba(255, 255, 255, 0.45)',
    fundo: 'menu-fundos/mais-de-deus.webp'
  },
  {
    text: 'YouTube',
    icon: <YouTubeIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/youtube',
    description: 'Canal Bíblia do Discípulo Cristão',
    accentRing: 'rgba(255, 255, 255, 0.45)',
    fundo: 'menu-fundos/youtube.webp'
  },
  {
    text: 'Quiz',
    icon: <QuizRetiroIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/quiz-retiro',
    description: 'Quiz bíblico',
    accentRing: 'rgba(255, 255, 255, 0.45)',
    fundo: 'menu-fundos/quiz.webp'
  },
  {
    text: 'Versículos marcados',
    icon: <BookmarkAddedOutlinedIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/versiculos-marcados',
    description: 'Suas marcações por cor',
    fundo: 'menu-fundos/versiculos-marcados.webp'
  },
  {
    text: 'Versículos compartilhados',
    icon: <CollectionsBookmarkOutlinedIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/versiculos-compartilhados',
    description: 'Mural anônimo e seus compartilhamentos',
    requerLogin: true,
    accentRing: 'rgba(255, 255, 255, 0.45)',
    fundo: 'menu-fundos/versiculos-compartilhados.webp'
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

const menuAntesHinario = menuItems.slice(0, 4)
// Itens depois de Westminster e antes do "Sobre" (menuFinal).
const menuDepoisWestminster = menuItems.slice(4, -1)
const menuFinal = menuItems.slice(-1)

/**
 * Pai expansível "Conectar" — reúne tudo que é **conexão** com a comunidade
 * e com o aparelho: chat, preferências de push e (para admin) envio de aviso.
 */
const conectarPai = {
  text: 'Conectar',
  description: 'Mensagens, conta e notificações'
}

const conectarSubChat = {
  text: 'Mensagens',
  icon: <ChatIcon sx={{ fontSize: ICON_SIZE }} />,
  path: '/chat',
  description: 'Chat da comunidade'
}

const notificacoesSubItens = [
  {
    text: 'Configurações',
    icon: <TuneIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/configuracoes/notificacoes',
    description: 'Perfil e notificações',
    requerLogin: true
  }
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
  text: 'Hinário Novo Cântico',
  icon: <HinarioPaiIcon sx={{ fontSize: ICON_SIZE }} />,
  description: 'Letra e cifras — abra para escolher',
  fundo: 'menu-fundos/hinario.webp'
}

const hinarioSubItens = [
  {
    text: 'Letra',
    icon: <HinarioLetraIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/hinario/letra',
    description: 'Letras dos hinos para cantar'
  },
  {
    text: 'Cifras',
    icon: <HinarioCifrasIcon sx={{ fontSize: ICON_SIZE }} />,
    path: '/hinario/cifras',
    description: 'Cifras com transposição de tom'
  }
]

const westminsterPai = {
  text: 'Westminster',
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

/**
 * Gera um `shimmerDelay` determinístico (em segundos) a partir do índice do
 * card. Antes usávamos `Math.random() * 7` em cada render — a cada re-render
 * do menu (mudança de rota, modo escuro, etc.) o delay mudava e o shimmer
 * "pulava". Agora cada card tem o seu próprio offset estável, mantendo a
 * sensação de "ondas independentes" sem o jank.
 */
function shimmerDelayPorIndice(i, total = 8) {
  const passo = 7 / Math.max(1, total)
  return Number(((i % total) * passo + 0.3).toFixed(2))
}

/** Mesmo gradiente do card "Continuar de onde parou" em `Discipulado.jsx`. */
const MENU_CARD_DESTAQUE_VERDE_GRADIENT =
  'linear-gradient(135deg, rgba(0, 77, 64, 0.9) 0%, rgba(0, 64, 53, 0.9) 100%)'

/**
 * A Bíblia usa a rota index `/`; o item do menu aponta para `/biblia`.
 * Outros itens podem ter sub-rotas (ex.: `/discipulado/tema/...`).
 */
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
  if (path.startsWith('/hinario/editor') || path.startsWith('/hinario-editor')) return 'hinarioEditor'
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

function conectarResumoConta(user) {
  if (user === undefined) return 'A preparar…'
  if (!user) return 'Entre na conta para mensagens e notificações'
  return nomeContaCurto(user)
}

export default function MenuCards({ onItemClick, unreadChatCount = 0, menuOpen }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useFirebaseAuth()
  const { isDarkMode } = useApp()
  const [hinarioExpanded, setHinarioExpanded] = useState(false)
  const [westminsterExpanded, setWestminsterExpanded] = useState(false)
  const [conectarExpanded, setConectarExpanded] = useState(false)
  const [ehAdmin, setEhAdmin] = useState(false)

  // Cada acesso ao menu começa no topo e com os grupos recolhidos.
  useEffect(() => {
    if (menuOpen === undefined) return
    setConectarExpanded(false)
    setHinarioExpanded(false)
    setWestminsterExpanded(false)
    if (menuOpen) prefetchRotasComuns()
  }, [menuOpen])

  // Detecta admin — mostra "Enviar aviso" dentro de Conectar > Notificações.
  useEffect(() => {
    let cancelado = false
    async function checar() {
      if (!user?.uid) { setEhAdmin(false); return }
      try {
        const { getFirebaseDatabase, loadFirebaseModules } = await import('../config/firebase')
        await loadFirebaseModules()
        const db = getFirebaseDatabase()
        if (!db) return
        const { ref, get } = await import('firebase/database')
        const snap = await get(ref(db, `users/${user.uid}/admin`))
        if (!cancelado) setEhAdmin(snap.val() === true)
      } catch (_) {
        if (!cancelado) setEhAdmin(false)
      }
    }
    void checar()
    return () => { cancelado = true }
  }, [user?.uid])
  const menuCardGradient = isDarkMode
    ? 'linear-gradient(135deg, #000000 0%, #000000 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)'
  const menuCardTextColor = isDarkMode ? 'white' : '#111'
  const menuCardBorder = isDarkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)'
  /** Borda do cartão ativo — alinhada ao card "Continuar" no Discipulado. */
  const bordaCartaoMenuAtivo = '1px solid rgba(255, 255, 255, 0.22)'
  /** Cartão ativo: texto claro sobre o gradiente verde (modelo Discipulado). */
  const corTextoItemMenuAtivo = (ativo, corInativa = menuCardTextColor) =>
    ativo ? 'rgba(255, 255, 255, 0.98)' : corInativa

  // Garante que o drawer/menu que abriga o MenuCards feche assim que o
  // usuário clica em qualquer item — mesmo quando a navegação não muda a
  // URL (ex.: clicar em Plano de leitura estando já em `/chat`).
  const fecharMenuPai = () => {
    if (typeof onItemClick === 'function') {
      try { onItemClick() } catch (_) { /* noop */ }
    }
  }

  const handleClick = (item) => {
    if (item.externalUrl) {
      window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
      fecharMenuPai()
      return
    }
    if (item.path === '/youtube') {
      void registarVisualizacaoSecaoSeNecessario('youtube', user?.uid)
      void abrirCanalYoutube(isDarkMode)
      fecharMenuPai()
      return
    }
    if (item.requerLogin) {
      if (!ensureUserForFeature(user, navigate, {
        mensagem: 'Entre na sua conta para usar este recurso.',
        redirectTo: item.path
      })) {
        fecharMenuPai()
        return
      }
    }
    if (rotaCorrespondeItemMenu(item.path, location.pathname)) {
      fecharMenuPai()
      return
    }
    const nomePrefetch = nomePrefetchPorPath(item.path)
    if (nomePrefetch) prefetchRota(nomePrefetch)
    navigate(item.path)
    fecharMenuPai()
  }

  const chatMenuActive = location.pathname === '/chat'
  const hinarioAtivo = location.pathname.startsWith('/hinario')
  const westminsterAtivo =
    location.pathname.startsWith('/confissao') ||
    location.pathname.startsWith('/catecismo-maior') ||
    location.pathname.startsWith('/catecismo-breve')
  const conectarGrupoAtivo =
    location.pathname === '/chat' ||
    location.pathname.startsWith('/configuracoes/notificacoes') ||
    location.pathname.startsWith('/admin/notificar') ||
    location.pathname.startsWith('/admin/usuarios')

  return (
    <Box
      sx={{
        p: 1.5,
        width: '100%',
        maxWidth: 1180,
        mx: 'auto',
        boxSizing: 'border-box',
        background: '#004d40',
        // O Drawer cresce até a altura do viewport. Usar `100vh` em
        // celular esconde os últimos itens (Devocional, etc.) atrás da
        // barra do navegador — `100dvh` mede só o que está visível.
        // Também adicionamos folga inferior para que o último item caiba
        // acima do safe-area / barra de gestos.
        minHeight: '100vh',
        '@supports (min-height: 100dvh)': {
          minHeight: '100dvh',
        },
        pb: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
      }}
    >
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Card
            sx={{
              ...estilosCartaoMenu(
                conectarGrupoAtivo ? MENU_CARD_DESTAQUE_VERDE_GRADIENT : menuCardGradient,
                {
                  hover: false,
                  border: conectarGrupoAtivo,
                  shimmer: !conectarGrupoAtivo,
                  borderRadius: 2,
                  shimmerDelay: 0.5,
                }
              ),
              color: corTextoItemMenuAtivo(conectarGrupoAtivo),
              border: conectarGrupoAtivo ? bordaCartaoMenuAtivo : `1px solid ${menuCardBorder}`,
              background: 'linear-gradient(135deg, #052f29 0%, #001d19 100%)',
              '& .MuiTypography-root, & .MuiSvgIcon-root': { color: '#fff !important' },
            }}
          >
            <CardContent
              sx={{
                py: 1.25,
                px: 1.5,
                '& .MuiTypography-root': {
                  fontStyle: conectarGrupoAtivo ? 'italic' : 'normal',
                },
                '&:last-child': { pb: 1.25 },
              }}
            >
              <Box
                onClick={() => setConectarExpanded((v) => !v)}
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 1.25,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Box
                  sx={{
                    flexShrink: 0,
                    p: 0.75,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.22)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: ICON_BOX,
                    height: ICON_BOX,
                    position: 'relative',
                    zIndex: 3,
                    border: '1px solid rgba(255, 255, 255, 0.45)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
                  }}
                >
                  {user?.photoURL ? (
                    <Avatar src={user.photoURL} alt="" sx={{ width: 34, height: 34 }} />
                  ) : user ? (
                    <PersonIcon sx={{ fontSize: ICON_SIZE }} />
                  ) : (
                    <ChatIcon sx={{ fontSize: ICON_SIZE }} />
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 3 }}>
                  {/* Logado: nome assume o lugar do título — o avatar + nome já
                   *  comunicam visualmente "está conectado", então omitimos o rótulo
                   *  "Conectar" e a descrição redundante. */}
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      lineHeight: 1.25,
                      mb: 0.25,
                      textShadow: conectarGrupoAtivo
                        ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                        : '1px 1px 4px rgba(0, 0, 0, 0.35)',
                      color: corTextoItemMenuAtivo(conectarGrupoAtivo),
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user ? nomeContaCurto(user) : conectarPai.text}
                  </Typography>
                  {user && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: '#f0d994 !important',
                        fontFamily: 'Georgia, serif',
                        fontStyle: 'italic',
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        lineHeight: 1.25,
                      }}
                    >
                      Que bom ter você por aqui!
                    </Typography>
                  )}
                  {!user && (
                    <Typography
                      variant="body2"
                      sx={{
                        opacity: 0.92,
                        fontSize: '0.72rem',
                        lineHeight: 1.35,
                        fontWeight: 700,
                        textShadow: conectarGrupoAtivo
                          ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                          : '1px 1px 3px rgba(0, 0, 0, 0.35)',
                        color: corTextoItemMenuAtivo(conectarGrupoAtivo),
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {conectarResumoConta(user)}
                    </Typography>
                  )}
                  {!user && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.35,
                        opacity: 0.82,
                        fontWeight: 600,
                        textShadow: conectarGrupoAtivo
                          ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                          : '1px 1px 3px rgba(0, 0, 0, 0.35)',
                        color: corTextoItemMenuAtivo(conectarGrupoAtivo),
                      }}
                    >
                      {conectarPai.description}
                    </Typography>
                  )}
                </Box>
                <ExpandMore
                  sx={{
                    flexShrink: 0,
                    color: corTextoItemMenuAtivo(conectarGrupoAtivo),
                    transition: 'transform 0.2s ease',
                    transform: conectarExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </Box>
              <Collapse in={conectarExpanded} timeout="auto" unmountOnExit={false}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1.5, pl: 0.5 }}>
                  {/* Chat */}
                  <Card
                    onClick={() => {
                      navigate('/chat')
                      fecharMenuPai()
                    }}
                    sx={{
                      ...estilosCartaoMenu(
                        chatMenuActive ? MENU_CARD_DESTAQUE_VERDE_GRADIENT : menuCardGradient,
                        {
                          hover: true,
                          border: chatMenuActive,
                          shimmer: !chatMenuActive,
                          borderRadius: 2,
                          shimmerDelay: shimmerDelayPorIndice(0, 6),
                        }
                      ),
                      color: corTextoItemMenuAtivo(chatMenuActive),
                      border: chatMenuActive ? bordaCartaoMenuAtivo : `1px solid ${menuCardBorder}`,
                      background: 'transparent !important',
                      borderLeft: 0,
                      borderRight: 0,
                      borderTop: 0,
                      borderBottom: '1px solid rgba(255,255,255,.18)',
                      borderRadius: 0,
                      boxShadow: 'none',
                      '&::before, &::after': { display: 'none' },
                    }}
                  >
                    <CardContent
                      sx={{
                        py: 1,
                        px: 1.25,
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 1,
                        '& .MuiTypography-root': {
                          fontStyle: chatMenuActive ? 'italic' : 'normal',
                        },
                        '&:last-child': { pb: 1 },
                      }}
                    >
                      <Box
                        sx={{
                          flexShrink: 0,
                          p: 0.5,
                          borderRadius: 1.25,
                          background: 'rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 36,
                          height: 36,
                        }}
                      >
                        {conectarSubChat.icon}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            color: corTextoItemMenuAtivo(chatMenuActive),
                            textShadow: chatMenuActive
                              ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                              : (isDarkMode ? '1px 1px 3px rgba(0,0,0,0.35)' : 'none'),
                          }}
                        >
                          {conectarSubChat.text}
                        </Typography>
                        <Typography variant="caption" sx={{ color: corTextoItemMenuAtivo(chatMenuActive, isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)'), fontWeight: 700, display: 'block' }}>
                          {conectarSubChat.description}
                        </Typography>
                        <AdminSectionViewCounts ehAdmin={ehAdmin} keys={['chat']} />
                      </Box>
                      {Number(unreadChatCount) > 0 ? (
                        <Box
                          component="span"
                          aria-label={`${Number(unreadChatCount)} mensagens não lidas`}
                          sx={{
                            flexShrink: 0,
                            minWidth: 24,
                            height: 24,
                            px: Number(unreadChatCount) > 9 ? 0.75 : 0,
                            borderRadius: 999,
                            bgcolor: '#ff6d00',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            lineHeight: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                          }}
                        >
                          {Number(unreadChatCount) > 99 ? '99+' : Number(unreadChatCount)}
                        </Box>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      mb: 0.25,
                      pl: 0.5,
                      fontWeight: 800,
                      letterSpacing: 0.06,
                      textTransform: 'uppercase',
                      color: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)',
                    }}
                  >
                    Notificações
                  </Typography>

                  {[
                    ...notificacoesSubItens,
                    ...(ehAdmin ? [notificacoesSubItemUsuarios, notificacoesSubItemAdmin] : [])
                  ].map((sub, subIdx) => {
                    const subActive = location.pathname === sub.path
                    return (
                      <Card
                        key={sub.path}
                        onClick={() => handleClick(sub)}
                        sx={{
                          ...estilosCartaoMenu(
                            subActive ? MENU_CARD_DESTAQUE_VERDE_GRADIENT : menuCardGradient,
                            {
                              hover: true,
                              border: subActive,
                              shimmer: !subActive,
                              borderRadius: 2,
                              shimmerDelay: shimmerDelayPorIndice(subIdx + 1, 6),
                            }
                          ),
                          color: corTextoItemMenuAtivo(subActive),
                          border: subActive ? bordaCartaoMenuAtivo : `1px solid ${menuCardBorder}`,
                          background: 'transparent !important',
                          borderLeft: 0,
                          borderRight: 0,
                          borderTop: 0,
                          borderBottom: '1px solid rgba(255,255,255,.18)',
                          borderRadius: 0,
                          boxShadow: 'none',
                          '&::before, &::after': { display: 'none' },
                        }}
                      >
                        <CardContent
                          sx={{
                            py: 1,
                            px: 1.25,
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 1,
                            '& .MuiTypography-root': {
                              fontStyle: subActive ? 'italic' : 'normal',
                            },
                            '&:last-child': { pb: 1 },
                          }}
                        >
                          <Box
                            sx={{
                              flexShrink: 0,
                              p: 0.5,
                              borderRadius: 1.25,
                              background: 'rgba(255, 255, 255, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 36,
                              height: 36,
                            }}
                          >
                            {sub.icon}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 700,
                                color: corTextoItemMenuAtivo(subActive),
                                textShadow: subActive
                                  ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                                  : (isDarkMode ? '1px 1px 3px rgba(0,0,0,0.35)' : 'none'),
                              }}
                            >
                              {sub.text}
                            </Typography>
                            <Typography variant="caption" sx={{ color: corTextoItemMenuAtivo(subActive, isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)'), fontWeight: 700, display: 'block' }}>
                              {sub.description}
                            </Typography>
                            <AdminSectionViewCounts ehAdmin={ehAdmin} keys={chavesMetricaParaPathMenu(sub.path)} />
                          </Box>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        </Grid>

        <VersiculoDoDiaMenu />

        {menuAntesHinario.map((item, idx) => {
          const isActive = rotaCorrespondeItemMenu(item.path, location.pathname)
          return (
            <Grid item xs={6} md={3} key={item.text} sx={{ display: 'flex' }}>
              <Card
                onClick={() => handleClick(item)}
                sx={{
                  ...estilosCartaoMenu(
                    isActive ? MENU_CARD_DESTAQUE_VERDE_GRADIENT : menuCardGradient,
                    {
                      hover: true,
                      border: isActive,
                      shimmer: !isActive,
                      borderRadius: 2,
                      shimmerDelay: shimmerDelayPorIndice(idx + 1),
                    }
                  ),
                  color: corTextoItemMenuAtivo(isActive),
                  border: isActive ? bordaCartaoMenuAtivo : `1px solid ${menuCardBorder}`,
                  ...estilosFundoMenu(item.fundo, isActive),
                }}
              >
                <CardContent
                  sx={{
                    py: 1.25,
                    px: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    gap: 0.75,
                    textAlign: 'center',
                    '& .MuiTypography-root': {
                      fontStyle: isActive ? 'italic' : 'normal',
                    },
                    '&:last-child': { pb: 1.25 },
                  }}
                >
                  <Box
                    sx={{
                      flexShrink: 0,
                      p: 0.75,
                      borderRadius: '50%',
                      background: 'linear-gradient(145deg, #00715f, #004d40)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: ICON_BOX,
                      height: ICON_BOX,
                      position: 'relative',
                      zIndex: 3,
                      border: item.accentRing
                        ? `1px solid ${item.accentRing}`
                        : '1px solid rgba(222, 205, 165, 0.92)',
                      boxShadow: '0 3px 9px rgba(0, 55, 44, 0.2)',
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box sx={{ width: '100%', minWidth: 0, position: 'relative', zIndex: 3, textAlign: 'center' }}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        lineHeight: 1.25,
                        mb: 0.25,
                        textShadow: isActive
                          ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                          : '1px 1px 4px rgba(0, 0, 0, 0.35)',
                        color: corTextoItemMenuAtivo(isActive),
                      }}
                    >
                      {item.text}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        opacity: 0.92,
                        fontSize: '0.72rem',
                        lineHeight: 1.35,
                        fontWeight: 700,
                        textShadow: isActive
                          ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                          : '1px 1px 3px rgba(0, 0, 0, 0.35)',
                        color: corTextoItemMenuAtivo(isActive),
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.description}
                    </Typography>
                    <AdminSectionViewCounts ehAdmin={ehAdmin} keys={chavesMetricaParaPathMenu(item.path)} />
                  </Box>
                  <ChevronRightIcon sx={{ position: 'absolute', right: 7, bottom: 8, zIndex: 3, fontSize: 22 }} />
                </CardContent>
              </Card>
            </Grid>
          )
        })}

        <Grid item xs={hinarioExpanded ? 12 : 6} md={hinarioExpanded ? 12 : 3} sx={{ display: 'flex' }}>
          <Card
            sx={{
              ...estilosCartaoMenu(
                hinarioAtivo ? MENU_CARD_DESTAQUE_VERDE_GRADIENT : menuCardGradient,
                {
                  hover: false,
                  border: hinarioAtivo,
                  shimmer: !hinarioAtivo,
                  borderRadius: 2,
                  shimmerDelay: 2,
                }
              ),
              color: corTextoItemMenuAtivo(hinarioAtivo),
              border: hinarioAtivo ? bordaCartaoMenuAtivo : `1px solid ${menuCardBorder}`,
              ...estilosFundoMenu(hinarioPai.fundo, hinarioAtivo),
            }}
          >
            <CardContent
              sx={{
                py: 1.25,
                px: 1.5,
                '& .MuiTypography-root': {
                  fontStyle: hinarioAtivo ? 'italic' : 'normal',
                },
                '&:last-child': { pb: 1.25 },
              }}
            >
              <Box
                onClick={() => setHinarioExpanded((v) => !v)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.75,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    flexShrink: 0,
                    p: 0.75,
                    borderRadius: '50%',
                    background: 'linear-gradient(145deg, #00715f, #004d40)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: ICON_BOX,
                    height: ICON_BOX,
                    position: 'relative',
                    zIndex: 3,
                    border: '1px solid rgba(222, 205, 165, 0.92)',
                    boxShadow: '0 3px 9px rgba(0, 55, 44, 0.2)',
                  }}
                >
                  {hinarioPai.icon}
                </Box>
                <Box sx={{ width: '100%', minWidth: 0, position: 'relative', zIndex: 3, textAlign: 'center' }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      lineHeight: 1.25,
                      mb: 0.25,
                      textShadow: hinarioAtivo
                        ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                        : '1px 1px 4px rgba(0, 0, 0, 0.35)',
                      color: corTextoItemMenuAtivo(hinarioAtivo),
                    }}
                  >
                    {hinarioPai.text}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      opacity: 0.92,
                      fontSize: '0.72rem',
                      lineHeight: 1.35,
                      fontWeight: 700,
                      textShadow: hinarioAtivo
                        ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                        : '1px 1px 3px rgba(0, 0, 0, 0.35)',
                      color: corTextoItemMenuAtivo(hinarioAtivo),
                    }}
                  >
                    {hinarioPai.description}
                  </Typography>
                  <AdminSectionViewCounts ehAdmin={ehAdmin} keys={['hinario_letra', 'hinario_cifras']} />
                </Box>
                <ExpandMore
                  sx={{
                    flexShrink: 0,
                    color: corTextoItemMenuAtivo(hinarioAtivo),
                    transition: 'transform 0.2s ease',
                    transform: hinarioExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </Box>
              <Collapse in={hinarioExpanded} timeout="auto" unmountOnExit={false}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1.5, pl: 0.5 }}>
                  {hinarioSubItens.map((sub, subIdx) => {
                    const subActive = location.pathname === sub.path
                    return (
                      <Card
                        key={sub.path}
                        onClick={() => handleClick(sub)}
                        sx={{
                          ...estilosCartaoMenu(
                            subActive ? MENU_CARD_DESTAQUE_VERDE_GRADIENT : menuCardGradient,
                            {
                              hover: true,
                              border: subActive,
                              shimmer: !subActive,
                              borderRadius: 2,
                              shimmerDelay: shimmerDelayPorIndice(subIdx + 3, 5),
                            }
                          ),
                          color: corTextoItemMenuAtivo(subActive),
                          minHeight: 88,
                          position: 'relative',
                          zIndex: 4,
                          border: subActive ? bordaCartaoMenuAtivo : `2px solid ${menuCardBorder}`,
                          boxShadow: subActive
                            ? '0 4px 12px rgba(0, 92, 55, 0.22)'
                            : (isDarkMode ? '0 3px 10px rgba(0,0,0,0.32)' : '0 3px 10px rgba(20,45,34,0.14)'),
                          '&& .MuiTypography-root': {
                            color: `${subActive ? 'rgba(255,255,255,.98)' : menuCardTextColor} !important`,
                          },
                          '&& .MuiSvgIcon-root': {
                            color: `${subActive ? '#fff' : menuCardTextColor} !important`,
                          },
                        }}
                      >
                        <CardContent
                          sx={{
                            py: 1.25,
                            px: 1.5,
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 1,
                            '& .MuiTypography-root': {
                              fontStyle: subActive ? 'italic' : 'normal',
                            },
                            '&:last-child': { pb: 1.25 },
                          }}
                        >
                          <Box
                            sx={{
                              flexShrink: 0,
                              p: 0.5,
                              borderRadius: 1.25,
                              background: 'rgba(255, 255, 255, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 42,
                              height: 42,
                            }}
                          >
                            {sub.icon}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 700,
                                fontSize: '1.08rem',
                                lineHeight: 1.25,
                                color: corTextoItemMenuAtivo(subActive),
                                textShadow: subActive
                                  ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                                  : (isDarkMode ? '1px 1px 3px rgba(0,0,0,0.35)' : 'none'),
                              }}
                            >
                              {sub.text}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.25, color: corTextoItemMenuAtivo(subActive, isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)'), fontSize: '0.82rem', lineHeight: 1.35, fontWeight: 700, display: 'block' }}>
                              {sub.description}
                            </Typography>
                            <AdminSectionViewCounts ehAdmin={ehAdmin} keys={chavesMetricaParaPathMenu(sub.path)} />
                          </Box>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={westminsterExpanded ? 12 : 6} md={westminsterExpanded ? 12 : 3} sx={{ display: 'flex' }}>
          <Card
            sx={{
              ...estilosCartaoMenu(
                westminsterAtivo ? MENU_CARD_DESTAQUE_VERDE_GRADIENT : menuCardGradient,
                {
                  hover: false,
                  border:
                    location.pathname.startsWith('/confissao') ||
                    location.pathname.startsWith('/catecismo-maior') ||
                    location.pathname.startsWith('/catecismo-breve'),
                  shimmer: !westminsterAtivo,
                  borderRadius: 2,
                  shimmerDelay: 1.5,
                }
              ),
              color: corTextoItemMenuAtivo(westminsterAtivo),
              border: westminsterAtivo ? bordaCartaoMenuAtivo : `1px solid ${menuCardBorder}`,
              ...estilosFundoMenu(westminsterPai.fundo, westminsterAtivo),
            }}
          >
            <CardContent
              sx={{
                py: 1.25,
                px: 1.5,
                '& .MuiTypography-root': {
                  fontStyle: westminsterAtivo ? 'italic' : 'normal',
                },
                '&:last-child': { pb: 1.25 },
              }}
            >
              <Box
                onClick={() => setWestminsterExpanded((v) => !v)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.75,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    flexShrink: 0,
                    p: 0.75,
                    borderRadius: '50%',
                    background: 'linear-gradient(145deg, #00715f, #004d40)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: ICON_BOX,
                    height: ICON_BOX,
                    position: 'relative',
                    zIndex: 3,
                    border: '1px solid rgba(222, 205, 165, 0.92)',
                    boxShadow: '0 3px 9px rgba(0, 55, 44, 0.2)',
                  }}
                >
                  {westminsterPai.icon}
                </Box>
                <Box sx={{ width: '100%', minWidth: 0, position: 'relative', zIndex: 3, textAlign: 'center' }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      lineHeight: 1.25,
                      mb: 0.25,
                      textShadow: westminsterAtivo
                        ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                        : '1px 1px 4px rgba(0, 0, 0, 0.35)',
                      color: corTextoItemMenuAtivo(westminsterAtivo),
                    }}
                  >
                    {westminsterPai.text}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      opacity: 0.92,
                      fontSize: '0.72rem',
                      lineHeight: 1.35,
                      fontWeight: 700,
                      textShadow: westminsterAtivo
                        ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                        : '1px 1px 3px rgba(0, 0, 0, 0.35)',
                      color: corTextoItemMenuAtivo(westminsterAtivo),
                    }}
                  >
                    {westminsterPai.description}
                  </Typography>
                  <AdminSectionViewCounts
                    ehAdmin={ehAdmin}
                    keys={['confissao', 'catecismo_maior', 'catecismo_breve']}
                  />
                </Box>
                <ExpandMore
                  sx={{
                    flexShrink: 0,
                    color: corTextoItemMenuAtivo(westminsterAtivo),
                    transition: 'transform 0.2s ease',
                    transform: westminsterExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </Box>
              <Collapse in={westminsterExpanded} timeout="auto" unmountOnExit={false}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1.5, pl: 0.5 }}>
                  {westminsterSubItens.map((sub, subIdx) => {
                    const subActive = location.pathname === sub.path
                    return (
                      <Card
                        key={sub.path}
                        onClick={() => handleClick(sub)}
                        sx={{
                          ...estilosCartaoMenu(
                            subActive ? MENU_CARD_DESTAQUE_VERDE_GRADIENT : menuCardGradient,
                            {
                              hover: true,
                              border: subActive,
                              shimmer: !subActive,
                              borderRadius: 2,
                              shimmerDelay: shimmerDelayPorIndice(subIdx + 4, 5),
                            }
                          ),
                          color: corTextoItemMenuAtivo(subActive),
                          minHeight: 88,
                          position: 'relative',
                          zIndex: 4,
                          border: subActive ? bordaCartaoMenuAtivo : `2px solid ${menuCardBorder}`,
                          boxShadow: subActive
                            ? '0 4px 12px rgba(0, 92, 55, 0.22)'
                            : (isDarkMode ? '0 3px 10px rgba(0,0,0,0.32)' : '0 3px 10px rgba(20,45,34,0.14)'),
                          '&& .MuiTypography-root': {
                            color: `${subActive ? 'rgba(255,255,255,.98)' : menuCardTextColor} !important`,
                          },
                          '&& .MuiSvgIcon-root': {
                            color: `${subActive ? '#fff' : menuCardTextColor} !important`,
                          },
                        }}
                      >
                        <CardContent
                          sx={{
                            py: 1.25,
                            px: 1.5,
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 1,
                            '& .MuiTypography-root': {
                              fontStyle: subActive ? 'italic' : 'normal',
                            },
                            '&:last-child': { pb: 1.25 },
                          }}
                        >
                          <Box
                            sx={{
                              flexShrink: 0,
                              p: 0.5,
                              borderRadius: 1.25,
                              background: 'rgba(255, 255, 255, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 42,
                              height: 42,
                            }}
                          >
                            {sub.icon}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 700,
                                fontSize: '1.08rem',
                                lineHeight: 1.25,
                                color: corTextoItemMenuAtivo(subActive),
                                textShadow: subActive
                                  ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                                  : (isDarkMode ? '1px 1px 3px rgba(0,0,0,0.35)' : 'none'),
                              }}
                            >
                              {sub.text}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.25, color: corTextoItemMenuAtivo(subActive, isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)'), fontSize: '0.82rem', lineHeight: 1.35, fontWeight: 700, display: 'block' }}>
                              {sub.description}
                            </Typography>
                            <AdminSectionViewCounts ehAdmin={ehAdmin} keys={chavesMetricaParaPathMenu(sub.path)} />
                          </Box>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        </Grid>

        {menuDepoisWestminster.map((item, idx) => {
          const isActive = rotaCorrespondeItemMenu(item.path, location.pathname)
          return (
            <Grid item xs={6} md={3} key={item.text} sx={{ display: 'flex' }}>
              <Card
                onClick={() => handleClick(item)}
                sx={{
                  ...estilosCartaoMenu(
                    isActive ? MENU_CARD_DESTAQUE_VERDE_GRADIENT : menuCardGradient,
                    {
                      hover: true,
                      border: isActive,
                      shimmer: !isActive,
                      borderRadius: 2,
                      shimmerDelay: shimmerDelayPorIndice(idx + 4),
                    }
                  ),
                  color: corTextoItemMenuAtivo(isActive),
                  border: isActive ? bordaCartaoMenuAtivo : `1px solid ${menuCardBorder}`,
                  ...estilosFundoMenu(item.fundo, isActive),
                }}
              >
                <CardContent
                  sx={{
                    py: 1.25,
                    px: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    gap: 0.75,
                    textAlign: 'center',
                    '& .MuiTypography-root': {
                      fontStyle: isActive ? 'italic' : 'normal',
                    },
                    '&:last-child': { pb: 1.25 },
                  }}
                >
                  <Box
                    sx={{
                      flexShrink: 0,
                      p: 0.75,
                      borderRadius: '50%',
                      background: 'linear-gradient(145deg, #00715f, #004d40)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: ICON_BOX,
                      height: ICON_BOX,
                      position: 'relative',
                      zIndex: 3,
                      border: item.accentRing
                        ? `1px solid ${item.accentRing}`
                        : '1px solid rgba(222, 205, 165, 0.92)',
                      boxShadow: '0 3px 9px rgba(0, 55, 44, 0.2)',
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box sx={{ width: '100%', minWidth: 0, position: 'relative', zIndex: 3, textAlign: 'center' }}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        lineHeight: 1.25,
                        mb: 0.25,
                        textShadow: isActive
                          ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                          : '1px 1px 4px rgba(0, 0, 0, 0.35)',
                        color: corTextoItemMenuAtivo(isActive),
                      }}
                    >
                      {item.text}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        opacity: 0.92,
                        fontSize: '0.72rem',
                        lineHeight: 1.35,
                        fontWeight: 700,
                        textShadow: isActive
                          ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                          : '1px 1px 3px rgba(0, 0, 0, 0.35)',
                        color: corTextoItemMenuAtivo(isActive),
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.description}
                    </Typography>
                    <AdminSectionViewCounts ehAdmin={ehAdmin} keys={chavesMetricaParaPathMenu(item.path)} />
                  </Box>
                  <ChevronRightIcon sx={{ position: 'absolute', right: 7, bottom: 8, zIndex: 3, fontSize: 22 }} />
                </CardContent>
              </Card>
            </Grid>
          )
        })}

        {menuFinal.map((item, idx) => {
          const isActive = rotaCorrespondeItemMenu(item.path, location.pathname)
          return (
            <Grid item xs={6} md={3} key={item.text} sx={{ display: 'flex' }}>
              <Card
                onClick={() => handleClick(item)}
                sx={{
                  ...estilosCartaoMenu(
                    isActive ? MENU_CARD_DESTAQUE_VERDE_GRADIENT : menuCardGradient,
                    {
                      hover: true,
                      border: isActive,
                      shimmer: !isActive,
                      borderRadius: 2,
                      shimmerDelay: shimmerDelayPorIndice(idx + 10),
                    }
                  ),
                  color: corTextoItemMenuAtivo(isActive),
                  border: isActive ? bordaCartaoMenuAtivo : `1px solid ${menuCardBorder}`,
                  ...estilosFundoMenu(item.fundo, isActive),
                }}
              >
                <CardContent
                  sx={{
                    py: 1.25,
                    px: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    gap: 0.75,
                    textAlign: 'center',
                    '& .MuiTypography-root': {
                      fontStyle: isActive ? 'italic' : 'normal',
                    },
                    '&:last-child': { pb: 1.25 },
                  }}
                >
                  <Box
                    sx={{
                      flexShrink: 0,
                      p: 0.75,
                      borderRadius: '50%',
                      background: 'linear-gradient(145deg, #00715f, #004d40)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: ICON_BOX,
                      height: ICON_BOX,
                      position: 'relative',
                      zIndex: 3,
                      border: item.accentRing
                        ? `1px solid ${item.accentRing}`
                        : '1px solid rgba(222, 205, 165, 0.92)',
                      boxShadow: '0 3px 9px rgba(0, 55, 44, 0.2)',
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box sx={{ width: '100%', minWidth: 0, position: 'relative', zIndex: 3, textAlign: 'center' }}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        lineHeight: 1.25,
                        mb: 0.25,
                        textShadow: isActive
                          ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                          : '1px 1px 4px rgba(0, 0, 0, 0.35)',
                        color: corTextoItemMenuAtivo(isActive),
                      }}
                    >
                      {item.text}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        opacity: 0.92,
                        fontSize: '0.72rem',
                        lineHeight: 1.35,
                        fontWeight: 700,
                        textShadow: isActive
                          ? '0 1px 2px rgba(0, 0, 0, 0.35)'
                          : '1px 1px 3px rgba(0, 0, 0, 0.35)',
                        color: corTextoItemMenuAtivo(isActive),
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.description}
                    </Typography>
                    <AdminSectionViewCounts ehAdmin={ehAdmin} keys={chavesMetricaParaPathMenu(item.path)} />
                  </Box>
                  <ChevronRightIcon sx={{ position: 'absolute', right: 7, bottom: 8, zIndex: 3, fontSize: 22 }} />
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}
