import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box
} from '@mui/material'
import TextoComReferencias from './TextoComReferencias'

/**
 * Popup com o texto integral do parágrafo da Confissão de Fé de Westminster.
 */
export default function CfwParagrafoPopup({ open, onClose, dados }) {
  if (!dados) return null
  const { capitulo, tituloCapitulo, numero, texto } = dados

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>
        Confissão de Fé — Cap. {capitulo}
        {tituloCapitulo ? `: ${tituloCapitulo}` : ''}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          Parágrafo {numero}
        </Typography>
        <Box sx={{ typography: 'body2', lineHeight: 1.65 }}>
          <TextoComReferencias texto={texto} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}
