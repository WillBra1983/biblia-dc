import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider
} from '@mui/material'
import AddCircleOutline from '@mui/icons-material/AddCircleOutline'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { useApp } from '../contexts/AppContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { confirmarAsync } from '../utils/uiDialogs'
import EstudosBiblicosListaLinha from '../components/EstudosBiblicosListaLinha'
import {
  listarMeusEstudos,
  apagarEstudoAutor,
  listarModulos,
  criarModulo,
  renomearModulo,
  apagarModulo
} from '../services/bibliaEstudosService'

export default function EstudosBiblicosGerir() {
  const navigate = useNavigate()
  const { user, isConfigured } = useFirebaseAuth()
  const { fontSize, fontFamily, lineHeight } = useApp()
  const ff = resolveFontFamily(fontFamily)
  const lh = readingLineHeightToCss(lineHeight)

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [meus, setMeus] = useState([])
  const [modulos, setModulos] = useState([])
  const [apagarId, setApagarId] = useState(null)
  const [modulosOpen, setModulosOpen] = useState(false)
  const [novoModuloNome, setNovoModuloNome] = useState('')
  const [moduloBusy, setModuloBusy] = useState(false)

  const carregar = useCallback(async () => {
    if (!user?.uid) {
      setMeus([])
      setModulos([])
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const [m, mods] = await Promise.all([listarMeusEstudos(user.uid), listarModulos(user.uid)])
      setMeus(m.map((row) => ({ ...row, _tipo: 'meu' })))
      setModulos(mods)
    } catch (e) {
      setErr(e?.message || 'Não foi possível carregar os estudos.')
    } finally {
      setLoading(false)
    }
  }, [user?.uid])

  useEffect(() => {
    carregar()
  }, [carregar])

  const meusPorModulo = useMemo(() => {
    const idsValidos = new Set(modulos.map((x) => x.id))
    const sem = []
    const porId = new Map()
    modulos.forEach((mo) => porId.set(mo.id, []))
    for (const row of meus) {
      const mid = row.moduleId && idsValidos.has(row.moduleId) ? row.moduleId : null
      if (!mid) {
        sem.push(row)
        continue
      }
      if (!porId.has(mid)) porId.set(mid, [])
      porId.get(mid).push(row)
    }
    return { sem, porId }
  }, [meus, modulos])

  const handleCriarModulo = async () => {
    const n = novoModuloNome.trim()
    if (!n || !user?.uid) return
    setModuloBusy(true)
    try {
      await criarModulo(user.uid, n)
      setNovoModuloNome('')
      await carregar()
    } catch (e) {
      setErr(e?.message || 'Não foi possível criar o módulo.')
    } finally {
      setModuloBusy(false)
    }
  }

  const handleRenomearModulo = async (id, nome) => {
    const n = String(nome || '').trim()
    if (!n || !user?.uid) return
    setModuloBusy(true)
    try {
      await renomearModulo(user.uid, id, n)
      await carregar()
    } catch (e) {
      setErr(e?.message || 'Não foi possível renomear.')
    } finally {
      setModuloBusy(false)
    }
  }

  const handleApagarModulo = async (id) => {
    if (!user?.uid) return
    const ok = await confirmarAsync({
      titulo: 'Apagar módulo',
      mensagem: 'Apagar este módulo? Os estudos voltam para "Sem módulo".',
      labelOk: 'Apagar',
      destrutivo: true
    })
    if (!ok) return
    setModuloBusy(true)
    try {
      await apagarModulo(user.uid, id)
      await carregar()
    } catch (e) {
      setErr(e?.message || 'Não foi possível apagar o módulo.')
    } finally {
      setModuloBusy(false)
    }
  }

  if (!isConfigured) {
    return (
      <Box sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
        <Alert severity="warning">Conta e base de dados não estão configuradas neste ambiente.</Alert>
      </Box>
    )
  }

  if (user === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    return (
      <Box sx={{ px: { xs: 1, sm: 2 }, py: 2, maxWidth: 520, mx: 'auto' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Faça login para gerir os seus estudos.
        </Typography>
        <Button variant="contained" component={RouterLink} to="/chat">
          Ir para Mensagens e entrar
        </Button>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        px: { xs: 1, sm: 2 },
        pt: 2,
        pb: 6,
        maxWidth: 720,
        mx: 'auto',
        color: 'text.primary',
        bgcolor: 'background.default',
        fontSize: `${fontSize || 100}%`,
        fontFamily: ff,
        lineHeight: lh
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FolderOpenOutlined />}
          onClick={() => setModulosOpen(true)}
        >
          Módulos
        </Button>
        <Button variant="contained" size="small" startIcon={<AddCircleOutline />} onClick={() => navigate('/estudos-biblicos/novo')}>
          Novo
        </Button>
      </Box>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <>
          {meus.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum estudo criado ainda.
            </Typography>
          ) : (
            <Box>
              {modulos.map((mo) => {
                const rows = meusPorModulo.porId.get(mo.id) || []
                if (!rows.length) return null
                return (
                  <Box key={mo.id} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 0.75, fontWeight: 700, opacity: 0.95 }}>
                      {mo.nome}
                    </Typography>
                    <EstudosBiblicosListaLinha
                      rows={rows}
                      navigate={navigate}
                      setApagarId={setApagarId}
                      mostrarAcoesAutor
                    />
                  </Box>
                )
              })}
              {meusPorModulo.sem.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 0.75, fontWeight: 700, opacity: 0.95 }}>
                    Sem módulo
                  </Typography>
                  <EstudosBiblicosListaLinha
                    rows={meusPorModulo.sem}
                    navigate={navigate}
                    setApagarId={setApagarId}
                    mostrarAcoesAutor
                  />
                </Box>
              )}
            </Box>
          )}
        </>
      )}

      <Dialog open={Boolean(apagarId)} onClose={() => setApagarId(null)}>
        <DialogTitle>Apagar estudo?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta ação remove o estudo para todos (incluindo quem tinha salvo).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApagarId(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!apagarId || !user?.uid) return
              try {
                await apagarEstudoAutor(apagarId, user.uid)
                setApagarId(null)
                await carregar()
              } catch (e) {
                setErr(e?.message || 'Falha ao apagar.')
                setApagarId(null)
              }
            }}
          >
            Apagar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={modulosOpen} onClose={() => setModulosOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Módulos</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              label="Nome do novo módulo"
              value={novoModuloNome}
              onChange={(e) => setNovoModuloNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCriarModulo())}
            />
            <Button variant="contained" disabled={moduloBusy || !novoModuloNome.trim()} onClick={() => void handleCriarModulo()}>
              Criar
            </Button>
          </Box>
          <Divider sx={{ my: 2 }} />
          {modulos.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum módulo ainda.
            </Typography>
          ) : (
            modulos.map((m) => (
              <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  defaultValue={m.nome}
                  key={m.id + m.nome}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v && v !== m.nome) void handleRenomearModulo(m.id, v)
                  }}
                />
                <IconButton color="error" aria-label="Apagar módulo" disabled={moduloBusy} onClick={() => void handleApagarModulo(m.id)}>
                  <DeleteOutline />
                </IconButton>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModulosOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
