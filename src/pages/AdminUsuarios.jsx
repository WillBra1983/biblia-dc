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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Tooltip,
  IconButton,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import PeopleIcon from '@mui/icons-material/People'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { getFirebaseDatabase, getFirebaseFunctions, loadFirebaseModules } from '../config/firebase'
import { confirmarAsync, mostrarSnackbar } from '../utils/uiDialogs'

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
      setRows((prev) => (pageToken ? [...prev, ...novos] : novos))
      setNextPageToken(data.pageToken || null)
    } catch (e) {
      setErro(e?.message || 'Falha ao carregar utilizadores.')
    } finally {
      setLoading(false)
    }
  }, [])

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

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <PeopleIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Usuários registrados
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Lista do Firebase Authentication. O <strong>@apelido</strong> é o nome público do chat (reservado
        no perfil), não o nome de exibição. Quem entrou só com Google costuma ter e-mail já verificado;
        cadastro por senha exige confirmação por link se você ativar essa opção no Firebase.
      </Alert>

      {erro ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      ) : null}

      <TextField
        size="small"
        label="Filtrar lista"
        placeholder="email, nome, @apelido, UID…"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>UID</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>
                <Tooltip title="Apelido público do chat (users/profile ou publicHandles), não é o nome de exibição">
                  <span>@apelido</span>
                </Tooltip>
              </TableCell>
              <TableCell>Provedor</TableCell>
              <TableCell align="center">Conta</TableCell>
              <TableCell>Criação</TableCell>
              <TableCell>
                <Tooltip title="Última abertura do app (RTDB) ou último login, o que for mais recente">
                  <span>Último acesso</span>
                </Tooltip>
              </TableCell>
              <TableCell align="center" sx={{ width: 88 }}>
                Ações
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows
              .filter((r) => {
                const q = filtro.trim().toLowerCase()
                if (!q) return true
                return (
                  (r.email || '').toLowerCase().includes(q) ||
                  (r.displayName || '').toLowerCase().includes(q) ||
                  (r.profileHandle || '').toLowerCase().includes(q) ||
                  (r.uid || '').toLowerCase().includes(q) ||
                  (r.provedorLabel || '').toLowerCase().includes(q) ||
                  (r.signInProvider || '').toLowerCase().includes(q)
                )
              })
              .map((r) => (
                <TableRow key={r.uid} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 140 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Tooltip title={r.uid}>
                        <span>{r.uid?.slice(0, 12)}…</span>
                      </Tooltip>
                      <IconButton
                        size="small"
                        aria-label="Copiar UID"
                        onClick={() => {
                          void navigator.clipboard?.writeText(r.uid || '')
                          mostrarSnackbar({ mensagem: 'UID copiado.', severidade: 'success' })
                        }}
                      >
                        <ContentCopyIcon fontSize="inherit" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                  <TableCell>{r.email || '—'}</TableCell>
                  <TableCell>{r.displayName || '—'}</TableCell>
                  <TableCell>{r.profileHandle ? `@${r.profileHandle}` : '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', maxWidth: 200 }}>
                    {r.provedorLabel || r.signInProvider || '—'}
                  </TableCell>
                  <TableCell align="center">{r.disabled ? 'Desativada' : 'Ativa'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                    {r.creationTime ? new Date(r.creationTime).toLocaleString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                    {(r.ultimoAcesso || r.lastAccessAt || r.lastSignInTime)
                      ? new Date(r.ultimoAcesso || r.lastAccessAt || r.lastSignInTime).toLocaleString('pt-BR')
                      : '—'}
                  </TableCell>
                  <TableCell align="center">
                    {r.uid === user?.uid ? (
                      <Typography variant="caption" color="text.secondary">
                        Você
                      </Typography>
                    ) : r.ehAdmin ? (
                      <Typography variant="caption" color="text.secondary">
                        Admin
                      </Typography>
                    ) : (
                      <Stack direction="row" spacing={0.25} justifyContent="center">
                        {r.disabled ? (
                          <Tooltip title="Reativar conta">
                            <span>
                              <IconButton
                                size="small"
                                color="success"
                                disabled={acaoUid === r.uid}
                                aria-label="Reativar conta"
                                onClick={() => void gerirUsuario(r.uid, 'reativar', 'Reativar conta')}
                              >
                                <LockOpenOutlinedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Desativar conta">
                            <span>
                              <IconButton
                                size="small"
                                color="warning"
                                disabled={acaoUid === r.uid}
                                aria-label="Desativar conta"
                                onClick={() => void gerirUsuario(r.uid, 'desativar', 'Desativar conta')}
                              >
                                <LockOutlinedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        <Tooltip title="Apagar conta">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={acaoUid === r.uid}
                              aria-label="Apagar conta"
                              onClick={() => void gerirUsuario(r.uid, 'apagar', 'Apagar conta')}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {rows.length} utilizador(es) carregado(s)
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
