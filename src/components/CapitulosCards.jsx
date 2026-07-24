import { Box, Typography, Dialog, AppBar, Toolbar, IconButton, ButtonBase } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useEffect, useState } from 'react'
import { obterCorLivro } from '../utils/coresBiblia'
import { sxFullscreenFlexColumn, sxFullscreenScrollBody, sxSafeAreaTop } from '../utils/viewportHeight'
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
        sx: sxFullscreenFlexColumn({ bgcolor: 'background.default' }),
      }}
    >
      <AppBar position="static" elevation={1} sx={{ bgcolor: corLivro, flexShrink: 0, ...sxSafeAreaTop() }}>
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
          <Typography variant="h6" sx={{ flexGrow: 1, minWidth: 0, fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' }, lineHeight: 1.2 }}>
            {livro.nome} - Selecione um Capítulo
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ ...sxFullscreenScrollBody(), p: { xs: 2, sm: 3 } }}>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(6, minmax(0, 1fr))', sm: 'repeat(10, minmax(0, 1fr))', md: 'repeat(12, minmax(0, 1fr))' }, gap: 0.75 }}>
          {capitulos.map((cap) => {
            const ativo = capituloAtual === cap
            return (
              <ButtonBase
                key={cap}
                onClick={() => handleSelect(cap)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: corLivro,
                  color: '#fff',
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: ativo
                    ? 'rgba(255, 255, 255, 0.95)'
                    : 'rgba(255, 255, 255, 0.22)',
                  boxShadow: 'none',
                  transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.15,
                  contain: 'layout paint',
                  '&:active': { opacity: 0.85 },
                  '@media (hover: hover)': {
                    '&:hover': {
                      bgcolor: corLivro,
                      borderColor: 'rgba(255, 255, 255, 0.95)',
                      filter: 'brightness(1.06)',
                    }
                  },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 800, fontSize: '0.78rem', lineHeight: 1 }}
                >
                  {cap}
                </Typography>
                {versiculosPorCap?.[cap] ? (
                  <Typography
                    variant="caption"
                    sx={{ fontSize: '0.52rem', lineHeight: 1, opacity: 0.78 }}
                  >
                    {versiculosPorCap[cap]} v.
                  </Typography>
                ) : null}
              </ButtonBase>
            )
          })}
        </Box>
      </Box>
    </Dialog>
  )
}
