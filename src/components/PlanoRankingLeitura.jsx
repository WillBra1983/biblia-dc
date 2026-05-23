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
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { useTheme } from '@mui/material/styles'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { FUNDO_VERDE_PADRAO } from '../utils/fundoVerdePagina'
import { dispararConfetePorTipo } from '../utils/celebracaoConfetti'
import {
  SRC_ESCADA,
  SRC_PLANO_RANKING,
  preloadPlanoRankingIcon,
} from '../utils/planoEscadaImagens'
import {
  lerOptInRankingPlano,
  gravarOptInRankingPlanoNaNuvem,
  subscribeRankingPlanoLeitura,
  sincronizarMeuRankingPlano,
  removerMeuRankingPlano,
  calcularPosicaoNoRanking,
  calcularPosicaoFantasma,
  montarSnapshotRankingLocal,
  montarSnapshotRankingDeProgresso,
  mesclarRankingComSnapshotLocal,
} from '../services/planoLeituraRankingService'

const avatarImgProps = { referrerPolicy: 'no-referrer' }

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
      sx={{
        height: altura,
        width: 'auto',
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
      }}
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
                {snapshot.capitulosLidos} capítulos · {snapshot.progressoPct.toFixed(1)}% · seq.{' '}
                {snapshot.diasConsecutivos ?? 0}
              </Typography>
            </>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  )
}

/**
 * Gatilho: troféu + link; tela cheia com pódio (medalhas + fotos) e lista completa.
 */
export default function PlanoRankingLeitura({
  tick = 0,
  instanciaId = null,
  progresso = null,
  tamanho = 'compacto',
}) {
  const grande = tamanho === 'grande'
  const theme = useTheme()
  const { user } = useFirebaseAuth()
  const [optIn, setOptIn] = useState(() => lerOptInRankingPlano())
  const [rows, setRows] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [syncErro, setSyncErro] = useState(false)
  const [telaAberta, setTelaAberta] = useState(false)
  const [iconeRankingVisivel, setIconeRankingVisivel] = useState(false)
  const [iconeRankingFalhou, setIconeRankingFalhou] = useState(false)
  const confeteDisparadoRef = useRef(false)

  useEffect(() => {
    let ativo = true
    const timer = window.setTimeout(() => {
      if (ativo) setIconeRankingVisivel(true)
    }, 2500)
    void preloadPlanoRankingIcon().finally(() => {
      if (ativo) setIconeRankingVisivel(true)
    })
    return () => {
      ativo = false
      window.clearTimeout(timer)
    }
  }, [])

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
      await sincronizarMeuRankingPlano(user.uid, {
        authUser: authCtx,
        instanciaId,
        progresso,
      })
    } catch {
      setSyncErro(true)
    }
  }, [user?.uid, optIn, authCtx, instanciaId, progresso])

  useEffect(() => {
    if (!user?.uid) {
      setRows([])
      setCarregando(false)
      return
    }
    setCarregando(true)
    const unsub = subscribeRankingPlanoLeitura((lista) => {
      setRows(lista)
      setCarregando(false)
    }, 50)
    return unsub
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    if (optIn) {
      void publicarRanking()
    }
  }, [tick, instanciaId, user?.uid, optIn, publicarRanking])

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
    const lidos = Math.max(0, Number(progresso?.capitulosLidos) || 0)
    if (lidos < 1) {
      if (!user?.uid) return null
      return montarSnapshotRankingLocal(user.uid, {}, authCtx, instanciaId)
    }
    const uid = user?.uid || 'local'
    return (
      montarSnapshotRankingDeProgresso(uid, progresso, {}, authCtx, instanciaId) ||
      (user?.uid ? montarSnapshotRankingLocal(user.uid, {}, authCtx, instanciaId) : null)
    )
  }, [user?.uid, authCtx, instanciaId, tick, progresso])

  const posicaoFantasma =
    !optIn && snapshotLocal?.capitulosLidos > 0
      ? calcularPosicaoFantasma(rows, snapshotLocal)
      : null

  const handleOptIn = async (_, checked) => {
    setOptIn(checked)
    await gravarOptInRankingPlanoNaNuvem(user?.uid || null, checked)
    if (!user?.uid) return
    if (checked) {
      setSyncErro(false)
      try {
        await sincronizarMeuRankingPlano(user.uid, {
          authUser: authCtx,
          instanciaId,
          progresso,
        })
      } catch {
        setSyncErro(true)
      }
    } else {
      await removerMeuRankingPlano(user.uid)
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

  const abrirTela = () => setTelaAberta(true)
  const fecharTela = () => setTelaAberta(false)

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
        aria-label="Ver lista completa do ranking"
        onClick={abrirTela}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            abrirTela()
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
          '&:hover': { opacity: 0.92 },
          '&:focus-visible': {
            outline: '2px solid rgba(255,255,255,0.8)',
            outlineOffset: 4,
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: grande ? { xs: 'min(88vw, 320px)', sm: 360 } : { xs: 40, sm: 44 },
            height: grande ? { xs: 'min(88vw, 320px)', sm: 360 } : { xs: 40, sm: 44 },
            maxWidth: '100%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!iconeRankingVisivel ? (
            <CircularProgress size={grande ? 40 : 20} sx={{ color: '#fff' }} />
          ) : null}
          <Box
            component="img"
            src={SRC_PLANO_RANKING}
            alt="Ranking da leitura"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            draggable={false}
            onLoad={() => setIconeRankingVisivel(true)}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              pointerEvents: 'none',
              opacity: iconeRankingVisivel ? 1 : 0,
              transition: 'opacity 0.2s ease',
            }}
          />
        </Box>
        {grande ? (
          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
              color: '#fff',
              textAlign: 'center',
              textDecoration: 'underline',
              textUnderlineOffset: 4,
              px: 1,
              pointerEvents: 'none',
            }}
          >
            Ver lista completa do ranking
          </Typography>
        ) : null}
      </Box>

      <Dialog
        fullScreen
        open={telaAberta}
        onClose={fecharTela}
        TransitionComponent={Transition}
        aria-labelledby="plano-ranking-titulo"
        PaperProps={{ sx: papelVerde }}
      >
        <AppBar position="sticky" elevation={0} sx={{ ...papelVerde }}>
          <Toolbar>
            <Box
              component="img"
              src={SRC_PLANO_RANKING}
              alt=""
              sx={{ width: 36, height: 36, objectFit: 'contain', mr: 1, flexShrink: 0 }}
            />
            <Typography id="plano-ranking-titulo" variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
              Ranking da leitura
            </Typography>
            {optIn && posicaoResumo != null ? (
              <Chip
                size="small"
                label={`Você: #${posicaoResumo}`}
                sx={{ mr: 1, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
              />
            ) : null}
            <IconButton edge="end" color="inherit" onClick={fecharTela} aria-label="Fechar">
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
                        ? 'Você aparece na lista pública do plano.'
                        : 'Sem participar, você vê apenas a sua classificação.'}
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
                      A lista completa do ranking fica oculta enquanto você não participa. Ative a
                      opção acima para ver o pódio e os demais leitores.
                    </Typography>
                  </Stack>
                </Paper>
                <MinhaClassificacaoCard
                  snapshot={snapshotLocal}
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
                  Ainda não há leitores no ranking. Seja o primeiro a marcar capítulos!
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
                          <TableCell>Leitor</TableCell>
                          <TableCell align="right">Caps.</TableCell>
                          <TableCell align="right">%</TableCell>
                          <TableCell align="right">Seq.</TableCell>
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
                              <TableCell align="right">{r.capitulosLidos}</TableCell>
                              <TableCell align="right">{r.progressoPct.toFixed(1)}%</TableCell>
                              <TableCell align="right">{r.diasConsecutivos}</TableCell>
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
              onClick={fecharTela}
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
