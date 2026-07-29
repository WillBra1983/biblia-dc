import { useEffect, useState } from 'react'
import { Box, CircularProgress, List, ListItemButton, ListItemText, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { listarVersiculosDoDia } from '../services/versiculoDoDiaService'

function formatarData(valor) {
  const [ano, mes, dia] = String(valor || '').split('-').map(Number)
  return ano && mes && dia ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(ano, mes - 1, dia)) : valor
}

export default function VersiculosDoDiaArquivo() {
  const navigate = useNavigate()
  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    listarVersiculosDoDia().then(setItens).finally(() => setCarregando(false))
  }, [])
  if (carregando) return <Box sx={{ width: '100%', minHeight: '55vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  return (
    <Box sx={{ width: '100%', p: 1, boxSizing: 'border-box' }}>
      <Typography variant="h5" sx={{ px: 1, py: 1.5, fontFamily: 'Georgia, serif', fontWeight: 800 }}>Versículos dos dias anteriores</Typography>
      <List disablePadding sx={{ maxWidth: 900, mx: 'auto' }}>
        {itens.map((item) => (
          <ListItemButton key={item.data} onClick={() => navigate(`/versiculo-do-dia?data=${encodeURIComponent(item.data)}`)} sx={{ mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, alignItems: 'flex-start' }}>
            <ListItemText
              primary={item.referencia}
              secondary={`${item.texto} · ${formatarData(item.data)}`}
              primaryTypographyProps={{ fontWeight: 900, fontFamily: 'Georgia, serif' }}
              secondaryTypographyProps={{ sx: { mt: .6, lineHeight: 1.5 } }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  )
}
