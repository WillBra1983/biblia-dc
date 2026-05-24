import {
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  createBrowserRouter,
  createHashRouter,
  createRoutesFromElements,
} from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import getTheme from './theme/theme'
import { AppProvider, useApp } from './contexts/AppContext'
import { LeituraApresentacaoProvider } from './contexts/LeituraApresentacaoContext'
import Layout from './components/Layout'
import Biblia from './pages/Biblia'
import ScrollToTop from './components/ScrollToTop'
import SplashScreen from './components/SplashScreen'
import NativeDeepLinkHandler from './components/NativeDeepLinkHandler'
import IncentivosListener from './components/IncentivosListener'
import AppDialogsHost from './components/AppDialogsHost'
import RecoverFromDeployError from './components/RecoverFromDeployError'
import { FirebaseAuthProvider } from './contexts/FirebaseAuthContext'
import PushNotificationsBootstrap from './components/PushNotificationsBootstrap'
import RequireAuth from './components/RequireAuth'
import ApresentacaoSomenteDesktop from './components/ApresentacaoSomenteDesktop'
import { aguardarPosSplash, jaPassouDoSplash, marcarSplashFechado, splashUiJaConcluiu } from './utils/posSplash'
import { lazy, Suspense, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

// Code-splitting: rotas secundárias sob demanda (a Bíblia, rota índice, fica estática
// para abrir imediatamente após o splash; as outras carregam só quando o usuário navega).
const StrongEstudo = lazy(() => import('./pages/StrongEstudo'))
const StrongEstudoResumo = lazy(() => import('./pages/StrongEstudoResumo'))
const Discipulado = lazy(() => import('./pages/Discipulado'))
const Hinario = lazy(() => import('./pages/Hinario'))
const HinarioApresentacao = lazy(() => import('./pages/HinarioApresentacao'))
const BibliaApresentacao = lazy(() => import('./pages/BibliaApresentacao'))
const Confissao = lazy(() => import('./pages/Confissao'))
const CatecismoMaior = lazy(() => import('./pages/CatecismoMaior'))
const CatecismoBreve = lazy(() => import('./pages/CatecismoBreve'))
const Devocional = lazy(() => import('./pages/Devocional'))
const PlanoLeitura = lazy(() => import('./pages/PlanoLeitura'))
const HinarioEditor = lazy(() => import('./pages/HinarioEditor'))
const PlanoLeituraBiblia = lazy(() => import('./pages/PlanoLeituraBiblia'))
const MaisDeDeus = lazy(() => import('./pages/MaisDeDeus'))
const YouTube = lazy(() => import('./pages/YouTube'))
const VersiculosMarcados = lazy(() => import('./pages/VersiculosMarcados'))
const QuizRetiro = lazy(() => import('./pages/QuizRetiro'))
const EstudosBiblicosHub = lazy(() => import('./pages/EstudosBiblicosHub'))
const EstudoBiblicoEditor = lazy(() => import('./pages/EstudoBiblicoEditor'))
const EstudoBiblicoIaPassagem = lazy(() => import('./pages/EstudoBiblicoIaPassagem'))
const EstudoBiblicoIaPericope = lazy(() => import('./pages/EstudoBiblicoIaPericope'))
const BibliotecaEstudos = lazy(() => import('./pages/BibliotecaEstudos'))
const EstudoBiblicoVer = lazy(() => import('./pages/EstudoBiblicoVer'))
const EstudosBiblicosGerir = lazy(() => import('./pages/EstudosBiblicosGerir'))
const Sobre = lazy(() => import('./pages/Sobre'))
const Privacidade = lazy(() => import('./pages/Privacidade'))
const Chat = lazy(() => import('./pages/Chat'))
const ConfiguracoesNotificacoes = lazy(() => import('./pages/ConfiguracoesNotificacoes'))
const AdminNotificar = lazy(() => import('./pages/AdminNotificar'))
const AdminUsuarios = lazy(() => import('./pages/AdminUsuarios'))
const EstudoBiblicoProvaResultado = lazy(() => import('./pages/EstudoBiblicoProvaResultado'))

/** Sincronização RTDB: chunk separado + só monta após o splash (não compete com Bíblia). */
const UserCloudSync = lazy(() => import('./components/UserCloudSync'))

function DeferredUserCloudSync() {
  const [show, setShow] = useState(false)
  useEffect(() => aguardarPosSplash(() => setShow(true)), [])
  if (!show) return null
  return (
    <Suspense fallback={null}>
      <UserCloudSync />
    </Suspense>
  )
}

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}

/** Deve ficar abaixo de `RouterProvider` para `useLocation`/`useNavigate` em `AppProvider`. */
function AppProvidersShell() {
  return (
    <AppProvider>
      <LeituraApresentacaoProvider>
        <FirebaseAuthProvider>
          <DeferredUserCloudSync />
          <Outlet />
        </FirebaseAuthProvider>
      </LeituraApresentacaoProvider>
    </AppProvider>
  )
}

function AppShell() {
  const { isDarkMode } = useApp()
  const theme = getTheme(isDarkMode ? 'dark' : 'light')
  const [splashComplete, setSplashComplete] = useState(() => splashUiJaConcluiu())

  useEffect(() => {
    if (!splashUiJaConcluiu()) return
    setSplashComplete(true)
    if (!jaPassouDoSplash()) marcarSplashFechado()
  }, [])

  // Push notifications via FCM (chat, novidades, lembretes diários) são
  // ativados pelo PushNotificationsBootstrap montado abaixo. Ele só
  // pede permissão automaticamente no app nativo; na web, o gesto vem
  // da tela de Configurações de notificação.

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {/* IMPORTANTE: montamos o `Layout` (e a `Biblia` via `Outlet`) já abaixo do splash.
       *  O splash continua como overlay (`zIndex: 99999`), mas a `Biblia` começa a
       *  rodar `init()`/carregar capítulo em paralelo. Quando ela dispara
       *  `biblia-pronta`, o splash fecha e o conteúdo já está pronto — eliminando
       *  o "tempo morto" entre a tela verde e o aparecimento do texto bíblico,
       *  que era mais perceptível em contas com mais conteúdo. */}
      <Layout>
        <IncentivosListener />
        <NativeDeepLinkHandler />
        <PushNotificationsBootstrap />
        <ScrollToTop />
        <RequireAuth>
          <Suspense
            fallback={
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 240,
                  py: 4
                }}
              >
                <CircularProgress />
              </Box>
            }
          >
            <Outlet />
          </Suspense>
        </RequireAuth>
      </Layout>
      <AppDialogsHost />
      {!splashComplete && (
        <SplashScreen onComplete={() => setSplashComplete(true)} />
      )}
    </ThemeProvider>
  )
}

const appRouteTree = createRoutesFromElements(
  <Route element={<AppProvidersShell />} errorElement={<RecoverFromDeployError />}>
    <Route path="/" element={<AppShell />}>
      <Route index element={<Biblia />} />
    <Route path="estudo-strong/:code/resumo" element={<StrongEstudoResumo />} />
    <Route path="estudo-strong/:code" element={<StrongEstudo />} />
    <Route
      path="biblia/apresentacao"
      element={
        <ApresentacaoSomenteDesktop voltarPara="/">
          <BibliaApresentacao />
        </ApresentacaoSomenteDesktop>
      }
    />
    <Route path="biblia" element={<Navigate to="/" replace />} />
    <Route path="plano-leitura" element={<Navigate to="/plano" replace />} />
    <Route path="plano" element={<PlanoLeitura />} />
    <Route path="plano-leitura-biblia" element={<PlanoLeituraBiblia />} />
    <Route path="discipulado" element={<Discipulado />} />
    <Route path="discipulado/:temaId" element={<Discipulado />} />
    <Route path="discipulado/:temaId/:estudoId" element={<Discipulado />} />
    <Route path="hinario/letra" element={<Hinario />} />
    <Route path="hinario/cifras" element={<Hinario />} />
    <Route
      path="hinario/apresentacao"
      element={
        <ApresentacaoSomenteDesktop voltarPara="/hinario/letra">
          <HinarioApresentacao />
        </ApresentacaoSomenteDesktop>
      }
    />
    <Route path="hinario" element={<Navigate to="/hinario/letra" replace />} />
    <Route path="confissao" element={<Confissao />} />
    <Route path="catecismo-maior" element={<CatecismoMaior />} />
    <Route path="catecismo-breve" element={<CatecismoBreve />} />
    <Route path="devocional" element={<Devocional />} />
    <Route path="devocional/:id" element={<Devocional />} />
    <Route path="hinario-editor" element={<HinarioEditor />} />
    <Route path="mais-de-deus" element={<MaisDeDeus />} />
    <Route path="youtube" element={<YouTube />} />
    <Route path="versiculos-marcados" element={<VersiculosMarcados />} />
    <Route path="quiz-retiro" element={<QuizRetiro />} />
    <Route path="estudos-biblicos/novo" element={<EstudoBiblicoEditor />} />
    <Route path="estudos-biblicos/ia-passagem" element={<EstudoBiblicoIaPassagem />} />
    <Route path="estudos-biblicos/ia-pericope" element={<EstudoBiblicoIaPericope />} />
    <Route path="biblioteca-estudos" element={<BibliotecaEstudos />} />
    <Route path="estudos-biblicos/abrir" element={<EstudoBiblicoVer />} />
    {/* Rota canónica nova (alinhada ao termo "avaliação" usado na UI). */}
    <Route path="estudos-biblicos/avaliacao-resultado" element={<EstudoBiblicoProvaResultado />} />
    {/* Rota antiga: mantida para não quebrar links já partilhados no chat. */}
    <Route path="estudos-biblicos/prova-resultado" element={<EstudoBiblicoProvaResultado />} />
    <Route path="estudos-biblicos/gerir" element={<EstudosBiblicosGerir />} />
    <Route path="estudos-biblicos/:studyId/edit" element={<EstudoBiblicoEditor />} />
    <Route path="estudos-biblicos/:studyId" element={<EstudoBiblicoVer />} />
    <Route path="estudos-biblicos" element={<EstudosBiblicosHub />} />
    <Route path="chat" element={<Chat />} />
    <Route path="configuracoes/notificacoes" element={<ConfiguracoesNotificacoes />} />
    <Route path="admin/usuarios" element={<AdminUsuarios />} />
    <Route path="admin/notificar" element={<AdminNotificar />} />
    <Route path="sobre" element={<Sobre />} />
    <Route path="privacidade" element={<Privacidade />} />
    </Route>
  </Route>
)

/**
 * Data router exigido por `useBlocker` (ex.: QuizRetiro). Web: BrowserRouter;
 * APK nativo: HashRouter — mesmo critério que em main.jsx.
 */
export function createAppRouter(basename, useHashRouter) {
  const opts = {
    future: routerFuture,
    ...(basename ? { basename } : {}),
  }
  return useHashRouter
    ? createHashRouter(appRouteTree, opts)
    : createBrowserRouter(appRouteTree, opts)
}

export default function App({ router }) {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />
} 