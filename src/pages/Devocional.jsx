import { useState, useEffect, useRef } from 'react'
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
  Divider
} from '@mui/material'
import { devocionalData } from '../data/devocional'
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
import EditorialProse from '../components/EditorialProse'
import EditorialPageSurface from '../components/EditorialPageSurface'
import { EDITORIAL_IMAGES } from '../utils/editorialThemes'

export default function Devocional() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useFirebaseAuth()
  const { fontSize, fontFamily, lineHeight, devocionaisConcluidos, setDevocionaisConcluidos } = useApp()
  const ff = resolveFontFamily(fontFamily)
  const lh = readingLineHeightToCss(lineHeight)
  const [searchTerm, setSearchTerm] = useState('')
  const [devocionalAtual, setDevocionalAtual] = useState(null)

  const scrollRef = useRef(null);

  useEffect(() => {
    if (id) {
      const devocional = devocionalData.find(d => d.id === parseInt(id))
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [devocionalAtual]);

  useEffect(() => {
    setTimeout(() => {
      // Resetar todos os elementos com scrollTop > 0
      document.querySelectorAll('main.MuiBox-root').forEach(el => {
        el.scrollTop = 0;
      });
    }, 100);
  }, [devocionalAtual]);

  const handleAnterior = () => {
    if (devocionalAtual && devocionalAtual.id > 1) {
      navigate(`/devocional/${devocionalAtual.id - 1}`)
    }
  }

  const handleProximo = () => {
    if (devocionalAtual && devocionalAtual.id < devocionalData.length) {
      navigate(`/devocional/${devocionalAtual.id + 1}`)
    }
  }

  const toggleDevocionalConcluido = (devocionalId) => {
    setDevocionaisConcluidos((prev) =>
      prev.includes(devocionalId)
        ? prev.filter((id) => id !== devocionalId)
        : [...prev, devocionalId]
    )
  }

  const devocionaisFiltrados = devocionalData.filter(devocional =>
    devocional.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    devocional.introducao.texto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    devocional.meditacao.some(meditacao =>
      meditacao.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meditacao.texto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (meditacao.reflexao && meditacao.reflexao.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (meditacao.oracao && meditacao.oracao.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (meditacao.conselho_pastoral && meditacao.conselho_pastoral.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (meditacao.desafio && meditacao.desafio.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  )

  const totalDevocionais = devocionalData.length
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
              overflow: 'hidden',
              bgcolor: 'background.default',
              position: 'relative',
              boxShadow: 'none',
              borderRadius: 0,
              fontFamily: ff,
              lineHeight: lh,
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
                  subtitle="Meditação bíblica para a vida cristã"
                  eyebrow="Devocional"
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
              ref={scrollRef}
              sx={{
                flex: 1,
                overflow: 'auto',
                px: { xs: 1, sm: 2.5 },
                py: { xs: 1.5, sm: 2.5 },
                pb: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
              }}
            >
              <Box sx={{ width: '100%', maxWidth: 860, mx: 'auto' }}>
              <EditorialProse
                text={devocionalAtual.introducao.texto}
                fontSize={fontSize}
                textAlign="justify"
                lineHeight={lh}
                sx={{ mb: 2 }}
              />

              {/* Meditação */}
              {devocionalAtual.meditacao.map((meditacao, index) => (
                <EditorialPageSurface
                  key={index}
                  sx={{
                    mb: 2,
                    px: { xs: 2, sm: 2.5 },
                    py: { xs: 2, sm: 2.5 },
                  }}
                >
                    <Typography variant="h6" gutterBottom sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                      {meditacao.titulo}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                      Leitura: <TextoComReferencias texto={meditacao.leitura} inline={true} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <TextoComReferencias texto={meditacao.texto} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                      Reflexão:
                    </Typography>
                    <TextoComReferencias texto={meditacao.reflexao} style={{ fontSize: `${fontSize}%`, lineHeight: lh, marginBottom: 16 }} />
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                      Oração:
                    </Typography>
                    <TextoComReferencias texto={meditacao.oracao} style={{ fontSize: `${fontSize}%`, lineHeight: lh, marginBottom: 16 }} />
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                      Conselho Pastoral:
                    </Typography>
                    <TextoComReferencias texto={meditacao.conselho_pastoral} style={{ fontSize: `${fontSize}%`, lineHeight: lh, marginBottom: 16 }} />
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                      Desafio:
                    </Typography>
                    <TextoComReferencias texto={meditacao.desafio} style={{ fontSize: `${fontSize}%`, lineHeight: lh }} />
                </EditorialPageSurface>
              ))}
              </Box>
            </Box>

            {/* Navegação */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                position: 'absolute',
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)',
                left: 0,
                px: { xs: 1, sm: 2 },
                zIndex: 1000,
                pointerEvents: 'none',
              }}
            >
              <IconButton
                onClick={handleAnterior}
                disabled={devocionalAtual.id <= 1}
                sx={{
                  bgcolor: 'background.paper',
                  color: 'primary.main',
                  border: 1,
                  borderColor: 'divider',
                  opacity: 0.9,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    opacity: 1
                  },
                  '&.Mui-disabled': {
                    opacity: 0.28
                  },
                  boxShadow: 3,
                  pointerEvents: 'auto',
                }}
              >
                <ArrowBackIosNewIcon />
              </IconButton>

              <IconButton
                onClick={handleProximo}
                disabled={devocionalAtual.id >= devocionalData.length}
                sx={{
                  bgcolor: 'background.paper',
                  color: 'primary.main',
                  border: 1,
                  borderColor: 'divider',
                  opacity: 0.9,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    opacity: 1
                  },
                  '&.Mui-disabled': {
                    opacity: 0.28
                  },
                  boxShadow: 3,
                  pointerEvents: 'auto',
                }}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </Box>
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

            <Grid container spacing={1.5}>
              {devocionaisFiltrados.map((devocional) => {
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
                              Dia {devocional.id}
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
                            {devocional.introducao.texto}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Container>
      )}
    </Box>
  )
}
