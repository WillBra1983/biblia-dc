import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Stack,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  AppBar,
  Toolbar,
  Slide,
  Button,
  Container,
} from '@mui/material'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { useTheme } from '@mui/material/styles'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { FUNDO_VERDE_PADRAO } from '../utils/fundoVerdePagina'
import { dispararConfetePorTipo } from '../utils/celebracaoConfetti'
import { SRC_ESCADA } from '../utils/planoEscadaImagens'
import {
  lerOptInRankingQuiz,
  gravarOptInRankingQuizNaNuvem,
  subscribeRankingQuizBiblico,
  sincronizarMeuRankingQuiz,
  removerMeuRankingQuiz,
  hidratarOptInRankingQuizDoPerfil,
  calcularPosicaoNoRanking,
  calcularPosicaoFantasma,
  montarSnapshotRankingQuiz,
  mesclarRankingComSnapshotLocal,
  lerMelhorPontuacaoQuizLocal,
} from '../services/quizBiblicoRankingService'

const avatarImgProps = { referrerPolicy: 'no-referrer' }
const SRC_TROFEU = SRC_ESCADA.trofeu

const MEDALHA_PODIO = {
  1: SRC_ESCADA.ouro,
  2: SRC_ESCADA.prata,
  3: SRC_ESCADA.bronze,
}

function MedalhaPosicao({ posicao, altura = 24 }) {
  const src = MEDALHA_PODIO[posicao]
  if (!src) return null
  return (
    <Box
      component="img"
      src={src}
      alt=""
      sx={{ height: altura, width: 'auto', objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  )
}

function iniciaisNome(nome) {
  const s = String(nome || '').trim().replace(/^@/, '')
  if (!s) return '?'
  const p = s.split(/\s+/).filter(Boolean)
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase()
  return s.slice(0, 2).toUpperCase()
}

function Transition(props) {
  return <Slide direction="up" {...props} />
}

function PodioDestaque({ primeiro, segundo, terceiro }) {
  const slots = [
    { pos: 2, data: segundo, medalSrc: MEDALHA_PODIO[2], medalH: { xs: 72, sm: 88 }, avatarSize: 44 },
    { pos: 1, data: primeiro, medalSrc: MEDALHA_PODIO[1], medalH: { xs: 96, sm: 112 }, avatarSize: 52 },
    { pos: 3, data: terceiro, medalSrc: MEDALHA_PODIO[3], medalH: { xs: 64, sm: 80 }, avatarSize: 40 },
  ]

  return (
    <Stack
      direction="row"
      alignItems="flex-end"
      justifyContent="center"
      spacing={{ xs: 1.5, sm: 2.5 }}
      sx={{ py: 2.5, px: 1 }}
    >
      {slots.map(({ pos, data, medalSrc, medalH, avatarSize }) => (
        <Stack
          key={pos}
          alignItems="center"
          spacing={0.75}
          sx={{ width: { xs: 96, sm: 120 }, flexShrink: 0 }}
        >
          <Box
            component="img"
            src={medalSrc}
            alt=""
            sx={{
              height: medalH,
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))',
            }}
          />
          {data ? (
            <>
              <Avatar
                src={data.photoURL || undefined}
                sx={{
                  width: avatarSize,
                  height: avatarSize,
                  fontSize: '0.85rem',
                  border: 2,
                  borderColor: 'rgba(255,255,255,0.85)',
                  mt: -0.5,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
                imgProps={avatarImgProps}
              >
                {iniciaisNome(data.displayName)}
              </Avatar>
              <Typography
                variant="caption"
                sx={{ color: '#fff', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}
              >
                {data.pontos} pts
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {data.perguntasRespondidas ?? data.acertos}/{data.totalPerguntas} · {data.acertos} ac.
              </Typography>
            </>
          ) : (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              —
            </Typography>
          )}
        </Stack>
      ))}
    </Stack>
  )
}

function MinhaClassificacaoCard({ snapshot, posicao, optIn }) {
  if (!snapshot && posicao == null) return null
  return (
    <Paper
      sx={{
        p: 2.5,
        mb: 2,
        borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.25)',
      }}
    >
      <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.85)', letterSpacing: 1 }}>
        Sua classificação
      </Typography>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
        <Avatar
          src={snapshot?.photoURL || undefined}
          sx={{ width: 56, height: 56, border: 2, borderColor: 'warning.main' }}
          imgProps={avatarImgProps}
        >
          {iniciaisNome(snapshot?.displayName)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {posicao != null ? (
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
              {optIn ? `#${posicao}` : `~#${posicao}`}
            </Typography>
          ) : null}
          {snapshot ? (
            <>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff', mt: 0.5 }}>
                {snapshot.displayName}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                {snapshot.pontos} pts · {snapshot.perguntasRespondidas ?? snapshot.acertos}/
                {snapshot.totalPerguntas} respondidas · {snapshot.acertos} acertos
              </Typography>
            </>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  )
}

/**
 * Ranking do Quiz Bíblico (melhor rodada). Gatilho com troféu; lista completa em tela cheia.
 */
export default function QuizRankingBiblico({ tamanho = 'grande', tick = 0 }) {
  const grande = tamanho === 'grande'
  const theme = useTheme()
  const { user } = useFirebaseAuth()
  const [optIn, setOptIn] = useState(() => lerOptInRankingQuiz())
  const [rows, setRows] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [syncErro, setSyncErro] = useState(false)
  const [telaAberta, setTelaAberta] = useState(false)
  const [iconeVisivel, setIconeVisivel] = useState(false)
  const confeteDisparadoRef = useRef(false)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setIconeVisivel(true)
    img.onerror = () => setIconeVisivel(true)
    img.src = SRC_TROFEU
  }, [])

  useEffect(() => {
    const syncOptIn = () => setOptIn(lerOptInRankingQuiz())
    window.addEventListener('salvation-quiz-ranking-optin-changed', syncOptIn)
    return () => window.removeEventListener('salvation-quiz-ranking-optin-changed', syncOptIn)
  }, [])

  useEffect(() => {
    if (!user?.uid) return
    let cancelado = false
    void hidratarOptInRankingQuizDoPerfil(user.uid).then((ativo) => {
      if (!cancelado) setOptIn(ativo)
    })
    return () => {
      cancelado = true
    }
  }, [user?.uid])

  const authCtx = useMemo(
    () =>
      user
        ? {
            email: user.email || '',
            photoURL: user.photoURL || '',
            displayName: user.displayName || '',
          }
        : null,
    [user?.uid, user?.email, user?.photoURL, user?.displayName]
  )

  const publicarRanking = useCallback(async () => {
    if (!user?.uid || !optIn) return
    setSyncErro(false)
    try {
      await sincronizarMeuRankingQuiz(user.uid, { authUser: authCtx })
    } catch {
      setSyncErro(true)
    }
  }, [user?.uid, optIn, authCtx])

  useEffect(() => {
    if (!user?.uid) {
      setRows([])
      setCarregando(false)
      return
    }
    setCarregando(true)
    const unsub = subscribeRankingQuizBiblico((lista) => {
      setRows(lista)
      setCarregando(false)
    }, 50)
    return unsub
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    if (optIn) {
      void publicarRanking()
    } else {
      void removerMeuRankingQuiz(user.uid)
    }
  }, [tick, user?.uid, optIn, publicarRanking])

  useEffect(() => {
    if (!telaAberta) {
      confeteDisparadoRef.current = false
      return
    }
    if (confeteDisparadoRef.current) return
    confeteDisparadoRef.current = true
    const t = requestAnimationFrame(() => {
      void dispararConfetePorTipo('intenso', { zIndex: theme.zIndex.modal + 200 })
    })
    return () => cancelAnimationFrame(t)
  }, [telaAberta, theme.zIndex.modal])

  const snapshotLocal = useMemo(() => {
    const local = lerMelhorPontuacaoQuizLocal()
    if (!user?.uid) {
      if (local.pontos < 1) return null
      return montarSnapshotRankingQuiz('local', {
        pontos: local.pontos,
        acertos: local.acertos,
        totalPerguntas: 50,
      })
    }
    if (local.pontos < 1) {
      return montarSnapshotRankingQuiz(user.uid, { pontos: 0, acertos: 0 }, {}, authCtx)
    }
    return montarSnapshotRankingQuiz(
      user.uid,
      { pontos: local.pontos, acertos: local.acertos, totalPerguntas: 50 },
      {},
      authCtx
    )
  }, [user?.uid, authCtx, tick])

  const posicaoFantasma =
    !optIn && snapshotLocal?.pontos > 0 ? calcularPosicaoFantasma(rows, snapshotLocal) : null

  const handleOptIn = async (_, checked) => {
    setOptIn(checked)
    await gravarOptInRankingQuizNaNuvem(user?.uid || null, checked)
    if (!user?.uid) return
    if (checked) {
      setSyncErro(false)
      try {
        await sincronizarMeuRankingQuiz(user.uid, { authUser: authCtx })
      } catch {
        setSyncErro(true)
      }
    } else {
      await removerMeuRankingQuiz(user.uid)
      setRows((prev) => prev.filter((r) => r.uid !== user.uid))
    }
  }

  const listaVisivel = useMemo(() => {
    if (!optIn) return []
    return mesclarRankingComSnapshotLocal(rows, snapshotLocal)
  }, [optIn, rows, snapshotLocal])

  const minhaPosicao =
    user?.uid && optIn ? calcularPosicaoNoRanking(listaVisivel, user.uid) : null

  const posicaoResumo =
    minhaPosicao != null
      ? minhaPosicao
      : !optIn && posicaoFantasma != null
        ? posicaoFantasma
        : null

  const listaParaExibir = optIn ? listaVisivel : []
  const temPodio = optIn && listaParaExibir.length > 0

  const papelVerde = {
    bgcolor: FUNDO_VERDE_PADRAO,
    color: '#fff',
    backgroundImage: 'none',
  }

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        aria-label="Ver ranking do Quiz Bíblico"
        onClick={() => setTelaAberta(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setTelaAberta(true)
          }
        }}
        sx={{
          cursor: 'pointer',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          borderRadius: 2,
          width: grande ? '100%' : 'auto',
          maxWidth: grande ? 'min(92vw, 400px)' : 'none',
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: grande ? 1.25 : 0.5,
          mt: grande ? 2 : 0,
          '&:hover': { opacity: 0.92 },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 4,
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: grande ? { xs: 120, sm: 140 } : { xs: 40, sm: 44 },
            height: grande ? { xs: 120, sm: 140 } : { xs: 40, sm: 44 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!iconeVisivel ? <CircularProgress size={grande ? 32 : 20} /> : null}
          <Box
            component="img"
            src={SRC_TROFEU}
            alt="Ranking do Quiz Bíblico"
            loading="eager"
            decoding="async"
            draggable={false}
            onLoad={() => setIconeVisivel(true)}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              pointerEvents: 'none',
              opacity: iconeVisivel ? 1 : 0,
              transition: 'opacity 0.2s ease',
            }}
          />
        </Box>
        {grande ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', textDecoration: 'underline', textUnderlineOffset: 4 }}
          >
            Ranking do Quiz Bíblico
            {posicaoResumo != null ? ` · você: #${posicaoResumo}` : ''}
          </Typography>
        ) : null}
        {!user && grande ? (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', px: 1 }}>
            Entre na sua conta para participar.
          </Typography>
        ) : null}
      </Box>

      <Dialog
        fullScreen
        open={telaAberta}
        onClose={() => setTelaAberta(false)}
        TransitionComponent={Transition}
        aria-labelledby="quiz-ranking-titulo"
        PaperProps={{ sx: papelVerde }}
      >
        <AppBar position="sticky" elevation={0} sx={papelVerde}>
          <Toolbar>
            <Box
              component="img"
              src={SRC_TROFEU}
              alt=""
              sx={{ width: 36, height: 36, objectFit: 'contain', mr: 1, flexShrink: 0 }}
            />
            <Typography id="quiz-ranking-titulo" variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
              Ranking do Quiz Bíblico
            </Typography>
            {optIn && posicaoResumo != null ? (
              <Chip
                size="small"
                label={`Você: #${posicaoResumo}`}
                sx={{ mr: 1, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
              />
            ) : null}
            <IconButton
              edge="end"
              color="inherit"
              onClick={() => setTelaAberta(false)}
              aria-label="Fechar"
            >
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ ...papelVerde, minHeight: '100%', pb: 4 }}>
          <Container maxWidth="sm" sx={{ pt: 2 }}>
            <Paper
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={optIn}
                    onChange={handleOptIn}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#fff' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        bgcolor: 'rgba(255,255,255,0.5)',
                      },
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff' }}>
                      Participar do ranking
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                      {optIn
                        ? 'Sua melhor rodada (pontos e acertos) aparece na lista.'
                        : 'Desligado: só você vê onde ficaria na classificação.'}
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', ml: 0, mr: 0 }}
              />
            </Paper>

            {syncErro ? (
              <Typography variant="body2" sx={{ mb: 2, color: '#ffcdd2' }}>
                Não foi possível atualizar sua posição. Confira a conexão ou o deploy das regras do
                banco.
              </Typography>
            ) : null}

            {!optIn ? (
              <>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    bgcolor: 'rgba(0,0,0,0.15)',
                    borderColor: 'rgba(255,255,255,0.25)',
                    borderStyle: 'dashed',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <VisibilityOffOutlinedIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                      A lista completa fica oculta enquanto você não participa. Ative a opção acima
                      para ver o pódio e os demais jogadores.
                    </Typography>
                  </Stack>
                </Paper>
                <MinhaClassificacaoCard
                  snapshot={snapshotLocal?.pontos > 0 ? snapshotLocal : null}
                  posicao={posicaoFantasma}
                  optIn={false}
                />
              </>
            ) : carregando && listaParaExibir.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress sx={{ color: '#fff' }} />
              </Box>
            ) : listaParaExibir.length === 0 ? (
              <Paper
                sx={{
                  p: 3,
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.1)',
                }}
              >
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Ainda não há jogadores no ranking. Complete uma rodada para entrar!
                </Typography>
              </Paper>
            ) : (
              <>
                {temPodio ? (
                  <Box sx={{ mb: 2 }}>
                    <PodioDestaque
                      primeiro={listaParaExibir[0]}
                      segundo={listaParaExibir[1]}
                      terceiro={listaParaExibir[2]}
                    />
                  </Box>
                ) : null}

                <Paper
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'rgba(255,255,255,0.95)',
                    color: 'text.primary',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ px: 2, pt: 2, pb: 1, fontWeight: 700, color: 'text.primary' }}
                  >
                    Classificação completa
                  </Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="medium">
                      <TableHead>
                        <TableRow>
                          <TableCell width={64}>#</TableCell>
                          <TableCell>Jogador</TableCell>
                          <TableCell align="right">Pontos</TableCell>
                          <TableCell align="right">Questões</TableCell>
                          <TableCell align="right">Acertos</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {listaParaExibir.map((r, i) => {
                          const pos = i + 1
                          const souEu = r.uid === user?.uid
                          return (
                            <TableRow
                              key={r.uid}
                              sx={{
                                bgcolor: souEu ? 'action.selected' : undefined,
                                '& td': { py: 1.25 },
                              }}
                            >
                              <TableCell sx={{ fontWeight: 700 }}>
                                <Stack direction="row" alignItems="center" spacing={0.75}>
                                  {pos <= 3 ? <MedalhaPosicao posicao={pos} altura={22} /> : null}
                                  <span>{pos}</span>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                  <Avatar
                                    src={r.photoURL || undefined}
                                    sx={{ width: 36, height: 36, fontSize: '0.8rem' }}
                                    imgProps={avatarImgProps}
                                  >
                                    {iniciaisNome(r.displayName)}
                                  </Avatar>
                                  <Typography variant="body2" sx={{ fontWeight: souEu ? 700 : 500 }}>
                                    {r.displayName}
                                    {souEu ? (
                                      <Typography
                                        component="span"
                                        variant="caption"
                                        color="primary"
                                        sx={{ ml: 0.75 }}
                                      >
                                        (você)
                                      </Typography>
                                    ) : null}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell align="right">{r.pontos}</TableCell>
                              <TableCell align="right">
                                {r.perguntasRespondidas ?? r.acertos}/{r.totalPerguntas}
                              </TableCell>
                              <TableCell align="right">
                                {r.acertos}/{r.totalPerguntas}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              </>
            )}

            <Button
              fullWidth
              variant="outlined"
              onClick={() => setTelaAberta(false)}
              sx={{
                mt: 3,
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              Fechar
            </Button>
          </Container>
        </Box>
      </Dialog>
    </>
  )
}
