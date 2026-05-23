import { useState } from 'react'
import { TextField, Box, Autocomplete, Button, Typography } from '@mui/material'
import { hinos } from '../data/hinos'

export default function BuscaHinos({ onHinoSelecionado }) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState([])

  const buscar = () => {
    const termoLower = termo.toLowerCase()
    const encontrados = hinos.filter(hino => 
      hino.numero.toString().includes(termoLower) ||
      hino.titulo.toLowerCase().includes(termoLower) ||
      hino.estrofes.some(estrofe => 
        estrofe.toLowerCase().includes(termoLower)
      )
    )
    setResultados(encontrados)
  }

  return (
    <Box>
      <TextField
        fullWidth
        label="Buscar hinos"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && buscar()}
        helperText="Busque por número, título ou letra"
      />
      <Button onClick={buscar}>Buscar</Button>

      {resultados.map(hino => (
        <Box 
          key={hino.numero}
          sx={{ cursor: 'pointer', p: 1 }}
          onClick={() => onHinoSelecionado(hino.numero)}
        >
          <Typography>
            {hino.numero}. {hino.titulo}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {hino.estrofes[0].substring(0, 50)}...
          </Typography>
        </Box>
      ))}
    </Box>
  )
} 