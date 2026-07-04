import React, { useState, useEffect } from 'react'
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Slider
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import {
  sxFullscreenFlexColumn,
  sxFullscreenScrollBody,
  sxSafeAreaBottom,
  sxSafeAreaTop,
} from '../utils/viewportHeight'

export default function VersiculoPopup({ versiculos, onClose }) {
  const [zoom, setZoom] = useState(100)

  useEffect(() => {
    const handlePopState = (event) => {
      if (onClose) {
        onClose();
        window.history.pushState(null, '');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onClose]);

  if (!versiculos || versiculos.length === 0) return null

  const formatarTitulo = () => {
    const getNumero = (v) => Number(v?.numero ?? v?.versiculo ?? 0)
    const getCapitulo = (v) => Number(v?.capitulo ?? 0)

    const ordenados = [...versiculos]
      .filter((v) => v && v.livro && getCapitulo(v) > 0 && getNumero(v) > 0)
      .sort((a, b) => {
        const byLivro = String(a.livro).localeCompare(String(b.livro))
        if (byLivro !== 0) return byLivro
        const byCap = getCapitulo(a) - getCapitulo(b)
        if (byCap !== 0) return byCap
        return getNumero(a) - getNumero(b)
      })

    if (ordenados.length === 0) return ''

    const livros = [...new Set(ordenados.map((v) => String(v.livro)))]
    if (livros.length > 1) {
      return livros.join(' | ')
    }

    const livro = livros[0]

    const porCapitulo = new Map()
    for (const v of ordenados) {
      const cap = getCapitulo(v)
      const num = getNumero(v)
      if (!porCapitulo.has(cap)) porCapitulo.set(cap, new Set())
      porCapitulo.get(cap).add(num)
    }

    const formatarRanges = (numsSet) => {
      const nums = [...numsSet].sort((a, b) => a - b)
      const partes = []
      let ini = nums[0]
      let fim = nums[0]

      for (let i = 1; i < nums.length; i++) {
        const n = nums[i]
        if (n === fim + 1) {
          fim = n
          continue
        }
        partes.push(ini === fim ? `${ini}` : `${ini}-${fim}`)
        ini = n
        fim = n
      }
      partes.push(ini === fim ? `${ini}` : `${ini}-${fim}`)
      // Usa "; " para refletir melhor referências não contínuas (ex.: 2:17; 22; 26)
      return partes.join('; ')
    }

    const capsOrdenados = [...porCapitulo.keys()].sort((a, b) => a - b)
    const ref = capsOrdenados
      .map((cap) => `${cap}:${formatarRanges(porCapitulo.get(cap))}`)
      .join('; ')

    return `${livro} ${ref}`
  }

  return (
    <Dialog 
      open={true} 
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen
      PaperProps={{
        sx: sxFullscreenFlexColumn({ boxSizing: 'border-box' }),
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          flexShrink: 0,
          ...sxSafeAreaTop('8px'),
          px: 2,
          pl: 'calc(16px + env(safe-area-inset-left, 0px))',
          pr: 'calc(8px + env(safe-area-inset-right, 0px))',
          pb: 1.5,
          bgcolor: 'grey.900',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography sx={{ flex: 1, minWidth: 0, pr: 1 }}>{formatarTitulo()}</Typography>
        <IconButton
          onClick={onClose}
          aria-label="Fechar leitura"
          sx={{
            color: 'white',
            flexShrink: 0,
            width: 44,
            height: 44,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={sxFullscreenScrollBody({
          p: 3,
          pl: 'calc(24px + env(safe-area-inset-left, 0px))',
          pr: 'calc(24px + env(safe-area-inset-right, 0px))',
          '&.MuiDialogContent-root': { padding: 3 },
        })}
      >
        {versiculos.map((versiculo) => (
          <Typography 
            key={`${versiculo.capitulo ?? 0}:${versiculo.numero ?? versiculo.versiculo ?? 0}`}
            sx={{ 
              mb: 2,
              fontSize: `${zoom}%`,
              lineHeight: 1.6
            }}
          >
            {versiculo.texto}
          </Typography>
        ))}
      </DialogContent>

      <Box
        sx={{
          flexShrink: 0,
          bgcolor: 'grey.900',
          color: 'white',
          px: 3,
          pl: 'calc(24px + env(safe-area-inset-left, 0px))',
          pr: 'calc(24px + env(safe-area-inset-right, 0px))',
          py: 1.5,
          ...sxSafeAreaBottom('0px'),
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          justifyContent: 'center',
        }}
      >
        <Slider
          value={zoom}
          min={100}
          max={200}
          step={10}
          onChange={(_, value) => setZoom(value)}
          sx={{ 
            width: 120,
            color: 'white',
            '& .MuiSlider-rail': { bgcolor: 'grey.600' }
          }}
        />
        <Typography sx={{ minWidth: 45 }}>
          {zoom}%
        </Typography>
      </Box>
    </Dialog>
  )
} 