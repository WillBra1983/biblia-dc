import { Box, Typography, Dialog, AppBar, Toolbar, IconButton, ButtonBase } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { obterCorLivro } from '../utils/coresBiblia'
import { useEffect, useState } from 'react'
import { sxFullscreenFlexColumn, sxFullscreenScrollBody, sxSafeAreaTop } from '../utils/viewportHeight'
import { contarVersiculos, obterVersiculosPorLivroSync, contarVersiculosPorLivro } from '../services/bibliaService'

export default function VersiculosCards({
  livro,
  capitulo,
  versiculoAtual,
  onSelectVersiculo,
  open,
  onClose,
  onBack
}) {
  // Tentativa síncrona: se `CapitulosCards` já fez `contarVersiculosPorLivro`,
  // pegamos o total imediatamente e a grade renderiza sem flash.
  const totalSincrono = (() => {
    if (!open || !livro || !capitulo) return null
    const map = obterVersiculosPorLivroSync(livro.id)
    return map?.[capitulo] ?? null
  })()

  const [totalVersiculos, setTotalVersiculos] = useState(totalSincrono ?? 0)

  useEffect(() => {
    if (!open || !livro || !capitulo) return

    // 1) Tenta cache síncrono (`O(1)`, sem nenhum await).
    const mapSync = obterVersiculosPorLivroSync(livro.id)
    if (mapSync && mapSync[capitulo] != null) {
      setTotalVersiculos(mapSync[capitulo])
      return
    }

    // 2) Fallback assíncrono — preenche cache para futuras aberturas.
    let cancelado = false
    ;(async () => {
      try {
        const total = await contarVersiculos(livro.id, capitulo)
        if (!cancelado) setTotalVersiculos(total)
        // Pré-carrega o restante para evitar delays nos próximos capítulos.
        contarVersiculosPorLivro(livro.id).catch(() => {})
      } catch (error) {
        console.error('Erro ao contar versículos:', error)
        if (!cancelado) setTotalVersiculos(0)
      }
    })()

    return () => { cancelado = true }
  }, [open, livro, capitulo])

  const handleSelect = (versiculo) => {
    onSelectVersiculo(versiculo)
  }

  // Suporte ao botão de voltar do navegador/celular
  useEffect(() => {
    if (!open) return

    const currentState = window.history.state

    if (!currentState?.dialogType || currentState.dialogType !== 'versiculos') {
      window.history.pushState({ dialogOpen: true, dialogType: 'versiculos' }, '')
    }

    window.__bibliaDialogOpen = (window.__bibliaDialogOpen || 0) + 1

    const handlePopState = () => {
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

  if (!livro || !capitulo || !open) return null

  const corLivro = obterCorLivro(livro.id)
  const versiculos = Array.from({ length: totalVersiculos }, (_, i) => i + 1)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      transitionDuration={0}
      PaperProps={{ sx: sxFullscreenFlexColumn({ bgcolor: 'background.default' }) }}
    >
      <AppBar position="static" elevation={1} sx={{ bgcolor: corLivro, flexShrink: 0, ...sxSafeAreaTop() }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => { if (onBack) onBack(); else onClose() }}
            sx={{ mr: 2 }}
            aria-label="voltar"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, minWidth: 0, fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' }, lineHeight: 1.2 }}>
            {livro.nome} {capitulo} - Selecione um Versículo
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ ...sxFullscreenScrollBody(), p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(6, minmax(0, 1fr))', sm: 'repeat(10, minmax(0, 1fr))', md: 'repeat(12, minmax(0, 1fr))' }, gap: 0.75 }}>
          {versiculos.map((versiculo) => {
            const ativo = versiculoAtual === versiculo
            return (
              <ButtonBase
                key={versiculo}
                onClick={() => handleSelect(versiculo)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: ativo ? corLivro : 'background.paper',
                  color: ativo ? '#fff' : 'text.primary',
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: ativo ? 'rgba(255, 255, 255, 0.85)' : 'divider',
                  boxShadow: 'none',
                  transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  contain: 'layout paint',
                  '&:active': { opacity: 0.85 },
                  '@media (hover: hover)': {
                    '&:hover': {
                      bgcolor: ativo ? corLivro : 'action.hover',
                      borderColor: ativo ? 'rgba(255, 255, 255, 0.85)' : corLivro,
                    }
                  },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 800, fontSize: '0.78rem', lineHeight: 1 }}
                >
                  {versiculo}
                </Typography>
              </ButtonBase>
            )
          })}
        </Box>
      </Box>
    </Dialog>
  )
}
