import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Container, 
  Typography, 
  Card, 
  CardActionArea,
  CardContent, 
  Box, 
  Grid,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Paper,
  Tooltip,
  Divider,
  Portal
} from '@mui/material'
import { devocionalData, devocionalMeta, devocionalSecoes } from '../data/devocional'
import TextoComReferencias from '../components/TextoComReferencias'
import SearchIcon from '@mui/icons-material/Search'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ShareIcon from '@mui/icons-material/Share'
import { useApp } from '../contexts/AppContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { sxMinViewportHeight } from '../utils/viewportHeight'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { buildDevocionalExport } from '../utils/appExportPayload'
import { ensureUserForChatExport, pushPendingChatExport } from '../utils/chatExportSend'
import { avisarAsync } from '../utils/uiDialogs'
import EditorialContentHeader from '../components/EditorialContentHeader'
import EditorialPageSurface from '../components/EditorialPageSurface'
import { EDITORIAL_IMAGES } from '../utils/editorialThemes'

const compactarQuebras = (texto) => String(texto || '').replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n')
const devocionaisOrdenados = [...devocionalData].sort((a, b) => a.ordem - b.ordem)
const secoesPorId = new Map(devocionalSecoes.map((secao) => [secao.id, secao]))

export default function Devocional() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useFirebaseAuth()
  const { fontSize, fontFamily, lineHeight, textAlign, devocionaisConcluidos, setDevocionaisConcluidos } = useApp()
  const ff = resolveFontFamily(fontFamily)
  const lh = readingLineHeightToCss(lineHeight)
  const tamanhoTituloSecao = `${Math.max(90, Math.round(fontSize * 0.9))}%`
  const [searchTerm, setSearchTerm] = useState('')
  const [devocionalAtual, setDevocionalAtual] = useState(null)
  const indiceAtual = devocionalAtual
    ? devocionaisOrdenados.findIndex((devocional) => devocional.id === devocionalAtual.id)
    : -1
  const secaoAtual = devocionalAtual ? secoesPorId.get(devocionalAtual.secao) : null

  useEffect(() => {
    if (id) {
      // A URL permanece vinculada ao ID histórico; `ordem` é apenas a posição editorial visível.
      const devocional = devocionaisOrdenados.find(d => d.id === parseInt(id))
      if (devocional) {
        setDevocionalAtual(devocional)
      } else {
        navigate('/devocional')
      }
    } else {
      setDevocionalAtual(null)
    }
  }, [id, navigate])

  useEffect(() => {
    setTimeout(() => {
      // Resetar todos os elementos com scrollTop > 0
      document.querySelectorAll('main.MuiBox-root').forEach(el => {
        el.scrollTop = 0;
      });
    }, 100);
  }, [devocionalAtual]);

  const handleAnterior = () => {
    if (indiceAtual <= 0) return
    navigate(`/devocional/${devocionaisOrdenados[indiceAtual - 1].id}`)
  }

  const handleProximo = () => {
    if (indiceAtual < 0 || indiceAtual >= devocionaisOrdenados.length - 1) return
    navigate(`/devocional/${devocionaisOrdenados[indiceAtual + 1].id}`)
  }

  const toggleDevocionalConcluido = (devocionalId) => {
    setDevocionaisConcluidos((prev) =>
      prev.includes(devocionalId)
        ? prev.filter((id) => id !== devocionalId)
        : [...prev, devocionalId]
    )
  }

  const devocionaisFiltrados = devocionaisOrdenados.filter(devocional =>
    devocional.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    devocional.leitura.toLowerCase().includes(searchTerm.toLowerCase()) ||
    devocional.texto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    devocional.pense_bem.toLowerCase().includes(searchTerm.toLowerCase()) ||
    devocional.oracao.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalDevocionais = devocionaisOrdenados.length
  const totalConcluidos = devocionaisConcluidos.length
  const progressoPercentual = totalDevocionais > 0
    ? Math.round((totalConcluidos / totalDevocionais) * 100)
    : 0

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        ...sxMinViewportHeight(),
        bgcolor: 'background.default'
      }}
    >
        {devocionalAtual ? (
          <Paper 
            key={devocionalAtual?.id}
            sx={{ 
              flex: 1,
              width: '100%',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'visible',
              bgcolor: 'background.default',
              position: 'relative',
              boxShadow: 'none',
              borderRadius: 0,
              fontFamily: ff,
              lineHeight: lh,
              textAlign,
            }}
          >
            <Box
              component="header"
              sx={{
                flexShrink: 0,
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider',
                px: { xs: 1, sm: 2.5 },
                py: { xs: 1.25, sm: 1.75 },
              }}
            >
              <Box sx={{ width: '100%', maxWidth: 920, mx: 'auto', display: 'grid', gap: 1.25 }}>
                <EditorialContentHeader
                  title={devocionalAtual.titulo}
                  subtitle={secaoAtual?.titulo || 'Meditação bíblica para a vida cristã'}
                  eyebrow={`Devocional • Dia ${devocionalAtual.ordem} de ${totalDevocionais}`}
                  image={EDITORIAL_IMAGES.devocional}
                  imagePosition="center 50%"
                />

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    startIcon={<ArrowBackIosNewIcon fontSize="small" />}
                    onClick={() => navigate('/devocional')}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    Voltar
                  </Button>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Button
                      type="button"
                      variant="outlined"
                      size="small"
                      startIcon={<ShareIcon />}
                      onClick={() => {
                        if (!ensureUserForChatExport(user, navigate)) return
                        const { serialized, previewText } = buildDevocionalExport({
                          concluidos: devocionaisConcluidos,
                          destaqueTitulo: devocionalAtual?.titulo
                        })
                        if (serialized.length > 12000) {
                          avisarAsync({
                            titulo: 'Volume de dados excedido',
                            mensagem: 'O volume de dados excede o limite do chat.',
                            severidade: 'warning'
                          })
                          return
                        }
                        pushPendingChatExport(navigate, {
                          exportKind: 'devocional',
                          exportPayload: serialized,
                          previewText
                        })
                      }}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Enviar progresso
                    </Button>

                    <Tooltip title={devocionaisConcluidos.includes(devocionalAtual.id) ? "Desmarcar como lido" : "Marcar como lido"}>
                      <Button
                        type="button"
                        variant={devocionaisConcluidos.includes(devocionalAtual.id) ? "contained" : "outlined"}
                        color={devocionaisConcluidos.includes(devocionalAtual.id) ? "success" : "primary"}
                        size="small"
                        startIcon={<CheckCircleIcon fontSize="small" />}
                        onClick={() => toggleDevocionalConcluido(devocionalAtual.id)}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                      >
                        {devocionaisConcluidos.includes(devocionalAtual.id) ? "Lido" : "Marcar como lido"}
                      </Button>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Conteúdo do devocional */}
            <Box
              sx={{
                width: '100%',
                px: { xs: 1, sm: 2.5 },
                py: { xs: 1, sm: 1.5 },
                pb: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
                touchAction: 'pan-y',
              }}
            >
              <Box sx={{ width: '100%', maxWidth: 860, mx: 'auto' }}>
                <EditorialPageSurface
                  sx={{
                    mb: 1,
                    px: { xs: 2, sm: 2.5 },
                    py: { xs: 1.5, sm: 2 },
                  }}
                >
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ fontSize: `${fontSize}%`, fontFamily: ff, lineHeight: lh, textAlign }}>
                      Leitura: <TextoComReferencias texto={devocionalAtual.leitura} inline={true} style={{ fontSize: `${fontSize}%`, fontFamily: ff, lineHeight: lh }} />
                    </Typography>
                    <Divider sx={{ my: 1.25 }} />
                    <TextoComReferencias texto={compactarQuebras(devocionalAtual.texto)} style={{ fontSize: `${fontSize}%`, fontFamily: ff, lineHeight: lh, textAlign }} />
                    <Box
                      component="section"
                      sx={{
                        mt: 1.25,
                        px: 1.25,
                        py: 1,
                        border: 1,
                        borderLeft: 4,
                        borderColor: 'divider',
                        borderLeftColor: 'primary.main',
                        borderRadius: 1.5,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Typography
                        component="h2"
                        color="primary"
                        sx={{
                          m: 0,
                          mb: 0.5,
                          fontSize: tamanhoTituloSecao,
                          fontFamily: ff,
                          fontWeight: 800,
                          lineHeight: 1.25,
                          letterSpacing: '0.045em',
                          textTransform: 'uppercase',
                          textAlign,
                        }}
                      >
                        Pense bem!
                      </Typography>
                      <TextoComReferencias texto={compactarQuebras(devocionalAtual.pense_bem)} style={{ fontSize: `${fontSize}%`, fontFamily: ff, lineHeight: lh, textAlign }} />
                    </Box>
                    <Box
                      component="section"
                      sx={{
                        mt: 1,
                        px: 1.25,
                        py: 1,
                        border: 1,
                        borderLeft: 4,
                        borderColor: 'divider',
                        borderLeftColor: 'primary.main',
                        borderRadius: 1.5,
                      }}
                    >
                      <Typography
                        component="h2"
                        color="primary"
                        sx={{
                          m: 0,
                          mb: 0.5,
                          fontSize: tamanhoTituloSecao,
                          fontFamily: ff,
                          fontWeight: 800,
                          lineHeight: 1.25,
                          letterSpacing: '0.045em',
                          textTransform: 'uppercase',
                          textAlign,
                        }}
                      >
                        Oração
                      </Typography>
                      <TextoComReferencias texto={devocionalAtual.oracao} style={{ fontSize: `${fontSize}%`, fontFamily: ff, lineHeight: lh, textAlign }} />
                    </Box>
                </EditorialPageSurface>
              </Box>
            </Box>

            {/* Navegação */}
            <Portal>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  position: 'fixed',
                  top: '50%',
                  left: 0,
                  right: 0,
                  transform: 'translateY(-50%)',
                  px: { xs: 1, sm: 2 },
                  zIndex: 1000,
                  pointerEvents: 'none',
                }}
              >
              <IconButton
                onClick={handleAnterior}
                disabled={indiceAtual <= 0}
                sx={{
                  bgcolor: 'transparent',
                  color: 'primary.main',
                  border: 'none',
                  boxShadow: 'none',
                  backdropFilter: 'none',
                  opacity: 0.45,
                  ml: '-14px',
                  borderRadius: '0 8px 8px 0',
                  transition: 'opacity 0.2s ease, margin 0.2s ease',
                  '&:hover': {
                    bgcolor: 'transparent',
                    opacity: 0.9,
                    ml: '-7px'
                  },
                  '&.Mui-disabled': {
                    opacity: 0.15
                  },
                  pointerEvents: 'auto',
                }}
              >
                <ArrowBackIosNewIcon sx={{ fontSize: '2rem' }} />
              </IconButton>

              <IconButton
                onClick={handleProximo}
                disabled={indiceAtual < 0 || indiceAtual >= devocionaisOrdenados.length - 1}
                sx={{
                  bgcolor: 'transparent',
                  color: 'primary.main',
                  border: 'none',
                  boxShadow: 'none',
                  backdropFilter: 'none',
                  opacity: 0.45,
                  mr: '-14px',
                  borderRadius: '8px 0 0 8px',
                  transition: 'opacity 0.2s ease, margin 0.2s ease',
                  '&:hover': {
                    bgcolor: 'transparent',
                    opacity: 0.9,
                    mr: '-7px'
                  },
                  '&.Mui-disabled': {
                    opacity: 0.15
                  },
                  pointerEvents: 'auto',
                }}
              >
                <ArrowForwardIosIcon sx={{ fontSize: '2rem' }} />
              </IconButton>
              </Box>
            </Portal>
          </Paper>
        ) : (
          <Container
            maxWidth="lg"
            sx={{
              width: '100%',
              py: { xs: 1.5, sm: 2.5 },
              px: { xs: 1, sm: 3 },
              fontFamily: ff,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5" sx={{ fontSize: { xs: '1.2rem', sm: '1.45rem' }, fontWeight: 800, lineHeight: 1.2 }}>
                    Devocionais
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {totalConcluidos} de {totalDevocionais} lidos
                  </Typography>
                </Box>

                <Box sx={{ width: { xs: '100%', sm: 280 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Progresso
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {progressoPercentual}%
                    </Typography>
                  </Box>
                  <Box sx={{ height: 8, borderRadius: 99, bgcolor: 'action.hover', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        width: `${progressoPercentual}%`,
                        height: '100%',
                        bgcolor: 'success.main',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1.5, fontFamily: ff, lineHeight: 1.6, textAlign }}
              >
                {devocionalMeta.introducao}
              </Typography>

              <Box
                component="details"
                sx={{
                  mt: 1,
                  px: 1.25,
                  py: 0.75,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  bgcolor: 'action.hover',
                  '&[open] summary': { mb: 0.75 },
                }}
              >
                <Box
                  component="summary"
                  sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 800, fontSize: '0.82rem' }}
                >
                  Aviso pastoral
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: ff, lineHeight: 1.55, textAlign }}>
                  {devocionalMeta.avisoPastoral}
                </Typography>
              </Box>

              <TextField
                fullWidth
                size="small"
                placeholder="Buscar devocional..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ mt: 1.5 }}
              />
            </Paper>

            {devocionalSecoes.map((secao) => {
              const itensDaSecao = devocionaisFiltrados.filter((devocional) => devocional.secao === secao.id)
              if (itensDaSecao.length === 0) return null

              return (
                <Box component="section" key={secao.id} sx={{ mb: 3 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      mb: 1.25,
                      px: { xs: 1.5, sm: 2 },
                      py: 1.25,
                      borderLeft: 4,
                      borderLeftColor: 'primary.main',
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="h6" sx={{ fontFamily: ff, fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.25 }}>
                        {secao.ordem}. {secao.titulo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                        Dias {secao.inicio}–{secao.fim}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, fontFamily: ff, lineHeight: 1.5 }}>
                      {secao.descricao}
                    </Typography>
                  </Paper>

                  <Grid container spacing={1.5}>
                    {itensDaSecao.map((devocional) => {
                      const concluido = devocionaisConcluidos.includes(devocional.id)
                      return (
                        <Grid item xs={12} sm={6} md={4} key={devocional.id}>
                          <Card
                            variant="outlined"
                            sx={{
                              height: '100%',
                              borderRadius: 2,
                              boxShadow: 'none',
                              bgcolor: 'background.paper',
                              borderColor: concluido ? 'success.main' : 'divider',
                              overflow: 'hidden',
                            }}
                          >
                            <CardActionArea onClick={() => navigate(`/devocional/${devocional.id}`)} sx={{ height: '100%' }}>
                              <CardContent sx={{ p: { xs: 1.75, sm: 2 }, minHeight: 150, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                                    Dia {devocional.ordem}
                                  </Typography>
                                  {concluido && (
                                    <Tooltip title="Devocional lido">
                                      <CheckCircleIcon color="success" sx={{ fontSize: '1.25rem', flexShrink: 0 }} />
                                    </Tooltip>
                                  )}
                                </Box>

                                <Typography
                                  variant="h6"
                                  sx={{
                                    fontSize: '1.02rem',
                                    lineHeight: 1.25,
                                    fontWeight: 800,
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {devocional.titulo}
                                </Typography>

                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    lineHeight: 1.55,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {devocional.texto}
                                </Typography>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        </Grid>
                      )
                    })}
                  </Grid>
                </Box>
              )
            })}

            {devocionaisFiltrados.length === 0 && (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
                <Typography color="text.secondary">Nenhum devocional encontrado.</Typography>
              </Paper>
            )}
          </Container>
      )}
    </Box>
  )
}
