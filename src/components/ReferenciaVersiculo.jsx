import React, { useState } from 'react'
import { Typography, Box, Link } from '@mui/material'
import VersiculoPopup from './VersiculoPopup'
import { buscarLivroPorNome } from '../services/bibliaService'
import { extrairReferenciaBiblica } from '../utils/biblia'

export default function ReferenciaVersiculo({ referencia }) {
  const [versiculosPopup, setVersiculosPopup] = useState(null)
  const linhas = referencia.split('\n')
  const titulo = linhas[0]
  const texto = linhas.slice(1).join('\n')

  const handleClick = async (e) => {
    e.preventDefault()
    try {
      // Extrai os detalhes da referência usando a mesma função do TextoComReferencias
      const referencias = extrairReferenciaBiblica(titulo)
      if (referencias.length > 0) {
        const ref = referencias[0]
        
        // Busca o ID do livro
        const livro = await buscarLivroPorNome(ref.livro)
        if (!livro) {
          console.error('Livro não encontrado:', ref.livro)
          return
        }

        // Busca os versículos usando os dados extraídos
        const versiculos = await buscarIntervaloVersiculos(
          livro.id,
          ref.capitulo,
          ref.versiculoInicio,
          ref.versiculoFim || ref.versiculoInicio
        )

        if (versiculos) {
          setVersiculosPopup(versiculos)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar versículo:', error)
    }
  }

  return (
    <Box>
      <Link
        component="button"
        variant="body1"
        onClick={handleClick}
        sx={{ 
          textAlign: 'left',
          fontWeight: 'bold',
          color: 'primary.main',
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'underline',
            color: 'primary.dark'
          }
        }}
      >
        {titulo}
      </Link>
      {texto && (
        <Typography sx={{ mt: 1 }}>
          {texto}
        </Typography>
      )}

      {versiculosPopup && (
        <VersiculoPopup 
          versiculos={versiculosPopup}
          onClose={() => setVersiculosPopup(null)}
        />
      )}
    </Box>
  )
} 