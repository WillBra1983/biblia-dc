import React from 'react'
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import NavigateNext from '@mui/icons-material/NavigateNext'
import { livros as livrosData } from '../data/biblia'

function marcarTexto(texto, termo) {
  const raw = String(texto || '')
  const t = String(termo || '').trim()
  if (!raw || !t) return raw
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${esc})`, 'gi')
  const parts = raw.split(regex)
  return parts.map((p, idx) =>
    p.toLowerCase() === t.toLowerCase() ? (
      <Box key={`hl-${idx}`} component="mark" sx={{ bgcolor: '#f7d84b', color: '#111', px: 0.1 }}>
        {p}
      </Box>
    ) : (
      <React.Fragment key={`tx-${idx}`}>{p}</React.Fragment>
    )
  )
}

const rotuloSx = {
  mb: 0.75,
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'text.secondary',
}

function termoDestaqueTraducao(significadoPtAlvo) {
  return String(significadoPtAlvo || '')
    .split(/[;,/]/)[0]
    .trim()
    .split(/\s+/)[0]
}

export default function StrongOcorrenciaDialog({
  open,
  loading,
  item,
  idx,
  total,
  original,
  traducao,
  significadoPtAlvo,
  termoDestaque,
  sxTextoLeitura,
  onClose,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const titulo = (() => {
    if (!item) return 'Ocorrência detalhada'
    const livro = livrosData.find((l) => Number(l.id) === Number(item.livroId))?.nome || 'Livro'
    const pos = idx >= 0 ? idx + 1 : 0
    return `${livro} ${item.capitulo}:${item.versiculo}${pos > 0 && total > 0 ? ` · ${pos}/${total}` : ''}`
  })()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle>
        {titulo}
        {!!significadoPtAlvo && (
          <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.4, fontSize: '1rem' }}>
            &ldquo;{significadoPtAlvo}&rdquo;
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers sx={{ minHeight: { xs: '42vh', sm: '52vh' } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
            <CircularProgress size={22} />
          </Box>
        ) : (
          <>
            <Typography sx={rotuloSx}>Original</Typography>
            <Box
              sx={{
                mb: 2,
                px: 1.75,
                py: 1.25,
                borderRadius: 2.5,
                bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f4f6'),
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body1" sx={{ ...sxTextoLeitura, m: 0 }}>
                {marcarTexto(original, termoDestaque)}
              </Typography>
            </Box>
            <Typography sx={rotuloSx}>Tradução</Typography>
            <Box
              sx={{
                px: 1.75,
                py: 1.25,
                borderRadius: 2.5,
                bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f4f6'),
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body1" sx={{ ...sxTextoLeitura, m: 0 }}>
                {marcarTexto(traducao, termoDestaqueTraducao(significadoPtAlvo))}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <IconButton onClick={onPrev} disabled={loading || prevDisabled} aria-label="ocorrência anterior">
          <NavigateBefore />
        </IconButton>
        <IconButton onClick={onNext} disabled={loading || nextDisabled} aria-label="próxima ocorrência">
          <NavigateNext />
        </IconButton>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}
