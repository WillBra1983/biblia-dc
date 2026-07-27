import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Typography,
  Paper,
  CircularProgress,
  Box,
  IconButton,
  Drawer,
  ListItem,
  ListItemText,
  TextField,
  InputAdornment,
  Stack,
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import NavigateNext from '@mui/icons-material/NavigateNext'
import LibraryMusic from '@mui/icons-material/LibraryMusic'
import SearchIcon from '@mui/icons-material/Search'
import ArrowBack from '@mui/icons-material/ArrowBack'
import Close from '@mui/icons-material/Close'
import Slideshow from '@mui/icons-material/Slideshow'
import { useNavigate, useLocation } from 'react-router-dom'
import { hinarioService } from '../services/hinarioService'
import { hinarioCifrasService } from '../services/hinarioCifrasService'
import HinarioCifrasDiretas from '../components/HinarioCifrasDiretas'
import LocalPinchZoom from '../components/LocalPinchZoom'
import ListaVirtualizada from '../components/ListaVirtualizada'
import { useApp } from '../contexts/AppContext'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { resolveFontFamily } from '../utils/fontFamily'
import { formatarNotasRodapeHinario } from '../utils/hinarioNotasFormat'
import { usePodeUsarModoApresentacao } from '../utils/modoApresentacaoDispositivo'

export default function Hinario() {
  const [searchTerm, setSearchTerm] = useState('')
  const [hinoAtual, setHinoAtual] = useState(null)
  const [hinos, setHinos] = useState([])
  const [ordenacao, setOrdenacao] = useState('numero')
  const [loading, setLoading] = useState(true)
  const [buscando, setBuscando] = useState(false)
  const [carregandoHino, setCarregandoHino] = useState(false)
  const [error, setError] = useState(null)
  const [menuAberto, setMenuAberto] = useState(false)
  const [hinoCifrado, setHinoCifrado] = useState(null)
  const [carregandoCifras, setCarregandoCifras] = useState(false)
  /** Evita repetir seleção automática quando o usuário volta à lista (hinoAtual null). */
  const selecaoInicialFeitaRef = useRef(false)
  const buscaIdRef = useRef(0)
  const selecaoIdRef = useRef(0)

  const navigate = useNavigate()
  const location = useLocation()
  /** Rota fixa: `/hinario/letra` ou `/hinario/cifras` — sem alternar na mesma tela. */
  const modoCifras = location.pathname.includes('/cifras')
  const { fontSize, lineHeight, textAlign, fontFamily, setBackButtonHandler } = useApp()
  const lh = readingLineHeightToCss(lineHeight)
  const ff = resolveFontFamily(fontFamily)
  const apresentacaoNoComputador = usePodeUsarModoApresentacao()
  const sxTextoLeitura = {
    fontSize: `${fontSize}%`,
    lineHeight: lh,
    fontFamily: ff,
    textAlign: textAlign || 'left',
  }

  const prefixoNumero = n => {
    const prefixo = String(n ?? '').match(/^\d+/)?.[0]
    return prefixo ? parseInt(prefixo, 10) : Number.MAX_SAFE_INTEGER
  }

  const selecionarHino = async (resumo, { fecharMenu = true, registrarHistorico = true } = {}) => {
    if (!resumo) return
    const selecaoId = ++selecaoIdRef.current
    setCarregandoHino(true)
    setError(null)
    try {
      const completo = modoCifras
        ? resumo
        : resumo.conteudo
        ? resumo
        : await hinarioService.buscarHino(resumo.numero)
      if (selecaoId !== selecaoIdRef.current || !completo) return
      setHinoAtual(completo)
      localStorage.setItem('ultimoHinoAcessado', completo.numero)
      if (fecharMenu) setMenuAberto(false)
      if (registrarHistorico) {
        window.history.pushState({ listaType: 'hinario-hino' }, '')
      }
    } catch (err) {
      if (selecaoId === selecaoIdRef.current) setError(err.message)
    } finally {
      if (selecaoId === selecaoIdRef.current) setCarregandoHino(false)
    }
  }

  const voltarDaVisualizacaoHino = () => {
    window.dispatchEvent(new Event('salvation-open-main-menu'))
  }

  // Com o menu (drawer) aberto, o botão/gesto voltar do sistema fecha o menu — igual ao esperado no app
  useEffect(() => {
    if (!setBackButtonHandler) return
    if (menuAberto) {
      setBackButtonHandler(() => setMenuAberto(false))
    } else {
      setBackButtonHandler(null)
    }
    return () => setBackButtonHandler(null)
  }, [menuAberto, setBackButtonHandler])

  // Carrega apenas o índice. A letra completa é buscada ao abrir um hino.
  useEffect(() => {
    const buscaId = ++buscaIdRef.current
    const termo = searchTerm.trim()
    const primeiraCarga = selecaoInicialFeitaRef.current === false && hinos.length === 0
    if (primeiraCarga) setLoading(true)
    else setBuscando(true)

    const timer = window.setTimeout(async () => {
      try {
        const service = modoCifras ? hinarioCifrasService : hinarioService
        const data = termo
          ? await service.buscarPorTexto(termo)
          : await service.buscarTodos()
        if (buscaId === buscaIdRef.current) {
          setHinos(data)
          setError(null)
        }
      } catch (err) {
        if (buscaId === buscaIdRef.current) setError(err.message)
      } finally {
        if (buscaId === buscaIdRef.current) {
          setLoading(false)
          setBuscando(false)
        }
      }
    }, termo ? 220 : 0)

    return () => window.clearTimeout(timer)
    // A lista é atualizada somente pela busca; incluir `hinos` repetiria a consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, modoCifras])

  // Primeira vez com lista carregada: último hino visto ou o primeiro (evita tela em branco ao voltar do menu/Bíblia)
  useEffect(() => {
    if (hinos.length === 0 || selecaoInicialFeitaRef.current) return
    selecaoInicialFeitaRef.current = true

    const ultimo = localStorage.getItem('ultimoHinoAcessado')
    if (ultimo) {
      const hinoSalvo = hinos.find(h => String(h.numero) === String(ultimo))
      if (hinoSalvo) {
        void selecionarHino(hinoSalvo, { fecharMenu: false, registrarHistorico: false })
        return
      }
    }

    const sorted = [...hinos].sort((a, b) => {
      const na = prefixoNumero(a.numero)
      const nb = prefixoNumero(b.numero)
      if (na !== nb) return na - nb
      return String(a.numero).localeCompare(String(b.numero))
    })
    const first = sorted[0]
    if (first) {
      void selecionarHino(first, { fecharMenu: false, registrarHistorico: false })
    }
  }, [hinos])

  useEffect(() => {
    if (!hinoAtual || !modoCifras) {
      setHinoCifrado(null)
      setCarregandoCifras(false)
      return
    }
    let cancelled = false
    setHinoCifrado(null)
    setCarregandoCifras(true)
    void hinarioCifrasService.buscarHino(hinoAtual.numero)
      .then(data => {
        if (cancelled) return
        setHinoCifrado(data)
        if (!data) setError(`Cifras não encontradas para o hino ${hinoAtual.numero}.`)
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setCarregandoCifras(false)
      })
    return () => { cancelled = true }
  }, [hinoAtual, modoCifras])

  // Suporte ao botão voltar do celular
  useEffect(() => {
    const stateType = hinoAtual ? 'hinario-hino' : 'hinario-lista'
    if (!window.history.state?.listaType || window.history.state.listaType !== stateType) {
      window.history.pushState({ listaType: stateType }, '')
    }
    const handlePopState = () => {
      if (menuAberto) {
        setMenuAberto(false)
      } else if (hinoAtual) {
        setHinoAtual(null)
      } else {
        navigate('/biblia', { replace: true })
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [hinoAtual, menuAberto, navigate])

  useEffect(() => {
    setTimeout(() => {
      document.querySelectorAll('main.MuiBox-root').forEach(el => {
        el.scrollTop = 0;
      });
    }, 100);
  }, [hinoAtual]);

  const hinosFiltrados = useMemo(() => [...hinos].sort((a, b) => {
    if (ordenacao === 'alfabetica') {
      return a.titulo.localeCompare(b.titulo, 'pt-BR')
    }
    const na = prefixoNumero(a.numero)
    const nb = prefixoNumero(b.numero)
    if (na !== nb) return na - nb
    return String(a.numero).localeCompare(String(b.numero), 'pt-BR')
  }), [hinos, ordenacao])

  const indiceHinoAtual = () => {
    if (!hinoAtual) return -1
    return hinosFiltrados.findIndex(h => String(h.numero) === String(hinoAtual.numero))
  }

  const irParaHinoAnterior = () => {
    const i = indiceHinoAtual()
    if (i > 0) {
      const h = hinosFiltrados[i - 1]
      void selecionarHino(h)
    }
  }

  const irParaProximoHino = () => {
    const i = indiceHinoAtual()
    if (i >= 0 && i < hinosFiltrados.length - 1) {
      const h = hinosFiltrados[i + 1]
      void selecionarHino(h)
    }
  }

  const podeAnterior = indiceHinoAtual() > 0
  const podeProximo = indiceHinoAtual() >= 0 && indiceHinoAtual() < hinosFiltrados.length - 1

  const abrirModoApresentacao = () => {
    if (!hinoAtual || !apresentacaoNoComputador) return
    navigate(`/hinario/apresentacao?numero=${encodeURIComponent(hinoAtual.numero)}`)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', '@supports (height: 100dvh)': { height: '100dvh' } }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        width: '100%',
        bgcolor: 'background.default'
      }}
    >
      {/* Ações principais do hinário */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          py: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Button
          color="primary"
          onClick={() => navigate('/biblia')}
          aria-label="Ir para o início"
          startIcon={<ArrowBack />}
          size="small"
          sx={{ fontWeight: 700 }}
        >
          Início
        </Button>
        <Button
          color="primary"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu do hinário"
          startIcon={<LibraryMusic />}
          variant="outlined"
          size="small"
          sx={{ fontWeight: 700 }}
        >
          Escolher hino
        </Button>
      </Box>

      {/* Drawer do Menu */}
      <Drawer
        anchor="right"
        open={menuAberto}
        onClose={() => setMenuAberto(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 400, md: 400 },
            maxWidth: '100vw',
            pt: 1
          }
        }}
      >
        <LocalPinchZoom
          resetKey={`${hinoAtual?.numero ?? 'lista'}-${menuAberto ? 'open' : 'closed'}`}
          sx={{ height: '100%', maxHeight: '100dvh' }}
        >
        <Box
          sx={{
            width: '100%',
            pt: 1,
            boxSizing: 'border-box',
            // flex column 100% para que a lista virtualizada ocupe o resto
            // do drawer (acima dela só ficam busca + botões de ordenação).
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0
          }}
        >
          <Box sx={{ px: 2, pt: 1, flexShrink: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Hinos
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {hinosFiltrados.length} {hinosFiltrados.length === 1 ? 'resultado' : 'resultados'}
            </Typography>
          </Box>

          {/* Barra de busca */}
          <Box sx={{ p: 2, pb: 1, flexShrink: 0 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar hino..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: buscando ? (
                  <InputAdornment position="end">
                    <CircularProgress size={18} />
                  </InputAdornment>
                ) : null,
              }}
            />
          </Box>

          {/* Botões de ordenação */}
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pb: 1, justifyContent: 'space-between', flexShrink: 0 }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={ordenacao}
              onChange={(_, valor) => valor && setOrdenacao(valor)}
              aria-label="Ordenar hinos"
            >
              <ToggleButton value="numero" aria-label="Ordenar por número">123</ToggleButton>
              <ToggleButton value="alfabetica" aria-label="Ordenar alfabeticamente">ABC</ToggleButton>
            </ToggleButtonGroup>
            <Button 
              startIcon={<ArrowBack />}
              onClick={() => setMenuAberto(false)}
              aria-label="Fechar menu de hinos"
              sx={{ fontWeight: 'bold' }}
            >
              Voltar
            </Button>
          </Box>

          {/* Lista de hinos — virtualizada (react-window) para suportar
              ~600 hinos sem renderizar todos no DOM. */}
          <ListaVirtualizada
            items={hinosFiltrados}
            itemSize={56}
            itemKey={(_, h) => h.numero}
            renderItem={(hino) => (
              <ListItem
                button
                onClick={() => {
                  void selecionarHino(hino)
                }}
                selected={String(hinoAtual?.numero) === String(hino.numero)}
                sx={{ height: '100%', px: 2.25 }}
              >
                <ListItemText
                  primary={`${hino.numero}. ${hino.titulo}`}
                  primaryTypographyProps={{
                    noWrap: true,
                    sx: {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }
                  }}
                />
              </ListItem>
            )}
          />
        </Box>
        </LocalPinchZoom>
      </Drawer>

      {hinoAtual ? (
        <Paper
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            maxHeight: '100%',
            overflow: 'hidden',
            bgcolor: 'background.paper'
          }}
        >
          {modoCifras ? (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                flexShrink: 0,
                px: 1,
                py: 0.5,
                borderBottom: 1,
                borderColor: 'divider',
                gap: 0.5
              }}
            >
              <Typography
                variant="body2"
                sx={{ flex: 1, minWidth: 0, fontWeight: 600, lineHeight: 1.2 }}
                noWrap
                title={`${hinoAtual.numero}. ${hinoAtual.titulo}`}
              >
                {hinoAtual.numero}. {hinoAtual.titulo}
              </Typography>
            </Stack>
          ) : (
            <Box
              alignItems="center"
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                gap: 1,
                px: { xs: 1, sm: 2 },
                pt: 1.5,
                pb: 0.5,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  flex: 1,
                  gridColumn: 2,
                  minWidth: 0,
                  ...sxTextoLeitura,
                  textAlign: 'center',
                }}
              >
                {hinoAtual.numero}. {hinoAtual.titulo}
              </Typography>
              {apresentacaoNoComputador ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Slideshow />}
                  onClick={abrirModoApresentacao}
                  sx={{ gridColumn: 3, justifySelf: 'end', flexShrink: 0 }}
                >
                  Apresentação
                </Button>
              ) : null}
            </Box>
          )}

          {/* Conteúdo: letra ou cifras diretas com transposição. */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {!modoCifras ? (
              <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 1, sm: 2 }, py: 1.5 }}>
                <Typography sx={{ whiteSpace: 'pre-wrap', ...sxTextoLeitura }}>
                  {formatarNotasRodapeHinario(hinoAtual.conteudo)}
                </Typography>
              </Box>
            ) : carregandoCifras || !hinoCifrado ? (
              <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
                <Stack alignItems="center" spacing={1.25}>
                  <CircularProgress size={30} />
                  <Typography color="text.secondary">Preparando cifras...</Typography>
                </Stack>
              </Box>
            ) : (
              <HinarioCifrasDiretas key={hinoCifrado.id} hino={hinoCifrado} textSx={sxTextoLeitura} />
            )}

            <Box
              sx={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                px: modoCifras ? 1 : 2,
                py: modoCifras ? 0.75 : 1,
                mt: !modoCifras ? 2 : 0,
                mb: !modoCifras ? 1 : 0,
                borderTop: modoCifras ? 1 : 0,
                borderColor: 'divider'
              }}
            >
              <IconButton
                color="primary"
                onClick={voltarDaVisualizacaoHino}
                aria-label="Voltar"
                sx={{ ml: modoCifras ? -0.5 : 0 }}
              >
                <ArrowBack />
                <Typography variant="body2" sx={{ ml: 0.5 }}>
                  Voltar
                </Typography>
              </IconButton>

              <Stack direction="row" spacing={0.5} sx={{ flex: 1, justifyContent: 'center' }}>
                <IconButton
                  size="small"
                  onClick={irParaHinoAnterior}
                  disabled={!podeAnterior}
                  aria-label="Hino anterior"
                  color="primary"
                >
                  <NavigateBefore />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={irParaProximoHino}
                  disabled={!podeProximo}
                  aria-label="Próximo hino"
                  color="primary"
                >
                  <NavigateNext />
                </IconButton>
              </Stack>

              {hinoAtual.referencia && !modoCifras && (
                <Typography
                  variant="caption"
                  sx={{
                    fontStyle: 'italic',
                    mr: 1,
                    textAlign: 'right',
                    ...sxTextoLeitura,
                  }}
                >
                  ({hinoAtual.referencia})
                </Typography>
              )}
            </Box>
          </Box>

          {/* Setas laterais: no modo cifras a navegação fica no rodapé para não cobrir os acordes. */}
          <Box
            sx={{
              position: 'fixed',
              left: 0,
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              display: !modoCifras ? 'flex' : 'none',
              justifyContent: 'space-between',
              px: 0.5,
              zIndex: 1,
              pointerEvents: 'none',
              '& .MuiIconButton-root': { pointerEvents: 'auto' }
            }}
          >
            <IconButton
              onClick={irParaHinoAnterior}
              disabled={!podeAnterior}
              sx={{
                bgcolor: 'rgba(0, 77, 64, 0.08)',
                color: '#004d40',
                '&:hover': {
                  bgcolor: 'rgba(0, 77, 64, 0.15)'
                },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                  color: 'rgba(0, 0, 0, 0.26)'
                }
              }}
            >
              <NavigateBefore />
            </IconButton>

            <IconButton
              onClick={irParaProximoHino}
              disabled={!podeProximo}
              sx={{
                bgcolor: 'rgba(0, 77, 64, 0.08)',
                color: '#004d40',
                '&:hover': {
                  bgcolor: 'rgba(0, 77, 64, 0.15)'
                },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                  color: 'rgba(0, 0, 0, 0.26)'
                }
              }}
            >
              <NavigateNext />
            </IconButton>
          </Box>
        </Paper>
      ) : carregandoHino ? (
        <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <Stack alignItems="center" spacing={1.5}>
            <CircularProgress size={32} />
            <Typography color="text.secondary">Abrindo hino...</Typography>
          </Stack>
        </Box>
      ) : null}
    </Box>
  )
} 
