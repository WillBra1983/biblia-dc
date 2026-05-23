import React from 'react'
import { Typography, Box, Skeleton } from '@mui/material'
import { buscarVersiculo } from '../utils/biblia'
import { useState, useEffect } from 'react'

export const Versiculo = ({ referencia }) => {
  const [versiculos, setVersiculos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    const carregarVersiculo = async () => {
      try {
        setLoading(true)
        setErro(null)
        const resultado = await buscarVersiculo(referencia)
        if (!resultado) {
          setErro(`Versículo não encontrado: ${referencia}`)
        } else {
          setVersiculos(resultado)
        }
      } catch (error) {
        console.error('❌ Erro ao carregar versículo:', error)
        setErro('Erro ao carregar o versículo')
      } finally {
        setLoading(false)
      }
    }

    if (referencia) {
      carregarVersiculo()
    }
  }, [referencia])

  if (loading) {
    return <Skeleton variant="text" width="100%" height={60} />
  }

  if (erro) {
    return (
      <Typography color="error" variant="body2">
        {erro}
      </Typography>
    )
  }

  if (!versiculos) return null

  return (
    <Box sx={{ my: 1 }}>
      <Typography variant="body1" gutterBottom>
        <strong>{referencia}</strong>
      </Typography>
      {versiculos.map((v, i) => (
        <Typography key={i} variant="body1" paragraph>
          {v.texto}
        </Typography>
      ))}
    </Box>
  )
} 