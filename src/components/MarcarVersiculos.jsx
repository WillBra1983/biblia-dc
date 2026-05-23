import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  IconButton,
  Chip,
  Stack
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import { CORES_DISPONIVEIS, marcarVersiculos, desmarcarVersiculo } from '../services/versiculosMarcadosService'

export default function MarcarVersiculos({ 
  open, 
  onClose, 
  versiculosSelecionados = [],
  livro,
  capitulo
}) {
  const [corSelecionada, setCorSelecionada] = useState(null)

  const handleMarcar = () => {
    if (!corSelecionada || versiculosSelecionados.length === 0) return

    const versiculosParaMarcar = versiculosSelecionados.map(v => ({
      livroId: livro?.id || v.livroId,
      capitulo: capitulo || v.capitulo,
      versiculo: v.versiculo,
      texto: v.texto || ''
    }))

    marcarVersiculos(versiculosParaMarcar, corSelecionada)
    onClose()
    setCorSelecionada(null)
  }

  const handleDesmarcar = () => {
    if (versiculosSelecionados.length === 0) return

    versiculosSelecionados.forEach(v => {
      desmarcarVersiculo(
        livro?.id || v.livroId,
        capitulo || v.capitulo,
        v.versiculo
      )
    })

    onClose()
  }

  const handleClose = () => {
    setCorSelecionada(null)
    onClose()
  }

  // Suporte ao botão voltar do celular
  useEffect(() => {
    if (!open) return
    if (!window.history.state?.dialogType || window.history.state.dialogType !== 'marcar-versiculos') {
      window.history.pushState({ dialogType: 'marcar-versiculos' }, '')
    }
    const handlePopState = () => {
      if (open) handleClose()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [open, onClose])

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BookmarkIcon />
            <Typography variant="h6">
              Marcar Versículo{versiculosSelecionados.length > 1 ? 's' : ''}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {versiculosSelecionados.length === 1 
              ? `Versículo ${versiculosSelecionados[0].versiculo} selecionado`
              : `${versiculosSelecionados.length} versículos selecionados`
            }
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
            Escolha uma cor:
          </Typography>

          <Grid container spacing={1.5}>
            {CORES_DISPONIVEIS.map((cor) => (
              <Grid item xs={6} sm={4} key={cor.id}>
                <Box
                  onClick={() => setCorSelecionada(cor.id)}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: 2,
                    borderColor: corSelecionada === cor.id ? cor.corEscura : 'divider',
                    bgcolor: corSelecionada === cor.id ? `${cor.cor}20` : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: `${cor.cor}30`,
                      transform: 'scale(1.02)'
                    }
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      height: 40,
                      borderRadius: 1,
                      bgcolor: cor.cor,
                      mb: 1,
                      boxShadow: corSelecionada === cor.id ? 3 : 1
                    }}
                  />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: corSelecionada === cor.id ? 'bold' : 'normal',
                      color: corSelecionada === cor.id ? cor.corEscura : 'text.primary'
                    }}
                  >
                    {cor.nome}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancelar
        </Button>
        <Button 
          onClick={handleDesmarcar} 
          variant="outlined"
          color="error"
          disabled={versiculosSelecionados.length === 0}
        >
          Desmarcar
        </Button>
        <Button
          onClick={handleMarcar}
          variant="contained"
          disabled={!corSelecionada || versiculosSelecionados.length === 0}
          sx={{
            bgcolor: corSelecionada 
              ? CORES_DISPONIVEIS.find(c => c.id === corSelecionada)?.cor 
              : 'primary.main',
            '&:hover': {
              bgcolor: corSelecionada 
                ? CORES_DISPONIVEIS.find(c => c.id === corSelecionada)?.corEscura 
                : 'primary.dark'
            }
          }}
        >
          Marcar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

