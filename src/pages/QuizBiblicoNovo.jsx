import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useBlocker, useLocation, useNavigate } from 'react-router-dom'
import { Box, Button, CircularProgress, Typography } from '@mui/material'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { useApp } from '../contexts/AppContext'
import { confirmarAsync } from '../utils/uiDialogs'
import { criarQuizIntegradoBridge } from '../services/quizIntegradoBridge'

export default function QuizBiblicoNovo() {
  const { user } = useFirebaseAuth()
  const { setBackButtonHandler } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const userRef = useRef(user)
  userRef.current = user
  const frame = useRef(null)
  const bridgeRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [height, setHeight] = useState(640)
  const game = () => frame.current?.contentWindow?.__quizApp
  const blocker = useBlocker(() => Boolean(game()?.estaNoQuiz()))

  useLayoutEffect(() => {
    const bridge = criarQuizIntegradoBridge({ getUser: () => userRef.current, openProfile: () => navigate('/perfil') })
    bridgeRef.current = bridge
    window.__bibliaQuizIntegrado = bridge
    setReady(true)
    return () => {
      // Persistir antes de desmontar; o flush captura o estado imediatamente.
      const win = frame.current?.contentWindow
      if (win?.__quizApp?.estaNoQuiz()) win.__quizApp.persistir()
      void win?.QuizFirebaseCloudSync?.flushImmediate()
      win?.QuizFirebaseCloudSync?.stop()
      bridge.dispose()
      if (window.__bibliaQuizIntegrado === bridge) delete window.__bibliaQuizIntegrado
    }
  }, [navigate, user?.uid])

  useEffect(() => { bridgeRef.current?.notifyAuth() }, [user])
  useEffect(() => {
    const resize = () => {
      const top = frame.current?.getBoundingClientRect().top || 0
      setHeight(Math.max(220, (window.visualViewport?.height || window.innerHeight) - top - 8))
    }
    resize()
    const observer = new ResizeObserver(resize)
    if (frame.current?.parentElement) observer.observe(frame.current.parentElement)
    window.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('resize', resize)
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('resize', resize) }
  }, [ready, loaded])

  useEffect(() => {
    setBackButtonHandler(() => () => {
      const app = game()
      if (app?.estaNoQuiz()) app.pedirConfirmacaoSaida('start')
      else if (app && !app.screens.start.classList.contains('active')) app.showScreen('start')
      else navigate('/menu')
    })
    return () => setBackButtonHandler(null)
  }, [navigate, setBackButtonHandler])

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    let active = true
    void confirmarAsync({ titulo: 'Sair do Quiz?', mensagem: 'Sua partida será salva para continuar depois.', labelOk: 'Salvar e sair', labelCancelar: 'Continuar jogando' }).then(async ok => {
      if (!active) return
      if (!ok) { blocker.reset(); return }
      game()?.persistir()
      await frame.current?.contentWindow?.QuizFirebaseCloudSync?.flushImmediate()
      if (active) blocker.proceed()
    })
    return () => { active = false }
  }, [blocker])

  return <Box sx={{ width: '100%', minWidth: 0 }}>
    {!loaded && <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={24} /><Typography>Abrindo o Quiz…</Typography></Box>}
    {ready && <iframe ref={frame} key={user?.uid || 'visitante'} title="Quiz Bíblico" src={`${import.meta.env.BASE_URL}quiz-biblico/index.html${location.search}`} onLoad={() => setLoaded(true)} style={{ width: '100%', height, border: 0, display: 'block', borderRadius: 8 }} />}
    <Button onClick={() => navigate('/menu')} size="small">Voltar ao menu</Button>
  </Box>
}
