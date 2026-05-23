import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Paper,
  Stack,
  Tooltip,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Collapse
} from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import SearchIcon from '@mui/icons-material/Search'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import ExpandMore from '@mui/icons-material/ExpandMore'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { livros as livrosData } from '../data/biblia'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { sxMinViewportHeight } from '../utils/viewportHeight'
import {
  listarEstudosVersiculo,
  listarEstudosPericope
} from '../services/estudosCuradosService'

/* ------------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------------ */

function nomeLivro(livroId) {
  const l = livrosData.find((x) => x.id === Number(livroId))
  return l?.nome || `Livro ${livroId}`
}
function abreviacaoLivro(livroId) {
  const l = livrosData.find((x) => x.id === Number(livroId))
  return l?.abreviacao || `?`
}
function testamentoLivro(livroId) {
  const l = livrosData.find((x) => x.id === Number(livroId))
  return l?.testamento || ''
}

/** "1-2-3" -> "1-3"; "1,3,4" -> "1;3-4". */
function compactarVersiculos(versArr) {
  const arr = [...new Set((versArr || []).map((n) => Number(n)))]
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b)
  if (!arr.length) return ''
  let ini = arr[0]
  let fim = arr[0]
  const blocos = []
  for (let i = 1; i < arr.length; i++) {
    const a = arr[i]
    if (a === fim + 1) fim = a
    else {
      blocos.push(ini === fim ? `${ini}` : `${ini}-${fim}`)
      ini = a
      fim = a
    }
  }
  blocos.push(ini === fim ? `${ini}` : `${ini}-${fim}`)
  return blocos.join(';')
}

function chaveLivroCap(livroId, capitulo) {
  return `${Number(livroId)}_${Number(capitulo)}`
}

/* ------------------------------------------------------------------------ *
 * Página
 * ------------------------------------------------------------------------ */

export default function BibliotecaEstudos() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useFirebaseAuth()

  const returnToParam = searchParams.get('returnTo') || '/'

  const [fase, setFase] = useState('loading') // loading | ready | error
  const [erro, setErro] = useState('')
  const [estudosV, setEstudosV] = useState([])
  const [estudosP, setEstudosP] = useState([])
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('tudo') // 'tudo' | 'pericope' | 'versiculo'
  const [livrosAbertos, setLivrosAbertos] = useState(() => new Set())

  /** Carga inicial — duas leituras em paralelo (oficial + candidato de cada tipo). */
  useEffect(() => {
    if (user === null) {
      navigate('/chat')
      return
    }
    if (user === undefined) return
    let cancelado = false
    ;(async () => {
      setFase('loading')
      setErro('')
      try {
        const [versiculos, pericopes] = await Promise.all([
          listarEstudosVersiculo(),
          listarEstudosPericope()
        ])
        if (cancelado) return
        setEstudosV(versiculos || [])
        setEstudosP(pericopes || [])
        setFase('ready')
      } catch (e) {
        if (cancelado) return
        setErro(e?.message || 'Não foi possível carregar a biblioteca.')
        setFase('error')
      }
    })()
    return () => { cancelado = true }
  }, [user?.uid, navigate])

  /**
   * Aplica filtros de tipo e texto, e devolve estrutura agrupada
   * por livro → capítulo, ordenada por ordem canônica e número.
   */
  const arvore = useMemo(() => {
    const termo = filtroTexto.trim().toLowerCase()
    const itens = []
    if (filtroTipo !== 'versiculo') {
      for (const p of estudosP) {
        const ref = p.referencia || `${abreviacaoLivro(p.livroId)} ${p.capitulo}:${p.inicio}-${p.fim}`
        const haystack = `${ref} ${p.titulo || ''} ${nomeLivro(p.livroId)}`.toLowerCase()
        if (termo && !haystack.includes(termo)) continue
        itens.push({ tipo: 'pericope', ...p, referenciaExibida: ref })
      }
    }
    if (filtroTipo !== 'pericope') {
      for (const v of estudosV) {
        const ref = v.referenciaCompacta || `${abreviacaoLivro(v.livroId)} ${v.capitulo}:${compactarVersiculos(v.versArr)}`
        const haystack = `${ref} ${nomeLivro(v.livroId)}`.toLowerCase()
        if (termo && !haystack.includes(termo)) continue
        itens.push({ tipo: 'versiculo', ...v, referenciaExibida: ref })
      }
    }

    // Agrupar por livro e capítulo.
    const grupoLivros = new Map() // livroId -> { livroId, capitulos: Map<capitulo, item[]>, total }
    for (const it of itens) {
      const lid = it.livroId
      if (!grupoLivros.has(lid)) {
        grupoLivros.set(lid, { livroId: lid, capitulos: new Map(), total: 0 })
      }
      const ent = grupoLivros.get(lid)
      const cap = it.capitulo
      if (!ent.capitulos.has(cap)) ent.capitulos.set(cap, [])
      ent.capitulos.get(cap).push(it)
      ent.total++
    }

    const ordenarItem = (a, b) => {
      // perícopes primeiro dentro de cada capítulo, depois por versículo inicial
      if (a.tipo !== b.tipo) return a.tipo === 'pericope' ? -1 : 1
      const aIni = a.tipo === 'pericope' ? a.inicio : a.versArr[0]
      const bIni = b.tipo === 'pericope' ? b.inicio : b.versArr[0]
      return aIni - bIni
    }

    const result = []
    for (const lid of [...grupoLivros.keys()].sort((x, y) => x - y)) {
      const ent = grupoLivros.get(lid)
      const caps = [...ent.capitulos.keys()].sort((x, y) => x - y)
      const capsOrdenados = caps.map((c) => ({
        capitulo: c,
        itens: [...ent.capitulos.get(c)].sort(ordenarItem)
      }))
      result.push({
        livroId: lid,
        nome: nomeLivro(lid),
        abreviacao: abreviacaoLivro(lid),
        testamento: testamentoLivro(lid),
        total: ent.total,
        capitulos: capsOrdenados
      })
    }
    return result
  }, [estudosV, estudosP, filtroTexto, filtroTipo])

  const totalGeral = useMemo(() => arvore.reduce((s, l) => s + l.total, 0), [arvore])

  const toggleLivro = useCallback((livroId) => {
    setLivrosAbertos((prev) => {
      const next = new Set(prev)
      if (next.has(livroId)) next.delete(livroId)
      else next.add(livroId)
      return next
    })
  }, [])

  /**
   * Abre o estudo correspondente — perícope ou comentário de versículos —
   * preservando o `returnTo` desta biblioteca para que o botão Voltar
   * traga o usuário de volta à mesma posição.
   */
  const abrirEstudo = useCallback((item) => {
    const returnTo = `/biblioteca-estudos${returnToParam ? `?returnTo=${encodeURIComponent(returnToParam)}` : ''}`
    if (item.tipo === 'pericope') {
      const q = new URLSearchParams({
        livro: String(item.livroId),
        capitulo: String(item.capitulo),
        inicio: String(item.inicio),
        fim: String(item.fim),
        titulo: item.titulo || '',
        returnTo
      })
      navigate(`/estudos-biblicos/ia-pericope?${q.toString()}`)
      return
    }
    const q = new URLSearchParams({
      livro: String(item.livroId),
      capitulo: String(item.capitulo),
      versiculos: item.versArr.join(','),
      returnTo
    })
    navigate(`/estudos-biblicos/ia-passagem?${q.toString()}`)
  }, [navigate, returnToParam])

  const voltar = useCallback(() => {
    try {
      navigate(returnToParam.startsWith('/') ? returnToParam : '/')
    } catch {
      navigate('/')
    }
  }, [navigate, returnToParam])

  /* ----------------- RENDER ----------------- */

  return (
    <Box sx={{ ...sxMinViewportHeight(), display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Paper
        elevation={0}
        square
        sx={{
          px: 1,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 2,
          bgcolor: 'background.paper'
        }}
      >
        <IconButton aria-label="Voltar" onClick={voltar} size="large" edge="start">
          <ArrowBack />
        </IconButton>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <LibraryBooksIcon fontSize="small" />
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              Biblioteca de estudos
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap>
            {fase === 'ready'
              ? `${totalGeral} estudo${totalGeral === 1 ? '' : 's'} disponíve${totalGeral === 1 ? 'l' : 'is'}`
              : 'Material já preparado para você ler'}
          </Typography>
        </Box>
      </Paper>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar por livro, referência ou título da perícope…"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
        <ToggleButtonGroup
          value={filtroTipo}
          exclusive
          onChange={(_, v) => v && setFiltroTipo(v)}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="tudo">Todos</ToggleButton>
          <ToggleButton value="pericope">Perícopes</ToggleButton>
          <ToggleButton value="versiculo">Versículos</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', px: 2, pb: 4 }}>
        {fase === 'loading' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
            <CircularProgress />
            <Typography color="text.secondary">Carregando a biblioteca…</Typography>
          </Box>
        )}

        {fase === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>{erro || 'Erro desconhecido.'}</Alert>
        )}

        {fase === 'ready' && arvore.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <AutoStoriesIcon sx={{ fontSize: 56, opacity: 0.4 }} />
            <Typography variant="body1" sx={{ mt: 2, fontWeight: 600 }}>
              {totalGeral === 0 && estudosV.length === 0 && estudosP.length === 0
                ? 'A biblioteca está vazia por enquanto.'
                : 'Nenhum estudo combina com este filtro.'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 480, mx: 'auto' }}>
              {totalGeral === 0 && estudosV.length === 0 && estudosP.length === 0
                ? 'Os primeiros estudos aparecerão aqui quando estiverem disponíveis.'
                : 'Tente outro termo, ou limpe os filtros.'}
            </Typography>
          </Box>
        )}

        {fase === 'ready' && arvore.map((livro) => {
          const aberto = livrosAbertos.has(livro.livroId)
          return (
            <Paper
              key={livro.livroId}
              variant="outlined"
              sx={{ mb: 1.5, overflow: 'hidden' }}
            >
              <Box
                onClick={() => toggleLivro(livro.livroId)}
                sx={{
                  px: 2,
                  py: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  cursor: 'pointer',
                  bgcolor: 'action.hover',
                  '&:hover': { bgcolor: 'action.selected' }
                }}
              >
                <MenuBookIcon color="primary" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {livro.nome}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {livro.testamento === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'}
                    {' · '}
                    {livro.total} estudo{livro.total === 1 ? '' : 's'}
                  </Typography>
                </Box>
                <ExpandMore
                  sx={{
                    transition: 'transform 0.2s ease',
                    transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}
                />
              </Box>
              <Collapse in={aberto} timeout="auto" unmountOnExit>
                <Box sx={{ p: 1.5 }}>
                  {livro.capitulos.map((cap) => (
                    <Box key={chaveLivroCap(livro.livroId, cap.capitulo)} sx={{ mb: 1.5 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ mb: 0.5, color: 'text.secondary' }}
                      >
                        Capítulo {cap.capitulo}
                      </Typography>
                      <Stack spacing={0.75}>
                        {cap.itens.map((item) => (
                          <ItemEstudoCard
                            key={`${item.tipo}-${item.referenciaExibida}`}
                            item={item}
                            onAbrir={() => abrirEstudo(item)}
                          />
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}

/* ------------------------------------------------------------------------ *
 * Card de um item da biblioteca
 * ------------------------------------------------------------------------ */

function ItemEstudoCard({ item, onAbrir }) {
  const ehPericope = item.tipo === 'pericope'
  return (
    <Paper
      variant="outlined"
      onClick={onAbrir}
      sx={{
        px: 1.5,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        cursor: 'pointer',
        bgcolor: 'background.paper',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
        '&:hover': {
          bgcolor: 'action.hover',
          borderColor: 'primary.main'
        }
      }}
    >
      <Tooltip title={ehPericope ? 'Estudo da perícope completa' : 'Comentário de versículo'}>
        {ehPericope ? (
          <AutoStoriesIcon color="primary" />
        ) : (
          <MenuBookIcon color="action" />
        )}
      </Tooltip>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {item.referenciaExibida}
          {ehPericope && item.titulo ? (
            <Typography component="span" variant="body2" fontWeight={500} sx={{ ml: 0.75, color: 'text.secondary' }}>
              — {item.titulo}
            </Typography>
          ) : null}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {ehPericope ? 'Estudo expositivo da perícope' : 'Comentário do versículo'}
        </Typography>
      </Box>
    </Paper>
  )
}
