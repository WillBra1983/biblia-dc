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
  CircularProgress,
  Divider,
} from '@mui/material'
import CampaignIcon from '@mui/icons-material/Campaign'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import {
  getFirebaseDatabase,
  getFirebaseFunctions,
  loadFirebaseModules
} from '../config/firebase'
import { mostrarSnackbar, confirmarAsync } from '../utils/uiDialogs'
import {
  obterConfigLojaVersao,
  salvarConfigLojaVersao,
} from '../services/appLojaVersaoService'

const CFG_LOJA_VAZIA = Object.freeze({
  versaoAtual: '',
  versaoMinima: '',
  mensagem: '',
  urlLoja: '',
})

function PlataformaLojaFields({ titulo, cfg, onChange }) {
  return (
    <Box sx={{ p: 2, borderRadius: 1, border: 1, borderColor: 'divider' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        {titulo}
      </Typography>
      <Stack spacing={1.5}>
        <TextField
          label="Versão na loja (versaoAtual)"
          size="small"
          fullWidth
          placeholder="ex.: 1.2.0"
          value={cfg.versaoAtual}
          onChange={(e) => onChange({ ...cfg, versaoAtual: e.target.value })}
          helperText="Quem estiver abaixo disto vê o aviso de atualização."
        />
        <TextField
          label="Versão mínima obrigatória (opcional)"
          size="small"
          fullWidth
          placeholder="ex.: 1.0.0"
          value={cfg.versaoMinima}
          onChange={(e) => onChange({ ...cfg, versaoMinima: e.target.value })}
          helperText="Abaixo disto: só botão Atualizar (sem Depois)."
        />
        <TextField
          label="Mensagem no diálogo (opcional)"
          size="small"
          fullWidth
          multiline
          minRows={2}
          value={cfg.mensagem}
          onChange={(e) => onChange({ ...cfg, mensagem: e.target.value.slice(0, 400) })}
        />
        <TextField
          label="URL da loja"
          size="small"
          fullWidth
          placeholder="Play Store ou App Store"
          value={cfg.urlLoja}
          onChange={(e) => onChange({ ...cfg, urlLoja: e.target.value })}
        />
      </Stack>
    </Box>
  )
}

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
  const [cfgAndroid, setCfgAndroid] = useState({ ...CFG_LOJA_VAZIA })
  const [cfgIos, setCfgIos] = useState({ ...CFG_LOJA_VAZIA })
  const [carregandoCfgLoja, setCarregandoCfgLoja] = useState(false)
  const [salvandoCfgLoja, setSalvandoCfgLoja] = useState(false)
  const [sincronizandoPlay, setSincronizandoPlay] = useState(false)

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

  useEffect(() => {
    if (!ehAdmin || checandoAdmin) return
    let cancelado = false
    setCarregandoCfgLoja(true)
    void obterConfigLojaVersao()
      .then(({ android, ios }) => {
        if (cancelado) return
        setCfgAndroid({ ...CFG_LOJA_VAZIA, ...(android || {}) })
        setCfgIos({ ...CFG_LOJA_VAZIA, ...(ios || {}) })
      })
      .finally(() => {
        if (!cancelado) setCarregandoCfgLoja(false)
      })
    return () => {
      cancelado = true
    }
  }, [ehAdmin, checandoAdmin])

  async function salvarCfgLoja() {
    setSalvandoCfgLoja(true)
    try {
      await loadFirebaseModules()
      await salvarConfigLojaVersao({ android: cfgAndroid, ios: cfgIos })
      mostrarSnackbar({
        mensagem: 'Versões da loja salvas. Quem abrir o app verá o aviso se estiver desatualizado.',
        severidade: 'success',
      })
    } catch (e) {
      mostrarSnackbar({
        mensagem: e?.message || 'Falha ao salvar versões da loja.',
        severidade: 'error',
      })
    } finally {
      setSalvandoCfgLoja(false)
    }
  }

  async function sincronizarComGooglePlay() {
    setSincronizandoPlay(true)
    try {
      await loadFirebaseModules()
      const fns = getFirebaseFunctions()
      if (!fns) throw new Error('Cloud Functions indisponível')
      const { httpsCallable } = await import('firebase/functions')
      const fn = httpsCallable(fns, 'sincronizarVersaoPlayStoreAdmin')
      const res = await fn({})
      const data = res.data || {}
      const versao = data.versaoAtual || ''
      if (versao) {
        setCfgAndroid((prev) => ({
          ...prev,
          versaoAtual: versao,
        }))
      }
      mostrarSnackbar({
        mensagem: versao
          ? `Google Play: versão ${versao} sincronizada no Firebase.`
          : 'Sincronização concluída.',
        severidade: 'success',
      })
    } catch (e) {
      const msg = String(e?.message || e?.code || e || '')
      mostrarSnackbar({
        mensagem: msg.includes('PLAY_STORE_SERVICE_ACCOUNT') || msg.includes('failed-precondition')
          ? 'Play API ainda não configurada. Use npm run sync:android-version ou veja docs/SYNC_VERSAO_LOJAS.md'
          : msg || 'Falha ao sincronizar com a Google Play.',
        severidade: 'warning',
      })
    } finally {
      setSincronizandoPlay(false)
    }
  }

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

      <Divider sx={{ my: 3 }} />

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <SystemUpdateAltIcon color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Aviso de atualização na loja
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        A Google Play <strong>não atualiza o Firebase sozinha</strong>. Opções:
        <br />
        • <strong>Automático:</strong> botão abaixo (requer API Play configurada — ver{' '}
        <code>docs/SYNC_VERSAO_LOJAS.md</code>)
        <br />
        • <strong>Ao publicar:</strong> no PC, <code>npm run sync:android-version</code> (lê o{' '}
        <code>build.gradle</code>)
        <br />
        • <strong>Manual:</strong> preencher os campos e salvar. iOS continua manual.
      </Alert>

      {carregandoCfgLoja ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Stack spacing={2}>
          <PlataformaLojaFields
            titulo="Android (Google Play)"
            cfg={cfgAndroid}
            onChange={setCfgAndroid}
          />
          <Button
            variant="contained"
            color="secondary"
            disabled={sincronizandoPlay}
            onClick={() => void sincronizarComGooglePlay()}
          >
            {sincronizandoPlay ? 'Consultando Play Store…' : 'Sincronizar Android com Google Play'}
          </Button>
          <PlataformaLojaFields
            titulo="iOS (App Store)"
            cfg={cfgIos}
            onChange={setCfgIos}
          />
          <Button
            variant="outlined"
            disabled={salvandoCfgLoja}
            onClick={() => void salvarCfgLoja()}
          >
            {salvandoCfgLoja ? 'Salvando…' : 'Salvar versões da loja'}
          </Button>
        </Stack>
      )}
    </Container>
  )
}
