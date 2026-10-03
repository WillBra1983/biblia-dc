import { Box, CircularProgress, Divider, List, ListItemButton, Typography } from '@mui/material'

export default function SumarioLivro({ itens, carregando, navegando, onSelect }) {
  return <Box sx={{ mt: 2.5 }}>
    <Divider sx={{ mb: 1.5 }} />
    <Typography component="h3" variant="subtitle1" fontWeight={800}>Sumário / Índice</Typography>
    {carregando ? <Box sx={{ py: 2 }}><CircularProgress size={20} aria-label="Carregando sumário" /></Box>
      : !itens.length ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Este arquivo não possui sumário navegável. O índice pode existir apenas como uma página do livro.</Typography>
        : <List dense aria-label="Capítulos do livro" sx={{ maxHeight: '42dvh', overflow: 'auto', mt: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          {itens.map((item, indice) => <ListItemButton key={indice} disabled={navegando || !item.destino} onClick={() => onSelect(item)} sx={{ pl: 2 + Math.min(item.nivel, 6) * 2, py: 1, borderBottom: indice < itens.length - 1 ? 1 : 0, borderColor: 'divider' }}>
            <Typography variant="body2" sx={{ fontWeight: item.nivel === 0 ? 700 : 400, overflowWrap: 'anywhere' }}>{item.titulo}</Typography>
          </ListItemButton>)}
        </List>}
  </Box>
}
