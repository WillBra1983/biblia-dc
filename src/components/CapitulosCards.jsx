import { Box, Card, CardContent, Typography, Grid, Dialog, AppBar, Toolbar, IconButton } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { obterCorLivro } from '../utils/coresBiblia'
import { useEffect, useState } from 'react'
import { contarVersiculosPorLivro, obterVersiculosPorLivroSync } from '../services/bibliaService'

export default function CapitulosCards({ 
  livro, 
  capituloAtual, 
  onSelectCapitulo, 
  open, 
  onClose,
  onBack 
}) {
  const handleSelect = (cap) => {
    onSelectCapitulo(cap)
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      onClose()
    }
  }

  // Pré-carrega a contagem de versículos de cada capítulo do livro escolhido —
  // assim, ao abrir `VersiculosCards`, a grade renderiza instantaneamente.
  const [versiculosPorCap, setVersiculosPorCap] = useState(() =>
    livro?.id ? obterVersiculosPorLivroSync(livro.id) : null
  )

  useEffect(() => {
    if (!open || !livro?.id) return
    const sync = obterVersiculosPorLivroSync(livro.id)
    if (sync) {
      setVersiculosPorCap(sync)
      return
    }
    contarVersiculosPorLivro(livro.id)
      .then((map) => setVersiculosPorCap(map))
      .catch(() => {})
  }, [open, livro?.id])

  // Suporte ao botão de voltar do navegador/celular
  useEffect(() => {
    if (!open) return

    const currentState = window.history.state

    // Adiciona uma entrada ao histórico quando o dialog abre, apenas se não for do tipo capitulos
    if (!currentState?.dialogType || currentState.dialogType !== 'capitulos') {
      window.history.pushState({ dialogOpen: true, dialogType: 'capitulos' }, '')
    }

    // Sinaliza globalmente que há um diálogo da Bíblia aberto.
    window.__bibliaDialogOpen = (window.__bibliaDialogOpen || 0) + 1

    const handlePopState = () => {
      // Quando o usuário aperta voltar, volta para livros ou fecha
      // O onBack já decide internamente se deve voltar para livros ou apenas fechar
      if (open) {
        if (onBack) {
          onBack()
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.__bibliaDialogOpen = Math.max(0, (window.__bibliaDialogOpen || 1) - 1)
    }
  }, [open, onBack, onClose])

  // Early return após todos os hooks
  if (!livro || !open) return null

  const capitulos = Array.from({ length: livro.maxCapitulos }, (_, i) => i + 1)
  const corLivro = obterCorLivro(livro.id)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      transitionDuration={0}
      PaperProps={{
        sx: {
          bgcolor: 'background.default',
        },
      }}
    >
      <AppBar position="static" elevation={1} sx={{ bgcolor: corLivro }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => {
              if (onBack) onBack()
              else onClose()
            }}
            sx={{ mr: 2 }}
            aria-label="voltar"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          {livro.nome} - Selecione um Capítulo
        </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 3, overflow: 'auto', height: 'calc(100% - 64px)' }}>

        <Grid container spacing={0.5}>
          {capitulos.map((cap) => {
            const ativo = capituloAtual === cap
            return (
              <Grid item xs={2} sm={1} md={1} lg={1} xl={1} key={cap}>
                <Card
                  onClick={() => handleSelect(cap)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: corLivro,
                    color: '#fff',
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: 1,
                    border: ativo
                      ? '1.5px solid rgba(255, 255, 255, 0.85)'
                      : '1px solid rgba(255, 255, 255, 0.18)',
                    boxShadow: 'none',
                    transition: 'none',
                    '&:active': { opacity: 0.85 },
                  }}
                >
                  <CardContent
                    sx={{
                      p: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      gap: 0.15,
                      '&:last-child': { paddingBottom: 0 },
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, fontSize: '0.78rem', lineHeight: 1 }}
                    >
                      {cap}
                    </Typography>
                    {versiculosPorCap?.[cap] ? (
                      <Typography
                        variant="caption"
                        sx={{ fontSize: '0.52rem', lineHeight: 1, opacity: 0.88 }}
                      >
                        {versiculosPorCap[cap]} v.
                      </Typography>
                    ) : null}
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Box>
    </Dialog>
  )
}

