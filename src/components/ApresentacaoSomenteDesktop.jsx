import { useEffect } from 'react'
import { Box, Typography, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { usePodeUsarModoApresentacao } from '../utils/modoApresentacaoDispositivo'

/**
 * Bloqueia modo apresentação em celular/tablet e no app nativo.
 */
export default function ApresentacaoSomenteDesktop({ children, voltarPara = '/' }) {
  const navigate = useNavigate()
  const pode = usePodeUsarModoApresentacao()

  useEffect(() => {
    if (!pode) {
      navigate(voltarPara, { replace: true })
    }
  }, [pode, navigate, voltarPara])

  if (!pode) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          p: 3,
          textAlign: 'center',
        }}
      >
        <Typography variant="h6">Modo apresentação</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 360 }}>
          Disponível apenas no computador (tela ampla). No celular ou no aplicativo, use a leitura
          normal.
        </Typography>
        <Button variant="contained" onClick={() => navigate(voltarPara, { replace: true })}>
          Voltar
        </Button>
      </Box>
    )
  }

  return children
}
