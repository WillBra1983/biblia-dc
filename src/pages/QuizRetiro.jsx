import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import EmojiEvents from '@mui/icons-material/EmojiEvents'
import ShareIcon from '@mui/icons-material/Share'
import { useBlocker, useNavigate } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { useApp } from '../contexts/AppContext'
import { buildQuizExport } from '../utils/appExportPayload'
import { ensureUserForChatExport, pushPendingChatExport } from '../utils/chatExportSend'
import { avisarAsync } from '../utils/uiDialogs'
import { QUIZ_FASE1_QUESTIONS } from '../data/quizRetiroQuestionsFase1'
import { QUIZ_FASE2_QUESTIONS } from '../data/quizRetiroQuestionsFase2'
import { QUIZ_FASE3_QUESTIONS } from '../data/quizRetiroQuestionsFase3'
import {
  carregarProgressoQuizRetiro,
  limparProgressoQuizRetiro,
  contarPerguntasRespondidas,
  quizPerguntasFromOrdem,
  salvarProgressoQuizRetiro
} from '../utils/quizRetiroProgressStorage'
import {
  notificarProgressoQuizLocal,
  saveQuizRodadasCloud,
  limparProgressoQuizCompleto,
  scheduleQuizProgressFlush,
  flushQuizProgressImmediate
} from '../services/quizRetiroCloudSync'
import { playQuizAcerto, playQuizErro } from '../utils/feedbackSounds'
import { processarMedalhasAposQuizResultado } from '../utils/medalhasGamificacao'
import QuizRankingBiblico from '../components/QuizRankingBiblico'
import { sincronizarMeuRankingQuiz } from '../services/quizBiblicoRankingService'

const STORAGE_UNLOCK = 'quizRetiro_phase2Unlocked'
const STORAGE_BEST = 'quizRetiro_fase1_best'
const STORAGE_PHASE3_UNLOCK = 'quizRetiro_phase3Unlocked'

/** Máximo de pontos na Fase 1 se acertar todas em sequência: 1+2+…+n = n(n+1)/2 */
function pontosMaximosFase1() {
  const n = QUIZ_FASE1_QUESTIONS.length
  return (n * (n + 1)) / 2
}

/** Próxima fase: pelo menos 85% dos pontos máximos possíveis na Fase 1 */
function minPontosParaDesbloquearFase2() {
  return Math.ceil(pontosMaximosFase1() * 0.85)
}

function criterioDesbloqueio(pontos) {
  return pontos >= minPontosParaDesbloquearFase2()
}

function lerMelhorFase1() {
  try {
    const j = JSON.parse(localStorage.getItem(STORAGE_BEST) || '{}')
    return { correct: Number(j.correct) || 0, points: Number(j.points) || 0 }
  } catch {
    return { correct: 0, points: 0 }
  }
}

function fase2Desbloqueada() {
  try {
    if (localStorage.getItem(STORAGE_UNLOCK) === '1') return true
    const b = lerMelhorFase1()
    return criterioDesbloqueio(b.points)
  } catch {
    return false
  }
}

function fase3Desbloqueada() {
  try {
    return localStorage.getItem(STORAGE_PHASE3_UNLOCK) === '1'
  } catch {
    return false
  }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function tituloFaseLabel(n) {
  if (n === 2) return 'Fase 2'
  if (n === 3) return 'Fase 3'
  return 'Fase 1'
}

export default function QuizRetiro() {
  const navigate = useNavigate()
  const { user } = useFirebaseAuth()
  const { setBackButtonHandler } = useApp()
  const [ecra, setEcra] = useState('inicio')
  const [rankingTick, setRankingTick] = useState(0)
  const [fase, setFase] = useState(1)
  const [perguntas, setPerguntas] = useState([])
  const [atual, setAtual] = useState(0)
  const [escolha, setEscolha] = useState(null)
  const [mostrarFeedback, setMostrarFeedback] = useState(false)
  const [acertouUltima, setAcertouUltima] = useState(false)
  const [pontosRodada, setPontosRodada] = useState(0)
  const [sequencia, setSequencia] = useState(0)
  const [totalPontos, setTotalPontos] = useState(0)
  const [respostas, setRespostas] = useState([])
  const [nomeJogador, setNomeJogador] = useState('')
  const [unlockRefresh, setUnlockRefresh] = useState(0)
  const [dialogParabensNivel, setDialogParabensNivel] = useState(false)
  const [dialogFase3EmBreve, setDialogFase3EmBreve] = useState(false)
  const [dialogSair, setDialogSair] = useState(false)
  /** Força releitura do banner de partida salva no menu */
  const [bannerTick, setBannerTick] = useState(0)

  const pendingLeaveRef = useRef(null)
  const parabensFase1Ref = useRef(false)

  const blocker = useBlocker(ecra === 'quiz')

  const desbloqueio2 = useMemo(() => {
    void unlockRefresh
    return fase2Desbloqueada()
  }, [ecra, unlockRefresh])

  const desbloqueio3 = useMemo(() => {
    void unlockRefresh
    return fase3Desbloqueada()
  }, [ecra, unlockRefresh])

  const total = perguntas.length

  const snapshotSalvoMenu = useMemo(() => {
    void bannerTick
    return ecra === 'inicio' ? carregarProgressoQuizRetiro() : null
  }, [ecra, bannerTick])

  const persistirEstadoQuiz = useCallback(() => {
    if (ecra !== 'quiz' || !perguntas.length) return
    salvarProgressoQuizRetiro({
      fase,
      ordem: perguntas.map((q) => q.number),
      atual,
      escolha,
      mostrarFeedback,
      sequencia,
      totalPontos,
      respostas: perguntas.map((_, i) => {
        const r = respostas[i]
        if (r === true) return true
        if (r === false) return false
        return null
      }),
      pontosRodada,
      acertouUltima
    })
    notificarProgressoQuizLocal()
  }, [
    ecra,
    fase,
    perguntas,
    atual,
    escolha,
    mostrarFeedback,
    sequencia,
    totalPontos,
    respostas,
    pontosRodada,
    acertouUltima
  ])

  useEffect(() => {
    if (ecra !== 'quiz' || !perguntas.length) return undefined
    const t = setTimeout(() => {
      persistirEstadoQuiz()
      if (user?.uid) scheduleQuizProgressFlush()
    }, 450)
    return () => clearTimeout(t)
  }, [ecra, perguntas, persistirEstadoQuiz, user?.uid])

  useEffect(() => {
    if (ecra === 'resultado') {
      void limparProgressoQuizCompleto(user?.uid || null)
    }
  }, [ecra, user?.uid])

  useEffect(() => {
    const onProg = () => setBannerTick((x) => x + 1)
    window.addEventListener('salvation-quiz-retiro-progresso', onProg)
    return () => window.removeEventListener('salvation-quiz-retiro-progresso', onProg)
  }, [])

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    pendingLeaveRef.current = 'router'
    setDialogSair(true)
  }, [blocker.state])

  useEffect(() => {
    if (ecra !== 'quiz') {
      setBackButtonHandler(null)
      return undefined
    }
    setBackButtonHandler(() => () => {
      pendingLeaveRef.current = 'back'
      setDialogSair(true)
    })
    return () => setBackButtonHandler(null)
  }, [ecra, setBackButtonHandler])

  const cancelarSaidaQuiz = useCallback(() => {
    if (pendingLeaveRef.current === 'router' && blocker.state === 'blocked') {
      blocker.reset()
    }
    pendingLeaveRef.current = null
    setDialogSair(false)
  }, [blocker])

  const confirmarSaidaQuiz = useCallback(() => {
    persistirEstadoQuiz()
    if (user?.uid) void flushQuizProgressImmediate(user.uid)
    const modo = pendingLeaveRef.current
    pendingLeaveRef.current = null
    setDialogSair(false)
    if (modo === 'router' && blocker.state === 'blocked') {
      blocker.proceed()
    } else if (modo === 'back') {
      navigate(-1)
    }
  }, [persistirEstadoQuiz, blocker, navigate, user?.uid])

  const continuarPartidaSalva = () => {
    const s = carregarProgressoQuizRetiro()
    if (!s) return
    const perg = quizPerguntasFromOrdem(s.fase, s.ordem)
    if (perg.length === 0) {
      void limparProgressoQuizCompleto(user?.uid || null)
      setBannerTick((x) => x + 1)
      return
    }
    const pq = perg[s.atual]
    const nOpt = pq?.options?.length ?? 0
    let esc = s.escolha
    if (esc !== null && esc !== undefined && (esc < 0 || esc >= nOpt)) esc = null

    setFase(s.fase)
    setPerguntas(perg)
    setAtual(s.atual)
    setEscolha(esc === null || esc === undefined ? null : esc)
    setMostrarFeedback(s.mostrarFeedback)
    setSequencia(s.sequencia)
    setTotalPontos(s.totalPontos)
    setRespostas(s.respostas && s.respostas.length ? [...s.respostas] : [])
    setPontosRodada(s.pontosRodada)
    setAcertouUltima(s.acertouUltima)
    setEcra('quiz')
  }

  const descartarPartidaSalva = () => {
    void limparProgressoQuizCompleto(user?.uid || null)
    setBannerTick((x) => x + 1)
  }

  const iniciar = useCallback((numFase) => {
    if (numFase === 2 && !fase2Desbloqueada()) return
    if (numFase === 3) {
      if (!fase3Desbloqueada()) return
      if (QUIZ_FASE3_QUESTIONS.length === 0) {
        setDialogFase3EmBreve(true)
        return
      }
    }
    const pool =
      numFase === 1
        ? QUIZ_FASE1_QUESTIONS
        : numFase === 2
          ? QUIZ_FASE2_QUESTIONS
          : QUIZ_FASE3_QUESTIONS
    if (!pool.length) return
    void limparProgressoQuizCompleto(user?.uid || null)
    setBannerTick((x) => x + 1)
    if (numFase === 1) parabensFase1Ref.current = false
    setPerguntas(shuffle(pool))
    setFase(numFase)
    setAtual(0)
    setEscolha(null)
    setMostrarFeedback(false)
    setSequencia(0)
    setTotalPontos(0)
    setRespostas([])
    setEcra('quiz')
  }, [user?.uid])

  const perguntaAtual = perguntas[atual]

  useEffect(() => {
    if (ecra !== 'resultado' || fase !== 1) return
    const nAcertos = respostas.reduce((n, r, i) => (i < total && r === true ? n + 1 : n), 0)
    const best = lerMelhorFase1()
    const novoBest = {
      correct: Math.max(best.correct, nAcertos),
      points: Math.max(best.points, totalPontos),
    }
    localStorage.setItem(STORAGE_BEST, JSON.stringify(novoBest))
    if (criterioDesbloqueio(totalPontos) || criterioDesbloqueio(novoBest.points)) {
      localStorage.setItem(STORAGE_UNLOCK, '1')
    }
    setUnlockRefresh((x) => x + 1)
    setRankingTick((t) => t + 1)
  }, [ecra, fase, respostas, totalPontos, total])

  useEffect(() => {
    if (ecra !== 'resultado' || !user?.uid) return
    const nAcertos = respostas.reduce((n, r, i) => (i < total && r === true ? n + 1 : n), 0)
    const nRespondidas = contarPerguntasRespondidas(respostas) || total
    const rodada = {
      pontos: totalPontos,
      acertos: nAcertos,
      perguntasRespondidas: nRespondidas,
      totalPerguntas: total,
      fase,
    }
    const authUser = {
      email: user.email || '',
      photoURL: user.photoURL || '',
      displayName: user.displayName || '',
    }
    void saveQuizRodadasCloud(user.uid, rodada)
      .then(() => sincronizarMeuRankingQuiz(user.uid, { authUser, rodada }))
      .then(() => setRankingTick((t) => t + 1))
  }, [ecra, user?.uid, user?.email, user?.photoURL, user?.displayName, totalPontos, total, respostas, fase])

  useEffect(() => {
    if (ecra !== 'resultado' || fase !== 2) return
    const nAcertos = respostas.reduce((n, r, i) => (i < total && r === true ? n + 1 : n), 0)
    const nFase2 = QUIZ_FASE2_QUESTIONS.length
    if (nFase2 > 0 && total === nFase2 && nAcertos === nFase2) {
      localStorage.setItem(STORAGE_PHASE3_UNLOCK, '1')
      setUnlockRefresh((x) => x + 1)
    }
  }, [ecra, fase, respostas, total])

  useEffect(() => {
    if (ecra !== 'resultado' || fase !== 1) return
    if (!criterioDesbloqueio(totalPontos)) return
    if (parabensFase1Ref.current) return
    parabensFase1Ref.current = true
    setDialogParabensNivel(true)
  }, [ecra, fase, totalPontos])

  const confirmar = () => {
    if (escolha === null || !perguntaAtual) return
    const ok = escolha === perguntaAtual.correctAnswer
    setAcertouUltima(ok)
    let novosPontos = 0
    if (ok) {
      novosPontos = sequencia + 1
      setTotalPontos((t) => t + novosPontos)
      setSequencia((s) => s + 1)
      setPontosRodada(novosPontos)
    } else {
      setPontosRodada(0)
      setSequencia(0)
    }
    setRespostas((prev) => {
      const next = [...prev]
      next[atual] = ok
      return next
    })
    if (ok) {
      playQuizAcerto()
      const trecho = perguntaAtual?.biblicalText ? String(perguntaAtual.biblicalText).trim() : ''
      window.dispatchEvent(
        new CustomEvent('app-incentivo', {
          detail: {
            mensagem: 'Ótimo!',
            versiculoDestaque: trecho.slice(0, 280),
            meta: { confete: 'versiculo' },
          },
        })
      )
    } else {
      playQuizErro()
    }
    setMostrarFeedback(true)
  }

  const proxima = () => {
    if (atual + 1 >= total) {
      setEcra('resultado')
      return
    }
    setAtual((a) => a + 1)
    setEscolha(null)
    setMostrarFeedback(false)
  }

  const nAcertosFinal = respostas.reduce((n, r, i) => (i < total && r === true ? n + 1 : n), 0)

  useEffect(() => {
    if (ecra !== 'resultado') return
    processarMedalhasAposQuizResultado({ total, acertos: nAcertosFinal }).forEach((detail) => {
      window.dispatchEvent(new CustomEvent('app-incentivo', { detail }))
    })
  }, [ecra, total, nAcertosFinal])

  const compartilharWhatsapp = () => {
    const nome = nomeJogador.trim() || 'Jogador'
    const msg = `🎯 Quiz Bíblico — ${nome}\nAcertos: ${nAcertosFinal}/${total}\nPontuação: ${totalPontos} pontos`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
  }

  const prog = total ? ((atual + (mostrarFeedback ? 1 : 0)) / total) * 100 : 0

  const dialogSairUi = (
    <Dialog open={dialogSair} onClose={cancelarSaidaQuiz} aria-labelledby="quiz-sair-title">
      <DialogTitle id="quiz-sair-title">Sair do quiz?</DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          Se sair agora, o progresso desta rodada fica guardado neste aparelho e na sua conta (se estiver
          conectado) para continuar depois pelo menu do quiz.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={cancelarSaidaQuiz} color="primary">
          Continuar jogando
        </Button>
        <Button onClick={confirmarSaidaQuiz} variant="contained" color="primary">
          Sair
        </Button>
      </DialogActions>
    </Dialog>
  )

  if (ecra === 'inicio') {
    return (
      <Box sx={{ px: 2, py: 2, maxWidth: 560, mx: 'auto' }}>
        <Typography variant="h5" align="center" gutterBottom fontWeight={700}>
          Quiz Bíblico
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2 }}>
          Integrado ao app Bíblia DC
        </Typography>

        {snapshotSalvoMenu && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Há uma partida em andamento ({tituloFaseLabel(snapshotSalvoMenu.fase)} · pergunta{' '}
              {Math.min(snapshotSalvoMenu.atual + 1, snapshotSalvoMenu.ordem.length)} de{' '}
              {snapshotSalvoMenu.ordem.length}
              ).
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button size="small" variant="contained" onClick={continuarPartidaSalva}>
                Continuar partida
              </Button>
              <Button size="small" variant="outlined" color="inherit" onClick={descartarPartidaSalva}>
                Descartar e começar outra
              </Button>
            </Stack>
          </Alert>
        )}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li>50 perguntas por rodada; a ordem muda a cada jogo.</li>
            <li>
              Pontos por sequência de acertos: 1º acerto da sequência = 1 pt, 2º = 2 pts, 3º = 3 pts…
              (soma cumulativa; ao errar, a sequência reinicia.)
            </li>
            <li>Depois de confirmar, não dá para voltar.</li>
          </Typography>
        </Paper>

        <Stack spacing={1.5}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<EmojiEvents />}
            onClick={() => iniciar(1)}
          >
            Jogar (50 perguntas)
          </Button>
          {desbloqueio2 && (
            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<EmojiEvents />}
              onClick={() => iniciar(2)}
            >
              Continuar
            </Button>
          )}
          {desbloqueio3 && (
            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<EmojiEvents />}
              onClick={() => iniciar(3)}
            >
              {QUIZ_FASE3_QUESTIONS.length > 0 ? 'Seguir' : 'Novidades'}
            </Button>
          )}
          <Button
            variant="outlined"
            size="medium"
            fullWidth
            startIcon={<ShareIcon />}
            onClick={() => {
              if (!ensureUserForChatExport(user, navigate)) return
              const { serialized, previewText } = buildQuizExport()
              if (serialized.length > 12000) {
                avisarAsync({
                  titulo: 'Volume de dados excedido',
                  mensagem: 'O volume de dados excede o limite do chat.',
                  severidade: 'warning'
                })
                return
              }
              pushPendingChatExport(navigate, {
                exportKind: 'quiz',
                exportPayload: serialized,
                previewText
              })
            }}
          >
            Enviar resultado pelo chat
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block', textAlign: 'center' }}>
          Conteúdo desenvolvido para interação pessoal.
        </Typography>

        <QuizRankingBiblico tamanho="grande" tick={rankingTick} />

        <Dialog open={dialogFase3EmBreve} onClose={() => setDialogFase3EmBreve(false)}>
          <DialogTitle>Novidades</DialogTitle>
          <DialogContent>
            <Typography variant="body1">Há mais conteúdo a caminho. Volte em breve.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogFase3EmBreve(false)}>Fechar</Button>
          </DialogActions>
        </Dialog>
        {dialogSairUi}
      </Box>
    )
  }

  if (ecra === 'resultado') {
    const irMenu = () => {
      setDialogParabensNivel(false)
      parabensFase1Ref.current = false
      setEcra('inicio')
    }

    const okParabensEIniciarFase2 = () => {
      setDialogParabensNivel(false)
      iniciar(2)
    }

    const fecharPopupParabens = () => {
      setDialogParabensNivel(false)
    }

    return (
      <Box sx={{ px: 2, py: 2, maxWidth: 560, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          Resultado
        </Typography>
        <Typography>Acertos: {nAcertosFinal} / {total}</Typography>
        <Typography sx={{ mb: 2 }}>Pontuação total: {totalPontos}</Typography>

        <TextField
          fullWidth
          size="small"
          label="Seu nome (opcional)"
          value={nomeJogador}
          onChange={(e) => setNomeJogador(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="contained" onClick={compartilharWhatsapp}>
            Compartilhar no WhatsApp
          </Button>
          <Button variant="outlined" onClick={irMenu}>
            Menu
          </Button>
        </Stack>

        <Dialog
          open={dialogParabensNivel && fase === 1 && criterioDesbloqueio(totalPontos)}
          onClose={() => {}}
          disableEscapeKeyDown
          aria-labelledby="quiz-parabens-nivel-title"
        >
          <DialogTitle id="quiz-parabens-nivel-title">Parabéns! Você atingiu outro nível!</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ pt: 0.5 }}>
              Há mais por descobrir. Toque em OK para seguir em frente.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Button onClick={fecharPopupParabens}>Fechar</Button>
            <Button variant="contained" onClick={okParabensEIniciarFase2} autoFocus>
              OK
            </Button>
          </DialogActions>
        </Dialog>
        {dialogSairUi}
      </Box>
    )
  }

  return (
    <Box sx={{ px: 2, py: 1, pb: 4, maxWidth: 720, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {atual + 1} / {total}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          Pontos: {totalPontos}
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={prog} sx={{ mb: 2, height: 8, borderRadius: 1 }} />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2, maxHeight: 72, overflow: 'auto' }}>
        {perguntas.map((_, i) => {
          let label = String(i + 1)
          let color = 'default'
          const r = respostas[i]
          if (i === atual && !mostrarFeedback) color = 'primary'
          else if (r === true) {
            color = 'success'
            label = '✓'
          } else if (r === false) {
            color = 'error'
            label = '✕'
          }
          return (
            <Chip
              key={i}
              size="small"
              label={label}
              color={color === 'default' ? 'default' : color}
              variant={i === atual && !mostrarFeedback ? 'filled' : 'outlined'}
            />
          )
        })}
      </Box>

      <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.15rem' } }}>
        {perguntaAtual?.question}
      </Typography>

      <Stack spacing={1} sx={{ mb: 2 }}>
        {perguntaAtual?.options.map((op, idx) => {
          let extra = {}
          if (mostrarFeedback) {
            if (idx === perguntaAtual.correctAnswer) {
              extra = { bgcolor: 'success.main', color: 'success.contrastText', borderColor: 'success.main' }
            } else if (idx === escolha && idx !== perguntaAtual.correctAnswer) {
              extra = { bgcolor: 'error.main', color: 'error.contrastText', borderColor: 'error.main' }
            }
          } else if (idx === escolha) {
            extra = { borderColor: 'primary.main', bgcolor: 'action.selected' }
          }
          return (
            <Button
              key={idx}
              fullWidth
              variant="outlined"
              disabled={mostrarFeedback}
              onClick={() => !mostrarFeedback && setEscolha(idx)}
              sx={{ py: 1.2, textAlign: 'left', justifyContent: 'flex-start', ...extra }}
            >
              {op}
            </Button>
          )
        })}
      </Stack>

      {!mostrarFeedback ? (
        <Button variant="contained" fullWidth disabled={escolha === null} onClick={confirmar}>
          Confirmar resposta
        </Button>
      ) : (
        <>
          <Paper
            sx={{
              p: 2,
              mb: 2,
              bgcolor: acertouUltima ? 'success.dark' : 'error.dark',
              color: '#fff',
            }}
          >
            <Typography fontWeight={700}>
              {acertouUltima ? `Correto! +${pontosRodada} ponto(s)` : 'Incorreto — sequência zerada'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Referência: {perguntaAtual?.reference}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {perguntaAtual?.biblicalText}
            </Typography>
          </Paper>
          <Button variant="contained" fullWidth onClick={proxima}>
            {atual + 1 >= total ? 'Ver resultado' : 'Próxima pergunta'}
          </Button>
        </>
      )}
      {dialogSairUi}
    </Box>
  )
}
