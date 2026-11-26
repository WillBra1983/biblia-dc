/**
 * Lista utilizadores do Firebase Auth (paginado), só para
 * `users/{uid}/admin === true` no RTDB. Dados via callable `listarUsuariosAdmin`.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  TextField,
} from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import AdminUsuarioCard from '../components/AdminUsuarioCard'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { getFirebaseDatabase, getFirebaseFunctions, loadFirebaseModules } from '../config/firebase'
import { confirmarAsync, mostrarSnackbar } from '../utils/uiDialogs'

function dataMs(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0
  if (typeof val !== 'string' || !val.trim()) return 0
  const ms = Date.parse(val)
  return Number.isFinite(ms) ? ms : 0
}

function usuarioUltimoAcessoMs(row) {
  return Math.max(
    dataMs(row?.ultimoAcesso),
    dataMs(row?.lastAccessAt),
    dataMs(row?.lastSignInTime),
    dataMs(row?.creationTime)
  )
}

function ordenarUsuariosPorAcesso(rows) {
  return [...rows].sort((a, b) => {
    const byAccess = usuarioUltimoAcessoMs(b) - usuarioUltimoAcessoMs(a)
    if (byAccess) return byAccess
    return String(a?.email || a?.uid || '').localeCompare(String(b?.email || b?.uid || ''))
  })
}

function dataHojeBr() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

export default function AdminUsuarios() {
  const { user } = useFirebaseAuth()
  const navigate = useNavigate()
  const [checandoAdmin, setChecandoAdmin] = useState(true)
  const [ehAdmin, setEhAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])
  const [nextPageToken, setNextPageToken] = useState(null)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('')
  const [acaoUid, setAcaoUid] = useState(null)
  const [dataAcessos, setDataAcessos] = useState(() => dataHojeBr())
  const [listaDoDia, setListaDoDia] = useState('')

  useEffect(() => {
    let cancelado = false
    async function checar() {
      setChecandoAdmin(true)
      try {
        if (!user?.uid) {
          if (user !== undefined && !cancelado) {
            mostrarSnackbar({
              mensagem: 'Entre na sua conta para acessar a área administrativa.',
              severidade: 'info',
            })
            navigate('/chat')
          }
          return
        }
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
            severidade: 'warning',
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
    return () => {
      cancelado = true
    }
  }, [user, navigate])

  const carregarPagina = useCallback(async (pageToken) => {
    setLoading(true)
    setErro('')
    try {
      await loadFirebaseModules()
      const fns = getFirebaseFunctions()
      if (!fns) throw new Error('Cloud Functions indisponível')
      const { httpsCallable } = await import('firebase/functions')
      const fn = httpsCallable(fns, 'listarUsuariosAdmin')
      const res = await fn({
        maxResults: 100,
        ...(pageToken ? { pageToken } : {}),
      })
      const data = res.data || {}
      const novos = Array.isArray(data.users) ? data.users : []
      setRows((prev) => ordenarUsuariosPorAcesso(pageToken ? [...new Map([...prev, ...novos].map(r => [r.uid, r])).values()] : novos))
      setNextPageToken(data.pageToken || null)
      setListaDoDia('')
    } catch (e) {
      setErro(e?.message || 'Falha ao carregar utilizadores.')
    } finally {
      setLoading(false)
    }
  }, [])

  const carregarAcessosDoDia = useCallback(async () => {
    if (!dataAcessos) return
    setLoading(true)
    setErro('')
    try {
      await loadFirebaseModules()
      const fns = getFirebaseFunctions()
      if (!fns) throw new Error('Cloud Functions indisponível')
      const { httpsCallable } = await import('firebase/functions')
      const fn = httpsCallable(fns, 'listarAcessosDiariosAdmin')
      const res = await fn({ data: dataAcessos })
      const data = res.data || {}
      setRows(Array.isArray(data.users) ? data.users : [])
      setNextPageToken(null)
      setListaDoDia(dataAcessos)
    } catch (e) {
      setErro(e?.message || 'Falha ao carregar os acessos do dia.')
    } finally {
      setLoading(false)
    }
  }, [dataAcessos])

  useEffect(() => {
    if (!ehAdmin || checandoAdmin) return
    void carregarPagina(null)
  }, [ehAdmin, checandoAdmin, carregarPagina])

  const gerirUsuario = useCallback(async (targetUid, acao, rotulo) => {
    const ok = await confirmarAsync({
      titulo: rotulo,
      mensagem:
        acao === 'apagar'
          ? 'A conta será removida do Authentication e sairá da busca do chat. Dados antigos no banco (conversas, perfil) podem permanecer. Esta ação não tem volta.'
          : acao === 'desativar'
            ? 'O utilizador não conseguirá entrar até reativar a conta.'
            : 'A conta voltará a poder entrar normalmente.',
      labelOk: acao === 'apagar' ? 'Apagar' : 'Confirmar',
      destrutivo: acao === 'apagar' || acao === 'desativar',
    })
    if (!ok) return

    setAcaoUid(targetUid)
    try {
      await loadFirebaseModules()
      const fns = getFirebaseFunctions()
      if (!fns) throw new Error('Cloud Functions indisponível')
      const { httpsCallable } = await import('firebase/functions')
      const fn = httpsCallable(fns, 'gerenciarUsuarioAdmin')
      const res = await fn({ targetUid, acao })
      const d = res.data || {}
      if (acao === 'apagar') {
        setRows((prev) => prev.filter((r) => r.uid !== targetUid))
      } else {
        setRows((prev) =>
          prev.map((r) => (r.uid === targetUid ? { ...r, disabled: Boolean(d.disabled) } : r))
        )
      }
      mostrarSnackbar({
        mensagem:
          acao === 'apagar'
            ? 'Conta removida do Authentication.'
            : acao === 'desativar'
              ? 'Conta desativada.'
              : 'Conta reativada.',
        severidade: 'success',
      })
    } catch (e) {
      mostrarSnackbar({
        mensagem: e?.message || 'Não foi possível concluir a operação.',
        severidade: 'error',
      })
    } finally {
      setAcaoUid(null)
    }
  }, [])

  if (checandoAdmin || !ehAdmin) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    )
  }

  const busca = filtro.trim().toLowerCase()
  const filtradas = rows.filter(r => !busca || [r.email, r.displayName, r.profileHandle, r.uid, r.provedorLabel, r.signInProvider]
    .some(valor => String(valor || '').toLowerCase().includes(busca)))

  return (
    <Container maxWidth="md" sx={{ py: 3, minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <PeopleIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Usuários registrados
        </Typography>
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          disabled={loading}
          onClick={() => void (listaDoDia ? carregarAcessosDoDia() : carregarPagina(null))}
        >
          Atualizar
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Contas cadastradas no aplicativo. O <strong>@apelido</strong> é o nome público do chat.
        A lista é carregada em páginas; quando houver mais contas, use “Carregar mais”.
      </Alert>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          type="date"
          label="Acessos em"
          value={dataAcessos}
          onChange={(e) => setDataAcessos(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" disabled={loading || !dataAcessos} onClick={() => void carregarAcessosDoDia()}>
          Mostrar usuários do dia
        </Button>
        {listaDoDia ? (
          <Button variant="outlined" disabled={loading} onClick={() => void carregarPagina(null)}>
            Mostrar todos
          </Button>
        ) : null}
      </Stack>

      {listaDoDia ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Relação preservada de quem acessou em {new Date(`${listaDoDia}T12:00:00`).toLocaleDateString('pt-BR')}.
          {' '}Considera acessos autenticados e não inclui contas administrativas.
        </Alert>
      ) : null}

      {erro ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      ) : null}

      <TextField
        size="small"
        label="Filtrar contas carregadas"
        placeholder="email, nome, @apelido, UID…"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      <Stack spacing={1.5} sx={{ mb: 2, minWidth: 0 }}>
        {filtradas.map(r => <AdminUsuarioCard key={r.uid} usuario={r} uidAtual={user?.uid}
          listaDoDia={listaDoDia} ocupado={acaoUid === r.uid} onGerir={gerirUsuario}
          onCopiar={async uid => {
            try {
              if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível')
              await navigator.clipboard.writeText(uid)
              mostrarSnackbar({ mensagem: 'UID copiado.', severidade: 'success' })
            } catch { mostrarSnackbar({ mensagem: 'Não foi possível copiar o UID.', severidade: 'warning' }) }
          }} />)}
        {!loading && !filtradas.length && <Alert severity="info">{filtro.trim()
          ? 'Nenhum usuário corresponde ao filtro nas contas carregadas.'
          : listaDoDia ? 'Nenhum acesso registrado nessa data.' : 'Nenhuma conta carregada.'}</Alert>}
      </Stack>

      <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {filtradas.length} de {rows.length} {listaDoDia ? 'usuário(s) que acessaram no dia' : 'utilizador(es) carregado(s)'}
          {nextPageToken ? ' — há mais páginas.' : ''}
        </Typography>
        {nextPageToken ? (
          <Button variant="outlined" disabled={loading} onClick={() => void carregarPagina(nextPageToken)}>
            {loading ? 'A carregar…' : 'Carregar mais'}
          </Button>
        ) : null}
      </Stack>
    </Container>
  )
}
