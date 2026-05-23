import { useEffect, useState, useCallback, useRef } from 'react'
import { Snackbar, Alert, Typography, Box } from '@mui/material'
import { dispararConfetePorTipo } from '../utils/celebracaoConfetti'

/**
 * Escuta `app-incentivo` — fila de mensagens, confete em `detail.meta.confete`,
 * versículo opcional em `detail.versiculoDestaque`.
 */
export default function IncentivosListener() {
  const [aberto, setAberto] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [versiculo, setVersiculo] = useState('')
  const [severidade, setSeveridade] = useState('success')
  const filaRef = useRef([])
  const abertoRef = useRef(false)

  const processarFila = useCallback(() => {
    if (abertoRef.current) return
    const fila = filaRef.current
    const item = fila.shift()
    if (!item) return
    const msg = String(item?.mensagem || '').trim()
    if (!msg) {
      processarFila()
      return
    }
    setMensagem(msg)
    setVersiculo(String(item?.versiculoDestaque || '').trim())
    setSeveridade(item?.severidade === 'info' ? 'info' : 'success')
    const confete = item?.meta?.confete
    if (confete && confete !== 'nenhum') {
      dispararConfetePorTipo(confete)
    }
    abertoRef.current = true
    setAberto(true)
  }, [])

  const enfileirar = useCallback(
    (detail) => {
      const msg = String(detail?.mensagem || '').trim()
      if (!msg) return
      filaRef.current.push(detail)
      processarFila()
    },
    [processarFila]
  )

  useEffect(() => {
    const onInc = (e) => {
      enfileirar(e.detail || {})
    }
    window.addEventListener('app-incentivo', onInc)
    return () => window.removeEventListener('app-incentivo', onInc)
  }, [enfileirar])

  const aoFechar = useCallback(() => {
    abertoRef.current = false
    setAberto(false)
    setVersiculo('')
    setTimeout(() => processarFila(), 100)
  }, [processarFila])

  return (
    <Snackbar
      open={aberto}
      autoHideDuration={versiculo ? 9000 : 6500}
      onClose={aoFechar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={aoFechar}
        severity={severidade}
        variant="filled"
        sx={{ width: '100%', maxWidth: 440 }}
      >
        <Box component="span" sx={{ display: 'block' }}>
          {mensagem}
        </Box>
        {versiculo ? (
          <Typography
            variant="caption"
            component="span"
            sx={{ display: 'block', mt: 1, opacity: 0.95, fontStyle: 'italic', lineHeight: 1.45 }}
          >
            “{versiculo.length > 220 ? `${versiculo.slice(0, 217)}…` : versiculo}”
          </Typography>
        ) : null}
      </Alert>
    </Snackbar>
  )
}
