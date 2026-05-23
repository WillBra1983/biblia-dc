import { useEffect, useMemo, useState } from 'react'
import { useRouteError, isRouteErrorResponse } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import {
  deployChunkRecoverJaExecutado,
  isErroCarregamentoChunkOuModulo,
  recuperarAssetsDesatualizadosERecarregar,
} from '../utils/chunkLoadRecovery'

/**
 * `errorElement` na raiz do router: falhas de `React.lazy()` após deploy
 * (chunk 404) disparam aqui — tentamos o mesmo fluxo de limpeza + reload.
 */
export default function RecoverFromDeployError() {
  const error = useRouteError()
  const chunk = useMemo(() => isErroCarregamentoChunkOuModulo(error), [error])
  const emProd = import.meta.env.PROD
  const deveRecuperar = chunk && emProd
  const [manual, setManual] = useState(() => deveRecuperar && deployChunkRecoverJaExecutado())

  useEffect(() => {
    if (!deveRecuperar) return
    if (deployChunkRecoverJaExecutado()) {
      setManual(true)
      return
    }
    void recuperarAssetsDesatualizadosERecarregar()
  }, [deveRecuperar])

  if (deveRecuperar && !manual) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', maxWidth: 420, mx: 'auto' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="body1">Nova versão do site — a atualizar…</Typography>
      </Box>
    )
  }

  if (deveRecuperar && manual) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', maxWidth: 480, mx: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Não foi possível carregar um arquivo da aplicação
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tente atualizar a página com o cache limpo (por exemplo Ctrl+F5 no Windows) ou
          limpar os dados do site para este domínio nas configurações do navegador.
        </Typography>
      </Box>
    )
  }

  const detalhe = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error?.stack || error?.message || String(error)

  return (
    <Box sx={{ p: 3, maxWidth: 560, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Erro inesperado
      </Typography>
      <Typography
        component="pre"
        variant="caption"
        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}
      >
        {detalhe}
      </Typography>
    </Box>
  )
}
