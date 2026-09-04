import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  InputAdornment,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import ContentPaste from '@mui/icons-material/ContentPaste'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import EditOutlined from '@mui/icons-material/EditOutlined'
import Fullscreen from '@mui/icons-material/Fullscreen'
import FullscreenExit from '@mui/icons-material/FullscreenExit'
import LibraryMusic from '@mui/icons-material/LibraryMusic'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import NavigateNext from '@mui/icons-material/NavigateNext'
import PublishOutlined from '@mui/icons-material/PublishOutlined'
import Search from '@mui/icons-material/Search'
import { useLocation, useNavigate } from 'react-router-dom'
import HinarioCifrasDiretas from '../components/HinarioCifrasDiretas'
import ListaVirtualizada from '../components/ListaVirtualizada'
import LocalPinchZoom from '../components/LocalPinchZoom'
import { useApp } from '../contexts/AppContext'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { useLeituraTelaCheia } from '../hooks/useLeituraTelaCheia'
import { canticosService } from '../services/canticosService'
import {
  assinarCanticosCompartilhados,
  editarCantico,
  excluirCantico,
  publicarCantico,
} from '../services/canticosCompartilhadosService'
import { ensureUserForFeature } from '../utils/chatExportSend'
import { chordSongToEditableText, parsePastedChordSong, normalizeChordSearch } from '../utils/chordProParser'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'

const PERSONAL_STORAGE_KEY = 'salvation-canticos-cifrados-pessoais-v1'

const readPersonalSongs = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PERSONAL_STORAGE_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    const reparsed = parsed.map(song => {
      if (!song?.textoOriginal) return { ...song, localPrivado: true }
      return {
        ...parsePastedChordSong(song.textoOriginal, {
        id: song.id,
        title: song.titulo,
        artist: song.detalhe || '',
        source: 'Minha cifra',
        }),
        localPrivado: true,
      }
    })
    return reparsed
  } catch {
    return []
  }
}

const hasChords = song => song?.linhas?.some(line => line.detalhes?.length || line.cifras?.length)
const formatPublishedAt = value => {
  const timestamp = Number(value || 0)
  if (!timestamp) return 'data não informada'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

export default function Canticos() {
  const navigate = useNavigate()
  const location = useLocation()
  const outrasCancoes = location.pathname.includes('/outras-cancoes')
  const { fontSize, lineHeight, textAlign, fontFamily, setBackButtonHandler } = useApp()
  const { user } = useFirebaseAuth()
  const { telaCheia, entrarTelaCheia, sairTelaCheia } = useLeituraTelaCheia()
  const [officialSongs, setOfficialSongs] = useState([])
  const [sharedSongs, setSharedSongs] = useState([])
  const [personalSongs, setPersonalSongs] = useState(() => readPersonalSongs())
  const [currentSong, setCurrentSong] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [editingSongId, setEditingSongId] = useState(null)
  const [pasteTitle, setPasteTitle] = useState('')
  const [pasteArtist, setPasteArtist] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [pasteError, setPasteError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const initialSelectionRef = useRef(false)

  const textSx = {
    fontSize: `${fontSize}%`,
    lineHeight: readingLineHeightToCss(lineHeight),
    fontFamily: resolveFontFamily(fontFamily),
    textAlign: textAlign || 'left',
  }

  useEffect(() => {
    if (outrasCancoes) {
      let unsubscribe = null
      let cancelled = false
      setLoading(true)
      assinarCanticosCompartilhados(
        songs => {
          if (!cancelled) {
            setSharedSongs(songs)
            setLoading(false)
          }
        },
        err => {
          if (!cancelled) {
            setError(err?.message || 'Não foi possível carregar a lista compartilhada.')
            setLoading(false)
          }
        }
      ).then(fn => {
        if (cancelled) fn?.()
        else unsubscribe = fn
      }).catch(err => {
        if (!cancelled) {
          setError(err?.message || 'Não foi possível carregar a lista compartilhada.')
          setLoading(false)
        }
      })
      return () => {
        cancelled = true
        unsubscribe?.()
      }
    }
    let cancelled = false
    canticosService.buscarTodos()
      .then(songs => {
        if (!cancelled) setOfficialSongs(songs)
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [outrasCancoes])

  const allSongs = useMemo(
    () => outrasCancoes ? [...sharedSongs, ...personalSongs] : officialSongs,
    [officialSongs, outrasCancoes, personalSongs, sharedSongs]
  )
  const visibleSongs = useMemo(() => {
    const term = normalizeChordSearch(searchTerm).trim()
    const filtered = term
      ? allSongs.filter(song =>
          normalizeChordSearch(song.titulo).includes(term) ||
          normalizeChordSearch(song.id).includes(term) ||
          song.linhas?.some(line => normalizeChordSearch(line.letra || line.texto).includes(term))
        )
      : allSongs
    const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })
    return [...filtered].sort((a, b) => {
      const peloTitulo = collator.compare(a.titulo, b.titulo)
      if (peloTitulo !== 0) return peloTitulo
      return Number(a.createdAt || 0) - Number(b.createdAt || 0)
    })
  }, [allSongs, searchTerm])

  useEffect(() => {
    if (initialSelectionRef.current || !allSongs.length) return
    initialSelectionRef.current = true
    const lastId = localStorage.getItem(outrasCancoes ? 'ultimaOutraCancaoAcessada' : 'ultimoSalmoAcessado')
    setCurrentSong(allSongs.find(song => String(song.id) === lastId) || allSongs[0])
  }, [allSongs, outrasCancoes])

  useEffect(() => {
    if (!outrasCancoes || !currentSong?.compartilhado) return
    const atualizada = sharedSongs.find(song => String(song.id) === String(currentSong.id))
    if (atualizada && atualizada.updatedAt !== currentSong.updatedAt) setCurrentSong(atualizada)
  }, [currentSong, outrasCancoes, sharedSongs])

  useEffect(() => {
    if (!setBackButtonHandler) return
    if (pasteOpen) setBackButtonHandler(() => setPasteOpen(false))
    else if (drawerOpen) setBackButtonHandler(() => setDrawerOpen(false))
    else setBackButtonHandler(null)
    return () => setBackButtonHandler(null)
  }, [drawerOpen, pasteOpen, setBackButtonHandler])

  const selectSong = song => {
    setCurrentSong(song)
    localStorage.setItem(outrasCancoes ? 'ultimaOutraCancaoAcessada' : 'ultimoSalmoAcessado', String(song.id))
    setDrawerOpen(false)
  }

  const currentIndex = visibleSongs.findIndex(song => String(song.id) === String(currentSong?.id))
  const moveSong = direction => {
    const next = visibleSongs[currentIndex + direction]
    if (next) selectSong(next)
  }

  const openNewSongDialog = () => {
    if (!ensureUserForFeature(user, navigate, {
      mensagem: 'Entre na sua conta para publicar uma música para todos.',
      redirectTo: '/hinario/outras-cancoes',
    })) return
    setEditingSongId(null)
    setPasteTitle('')
    setPasteArtist('')
    setPasteText('')
    setPasteError('')
    setPasteOpen(true)
  }

  const openEditSongDialog = () => {
    if (!currentSong || (!currentSong.localPrivado && currentSong.authorUid !== user?.uid)) return
    setEditingSongId(currentSong.id)
    setPasteTitle(currentSong.titulo || '')
    setPasteArtist(currentSong.detalhe || '')
    setPasteText(currentSong.textoOriginal || chordSongToEditableText(currentSong))
    setPasteError('')
    setPasteOpen(true)
  }

  const savePastedSong = async () => {
    const title = pasteTitle.trim()
    if (!title) {
      setPasteError('Informe o nome da música.')
      return
    }
    const preview = parsePastedChordSong(pasteText, {
      id: editingSongId || `pessoal-${Date.now()}`,
      title,
      artist: pasteArtist.trim(),
      source: 'Minha cifra',
    })
    if (!hasChords(preview)) {
      setPasteError('Não encontrei acordes. Cole cifras entre colchetes, como [G]Graça, ou em uma linha acima da letra.')
      return
    }
    setSaving(true)
    try {
      let song
      if (editingSongId && currentSong?.localPrivado) {
        song = { ...preview, localPrivado: true }
        const updated = personalSongs.map(item => item.id === editingSongId ? song : item)
        setPersonalSongs(updated)
        localStorage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify(updated))
      } else if (editingSongId) {
        song = await editarCantico(user, currentSong, {
          titulo: title,
          artista: pasteArtist,
          textoOriginal: pasteText,
        })
      } else {
        song = await publicarCantico(user, {
          titulo: title,
          artista: pasteArtist,
          textoOriginal: pasteText,
        })
      }
      setPasteOpen(false)
      setPasteTitle('')
      setPasteArtist('')
      setPasteText('')
      setPasteError('')
      setEditingSongId(null)
      selectSong(song)
    } catch (err) {
      setPasteError(err?.message || 'Não foi possível salvar a música.')
    } finally {
      setSaving(false)
    }
  }

  const deleteCurrentSong = async () => {
    if (!currentSong || (!currentSong.localPrivado && currentSong.authorUid !== user?.uid)) return
    const local = currentSong.localPrivado
    if (!window.confirm(local
      ? `Excluir “${currentSong.titulo}” deste dispositivo?`
      : `Excluir “${currentSong.titulo}” da lista de todos?`)) return
    try {
      if (local) {
        const updated = personalSongs.filter(song => song.id !== currentSong.id)
        setPersonalSongs(updated)
        localStorage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify(updated))
        setCurrentSong(updated[0] || sharedSongs[0] || null)
      } else {
        await excluirCantico(user, currentSong)
        setCurrentSong(allSongs.find(song => song.id !== currentSong.id) || null)
      }
    } catch (err) {
      setError(err?.message || 'Não foi possível excluir a música.')
    }
  }

  const publishLocalSong = async () => {
    if (!currentSong?.localPrivado) return
    if (!ensureUserForFeature(user, navigate, {
      mensagem: 'Entre na sua conta para publicar esta música para todos.',
      redirectTo: '/hinario/outras-cancoes',
    })) return
    setError('')
    try {
      const publicada = await publicarCantico(user, {
        titulo: currentSong.titulo,
        artista: currentSong.detalhe,
        textoOriginal: currentSong.textoOriginal || chordSongToEditableText(currentSong),
      })
      const updated = personalSongs.filter(song => song.id !== currentSong.id)
      setPersonalSongs(updated)
      localStorage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify(updated))
      selectSong(publicada)
    } catch (err) {
      setError(err?.message || 'Não foi possível publicar a música.')
    }
  }

  if (loading) {
    return <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%', bgcolor: 'background.default' }}>
      <Box sx={{ display: telaCheia ? 'none' : 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
        <Button color="primary" onClick={() => navigate('/biblia')} startIcon={<ArrowBack />} size="small" sx={{ fontWeight: 700 }}>
          Início
        </Button>
        <Stack direction="row" spacing={1}>
          {outrasCancoes ? (
            <Button onClick={openNewSongDialog} startIcon={<ContentPaste />} size="small" sx={{ fontWeight: 700 }}>
              Colar cifra
            </Button>
          ) : null}
          <Button onClick={() => setDrawerOpen(true)} startIcon={<LibraryMusic />} variant="outlined" size="small" sx={{ fontWeight: 700 }}>
            Escolher
          </Button>
        </Stack>
      </Box>

      {error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}

      {currentSong ? (
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', bgcolor: 'background.paper' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0, px: 1.5, py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" noWrap title={currentSong.titulo} sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {currentSong.titulo}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {currentSong.fonte || 'Comissão Brasileira de Salmodia'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.25}>
              <IconButton size="small" color="primary" onClick={telaCheia ? sairTelaCheia : entrarTelaCheia} aria-label={telaCheia ? 'Sair da tela cheia' : 'Abrir em tela cheia'}>
                {telaCheia ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
              {currentSong.localPrivado || currentSong.authorUid === user?.uid ? (
                <>
                {currentSong.localPrivado ? <Button size="small" startIcon={<PublishOutlined />} onClick={publishLocalSong}>Publicar</Button> : null}
                <Button size="small" startIcon={<EditOutlined />} onClick={openEditSongDialog} aria-label="Editar música cifrada">Editar</Button>
                <IconButton size="small" color="error" onClick={deleteCurrentSong} aria-label="Excluir música cifrada"><DeleteOutline /></IconButton>
                </>
              ) : null}
            </Stack>
          </Stack>

          <HinarioCifrasDiretas key={currentSong.id} hino={currentSong} textSx={textSx} />

          {currentSong.compartilhado ? (
            <Typography component="p" color="text.secondary" sx={{ flexShrink: 0, px: 1.5, py: 0.35, textAlign: 'center', fontSize: '0.68rem' }}>
              Adicionada por {currentSong.authorName || 'Usuário'} em {formatPublishedAt(currentSong.createdAt)}
            </Typography>
          ) : currentSong.localPrivado ? (
            <Typography component="p" color="text.secondary" sx={{ flexShrink: 0, px: 1.5, py: 0.35, textAlign: 'center', fontSize: '0.68rem' }}>
              Salva somente neste dispositivo
            </Typography>
          ) : null}

          <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'center', gap: 1, px: 1, py: 0.75, borderTop: 1, borderColor: 'divider' }}>
            <IconButton size="small" onClick={() => moveSong(-1)} disabled={currentIndex <= 0} aria-label="Cântico anterior" color="primary"><NavigateBefore /></IconButton>
            <IconButton size="small" onClick={() => moveSong(1)} disabled={currentIndex < 0 || currentIndex >= visibleSongs.length - 1} aria-label="Próximo cântico" color="primary"><NavigateNext /></IconButton>
          </Box>
        </Paper>
      ) : outrasCancoes ? (
        <Paper sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 3, textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center" sx={{ maxWidth: 520 }}>
            <ContentPaste color="primary" sx={{ fontSize: 52 }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Outras canções</Typography>
            <Typography color="text.secondary">
              Cole aqui uma música cifrada encontrada na internet. Ela ficará disponível para todos, com mudança de tom, diagramas de acordes e identificação de quem publicou.
            </Typography>
            <Button variant="contained" startIcon={<ContentPaste />} onClick={openNewSongDialog}>Colar primeira cifra</Button>
          </Stack>
        </Paper>
      ) : null}

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} ModalProps={{ keepMounted: true }} PaperProps={{ sx: { width: { xs: '100vw', sm: 420 }, maxWidth: '100vw', pt: 1 } }}>
        <LocalPinchZoom resetKey={drawerOpen ? 'canticos-open' : 'canticos-closed'} sx={{ height: '100%', maxHeight: '100dvh' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <Box sx={{ px: 2, pt: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{outrasCancoes ? 'Outras canções' : 'Salmos'}</Typography>
              <Typography variant="caption" color="text.secondary">
                {outrasCancoes ? `${sharedSongs.length} compartilhadas${personalSongs.length ? ` • ${personalSongs.length} privadas neste dispositivo` : ''}` : `Comissão Brasileira de Salmodia • ${officialSongs.length} salmos`}
              </Typography>
            </Box>
            <Box sx={{ p: 2, pb: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar cântico ou trecho..."
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              />
            </Box>
            <Box sx={{ px: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">{visibleSongs.length} resultados</Typography>
              {outrasCancoes ? <Button startIcon={<ContentPaste />} onClick={() => { setDrawerOpen(false); openNewSongDialog() }}>Colar cifra</Button> : null}
            </Box>
            <ListaVirtualizada
              items={visibleSongs}
              itemSize={64}
              itemKey={(_, song) => song.id}
              renderItem={song => (
                <ListItem button onClick={() => selectSong(song)} selected={String(currentSong?.id) === String(song.id)} sx={{ height: '100%', px: 2.25 }}>
                  <ListItemText
                    primary={song.titulo}
                    secondary={song.compartilhado ? `${song.authorName || 'Usuário'} • ${formatPublishedAt(song.createdAt)}` : song.localPrivado ? 'Somente neste dispositivo' : 'Comissão Brasileira de Salmodia'}
                    primaryTypographyProps={{ noWrap: true, sx: { fontWeight: 700 } }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItem>
              )}
            />
          </Box>
        </LocalPinchZoom>
      </Drawer>

      <Dialog open={pasteOpen} onClose={() => setPasteOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingSongId ? 'Editar música cifrada' : 'Colar música cifrada'}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Aceita acordes em uma linha acima da letra ou no formato ChordPro, como [G]Graça [C]maravilhosa. Ao publicar, todos poderão ver a música e seu nome aparecerá discretamente no rodapé.
          </Alert>
          {pasteError ? <Alert severity="error" sx={{ mb: 2 }}>{pasteError}</Alert> : null}
          <Stack spacing={2}>
            <TextField autoFocus label="Nome da música" value={pasteTitle} onChange={event => setPasteTitle(event.target.value)} fullWidth />
            <TextField label="Autor ou intérprete (opcional)" value={pasteArtist} onChange={event => setPasteArtist(event.target.value)} fullWidth />
            <TextField
              label="Letra e acordes"
              value={pasteText}
              onChange={event => setPasteText(event.target.value)}
              multiline
              minRows={10}
              fullWidth
              placeholder={'Tom: G\n\nG              C\nGraça maravilhosa\n\nou\n\n[G]Graça mara[C]vilhosa'}
              inputProps={{ style: { fontFamily: 'monospace' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasteOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={savePastedSong} disabled={saving}>{saving ? 'Salvando…' : editingSongId ? 'Salvar alterações' : 'Publicar para todos'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
