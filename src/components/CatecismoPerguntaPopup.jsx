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

export default function CatecismoPerguntaPopup({ open, onClose, dados }) {
  if (!dados) return null

  const { tipo, numero, pergunta, resposta, referencias = [] } = dados
  const titulo = tipo === 'CMW' ? 'Catecismo Maior de Westminster' : 'Breve Catecismo de Westminster'

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>
        {titulo} — Pergunta {numero}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Pergunta
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
          {pergunta}
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Resposta
        </Typography>
        <Typography variant="body2" sx={{ mb: referencias.length ? 2 : 0, whiteSpace: 'pre-wrap' }}>
          {resposta}
        </Typography>

        {referencias.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Referências
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {referencias.join('; ')}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}
