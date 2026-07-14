import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import SearchIcon from '@mui/icons-material/Search'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import MenuCards from './MenuCards'
import { useTheme } from '@mui/material/styles'
import { useApp } from '../contexts/AppContext'
import { sxMinViewportHeight, sxViewportHeightMinusOffset } from '../utils/viewportHeight'

function normalizarBusca(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function paragrafosHistoria(historia) {
  if (!historia) return []
  if (Array.isArray(historia)) {
    return historia.map((p) => String(p || '').trim()).filter(Boolean)
  }
  return String(historia)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export default function CapitulosListaCards({
  titulo,
  subtitulo,
  descricao,
  historia,
  etiqueta = 'Biblioteca reformada',
  capitulos,
  capituloAtual,
  onSelectCapitulo,
  open,
  onClose,
  gradient = 'linear-gradient(135deg, #0f3a1d 0%, #14532d 58%, #7c5d22 100%)'
}) {
  const theme = useTheme()
  const { setBackButtonHandler } = useApp()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const [historiaAberta, setHistoriaAberta] = useState(false)
  const isDarkMode = theme.palette.mode === 'dark'
  const paragrafos = useMemo(() => paragrafosHistoria(historia), [historia])

  const isDialogMode = onClose && typeof onClose === 'function'
  const tipoItem = capitulos?.[0]?.capitulo ? 'capitulo' : 'pergunta'
  const totalItens = capitulos?.length || 0
  const numeroAtual = capituloAtual?.capitulo || capituloAtual?.numero
  const textoAtual = capituloAtual?.titulo || capituloAtual?.pergunta || ''
  const labelTotal = tipoItem === 'capitulo'
    ? `${totalItens} capítulo${totalItens === 1 ? '' : 's'}`
    : `${totalItens} pergunta${totalItens === 1 ? '' : 's'}`
  const labelAtual = tipoItem === 'capitulo'
    ? `Capítulo ${numeroAtual || 1}`
    : `Pergunta ${numeroAtual || 1}`

  const capitulosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca)
    if (!termo) return capitulos || []
    return (capitulos || []).filter((cap) => {
      const numero = cap.capitulo || cap.numero
      const texto = normalizarBusca(`${numero} ${cap.titulo || cap.pergunta || ''}`)
      return texto.includes(termo)
    })
  }, [busca, capitulos])

  const heroGradient = isDarkMode
    ? 'linear-gradient(135deg, #07140d 0%, #0f2f1d 58%, #423110 100%)'
    : gradient

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen)
  }

  const handleSelect = (cap) => {
    onSelectCapitulo(cap)
    if (onClose) onClose()
  }

  const drawer = (
    <Box sx={{ width: '100%', bgcolor: '#004d40', height: '100%', overflow: 'auto' }}>
      <MenuCards menuOpen={drawerOpen} onItemClick={() => setDrawerOpen(false)} />
    </Box>
  )

  // Em modo diálogo: com o drawer do menu aberto, voltar fecha o menu primeiro.
  useEffect(() => {
    if (!isDialogMode || !drawerOpen || !setBackButtonHandler) return
    setBackButtonHandler(() => setDrawerOpen(false))
    return () => setBackButtonHandler(null)
  }, [isDialogMode, drawerOpen, setBackButtonHandler])

  useEffect(() => {
    if (!open || !isDialogMode) return

    const currentState = window.history.state
    if (!currentState?.dialogType || currentState.dialogType !== 'capitulos-lista') {
      window.history.pushState({ dialogOpen: true, dialogType: 'capitulos-lista' }, '')
    }

    const handlePopState = () => {
      if (open && onClose) onClose()
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [open, onClose, isDialogMode])

  if (!open) return null

  const content = (
    <>
      {isDialogMode && (
        <>
          <AppBar position="static" elevation={1}>
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                onClick={handleDrawerToggle}
                sx={{
                  mr: 2,
                  border: '2px solid',
                  borderRadius: '2px',
                  padding: '0.5px',
                  '& .MuiSvgIcon-root': {
                    fontSize: '2.5rem'
                  }
                }}
                aria-label="menu"
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
                {titulo}
              </Typography>
            </Toolbar>
          </AppBar>

          <Drawer
            variant="temporary"
            anchor="left"
            open={drawerOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true
            }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: { xs: '100%', sm: 400, md: 500 },
                bgcolor: '#004d40'
              },
            }}
          >
            {drawer}
          </Drawer>
        </>
      )}

      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: 'background.default',
          overflow: 'auto',
          height: isDialogMode ? 'calc(100% - 64px)' : '100%',
          ...sxViewportHeightMinusOffset(isDialogMode ? '64px' : '110px')
        }}
      >
        <Box sx={{ maxWidth: 1040, mx: 'auto', width: '100%' }}>
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 2,
              p: { xs: 2.25, sm: 3 },
              mb: 2,
              color: 'white',
              background: heroGradient,
              boxShadow: isDarkMode
                ? '0 18px 48px rgba(0, 0, 0, 0.35)'
                : '0 18px 48px rgba(15, 58, 29, 0.20)',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: `
                  radial-gradient(circle at 12% 18%, rgba(255,255,255,0.22), transparent 26%),
                  radial-gradient(circle at 85% 20%, rgba(234,179,8,0.22), transparent 30%)
                `,
                pointerEvents: 'none',
              },
            }}
          >
            <Stack spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<AutoStoriesIcon />}
                  label={etiqueta}
                  size="small"
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.14)',
                    border: '1px solid rgba(255,255,255,0.22)',
                    '& .MuiChip-icon': { color: 'white' }
                  }}
                />
                <Chip
                  label={labelTotal}
                  size="small"
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.18)'
                  }}
                />
              </Stack>

              <Box>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 800, lineHeight: 1.05, mb: 1 }}>
                  {titulo}
                </Typography>
                {subtitulo && (
                  <Typography variant="subtitle1" sx={{ maxWidth: 760, color: 'rgba(255,255,255,0.88)', lineHeight: 1.45, textAlign: 'justify' }}>
                    {subtitulo}
                  </Typography>
                )}
                {descricao && (
                  <Typography variant="body2" sx={{ maxWidth: 760, color: 'rgba(255,255,255,0.78)', mt: 1, textAlign: 'justify' }}>
                    {descricao}
                  </Typography>
                )}
                {paragrafos.length > 0 && (
                  <Box sx={{ maxWidth: 760, mt: 1 }}>
                    <Button
                      size="small"
                      onClick={() => setHistoriaAberta((v) => !v)}
                      endIcon={historiaAberta ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      aria-expanded={historiaAberta}
                      sx={{
                        color: 'rgba(255,255,255,0.92)',
                        fontWeight: 700,
                        textTransform: 'none',
                        px: 0,
                        minWidth: 0,
                        '&:hover': { bgcolor: 'transparent', color: 'white' }
                      }}
                    >
                      {historiaAberta ? 'Ver menos' : 'Ver mais'}
                    </Button>
                    {historiaAberta && (
                      <Stack spacing={1.25} sx={{ mt: 0.75 }}>
                        {paragrafos.map((p, i) => (
                          <Typography
                            key={i}
                            variant="body2"
                            sx={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.55, textAlign: 'justify' }}
                          >
                            {p}
                          </Typography>
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}
              </Box>

              {capituloAtual && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: { xs: 'stretch', sm: 'center' },
                    justifyContent: 'space-between',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.18)',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.72)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Continuar leitura
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'white' }}>
                      {labelAtual}{textoAtual ? ` - ${textoAtual}` : ''}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    color="warning"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => handleSelect(capituloAtual)}
                    sx={{ color: '#1f2937', fontWeight: 800, alignSelf: { xs: 'flex-start', sm: 'center' } }}
                  >
                    Continuar
                  </Button>
                </Box>
              )}
            </Stack>
          </Box>

          <TextField
            fullWidth
            size="small"
            placeholder={tipoItem === 'capitulo' ? 'Buscar capítulo ou tema' : 'Buscar pergunta ou assunto'}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
                borderRadius: 2,
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />

          <Grid container spacing={1.5}>
            {capitulosFiltrados.map((cap) => {
              const numero = cap.capitulo || cap.numero
              const texto = cap.titulo || cap.pergunta || `Capítulo ${numero}`
              const isAtual = capituloAtual && (
                (capituloAtual.capitulo === numero) ||
                (capituloAtual.numero === numero)
              )

              return (
                <Grid item xs={12} sm={6} key={numero}>
                  <Card
                    onClick={() => handleSelect(cap)}
                    sx={{
                      height: '100%',
                      bgcolor: 'background.paper',
                      border: isAtual
                        ? `1.5px solid ${theme.palette.warning.main}`
                        : `1px solid ${theme.palette.divider}`,
                      boxShadow: isAtual
                        ? (isDarkMode ? '0 10px 28px rgba(0,0,0,0.32)' : '0 10px 28px rgba(20,83,45,0.12)')
                        : 'none',
                      transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        borderColor: 'primary.main',
                        boxShadow: isDarkMode ? '0 12px 30px rgba(0,0,0,0.35)' : '0 12px 30px rgba(15,58,29,0.10)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          flexShrink: 0,
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: isAtual ? 'warning.main' : 'action.hover',
                          color: isAtual ? '#1f2937' : 'text.primary',
                          fontWeight: 900
                        }}
                      >
                        {numero}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, lineHeight: 1 }}>
                          {cap.titulo ? 'Capítulo' : 'Pergunta'}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 800, lineHeight: 1.25, mt: 0.25 }}>
                          {texto}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}

            {capitulosFiltrados.length === 0 && (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                  <Typography variant="body2">
                    Nenhum item encontrado para esta busca.
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      </Box>
    </>
  )

  if (isDialogMode) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: 'background.default',
          },
        }}
      >
        {content}
      </Dialog>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', ...sxMinViewportHeight(), bgcolor: 'background.default' }}>
      {content}
    </Box>
  )
}
