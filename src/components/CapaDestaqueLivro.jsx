import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import { urlCapaLivro } from '../data/livrosCatalogo'

export default function CapaDestaqueLivro({ livro }) {
  const url = livro?.capa ? urlCapaLivro(livro.capa) : ''
  const [falhou, setFalhou] = useState('')
  return url && falhou !== url ? <Box component="img" src={url} alt={`Capa de ${livro.titulo}`} draggable={false} onError={() => setFalhou(url)} sx={{ width: '100%', height: { xs: 205, sm: 220 }, objectFit: 'contain' }} /> : <Box sx={{ height: { xs: 205, sm: 220 }, width: '100%', p: 1.5, boxSizing: 'border-box', bgcolor: '#173e35', color: '#fff', border: '1px solid #e4bd68', display: 'flex', alignItems: 'center', justifyContent: 'center', textShadow: 'none' }}><Typography fontWeight={700}>{livro?.titulo || 'Livro'}</Typography></Box>
}
