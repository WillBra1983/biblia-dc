import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Container, 
  Typography, 
  Card, 
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
import { getGlassCardStyles } from '../utils/glassCardStyles'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { sxFullViewportHeight, sxMinViewportHeight } from '../utils/viewportHeight'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { buildDevocionalExport } from '../utils/appExportPayload'
import { ensureUserForChatExport, pushPendingChatExport } from '../utils/chatExportSend'
import { avisarAsync } from '../utils/uiDialogs'

export default function Devocional() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useFirebaseAuth()
  const { fontSize, voltarParaPaginaAnterior, fontFamily, lineHeight, isDarkMode, devocionaisConcluidos, setDevocionaisConcluidos } = useApp()
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

  const cardPadraoGradient = isDarkMode
    ? 'linear-gradient(135deg, #000000 0%, #000000 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)'
  const cardPadraoCorTexto = isDarkMode ? 'white' : '#111'
  const cardPadraoBorda = isDarkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)'

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
              display: 'flex',
              flexDirection: 'column',
              ...sxFullViewportHeight({ maxHeight: false }),
              overflow: 'hidden',
              bgcolor: 'background.paper',
              position: 'relative',
              pt: 2,
              fontFamily: ff,
              lineHeight: lh,
            }}
          >
            {/* Linha dos botões - Remover a seta de voltar daqui */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', p: 2 }}>
              {/* O botão de voltar para /devocional foi movido para baixo do título */}
              {/* <Box>
                <IconButton onClick={() => navigate('/devocional')} sx={{ color: 'primary.main' }}>
                  <ArrowBackIosNewIcon />
                  <Typography variant="body2" sx={{ ml: 1, display: 'inline' }}>
                    Voltar
                  </Typography>
                </IconButton>
              </Box> */}
            </Box>

            {/* Linha do título e opção de marcar como lido */}
            <Box sx={{ width: '100%', textAlign: 'center', mb: 2 }}>
              <Typography 
                variant="h5" 
                sx={{ fontSize: `${fontSize}%`, wordBreak: 'break-word', display: 'inline-block', lineHeight: lh }}
              >
                {devocionalAtual.titulo}
              </Typography>
            </Box>

            {/* Nova linha para os botões Voltar e Marcar como Lido */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, mb: 2 }}>
              {/* Botão Voltar para cards */}
              <IconButton onClick={() => window.history.back()} sx={{ color: 'primary.main', p: 0.5, borderRadius: 1 }}>
                <ArrowBackIosNewIcon fontSize="small" />
                <Typography variant="body2" sx={{ ml: 0.5, display: 'inline' }}>
                  Voltar
                </Typography>
              </IconButton>
              
              {/* Opção de Marcar como lido */}
              <Tooltip title={devocionaisConcluidos.includes(devocionalAtual.id) ? "Desmarcar como lido" : "Marcar como lido"}>
                <IconButton
                  onClick={() => toggleDevocionalConcluido(devocionalAtual.id)}
                  color={devocionaisConcluidos.includes(devocionalAtual.id) ? "success" : "default"}
                  sx={{ display: 'flex', alignItems: 'center', p: 0.5, borderRadius: 1 }}
                >
                  <CheckCircleIcon fontSize="small" />
                  <Typography variant="body2" sx={{ ml: 0.5, display: 'inline' }}>
                    {devocionaisConcluidos.includes(devocionalAtual.id) ? "Lido" : "Marcar como lido"}
                  </Typography>
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', px: 2, mb: 2 }}>
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
              >
                Enviar progresso pelo chat
              </Button>
            </Box>

            {/* Conteúdo do devocional */}
            <Box
              ref={scrollRef}
              sx={{
                flex: 1,
                overflow: 'auto',
                p: 0
              }}
            >
              <Card sx={{ mb: 2, width: '100%', borderRadius: 0, mx: 0 }}>
                <CardContent>
                  <Typography variant="body1" sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                    {devocionalAtual.introducao.texto}
                  </Typography>
                </CardContent>
              </Card>

              {/* Meditação */}
              {devocionalAtual.meditacao.map((meditacao, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
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
                    <Typography variant="body1" paragraph sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                      {meditacao.reflexao}
                    </Typography>
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                      Oração:
                    </Typography>
                    <Typography variant="body1" paragraph sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                      {meditacao.oracao}
                    </Typography>
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                      Conselho Pastoral:
                    </Typography>
                    <Typography variant="body1" paragraph sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                      {meditacao.conselho_pastoral}
                    </Typography>
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                      Desafio:
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: `${fontSize}%`, lineHeight: lh }}>
                      {meditacao.desafio}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {/* Navegação */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                position: 'fixed',
                bottom: 20,
                left: 0,
                px: 0,
                zIndex: 1000,
                pointerEvents: 'none',
              }}
            >
              <IconButton
                onClick={handleAnterior}
                disabled={devocionalAtual.id <= 1}
                sx={{
                  bgcolor: '#004d40',
                  opacity: 0.2,
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#004d40',
                    opacity: 0.5
                  },
                  '&.Mui-disabled': {
                    opacity: 0.1
                  },
                  boxShadow: 2,
                  pointerEvents: 'auto',
                  ml: 0
                }}
              >
                <ArrowBackIosNewIcon />
              </IconButton>

        <IconButton
                onClick={handleProximo}
                disabled={devocionalAtual.id >= devocionalData.length}
                sx={{
                  bgcolor: '#004d40',
                  opacity: 0.2,
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#004d40',
                    opacity: 0.5
                  },
                  '&.Mui-disabled': {
                    opacity: 0.1
                  },
                  boxShadow: 2,
                  pointerEvents: 'auto',
                  mr: 0
                }}
              >
                <ArrowForwardIosIcon />
        </IconButton>
      </Box>
          </Paper>
        ) : (
          <Container maxWidth="lg" sx={{ py: 0, pt: 2, mt: 0, fontFamily: ff }}>
          {/* Barra de busca */}
            <Box sx={{ mb: 2 }}>
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
              sx={{ mt: 8, mb: 0 }}
            />
          </Box>

            {/* Grid de devocionais */}
            <Box sx={{ p: 0 }}>
              <Grid container spacing={1}>
            {devocionaisFiltrados.map((devocional) => (
                  <Grid item xs={12} sm={6} md={4} key={devocional.id}>
                    <Card 
                      sx={{
                        ...getGlassCardStyles(cardPadraoGradient, {
                          hover: true,
                          shimmer: false,
                          borderRadius: 1,
                        }),
                        mb: 2,
                        width: '100%',
                        mx: 0,
                        position: 'relative',
                        border: `1px solid ${cardPadraoBorda}`,
                        cursor: 'pointer',
                        color: cardPadraoCorTexto,
                      }}
                      onClick={() => navigate(`/devocional/${devocional.id}`)}
                    >
                      <CardContent sx={{ 
                        px: 2, 
                        py: 3,
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 200
                      }}>
                        <Typography 
                          variant="h6" 
                          gutterBottom 
                          sx={{ 
                            wordBreak: 'break-word',
                            color: cardPadraoCorTexto,
                            fontWeight: 700,
                            mb: 2,
                          }}
                        >
                          {devocional.titulo}
                        </Typography>
                        {devocionaisConcluidos.includes(devocional.id) && (
                          <Tooltip title="Devocional lido">
                            <CheckCircleIcon 
                              sx={{
                                color: 'success.main',
                                fontSize: '4rem',
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                opacity: 0.5,
                                zIndex: 1
                              }} 
                            />
                          </Tooltip>
                        )}
                        <Typography 
                          variant="body2" 
                          sx={{
                            color: cardPadraoCorTexto,
                            textAlign: 'center',
                            lineHeight: 1.6,
                            opacity: 0.9,
                          }}
                        >
                          {devocional.introducao.texto.substring(0, 100)}...
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
          </Box>
          </Container>
      )}
    </Box>
  )
} 