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
  FormControlLabel,
  Switch,
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
  mensagem: '',
  urlLoja: '',
})

const URL_ATUALIZACAO_FALLBACK = 'https://foundcine.com/biblia/'

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
          helperText="Versão publicada na loja. Aviso sempre opcional (nunca bloqueia o app)."
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
  { label: 'Bíblia (início)', value: '/' },
  { label: 'Versículo do dia', value: '/versiculo-do-dia' },
  { label: 'Dias anteriores', value: '/versiculos-do-dia' },
  { label: 'Discipulado', value: '/discipulado' },
  { label: 'Devocional', value: '/devocional' },
  { label: 'Estudos Compartilhados', value: '/estudos-biblicos' },
  { label: 'Bíblia comentada', value: '/biblioteca-estudos' },
  { label: 'Hinário - Letra', value: '/hinario/letra' },
  { label: 'Hinário - Cifras', value: '/hinario/cifras' },
  { label: 'Confissão de Fé', value: '/confissao' },
  { label: 'Catecismo Maior', value: '/catecismo-maior' },
  { label: 'Catecismo Breve', value: '/catecismo-breve' },
  { label: 'Plano de leitura', value: '/plano-leitura-biblia' },
  { label: 'Mais de Deus', value: '/mais-de-deus' },
  { label: 'YouTube', value: '/youtube' },
  { label: 'Quiz', value: '/quiz-retiro' },
  { label: 'Versículos marcados', value: '/versiculos-marcados' },
  { label: 'Versículos compartilhados', value: '/versiculos-compartilhados' },
  { label: 'Mensagens', value: '/chat' },
  { label: 'Configurações', value: '/configuracoes/notificacoes' },
  { label: 'Sobre', value: '/sobre' }
]

export default function AdminNotificar() {
  const { user } = useFirebaseAuth()
  const navigate = useNavigate()
  const [checandoAdmin, setChecandoAdmin] = useState(true)
  const [ehAdmin, setEhAdmin] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [url, setUrl] = useState('/')
  const [temAtualizacaoApp, setTemAtualizacaoApp] = useState(false)
  const [somenteTeste, setSomenteTeste] = useState(true)
  const [confirmouTesteAtualizacao, setConfirmouTesteAtualizacao] = useState(false)
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
    if (temAtualizacaoApp && !somenteTeste && !confirmouTesteAtualizacao) {
      mostrarSnackbar({
        mensagem: 'Envie primeiro para você e confirme que a loja correta foi aberta.',
        severidade: 'warning'
      })
      return
    }
    const ok = await confirmarAsync({
      titulo: somenteTeste ? 'Enviar teste para você?' : 'Enviar aviso a todos?',
      mensagem: somenteTeste
        ? `“${t}” será enviado somente para a conta de administrador com a qual você está conectado.`
        : `“${t}” será enviado a todos os usuários inscritos. Deseja continuar?`,
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
      const res = await fn({
        titulo: t,
        mensagem: m,
        url: temAtualizacaoApp ? URL_ATUALIZACAO_FALLBACK : u,
        atualizacaoApp: temAtualizacaoApp,
        somenteParaMim: somenteTeste,
        topic: 'novidades'
      })
      setUltimoEnvio({
        quando: Date.now(),
        titulo: t,
        mensagem: m,
        messageId: res?.data?.messageId
      })
      if (!somenteTeste) {
        setTitulo('')
        setMensagem('')
        setTemAtualizacaoApp(false)
        setConfirmouTesteAtualizacao(false)
      }
      mostrarSnackbar({
        mensagem: somenteTeste ? 'Teste enviado somente para você.' : 'Aviso enviado.',
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
        {somenteTeste ? (
          <>
            Modo de teste: somente você receberá o aviso, na conta de administrador
            com a qual está conectado. Outros usuários e outros administradores não receberão.
          </>
        ) : (
          <>
            Será enviado para todos os aparelhos inscritos no topic <code>novidades</code>.
            Usuários que desligaram esse switch nas Configurações não recebem.
          </>
        )}
      </Alert>

      <Stack spacing={2}>
        <FormControlLabel
          control={(
            <Switch
              checked={somenteTeste}
              onChange={(e) => setSomenteTeste(e.target.checked)}
            />
          )}
          label="Enviar teste somente para mim"
        />
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
          <FormControlLabel
            control={(
              <Switch
                checked={temAtualizacaoApp}
                onChange={(e) => {
                  setTemAtualizacaoApp(e.target.checked)
                  setConfirmouTesteAtualizacao(false)
                }}
              />
            )}
            label="Tem atualização do aplicativo"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {temAtualizacaoApp
              ? 'Ao tocar, cada aparelho abrirá a loja correspondente: Google Play ou App Store.'
              : 'Desligado: a notificação abrirá somente o destino normal escolhido abaixo.'}
          </Typography>
        </Box>
        {temAtualizacaoApp && !somenteTeste && (
          <FormControlLabel
            control={(
              <Switch
                checked={confirmouTesteAtualizacao}
                onChange={(e) => setConfirmouTesteAtualizacao(e.target.checked)}
              />
            )}
            label="Confirmei no teste que a loja correta foi aberta"
          />
        )}
        {!temAtualizacaoApp && <Box>
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
        </Box>}

        <Button
          variant="contained"
          onClick={enviar}
          disabled={
            enviando ||
            !titulo.trim() ||
            !mensagem.trim() ||
            (temAtualizacaoApp && !somenteTeste && !confirmouTesteAtualizacao)
          }
          size="large"
        >
          {enviando ? 'Enviando…' : somenteTeste ? 'Enviar teste' : 'Enviar agora'}
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
        • <strong>Ao gerar o build:</strong> <code>npm run sync:android-version</code> (registra o build;{' '}
        <strong>não</strong> altera a versão que o app exibe — pode rodar antes de publicar)
        <br />
        • <strong>Após publicar na Play:</strong> botão «Sincronizar Android com Google Play» ou cron 12h
        <br />
        • <strong>Manual:</strong> preencher versaoAtual e salvar. iOS continua manual.
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
