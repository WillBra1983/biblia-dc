/**
 * Tela `/admin/notificar`: permite a um administrador disparar um aviso
 * push para todos os usuários inscritos no topic `novidades`.
 *
 * Só é acessível por usuários com `users/{uid}/admin === true` no RTDB.
 * Se não for admin, redirecionamos para a Bíblia.
 *
 * O envio é feito chamando a callable `enviarAvisoAdmin` (em
 * `functions/src/enviarAvisoAdmin.js`).
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Stack,
  TextField,
  Button,
  Alert,
  CircularProgress
} from '@mui/material'
import CampaignIcon from '@mui/icons-material/Campaign'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import {
  getFirebaseDatabase,
  getFirebaseFunctions,
  loadFirebaseModules
} from '../config/firebase'
import { mostrarSnackbar, confirmarAsync } from '../utils/uiDialogs'

const ROTAS_SUGERIDAS = [
  { label: 'Devocional', value: '/devocional' },
  { label: 'Estudos Compartilhados', value: '/estudos-biblicos' },
  { label: 'Plano de leitura', value: '/plano' },
  { label: 'Mais de Deus', value: '/mais-de-deus' },
  { label: 'Bíblia (início)', value: '/' }
]

export default function AdminNotificar() {
  const { user } = useFirebaseAuth()
  const navigate = useNavigate()
  const [checandoAdmin, setChecandoAdmin] = useState(true)
  const [ehAdmin, setEhAdmin] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [url, setUrl] = useState('/')
  const [enviando, setEnviando] = useState(false)
  const [ultimoEnvio, setUltimoEnvio] = useState(null)

  useEffect(() => {
    let cancelado = false
    async function checar() {
      setChecandoAdmin(true)
      if (!user?.uid) {
        if (user !== undefined && !cancelado) {
          mostrarSnackbar({
            mensagem: 'Entre na sua conta para acessar a área administrativa.',
            severidade: 'info'
          })
          navigate('/chat')
        }
        return
      }
      try {
        await loadFirebaseModules()
        const db = getFirebaseDatabase()
        if (!db) throw new Error('Firebase indisponível')
        const { ref, get } = await import('firebase/database')
        const snap = await get(ref(db, `users/${user.uid}/admin`))
        const isAdm = snap.val() === true
        if (cancelado) return
        setEhAdmin(isAdm)
        if (!isAdm) {
          mostrarSnackbar({
            mensagem: 'Área restrita a administradores.',
            severidade: 'warning'
          })
          navigate('/')
        }
      } catch (_) {
        if (!cancelado) navigate('/')
      } finally {
        if (!cancelado) setChecandoAdmin(false)
      }
    }
    void checar()
    return () => { cancelado = true }
  }, [user, navigate])

  async function enviar() {
    const t = titulo.trim()
    const m = mensagem.trim()
    const u = (url || '/').trim()
    if (!t || !m) {
      mostrarSnackbar({
        mensagem: 'Preencha título e mensagem.',
        severidade: 'warning'
      })
      return
    }
    const ok = await confirmarAsync({
      titulo: 'Enviar aviso a todos?',
      mensagem: `“${t}” será enviado a todos os usuários inscritos. Deseja continuar?`,
      labelOk: 'Enviar'
    })
    if (!ok) return

    setEnviando(true)
    try {
      await loadFirebaseModules()
      const fns = getFirebaseFunctions()
      if (!fns) throw new Error('Cloud Functions indisponível')
      const { httpsCallable } = await import('firebase/functions')
      const fn = httpsCallable(fns, 'enviarAvisoAdmin')
      const res = await fn({ titulo: t, mensagem: m, url: u, topic: 'novidades' })
      setUltimoEnvio({
        quando: Date.now(),
        titulo: t,
        mensagem: m,
        messageId: res?.data?.messageId
      })
      setTitulo('')
      setMensagem('')
      mostrarSnackbar({
        mensagem: 'Aviso enviado.',
        severidade: 'success'
      })
    } catch (e) {
      mostrarSnackbar({
        mensagem: e?.message || 'Falha ao enviar.',
        severidade: 'error'
      })
    } finally {
      setEnviando(false)
    }
  }

  if (checandoAdmin || !ehAdmin) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <CampaignIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Enviar aviso aos usuários
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Será enviado para todos os aparelhos inscritos no topic <code>novidades</code>.
        Usuários que desligaram esse switch nas Configurações não recebem.
      </Alert>

      <Stack spacing={2}>
        <TextField
          label="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value.slice(0, 120))}
          fullWidth
          inputProps={{ maxLength: 120 }}
        />
        <TextField
          label="Mensagem"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value.slice(0, 500))}
          multiline
          minRows={3}
          fullWidth
          inputProps={{ maxLength: 500 }}
          helperText={`${mensagem.length}/500`}
        />
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Ao tocar na notificação, abrir:
          </Typography>
          <TextField
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            fullWidth
            size="small"
            placeholder="/"
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
            {ROTAS_SUGERIDAS.map((r) => (
              <Button
                key={r.value}
                size="small"
                variant={url === r.value ? 'contained' : 'outlined'}
                onClick={() => setUrl(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </Stack>
        </Box>

        <Button
          variant="contained"
          onClick={enviar}
          disabled={enviando || !titulo.trim() || !mensagem.trim()}
          size="large"
        >
          {enviando ? 'Enviando…' : 'Enviar agora'}
        </Button>

        {ultimoEnvio && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Último envio: {new Date(ultimoEnvio.quando).toLocaleString()}
            </Typography>
            <Typography variant="caption">
              {ultimoEnvio.titulo} — {ultimoEnvio.mensagem}
            </Typography>
          </Alert>
        )}
      </Stack>
    </Container>
  )
}
