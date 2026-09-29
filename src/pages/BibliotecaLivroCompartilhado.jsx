import { useEffect } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'

export default function BibliotecaLivroCompartilhado() {
  const { livroArquivo = '' } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const livroId = decodeURIComponent(livroArquivo).replace(/\.html$/i, '')
    navigate(`/biblioteca/${encodeURIComponent(livroId)}?abrir=1&origem=compartilhamento`, { replace: true })
  }, [livroArquivo, navigate])

  return <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /></Box>
}
