import React from 'react'
import { Box } from '@mui/material'
import { Typography } from '@mui/material'
import { buscarReferencia } from '../services/bibliaService'
import VersiculoPopup from './VersiculoPopup'

export default function VersiculoLink({ referencia }) {
  const [versiculosPopup, setVersiculosPopup] = useState(null)
  
  const handleClick = async () => {
    try {
      const versiculos = await buscarReferencia(referencia)
      if (versiculos) {
        setVersiculosPopup(versiculos)
      }
    } catch (error) {
      console.error('Erro ao carregar versículo:', error)
    }
  }

  return (
    <Box
      component="span"
      sx={{
        color: 'primary.main',
        cursor: 'pointer',
        textDecoration: 'underline',
        '&:hover': {
          color: 'primary.dark'
        }
      }}
    >
      {referencia}
    </Box>
  )
} 