import { Box, Typography, Button, Paper } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import WifiOffOutlined from '@mui/icons-material/WifiOffOutlined'
import { bloqueioOfflineSemConta } from '../utils/conteudoLocalOffline'
import { useLocation } from 'react-router-dom'

/**
 * Offline sem login numa rota só da nuvem (ex.: estudos, configurações).
 */
export default function RotaRequerRedeConta({ children }) {
  const { pathname } = useLocation()

  if (!bloqueioOfflineSemConta(pathname)) {
    return children
  }

  return (
    <Box sx={{ px: 2, py: 4, maxWidth: 480, mx: 'auto' }}>
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <WifiOffOutlined sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
        <Typography variant="h6" gutterBottom fontWeight={700}>
          Acesso limitado
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sem internet não é possível entrar na conta. Use o conteúdo local do app (Bíblia, discipulado,
          quiz…) até a conexão voltar; depois faça login em Conectar.
        </Typography>
        <Button variant="contained" component={RouterLink} to="/">
          Abrir a Bíblia
        </Button>
      </Paper>
    </Box>
  )
}
