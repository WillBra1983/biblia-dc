import { 
  Box,
  Badge,
  IconButton,
  AppBar,
  Toolbar,
  Typography
} from '@mui/material'
import MenuCards from './MenuCards'
import MenuIcon from '@mui/icons-material/Menu'
import ArrowBack from '@mui/icons-material/ArrowBack'
import { useState, useEffect, useLayoutEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import GlobalPinchZoom from './GlobalPinchZoom'
import { useZoomReset } from '../contexts/ZoomResetContext'
import { useApp } from '../contexts/AppContext'
// Antes: `import { discipuladoData } from '../data/discipulado'` puxava 220 kB
// para o caminho crítico só para resolver títulos de tela. Agora usamos o
// índice leve (≈ 1 kB) — o dataset completo é importado por dynamic chunks
// apenas em `/discipulado/*` (já lazy) e nos fluxos de export do chat.
import { discipuladoTitulos } from '../data/discipuladoTitulos'
import LeituraConfigButton from './LeituraConfigButton'
import SharePageButton from './SharePageButton'
import { sxFullViewportHeight, sxMainBelowAppBar } from '../utils/viewportHeight'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { loadFirebaseModules, isFirebaseConfigured } from '../config/firebase'
import {
  pathnameParaSectionKey,
  registarVisualizacaoSecaoSeNecessario,
} from '../utils/sectionViewKeys'
import { setAppIconBadgeCount } from '../utils/appIconBadge'
import { aguardarPosSplash } from '../utils/posSplash'

/**
 * Título da tela na AppBar e na aba do navegador.
 * A Bíblia está em `/` (e `/biblia` redireciona); há subtemas em `/discipulado/…`, etc.
 */
function getPageTitleFromPathname(pathname) {
  const raw = pathname || '/'
  const path = raw !== '/' && raw.endsWith('/') ? raw.slice(0, -1) : raw
  if (path === '/' || path === '/biblia') return 'Biblia DC'
  if (path.startsWith('/plano-leitura-biblia')) return 'Plano de Leitura Anual'
  if (path.startsWith('/plano')) return 'Plano de Leitura'

  const discSub = path.match(/^\/discipulado\/([^/]+)\/([^/]+)$/)
  if (discSub) {
    const temaId = parseInt(discSub[1], 10)
    const estudoIdRaw = discSub[2]
    const estudoIdNum = parseInt(estudoIdRaw, 10)
    const tema = Number.isFinite(temaId) ? discipuladoTitulos.find((t) => t.id === temaId) : null
    const est = tema?.estudos?.find(
      (e) => e.id === estudoIdNum || String(e.id) === estudoIdRaw
    )
    if (est?.titulo) return est.titulo
    if (tema?.titulo) return tema.titulo
  }
  const discIntro = path.match(/^\/discipulado\/([^/]+)$/)
  if (discIntro) {
    const temaId = parseInt(discIntro[1], 10)
    if (Number.isFinite(temaId)) {
      const tema = discipuladoTitulos.find((t) => t.id === temaId)
      if (tema?.titulo) return tema.titulo
    }
  }
  if (path.startsWith('/discipulado')) return 'Discipulado'
  if (path.startsWith('/hinario-editor')) return 'Editor do hinário'
  if (path.startsWith('/hinario')) return 'Hinário Novo Cântico'
  if (path.startsWith('/confissao')) return 'Confissão de Fé'
  if (path.startsWith('/catecismo-maior')) return 'Catecismo Maior'
  if (path.startsWith('/catecismo-breve')) return 'Catecismo Breve'
  if (path.startsWith('/devocional')) return 'Devocional'
  if (path.startsWith('/mais-de-deus')) return 'Mais de Deus'
  if (path.startsWith('/youtube')) return 'YouTube'
  if (path.startsWith('/quiz-retiro')) return 'Quiz Bíblico'
  if (path.startsWith('/biblioteca-estudos')) return 'Bíblia comentada'
  if (path === '/estudos-biblicos/gerir') return 'Gerenciar estudos'
  /** Comentários gerados/curados pertencem ao acervo da Bíblia comentada. */
  if (/^\/estudos-biblicos\/ia-(passagem|pericope)/.test(path)) return 'Bíblia comentada'
  if (path.startsWith('/estudos-biblicos')) return 'Estudos Compartilhados'
  if (path.startsWith('/chat')) return 'Mensagens'
  if (path.startsWith('/admin/usuarios')) return 'Usuários'
  if (path.startsWith('/admin/notificar')) return 'Enviar aviso'
  if (path.startsWith('/versiculos-marcados')) return 'Versículos marcados'
  if (path.startsWith('/biblia/apresentacao')) return 'Apresentação — Bíblia'
  if (path.startsWith('/hinario/apresentacao')) return 'Apresentação — Hinário'
  if (path.match(/^\/estudo-strong\/[^/]+\/ocorrencias$/)) return 'Ocorrências Strong'
  if (path.match(/^\/estudo-strong\/[^/]+\/resumo$/)) return 'Resumo lexical'
  if (path.startsWith('/estudo-strong')) return 'Dicionário Strong'
  if (path.startsWith('/configuracoes')) return 'Configurações'
  if (path.startsWith('/privacidade')) return 'Privacidade'
  if (path.startsWith('/sobre')) return 'Sobre'
  return 'Biblia DC'
}

export default function Layout({ title, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [appBarOculta, setAppBarOculta] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useFirebaseAuth()
  const { setBackButtonHandler } = useApp()
  const pathnameNorm =
    location.pathname !== '/' && location.pathname.endsWith('/')
      ? location.pathname.slice(0, -1)
      : location.pathname
  const isHinarioApresentacao = pathnameNorm.startsWith('/hinario/apresentacao')
  const isBibliaApresentacao = pathnameNorm.startsWith('/biblia/apresentacao')
  const apresentacaoTelaCheia = isHinarioApresentacao || isBibliaApresentacao
  const { version: zoomResetVersion } = useZoomReset()

  // Rotas onde os botões devem aparecer
  const mostrarBotoesBiblia = location.pathname === '/biblia' || location.pathname === '/';
  const ocultarTituloNaBiblia = mostrarBotoesBiblia

  const resolvedToolbarTitle = title || getPageTitleFromPathname(location.pathname)

  const fecharSelecaoVersiculosBiblia = () => {
    window.dispatchEvent(new Event('salvation-biblia-fechar-selecao-versiculos'))
  }

  const handleDrawerToggle = () => {
    setDrawerOpen((open) => {
      if (!open) fecharSelecaoVersiculosBiblia()
      return !open
    })
  }

  useEffect(() => {
    if (!drawerOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  useEffect(() => {
    if (!drawerOpen) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [drawerOpen])

  // Com o menu principal aberto, o botão/gesto voltar do sistema fecha o menu
  // (volta ao conteúdo) em vez de sair do app ou trocar de rota.
  useEffect(() => {
    if (!setBackButtonHandler) return
    if (drawerOpen) {
      setBackButtonHandler(() => setDrawerOpen(false))
    } else {
      setBackButtonHandler(null)
    }
    return () => setBackButtonHandler(null)
  }, [drawerOpen, setBackButtonHandler])

  /** Conteúdo do `main` começa por baixo do AppBar fixo (evita títulos escondidos). */
  const p = location.pathname
  const needsMainToolbarPadding =
    !apresentacaoTelaCheia &&
    (p === '/' ||
    p === '/biblia' ||
    p.startsWith('/discipulado') ||
    p.startsWith('/devocional') ||
    p.startsWith('/hinario') ||
    p.startsWith('/plano') ||
    p === '/confissao' ||
    p === '/catecismo-breve' ||
    p === '/catecismo-maior' ||
    p === '/youtube' ||
    p === '/quiz-retiro' ||
    p === '/chat' ||
    p === '/versiculos-marcados' ||
    p === '/mais-de-deus' ||
    p === '/hinario-editor' ||
    p.startsWith('/biblioteca-estudos') ||
    p.startsWith('/estudos-biblicos') ||
    p.startsWith('/estudo-strong') ||
    p.startsWith('/sobre') ||
    p.startsWith('/privacidade') ||
    p.startsWith('/admin/'))

  /** `/discipulado/:temaId/:estudoId` — conteúdo de um subtema (esconde drawer global e hamburger). */
  const isSubtemaDiscipulado = /^\/discipulado\/[^/]+\/[^/]+$/.test(location.pathname)
  /** `/discipulado/:temaId` — introdução do tema (não confundir com `/discipulado` sozinho). */
  const discipuladoIntroMatch = location.pathname.match(/^\/discipulado\/([^/]+)$/)
  const discipuladoIntroTemaId = discipuladoIntroMatch ? parseInt(discipuladoIntroMatch[1], 10) : NaN
  const discipuladoIntroTema =
    Number.isFinite(discipuladoIntroTemaId) ? discipuladoTitulos.find((t) => t.id === discipuladoIntroTemaId) : null
  const isIntroTemaDiscipulado = Boolean(discipuladoIntroMatch)
  const showDiscipuladoMenuNaIntro = Boolean(discipuladoIntroTema?.estudos?.length)
  const showDiscipuladoAppBarMenuSlot = isSubtemaDiscipulado || showDiscipuladoMenuNaIntro
  const showDiscipuladoAppBarBackSlot = isSubtemaDiscipulado || isIntroTemaDiscipulado
  const showPlanoLeituraBibliaBack = location.pathname.startsWith('/plano-leitura-biblia')
  const isStrongStudy = location.pathname.startsWith('/estudo-strong')
  const ocultarAcoesLeituraAppBar =
    pathnameNorm.startsWith('/estudos-biblicos') ||
    pathnameNorm.startsWith('/biblioteca-estudos') ||
    pathnameNorm.startsWith('/hinario-editor') ||
    pathnameNorm.startsWith('/youtube') ||
    pathnameNorm.startsWith('/quiz-retiro') ||
    pathnameNorm.startsWith('/configuracoes') ||
    pathnameNorm.startsWith('/admin/')

  // Sempre rola para o topo ao mudar de página
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  /** Métricas de secção (admin): uma vez por rota nesta entrada (sessionStorage). */
  useEffect(() => {
    if (!isFirebaseConfigured()) return
    if (!user?.uid) return
    const key = pathnameParaSectionKey(location.pathname)
    if (!key) return
    void registarVisualizacaoSecaoSeNecessario(key, user.uid)
  }, [location.pathname, user?.uid])

  useEffect(() => {
    if (!user?.uid) {
      setChatUnreadCount(0)
      return
    }

    let innerUnsub = () => {}
    let cancelled = false
    const cancelarEspera = aguardarPosSplash(() => {
      void (async () => {
        await loadFirebaseModules()
        if (cancelled) return
        const { subscribeUserChatList } = await import('../services/chatService')
        innerUnsub = subscribeUserChatList(user.uid, (rows) => {
          const total = (rows || []).reduce((acc, row) => {
            return acc + Math.max(0, Number(row?.unreadCount) || 0)
          }, 0)
          setChatUnreadCount(total)
        })
      })()
    })

    return () => {
      cancelled = true
      cancelarEspera()
      innerUnsub()
    }
  }, [user?.uid])

  useEffect(() => {
    void setAppIconBadgeCount(chatUnreadCount)
  }, [chatUnreadCount])

  useLayoutEffect(() => {
    const onToggleBibliaImersiva = (ev) => {
      const hide = Boolean(ev?.detail?.hide)
      setAppBarOculta(hide)
    }
    window.addEventListener('biblia-imersiva-toggle', onToggleBibliaImersiva)
    return () => window.removeEventListener('biblia-imersiva-toggle', onToggleBibliaImersiva)
  }, [])

  useEffect(() => {
    const onOpenMainMenu = () => {
      fecharSelecaoVersiculosBiblia()
      setDrawerOpen(true)
    }
    window.addEventListener('salvation-open-main-menu', onOpenMainMenu)
    return () => window.removeEventListener('salvation-open-main-menu', onOpenMainMenu)
  }, [])

  // Prefetch automático de rotas removido: abrimos apenas o que o utilizador
  // pedir no menu, reduzindo parse/compile de chunks na entrada da Bíblia.

  useEffect(() => {
    const isBiblia = location.pathname === '/' || location.pathname === '/biblia'
    if (!isBiblia && appBarOculta) setAppBarOculta(false)
  }, [location.pathname, appBarOculta])

  // Fecha o menu principal somente após a rota realmente mudar,
  // evitando "flash" da tela atual antes da navegação.
  useEffect(() => {
    if (drawerOpen) setDrawerOpen(false)
  }, [location.pathname])

  // Aba do navegador / PWA: nome da tela atual (evita aparecer sempre só "Biblia DC")
  useEffect(() => {
    const section = title || getPageTitleFromPathname(location.pathname)
    const isHome = location.pathname === '/' || location.pathname === '/biblia'
    document.title = isHome ? 'Bíblia DC' : `${section} · Bíblia DC`
  }, [location.pathname, title])

  const drawerWidth = { xs: '100%', sm: 400, md: 420 }

  const menuPrincipal = (
    <MenuCards
      unreadChatCount={chatUnreadCount}
      menuOpen={drawerOpen}
      onItemClick={() => setDrawerOpen(false)}
    />
  )

  const appBarEscondidaVisual = appBarOculta && !apresentacaoTelaCheia
  /** Bíblia: conteúdo sob o AppBar fixo — modo imersivo revela linhas sem faixa vazia no `main`. */
  const bibliaToolbarOverlay = mostrarBotoesBiblia && !apresentacaoTelaCheia

  return (
    <Box sx={{ display: 'flex', ...sxFullViewportHeight() }}>
      <AppBar 
        position="fixed" 
        color="inherit"
        elevation={0}
        sx={{
          display: apresentacaoTelaCheia ? 'none' : 'flex',
          zIndex: (theme) => theme.zIndex.appBar,
          transform: appBarEscondidaVisual
            ? 'translate3d(0, calc(-100% - env(safe-area-inset-top, 0px)), 0)'
            : 'translate3d(0, 0, 0)',
          pointerEvents: appBarEscondidaVisual ? 'none' : 'auto',
          transition: bibliaToolbarOverlay ? 'none' : 'transform 180ms ease',
          willChange: bibliaToolbarOverlay ? 'auto' : 'transform',
          /**
           * Na Bíblia (`/` e `/biblia`) o AppBar não seguia bem o tema claro:
           * os controles portados (Livro, Cap., Strong…) foram desenhados
           * para fundo escuro. Mantemos **sempre** o mesmo “casco” escuro
           * nessas rotas, independente de claro/escuro — alinhado ao modo
           * noturno. Nas demais rotas, mantém-se o contraste anterior.
           */
          bgcolor: (theme) =>
            mostrarBotoesBiblia || theme.palette.mode === 'dark'
              ? 'grey.900'
              : 'grey.700',
          color: 'grey.100',
          borderBottom: 1,
          borderColor: (theme) =>
            mostrarBotoesBiblia || theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.12)'
              : theme.palette.divider,
          pt: 'env(safe-area-inset-top, 0px)'
        }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: { xs: 1.25, sm: 2 }
          }}
        >
          {/* Esquerda: Menu */}
          <Box sx={{ minWidth: 56, display: 'flex', alignItems: 'center', pl: 0.25 }}>
            {showPlanoLeituraBibliaBack ? (
              <IconButton
                color="inherit"
                aria-label="Voltar para a Bíblia"
                edge="start"
                onClick={() => navigate('/biblia')}
                sx={{ ml: 0.5 }}
              >
                <ArrowBack />
              </IconButton>
            ) : showDiscipuladoAppBarBackSlot ? (
              <Box
                id="discipulado-appbar-back"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  minWidth: 48,
                  pl: 0.5,
                  pr: 0.5
                }}
              />
            ) : (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{
                  ml: 0.5,
                  border: '2px solid',
                  borderRadius: '2px',
                  padding: '0.5px',
                  '& .MuiSvgIcon-root': {
                    fontSize: '2.5rem'
                  }
                }}
              >
                <Badge
                  color="error"
                  overlap="circular"
                  badgeContent={chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  invisible={chatUnreadCount <= 0}
                >
                  <MenuIcon />
                </Badge>
              </IconButton>
            )}
          </Box>

          {/* Centro: Título.
              Na rota da Bíblia, o título é omitido — usamos esse espaço como
              slot (`biblia-appbar-toolbar-left`) para receber os controles
              primários da leitura (Livro, Capítulo, Pesquisa, Strong) via
              portal, eliminando a antiga linha secundária abaixo do AppBar. */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              justifyContent: ocultarTituloNaBiblia ? 'flex-start' : 'center',
              alignItems: 'center',
              gap: ocultarTituloNaBiblia ? 0 : 0.5,
              pointerEvents: ocultarTituloNaBiblia ? 'auto' : 'none',
              minWidth: 0,
              px: 0.5,
              overflow: 'hidden'
            }}
          >
            {ocultarTituloNaBiblia && (
              <Box
                id="biblia-appbar-toolbar-left"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 0.4, sm: 0.6 },
                  flex: '1 1 auto',
                  minWidth: 0,
                  pr: { xs: 0.4, sm: 0.6 },
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                  '&:empty': { display: 'none' }
                }}
              />
            )}
            {!ocultarTituloNaBiblia && (
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  pointerEvents: 'auto',
                  minWidth: 0
                }}
              >
                {resolvedToolbarTitle}
              </Typography>
            )}
          </Box>

          {/* Direita: configuração de leitura (global) + ações da rota */}
          {location.pathname === '/chat' ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 0.5,
                minWidth: 'fit-content',
                pr: { xs: 0.75, sm: 1 },
              }}
            >
              <Box
                id="chat-appbar-actions"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 0.25,
                }}
              />
            </Box>
          ) : showDiscipuladoAppBarMenuSlot ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 0.5,
                minWidth: 'fit-content',
                pl: 0.5,
                pr: { xs: 0.75, sm: 1 },
              }}
            >
              <LeituraConfigButton />
              <SharePageButton />
              <Box
                id="discipulado-appbar-menu"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 0.25,
                  minWidth: 48,
                }}
              />
            </Box>
          ) : mostrarBotoesBiblia ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                position: 'relative',
                gap: 0.5,
                pr: { xs: 0.5, sm: 0.75 },
                flexShrink: 0,
              }}
            >
              {/* `LeituraConfigButton` e `SharePageButton` ficam ocultos
                  (`hidden`) porém montados — assim seus diálogos/handlers
                  continuam respondendo aos eventos globais disparados pelo
                  `AppBarMaisMenu` (que vive agora dentro da faixa de
                  controles `biblia-appbar-toolbar-left`). */}
              <LeituraConfigButton hidden />
              <SharePageButton hidden />
              {/* Slot opcional para ações no canto direito. Fica em
                  `display: contents` quando vazio para não reservar largura. */}
              <Box
                id="biblia-appbar-actions"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.4,
                  '&:empty': { display: 'none' },
                }}
              />
            </Box>
          ) : ocultarAcoesLeituraAppBar ? (
            <Box
              aria-hidden
              sx={{
                minWidth: 56,
                flexShrink: 0,
                pr: { xs: 0.75, sm: 1 }
              }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: 'fit-content', pr: { xs: 0.75, sm: 1 }, gap: 0.5 }}>
              {!showPlanoLeituraBibliaBack ? <LeituraConfigButton /> : null}
              <SharePageButton />
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {!isSubtemaDiscipulado && (
        <>
          <Box
            aria-hidden={!drawerOpen}
            onClick={handleDrawerToggle}
            sx={{
              position: 'fixed',
              inset: 0,
              zIndex: 1199,
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              opacity: drawerOpen ? 1 : 0,
              pointerEvents: drawerOpen ? 'auto' : 'none',
              transition: 'opacity 0.2s ease',
            }}
          />
          {/*
            Painel sempre montado e pré-pintado fora da tela (`translateX(-100%)`).
            O Drawer temporário do MUI escondia o conteúdo com `visibility: hidden`,
            o que forçava repintura pesada na abertura — o usuário via só o fundo
            verde antes dos cards do menu aparecerem.
          */}
          <Box
            component="nav"
            aria-label="Menu principal"
            aria-hidden={!drawerOpen}
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              height: '100%',
              width: drawerWidth,
              maxWidth: '100vw',
              zIndex: 1200,
              overflow: 'auto',
              WebkitOverflowScrolling: 'touch',
              bgcolor: '#004d40',
              boxShadow: drawerOpen ? 8 : 0,
              transform: drawerOpen ? 'translate3d(0, 0, 0)' : 'translate3d(-100%, 0, 0)',
              transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: drawerOpen ? 'auto' : 'none',
              willChange: 'transform',
              pt: 'env(safe-area-inset-top, 0px)',
              pb: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {menuPrincipal}
          </Box>
        </>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: 0,
          minWidth: 0,
          pt: needsMainToolbarPadding
            ? bibliaToolbarOverlay
              ? 0
              : sxMainBelowAppBar()
            : 0,
          pb: 'env(safe-area-inset-bottom, 0px)', // evita que a barra de gestos/botões do celular corte o conteúdo
          // `100vh` em mobile inclui a área coberta pela barra do navegador,
          // o que esconde o rodapé das páginas. `100dvh` mede a viewport
          // realmente visível e atualiza ao recolher/expandir a chrome.
          ...sxFullViewportHeight({ maxHeight: false }),
          overflow: isStrongStudy
            ? 'auto'
            : (location.pathname === '/biblia' ||
                location.pathname === '/' ||
                location.pathname.startsWith('/hinario') ||
                location.pathname.startsWith('/biblia/apresentacao') ||
                location.pathname === '/chat')
              ? 'hidden'
              : 'auto',
          overflowX: 'hidden',
          overflowY: isStrongStudy ? 'auto' : undefined,
          WebkitOverflowScrolling: isStrongStudy ? 'touch' : undefined,
          touchAction: isStrongStudy ? 'pan-y' : undefined,
          bgcolor: 'background.default',
          /** Herança a partir do body (CssBaseline do tema "externo") podia deixar texto escuro sobre fundo escuro no modo noturno. */
          color: 'text.primary',
          px: 0,
          display: isStrongStudy ? 'block' : 'flex',
          flexDirection: location.pathname.startsWith('/hinario') ? 'column' : 'row',
          flexWrap: location.pathname.startsWith('/hinario') ? 'nowrap' : 'wrap',
          alignItems: location.pathname.startsWith('/hinario') ? 'stretch' : undefined
        }}
      >
        <GlobalPinchZoom
          pathname={location.pathname}
          zoomResetVersion={zoomResetVersion}
          disabled={
            location.pathname === '/chat' ||
            location.pathname === '/' ||
            location.pathname === '/biblia' ||
            location.pathname.startsWith('/discipulado') ||
            location.pathname.startsWith('/estudo-strong') ||
            location.pathname.startsWith('/estudos-biblicos')
          }
        >
          {children}
        </GlobalPinchZoom>
      </Box>
    </Box>
  )
} 
