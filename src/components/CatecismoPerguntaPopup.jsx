import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider
} from '@mui/material'
import { sxSafeAreaBottom, sxSafeAreaTop } from '../utils/viewportHeight'
import TextoComReferencias from './TextoComReferencias'

export default function CatecismoPerguntaPopup({ open, onClose, dados }) {
  if (!dados) return null

  const { tipo, numero } = dados
  const itens = Array.isArray(dados.itens) && dados.itens.length ? dados.itens : [dados]
  const titulo = tipo === 'CMW'
    ? 'Catecismo Maior de Westminster'
    : tipo === 'CH'
      ? 'Catecismo de Heidelberg'
      : 'Breve Catecismo de Westminster'

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper" sx={{ zIndex: 1400 }}>
      <DialogTitle sx={sxSafeAreaTop('8px')}>
        {titulo} — {itens.length > 1 ? 'Perguntas' : 'Pergunta'} {numero}
      </DialogTitle>
      <DialogContent dividers>
        {itens.map((item, index) => {
          const referencias = item.referencias || []
          return (
            <Box key={`${item.tipo}-${item.numero}`}>
              {itens.length > 1 && (
                <Typography sx={{ mb: 1, fontWeight: 800 }}>Pergunta {item.numero}</Typography>
              )}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Pergunta</Typography>
              <TextoComReferencias texto={item.pergunta} style={{ marginBottom: 16, whiteSpace: 'pre-wrap' }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {tipo === 'CH' ? 'Síntese da resposta' : 'Resposta'}
              </Typography>
              <TextoComReferencias
                texto={item.resposta}
                style={{ marginBottom: referencias.length ? 16 : 0, whiteSpace: 'pre-wrap' }}
              />
              {referencias.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Referências</Typography>
                  <TextoComReferencias texto={referencias.join('; ')} style={{ whiteSpace: 'pre-wrap' }} />
                </Box>
              )}
              {index < itens.length - 1 && <Divider sx={{ my: 2.5 }} />}
            </Box>
          )
        })}
      </DialogContent>
      <DialogActions sx={sxSafeAreaBottom('8px')}>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}
