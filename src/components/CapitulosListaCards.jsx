import { Box, Card, CardContent, Typography, Grid, Dialog, AppBar, Toolbar, IconButton, Drawer } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { getGlassCardStyles } from '../utils/glassCardStyles'
import { useEffect, useState } from 'react'
import MenuCards from './MenuCards'
import { useTheme } from '@mui/material/styles'
import { sxMinViewportHeight, sxViewportHeightMinusOffset } from '../utils/viewportHeight'

/**
 * Gera shimmerDelay determinístico baseado no índice — antes era
 * `Math.random() * 7` recalculado a cada render, fazendo a animação
 * "pular" toda vez que o pai re-renderizava.
 */
function shimmerDelayPorIndice(i, total = 8) {
  const passo = 7 / Math.max(1, total)
  return Number(((i % total) * passo + 0.3).toFixed(2))
}

export default function CapitulosListaCards({ 
  titulo,
  capitulos, // Array de objetos com { numero, titulo } ou { numero, pergunta }
  capituloAtual, 
  onSelectCapitulo, 
  open, 
  onClose,
  gradient = 'linear-gradient(135deg, #f57c00 0%, #e65100 100%)'
}) {
  const theme = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isDarkMode = theme.palette.mode === 'dark'
  const menuCardGradient = isDarkMode
    ? 'linear-gradient(135deg, #000000 0%, #000000 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)'
  const menuCardTextColor = isDarkMode ? 'white' : '#111'

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen)
  }

  const handleSelect = (cap) => {
    onSelectCapitulo(cap)
    if (onClose) {
      onClose()
    }
  }

  const drawer = (
    <Box sx={{ width: '100%', bgcolor: '#004d40', height: '100%', overflow: 'auto' }}>
      <MenuCards menuOpen={drawerOpen} onItemClick={() => setDrawerOpen(false)} />
    </Box>
  )

  // Verifica se está em modo Dialog (tem onClose funcional)
  // Se estiver em modo Dialog, precisa de AppBar próprio
  // Se não estiver, confia no Layout do App para fornecer o AppBar
  const isDialogMode = onClose && typeof onClose === 'function'

  // Suporte ao botão de voltar do navegador/celular (apenas em modo Dialog)
  useEffect(() => {
    if (!open || !isDialogMode) return

    const currentState = window.history.state
    
    // Adiciona uma entrada ao histórico quando o dialog abre
    if (!currentState?.dialogType || currentState.dialogType !== 'capitulos-lista') {
      window.history.pushState({ dialogOpen: true, dialogType: 'capitulos-lista' }, '')
    }

    const handlePopState = () => {
      if (open && onClose) {
        onClose()
      }
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
      <Box sx={{ 
        p: 3, 
        bgcolor: '#004d40',
        overflow: 'auto', 
        height: isDialogMode ? 'calc(100% - 64px)' : '100%',
        ...sxViewportHeightMinusOffset(isDialogMode ? '64px' : '110px')
      }}>
        <Grid container spacing={2}>
          {capitulos.map((cap, idx) => {
            const numero = cap.capitulo || cap.numero
            const texto = cap.titulo || cap.pergunta || `Capítulo ${numero}`
            const isAtual = capituloAtual && (
              (capituloAtual.capitulo === numero) ||
              (capituloAtual.numero === numero)
            )

            return (
              <Grid item xs={12} key={numero}>
                <Card
                  onClick={() => handleSelect(cap)}
                  sx={{
                    ...getGlassCardStyles(menuCardGradient, {
                      hover: true,
                      border: isAtual,
                      shimmer: true,
                      borderRadius: 2,
                      shimmerDelay: shimmerDelayPorIndice(idx),
                    }),
                    color: menuCardTextColor,
                    border: isAtual 
                      ? `2px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)'}` 
                      : `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {cap.titulo ? `Capítulo ${numero}` : `Pergunta ${numero}`}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {texto}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Box>
    </>
  )

  // Se tem onClose funcional, renderiza como Dialog, senão renderiza diretamente
  // Quando renderiza diretamente, o Layout do App fornece o AppBar e menu
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
    <Box sx={{ display: 'flex', flexDirection: 'column', ...sxMinViewportHeight(), bgcolor: '#004d40' }}>
      {content}
    </Box>
  )
}



