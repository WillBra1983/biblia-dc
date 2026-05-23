import React, { useState } from 'react'
import { Typography, Box } from '@mui/material'
import { buscarReferencia } from '../services/bibliaService'
import VersiculoPopup from './VersiculoPopup'

export default function ReferenciaComTexto({ titulo, texto }) {
  const [versiculosPopup, setVersiculosPopup] = useState(null)
  
  const handleClick = async () => {
    try {
      const versiculos = await buscarReferencia(titulo)
      if (versiculos) {
        setVersiculosPopup(versiculos)
      }
    } catch (error) {
      console.error('Erro ao carregar versículo:', error)
    }
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          cursor: 'pointer',
          '&:hover': {
            color: 'primary.dark'
          }
        }}
        onClick={handleClick}
      >
        <Typography
          component="div"
          sx={{
            color: 'primary.main',
            fontWeight: 'bold',
            mb: 0.5
          }}
        >
          {titulo}
        </Typography>
        <Typography sx={{ color: 'text.primary' }}>
          {texto}
        </Typography>
      </Box>

      {versiculosPopup && (
        <VersiculoPopup 
          versiculos={versiculosPopup}
          onClose={() => setVersiculosPopup(null)}
        />
      )}
    </Box>
  )
} 