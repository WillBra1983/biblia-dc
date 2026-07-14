import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Divider,
  Stack,
  useMediaQuery,
  useTheme
} from '@mui/material'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import DeleteIcon from '@mui/icons-material/Delete'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ShareIcon from '@mui/icons-material/Share'
import { useNavigate } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { buildVersiculosMarcadosExport } from '../utils/appExportPayload'
import { ensureUserForChatExport, pushPendingChatExport } from '../utils/chatExportSend'
import { avisarAsync } from '../utils/uiDialogs'
import { useApp } from '../contexts/AppContext'
import {
  obterTodosVersiculosMarcados,
  desmarcarVersiculo,
  limparTodosVersiculosMarcados,
  CORES_DISPONIVEIS
} from '../services/versiculosMarcadosService'
import { livros } from '../data/biblia'
import { VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED } from '../config/featureFlags'
import CloudSyncBadge from '../components/CloudSyncBadge'
import { limparBibliaSessaoCache } from '../utils/bibliaSessionCache'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { resolveFontFamily } from '../utils/fontFamily'

/** Conta quantos marcados legados (sem `grupoMarcacaoId`) compartilham o mesmo instante + livro + capítulo + cor. */
function contarLegadoPorData(versiculos) {
  const m = new Map()
  for (const v of versiculos) {
    if (v.grupoMarcacaoId) continue
    const k = `${v.livroId}|${v.capitulo}|${v.corId}|${v.dataMarcacao}`
    m.set(k, (m.get(k) || 0) + 1)
  }
  return m
}

function chaveGrupo(v, contagemLegado) {
  if (v.grupoMarcacaoId) return v.grupoMarcacaoId
  const leg = `${v.livroId}|${v.capitulo}|${v.corId}|${v.dataMarcacao}`
  if ((contagemLegado.get(leg) || 0) > 1) return `legacyBatch:${leg}`
  return `solo:${v.livroId}-${v.capitulo}-${v.versiculo}-${v.corId}-${v.dataMarcacao}`
}

function agruparVersiculosNaCor(versiculos) {
  const contagem = contarLegadoPorData(versiculos)
  const mapa = new Map()
  for (const v of versiculos) {
    const k = chaveGrupo(v, contagem)
    if (!mapa.has(k)) mapa.set(k, [])
    mapa.get(k).push(v)
  }
  const grupos = [...mapa.values()].map((g) =>
    [...g].sort((a, b) => Number(a.versiculo) - Number(b.versiculo))
  )
  grupos.sort(
    (a, b) =>
      new Date(b[0]?.dataMarcacao || 0).getTime() - new Date(a[0]?.dataMarcacao || 0).getTime()
  )
  return grupos
}

function numerosVersiculoParaFaixas(numeros) {
  const sorted = [...new Set(numeros.map((n) => Math.floor(Number(n))).filter((n) => !Number.isNaN(n)))].sort(
    (a, b) => a - b
  )
  const partes = []
  let i = 0
  while (i < sorted.length) {
    const ini = sorted[i]
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j += 1
    partes.push(ini === sorted[j] ? String(ini) : `${ini}-${sorted[j]}`)
    i = j + 1
  }
  return partes.join('; ')
}

function rotuloGrupo(livroId, capitulo, grupo) {
  const livro = livros.find((l) => l.id === livroId)
  const abr = livro?.abreviacao || livro?.nome?.slice(0, 3) || `L${livroId}`
  const nums = grupo.map((v) => v.versiculo)
  const faixas = numerosVersiculoParaFaixas(nums)
  return `${abr} ${capitulo}:${faixas}`
}

function textoGrupoUnido(grupo) {
  return grupo
    .map((v) => (typeof v.texto === 'string' ? v.texto.trim() : ''))
    .filter(Boolean)
    .join(' ')
}

export default function VersiculosMarcados() {
  const [versiculosMarcados, setVersiculosMarcados] = useState([])
  const [dialogoLimparAberto, setDialogoLimparAberto] = useState(false)
  const navigate = useNavigate()
  const { user } = useFirebaseAuth()
  const { voltarParaPaginaAnterior, setBackButtonHandler, fontSize, lineHeight, textAlign, fontFamily } =
    useApp()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const lh = readingLineHeightToCss(lineHeight)
  const ff = resolveFontFamily(fontFamily)
  const sxTextoLeitura = {
    fontSize: `${fontSize}%`,
    lineHeight: lh,
    fontFamily: ff,
    textAlign: textAlign || 'left',
  }

  useEffect(() => {
    const carregarVersiculos = () => {
      const marcados = obterTodosVersiculosMarcados()
      setVersiculosMarcados(marcados)
    }

    carregarVersiculos()

    const handleChange = () => {
      carregarVersiculos()
    }
    window.addEventListener('versiculosMarcadosChange', handleChange)
    return () => window.removeEventListener('versiculosMarcadosChange', handleChange)
  }, [])

  // Garante comportamento consistente do botão físico voltar nesta tela.
  useEffect(() => {
    if (!setBackButtonHandler) return
    setBackButtonHandler(() => {
      if (dialogoLimparAberto) {
        setDialogoLimparAberto(false)
        return
      }
      voltarParaPaginaAnterior('/')
    })
    return () => setBackButtonHandler(null)
  }, [dialogoLimparAberto, setBackButtonHandler, voltarParaPaginaAnterior])

  const obterCor = (corId) => {
    return CORES_DISPONIVEIS.find(c => c.id === corId) || CORES_DISPONIVEIS[0]
  }

  const handleIrParaVersiculo = async (versiculo) => {
    const { livroId, capitulo, versiculo: versiculoNum } = versiculo
    // Destino explícito — não reutilizar cache/scroll da leitura anterior.
    limparBibliaSessaoCache()
    localStorage.setItem('ultimaLeitura', JSON.stringify({ livroId, capitulo }))
    localStorage.setItem('versiculoParaScroll', JSON.stringify({
      livroId,
      cap: capitulo,
      versiculoNum,
    }))
    window.dispatchEvent(new Event('localStorageChange'))
    navigate(`/?livro=${livroId}&capitulo=${capitulo}&versiculo=${versiculoNum}`)
  }

  const handleIrParaGrupo = (grupo) => {
    if (!grupo?.length) return
    const primeiro = [...grupo].sort((a, b) => Number(a.versiculo) - Number(b.versiculo))[0]
    handleIrParaVersiculo(primeiro)
  }

  const handleDesmarcarGrupo = (grupo) => {
    for (const v of grupo) {
      desmarcarVersiculo(v.livroId, v.capitulo, v.versiculo)
    }
    // A reconciliação com a nuvem é disparada automaticamente pelo service
    // (com coalescing de múltiplas desmarcações no mesmo tick).
  }

  const handleLimparTodos = () => {
    limparTodosVersiculosMarcados()
    setDialogoLimparAberto(false)
    // Reconciliação automática pelo service.
  }

  const handleEnviarVersiculosChat = () => {
    if (!ensureUserForChatExport(user, navigate)) return
    const { serialized, previewText } = buildVersiculosMarcadosExport()
    if (serialized.length > 12000) {
      avisarAsync({
        titulo: 'Volume de dados excedido',
        mensagem: 'O volume de dados excede o limite do chat. Reduza as marcações ou envie em partes.',
        severidade: 'warning'
      })
      return
    }
    pushPendingChatExport(navigate, {
      exportKind: 'versiculos_marcados',
      exportPayload: serialized,
      previewText
    })
  }

  // Agrupar por cor
  const versiculosPorCor = versiculosMarcados.reduce((acc, v) => {
    if (!acc[v.corId]) {
      acc[v.corId] = []
    }
    acc[v.corId].push(v)
    return acc
  }, {})

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        gap: { xs: 2, sm: 0 },
        mb: 3 
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, sm: 2 },
          flexWrap: 'wrap',
          flex: 1,
          minWidth: 0,
        }}>
          <IconButton
            onClick={() => window.history.back()}
            sx={{ 
              mr: { xs: 0.5, sm: 1 },
              color: 'primary.main',
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <BookmarkIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: 'primary.main', flexShrink: 0 }} />
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', sm: '2.125rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Versículos Marcados
          </Typography>
          <Chip 
            label={versiculosMarcados.length} 
            color="primary" 
            sx={{ 
              fontWeight: 'bold',
              flexShrink: 0,
            }}
          />
          <CloudSyncBadge
            featureEnabled={VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED}
            recurso="marcadores"
          />
        </Box>
        {versiculosMarcados.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<ShareIcon />}
              onClick={handleEnviarVersiculosChat}
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1.5, sm: 2 }
              }}
            >
              Enviar pelo chat
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDialogoLimparAberto(true)}
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1.5, sm: 2 }
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Limpar Todos
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                Limpar
              </Box>
            </Button>
          </Stack>
        )}
      </Box>

      {versiculosMarcados.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <BookmarkBorderIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum versículo marcado
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Marque versículos na página da Bíblia para vê-los aqui
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {Object.entries(versiculosPorCor).map(([corId, versiculos]) => {
            const cor = obterCor(corId)
            return (
              <Paper key={corId} sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: { xs: 1, sm: 2 }, 
                  mb: 2,
                  flexWrap: 'wrap',
                }}>
                  <Box
                    sx={{
                      width: { xs: 20, sm: 24 },
                      height: { xs: 20, sm: 24 },
                      borderRadius: '50%',
                      bgcolor: cor.cor,
                      flexShrink: 0,
                    }}
                  />
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 'bold',
                      fontSize: { xs: '1rem', sm: '1.25rem' },
                    }}
                  >
                    {cor.nome}
                  </Typography>
                  <Chip 
                    label={versiculos.length} 
                    size="small" 
                    sx={{ flexShrink: 0 }}
                  />
                </Box>
                <Divider sx={{ mb: 2 }} />
                <List>
                  {agruparVersiculosNaCor(versiculos).map((grupo) => {
                    const v0 = grupo[0]
                    const chaveLista = grupo.map((v) => `${v.livroId}-${v.capitulo}-${v.versiculo}`).join('|')
                    const textoUnido = textoGrupoUnido(grupo)
                    return (
                      <React.Fragment key={chaveLista}>
                        <ListItem
                          sx={{
                            bgcolor: `${cor.cor}10`,
                            borderRadius: 1,
                            mb: 1,
                            borderLeft: `4px solid ${cor.cor}`,
                            '&:hover': {
                              bgcolor: `${cor.cor}20`
                            },
                            pr: { xs: 9, sm: 10 },
                            alignItems: 'flex-start'
                          }}
                          secondaryAction={
                            <Box
                              sx={{
                                display: 'flex',
                                gap: { xs: 0.5, sm: 1 },
                                position: 'absolute',
                                right: { xs: 4, sm: 8 },
                                top: '50%',
                                transform: 'translateY(-50%)'
                              }}
                            >
                              <IconButton
                                edge="end"
                                onClick={() => handleIrParaGrupo(grupo)}
                                color="primary"
                                size={isMobile ? 'small' : 'medium'}
                                aria-label="Abrir na Bíblia"
                              >
                                <NavigateNextIcon fontSize={isMobile ? 'small' : 'medium'} />
                              </IconButton>
                              <IconButton
                                edge="end"
                                onClick={() => handleDesmarcarGrupo(grupo)}
                                color="error"
                                size={isMobile ? 'small' : 'medium'}
                                aria-label={
                                  grupo.length > 1 ? 'Remover marcação deste grupo' : 'Remover marcação'
                                }
                              >
                                <DeleteIcon fontSize={isMobile ? 'small' : 'medium'} />
                              </IconButton>
                            </Box>
                          }
                        >
                          <ListItemText
                            primary={
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  fontWeight: 'bold',
                                  wordBreak: 'break-word',
                                  ...sxTextoLeitura,
                                }}
                              >
                                {rotuloGrupo(v0.livroId, v0.capitulo, grupo)}
                              </Typography>
                            }
                            secondary={
                              <Typography
                                variant="body2"
                                sx={{
                                  mt: 1,
                                  fontStyle: 'italic',
                                  color: 'text.secondary',
                                  wordBreak: 'break-word',
                                  whiteSpace: 'pre-wrap',
                                  ...sxTextoLeitura,
                                }}
                              >
                                {textoUnido || 'Sem texto salvo'}
                              </Typography>
                            }
                          />
                        </ListItem>
                      </React.Fragment>
                    )
                  })}
                </List>
              </Paper>
            )
          })}
        </Stack>
      )}

      <Dialog open={dialogoLimparAberto} onClose={() => setDialogoLimparAberto(false)}>
        <DialogTitle>Limpar todos os versículos marcados?</DialogTitle>
        <DialogContent>
          <Typography>
            Esta ação não pode ser desfeita. Todos os {versiculosMarcados.length} versículos marcados serão removidos.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogoLimparAberto(false)}>Cancelar</Button>
          <Button onClick={handleLimparTodos} color="error" variant="contained">
            Limpar Todos
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

