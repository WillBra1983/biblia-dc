import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Collapse,
  Stack,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useApp } from '../contexts/AppContext'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Check from '@mui/icons-material/Check'
import Close from '@mui/icons-material/Close'
import MoreVert from '@mui/icons-material/MoreVert'
import Delete from '@mui/icons-material/Delete'
import Visibility from '@mui/icons-material/Visibility'
import TextoBiblico from '../components/TextoBiblico'
import PlanoPinchZoomShell from '../components/PlanoPinchZoomShell'
import { limparBibliaSessaoCache } from '../utils/bibliaSessionCache'
import {
  migrarLegadoSeNecessario,
  obterInstancia,
  obterTemplate,
  instanciaAtivaId,
  definirInstanciaAtiva,
  marcarCapituloInstancia,
  obterProgressoInstancia,
  processarEventosAoAbrirPlano,
  limparProgressoInstancia,
  podeColocarLeituraEmDia,
  colocarLeituraEmDia,
  obterMetricasResumo,
} from '../utils/planoLeituraUsuario'
import { diaCivilAmericaSaoPaulo } from '../utils/fusoHorarioBrasil'

const hojeBrasil = () => diaCivilAmericaSaoPaulo()
import { resumoVisualAPartirInventario } from '../utils/escadaPlanoLeitura'
import { processarMedalhasAposAbrirPlano } from '../utils/medalhasGamificacao'
import PlanoEscadaBarraMedalhas from '../components/PlanoEscadaBarraMedalhas'
import PlanoEscadaCelebracao from '../components/PlanoEscadaCelebracao'
import PlanoRankingLeitura from '../components/PlanoRankingLeitura'
import { blocosVisiveisParaTemplate, destinoMapaBloco } from '../utils/planoMapaLeitura'
import { sxFundoVerdePagina } from '../utils/fundoVerdePagina'
import { preloadPlanoRankingIcon } from '../utils/planoEscadaImagens'

function CabecalhoSecaoRecolhivel({ titulo, expandido, onToggle, sx = {}, acaoDireita = null }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={expandido}
      sx={{
        cursor: 'pointer',
        userSelect: 'none',
        mb: expandido ? 1 : 0,
        ...sx,
      }}
    >
      <IconButton
        size="small"
        aria-label={expandido ? 'Recolher' : 'Expandir'}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        sx={{
          transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          color: 'inherit',
        }}
      >
        <ExpandMoreIcon fontSize="small" />
      </IconButton>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
        {titulo}
      </Typography>
      {acaoDireita ? (
        <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
          {acaoDireita}
        </Box>
      ) : null}
    </Stack>
  )
}

function isEventoEscadaVisual(e) {
  return (
    e?.tipo === 'plano_dia_bronze' ||
    e?.tipo === 'plano_escada_conversao' ||
    e?.tipo === 'plano_orientacao_recuperacao'
  )
}

function eventoEscadaParaProps(e) {
  if (!e) return { variante: 'bronze', mensagem: '' }
  if (e.tipo === 'plano_orientacao_recuperacao') {
    return { variante: 'bronze', mensagem: String(e.mensagem || '') }
  }
  if (e.tipo === 'plano_dia_bronze') return { variante: 'bronze', mensagem: String(e.mensagem || '') }
  const n = e.meta?.nivel
  if (n === 'prata') return { variante: 'prata', mensagem: String(e.mensagem || '') }
  if (n === 'ouro') return { variante: 'ouro', mensagem: String(e.mensagem || '') }
  if (n === 'trofeu') return { variante: 'trofeu', mensagem: String(e.mensagem || '') }
  if (n === 'superTrofeu') return { variante: 'superTrofeu', mensagem: String(e.mensagem || '') }
  return { variante: 'bronze', mensagem: String(e.mensagem || '') }
}

function dispararIncentivos(lista) {
  if (!Array.isArray(lista)) return
  for (const detail of lista) {
    if (detail && detail.mensagem) {
      window.dispatchEvent(new CustomEvent('app-incentivo', { detail }))
    }
  }
}

export default function PlanoLeituraBiblia() {
  migrarLegadoSeNecessario()
  const { isDarkMode, setPlanoLeitura } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const idUrl = searchParams.get('id')
  const [instanciaId, setInstanciaId] = useState(() => idUrl || instanciaAtivaId() || '')
  const [menuAnchorEl, setMenuAnchorEl] = useState(null)
  const [dialogLimparAberto, setDialogLimparAberto] = useState(false)
  const [dialogProgressoAberto, setDialogProgressoAberto] = useState(false)
  const [tick, setTick] = useState(0)
  const [filaCelebracao, setFilaCelebracao] = useState([])
  const [mapaExpandido, setMapaExpandido] = useState(false)
  const [livrosExpandido, setLivrosExpandido] = useState(false)

  useEffect(() => {
    setLivrosExpandido(false)
    setMapaExpandido(false)
  }, [instanciaId])

  useEffect(() => {
    void preloadPlanoRankingIcon()
  }, [])

  useEffect(() => {
    const resolved = idUrl || instanciaAtivaId() || ''
    if (resolved) {
      setInstanciaId(resolved)
      definirInstanciaAtiva(resolved)
      if (!idUrl) {
        setSearchParams({ id: resolved }, { replace: true })
      }
    }
  }, [idUrl, setSearchParams])

  const instancia = useMemo(() => (instanciaId ? obterInstancia(instanciaId) : null), [instanciaId, tick])
  const planoAtual = useMemo(
    () => (instancia ? obterTemplate(instancia.templateId) : null),
    [instancia, tick]
  )

  const blocosMapa = useMemo(
    () => (planoAtual ? blocosVisiveisParaTemplate(planoAtual) : []),
    [planoAtual]
  )

  const abrirMapaBloco = useCallback(
    (blocoId) => {
      if (!instancia || !planoAtual || !instanciaId) return
      const dest = destinoMapaBloco(instancia, planoAtual, blocoId)
      if (!dest) return
      // Evita que o cache da última leitura na Bíblia sobrescreva o destino do plano.
      limparBibliaSessaoCache()
      navigate(
        `/?livro=${dest.livroId}&capitulo=${dest.capitulo}&planoId=${encodeURIComponent(instanciaId)}&origem=plano`
      )
    },
    [instancia, planoAtual, instanciaId, navigate]
  )

  const capitulosLidosPlano = instancia?.capitulosLidos ?? []

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const diaCivilAnteriorRef = useRef(diaCivilAmericaSaoPaulo())

  useEffect(() => {
    const aoExterno = () => refresh()
    const aoVisibilidade = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const aoMudarDia = () => {
      const d = diaCivilAmericaSaoPaulo()
      if (d !== diaCivilAnteriorRef.current) {
        diaCivilAnteriorRef.current = d
        refresh()
      }
    }
    window.addEventListener('salvation-plano-leitura-atualizado', aoExterno)
    window.addEventListener('focus', aoMudarDia)
    window.addEventListener('pageshow', aoMudarDia)
    document.addEventListener('visibilitychange', aoVisibilidade)
    const timer = window.setInterval(aoMudarDia, 15000)
    return () => {
      window.removeEventListener('salvation-plano-leitura-atualizado', aoExterno)
      window.removeEventListener('focus', aoMudarDia)
      window.removeEventListener('pageshow', aoMudarDia)
      document.removeEventListener('visibilitychange', aoVisibilidade)
      window.clearInterval(timer)
    }
  }, [refresh])

  const marcarCapituloLido = (livroId, capitulo) => {
    if (!instanciaId) return
    const { eventos } = marcarCapituloInstancia(instanciaId, livroId, capitulo)
    refresh()
    const instAtual = obterInstancia(instanciaId)
    if (instAtual) {
      setPlanoLeitura((prev) => ({
        ...prev,
        planoAtual: instAtual.templateId,
        instanciaAtivaId: instAtual.id,
        ultimaLeitura: new Date().toISOString(),
      }))
    }
    queueMicrotask(() => {
      const escada = eventos.filter(isEventoEscadaVisual)
      const resto = eventos.filter((e) => !isEventoEscadaVisual(e))
      dispararIncentivos(resto)
      if (escada.length > 0) {
        setFilaCelebracao((f) => [...f, ...escada])
      }
    })
  }

  const isCapituloLido = (livroId, capitulo) => {
    return capitulosLidosPlano.includes(`${livroId}-${capitulo}`)
  }

  const calcularProgresso = () => {
    if (!planoAtual) return 0
    return (capitulosLidosPlano.length / planoAtual.capitulos) * 100
  }

  const handleMenuClick = (event) => {
    setMenuAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
  }

  const handleLimparPlano = () => {
    setDialogLimparAberto(true)
    handleMenuClose()
  }

  const confirmarLimparPlano = () => {
    if (instanciaId) {
      limparProgressoInstancia(instanciaId)
      refresh()
    }
    setDialogLimparAberto(false)
  }

  const aberturaPlanoRef = useRef('')
  useEffect(() => {
    if (!instanciaId || !instancia) return
    if (aberturaPlanoRef.current === instanciaId) return
    aberturaPlanoRef.current = instanciaId

    const { pct, lidos, total } = obterProgressoInstancia(instanciaId)
    const evConfete = processarEventosAoAbrirPlano(instanciaId)
    const evMedalhas = processarMedalhasAposAbrirPlano({
      progressoPct: pct,
      restantes: Math.max(0, total - lidos),
      total,
    })
    queueMicrotask(() => {
      const m = obterMetricasResumo(instanciaId)
      const atrasadoNoRitmo =
        m != null && Number(m.metaAcumulada) > Number(m.lidos) + 1e-6
      const evMedalhasFiltradas = atrasadoNoRitmo ? [] : evMedalhas
      dispararIncentivos([...evConfete, ...evMedalhasFiltradas])
    })
  }, [instanciaId, instancia])

  const metricas = instanciaId ? obterMetricasResumo(instanciaId) : null
  const colocar = instancia ? podeColocarLeituraEmDia(instancia) : { pode: false }

  const atualCelebracao = filaCelebracao[0] ?? null
  const barraPreviewResumo = useMemo(() => {
    const snap = atualCelebracao?.meta?.escadaSnapshot
    if (snap && typeof snap === 'object') return resumoVisualAPartirInventario(snap)
    return null
  }, [atualCelebracao])
  const propsCelebracao = useMemo(() => {
    const base = eventoEscadaParaProps(atualCelebracao)
    return {
      ...base,
      tituloDialogo: atualCelebracao?.meta?.tituloDialogo,
    }
  }, [atualCelebracao])
  const fecharCelebracao = useCallback(() => {
    setFilaCelebracao((f) => f.slice(1))
  }, [])

  const handleColocarEmDia = () => {
    if (!instanciaId) return
    const r = colocarLeituraEmDia(instanciaId)
    refresh()
    if (r.ok) {
      const m = obterMetricasResumo(instanciaId)
      const porDia = Math.max(1, Math.ceil(Number(m?.capitulosPorDiaMeta) || 1))
      const def = Math.max(0, Math.ceil(Number(m?.metaAcumulada ?? 0) - Number(m?.lidos ?? 0)))
      const x = Math.max(porDia, def)
      const msg =
        x === 1
          ? 'Leia 1 capítulo e coloque a leitura de ontem em dia — marque como lido na Bíblia.'
          : `Leia ${x} capítulos e coloque a leitura de ontem em dia — marque como lidos na Bíblia.`
      setFilaCelebracao((f) => [
        ...f,
        {
          tipo: 'plano_orientacao_recuperacao',
          chave: `rec_orient_${instanciaId}_${Date.now()}`,
          mensagem: msg,
          meta: {
            confete: 'nenhum',
            tituloDialogo: 'Recuperar o ritmo',
          },
        },
      ])
    } else {
      window.dispatchEvent(
        new CustomEvent('app-incentivo', {
          detail: {
            tipo: 'aviso',
            chave: 'rec_falhou',
            mensagem: r.erro || 'Não foi possível colocar o dia em dia agora.',
            severidade: 'info',
            meta: { confete: 'nenhum' },
          },
        })
      )
    }
  }

  const textoDiasLidos =
    metricas?.diasLeitura === 1 ? '1 dia lido' : `${metricas?.diasLeitura || 0} dias lidos`
  const textoDiasRestantes =
    metricas?.diasRestantesCalendario === 1
      ? '1 dia restante'
      : `${metricas?.diasRestantesCalendario || 0} dias restantes`
  const textoDiasConsecutivos =
    metricas?.diasConsecutivos === 1
      ? '1 dia consecutivo lido'
      : `${metricas?.diasConsecutivos || 0} dias consecutivos lidos`
  const textoCapitulosLidos = metricas?.lidos === 1 ? '1 capítulo lido' : `${metricas?.lidos || 0} capítulos lidos`
  const metaHojeMarco = Math.max(0, Number(metricas?.metaHoje) || 0)
  const marcadosHoje = Math.max(0, Number(metricas?.marcadosHoje) || 0)
  const faltamHojeMarco = Math.max(0, Number(metricas?.faltamHoje) || 0)
  const faltamRitmo = Math.max(0, Number(metricas?.faltamRitmo) || 0)
  const metaEsperadaHoje = Math.max(0, Number(metricas?.metaEsperadaHoje) || 0)
  const lidosTotal = Math.max(0, Number(metricas?.lidos) || 0)
  const capitulosAntecipados = Math.max(0, Number(metricas?.capitulosAntecipados) || 0)
  const atrasadoRitmo = Boolean(metricas && !metricas.emDia)
  const textoLeituraHoje =
    marcadosHoje === 1
      ? 'Leitura registrada hoje: 1 capítulo'
      : `Leitura registrada hoje: ${marcadosHoje} capítulos`
  const textoRazaoMetaHoje = `${marcadosHoje}/${metaHojeMarco}`
  const textoRitmoPlano =
    faltamRitmo <= 0
      ? `Ritmo do prazo em dia — meta até hoje: ${metaEsperadaHoje} cap., lidos: ${lidosTotal}`
      : `Faltam ${faltamRitmo === 1 ? '1 capítulo' : `${faltamRitmo} capítulos`} para o ritmo do prazo (meta até hoje: ${metaEsperadaHoje}, lidos: ${lidosTotal})`
  const textoCumprimentoHoje =
    metaHojeMarco <= 0
      ? 'Marco de leitura de hoje: já coberto nos degraus do plano.'
      : faltamHojeMarco <= 0
        ? `Marco de hoje cumprido (${textoRazaoMetaHoje})`
        : `Marco de hoje: faltam ${faltamHojeMarco === 1 ? '1 capítulo' : `${faltamHojeMarco} capítulos`} (${textoRazaoMetaHoje})`

  if (!planoAtual || !instancia) {
    return (
      <Box sx={{ ...sxFundoVerdePagina, px: { xs: 1.5, sm: 3 } }}>
        <Typography sx={{ mb: 2 }}>Nenhum plano ativo ou instância inválida.</Typography>
        <Button variant="contained" color="inherit" onClick={() => navigate('/plano')}>
          Ir aos planos de leitura
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ ...sxFundoVerdePagina, px: { xs: 1.5, sm: 3 } }}>
    <Container
      maxWidth="lg"
      sx={{
        py: 0,
        minWidth: 0,
        overflowX: 'hidden',
        boxSizing: 'border-box',
        px: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1.5,
          minWidth: 0,
          flexWrap: 'nowrap',
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <PlanoEscadaBarraMedalhas
            tick={tick}
            previewResumo={barraPreviewResumo}
            instanciaId={instanciaId}
          />
        </Box>
        <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
          <MenuItem
            onClick={() => {
              handleMenuClose()
              navigate('/plano')
            }}
          >
            Prazo e opções
          </MenuItem>
          <MenuItem onClick={handleLimparPlano}>
            <Delete sx={{ mr: 1, fontSize: 20 }} />
            Limpar leituras
          </MenuItem>
        </Menu>
      </Box>

      <PlanoEscadaCelebracao
        aberto={Boolean(atualCelebracao)}
        onFechar={fecharCelebracao}
        mensagem={propsCelebracao.mensagem}
        variante={propsCelebracao.variante}
        eventoChave={atualCelebracao?.chave}
        tipoConfete={atualCelebracao?.meta?.confete}
        tituloDestaque={propsCelebracao.tituloDialogo}
      />

      <PlanoPinchZoomShell>
        {blocosMapa.length > 0 && (
          <Paper
            sx={{
              p: 2,
              mb: 2,
              bgcolor: isDarkMode ? 'grey.900' : 'grey.100',
              color: isDarkMode ? 'white' : 'grey.900',
              borderRadius: 1,
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            <CabecalhoSecaoRecolhivel
              titulo="Mapa de Opções"
              expandido={mapaExpandido}
              onToggle={() => setMapaExpandido((v) => !v)}
              sx={{ color: isDarkMode ? 'grey.300' : 'grey.800' }}
              acaoDireita={
                <Stack direction="row" alignItems="center" spacing={0.25} onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setDialogProgressoAberto(true)}
                    startIcon={
                      <Visibility
                        sx={{ fontSize: 18, color: atrasadoRitmo ? 'error.main' : 'inherit' }}
                      />
                    }
                    sx={{
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      color: atrasadoRitmo ? 'error.main' : undefined,
                      borderColor: atrasadoRitmo ? 'error.main' : undefined,
                    }}
                  >
                    {capitulosLidosPlano.length}/{planoAtual.capitulos}
                  </Button>
                  <IconButton
                    onClick={handleMenuClick}
                    aria-label="Menu do plano"
                    size="small"
                    sx={{ color: isDarkMode ? 'grey.300' : 'grey.800' }}
                  >
                    <MoreVert />
                  </IconButton>
                </Stack>
              }
            />
            <Collapse in={mapaExpandido} timeout="auto" unmountOnExit={false}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pt: 0.5 }}>
                {blocosMapa.map((b) => (
                  <Button key={b.id} variant="outlined" size="small" onClick={() => abrirMapaBloco(b.id)}>
                    {b.titulo}
                  </Button>
                ))}
              </Box>
            </Collapse>
          </Paper>
        )}

        <Paper
          sx={{
            p: 2,
            mb: 2,
            bgcolor: isDarkMode ? 'grey.900' : 'grey.100',
            color: isDarkMode ? 'white' : 'grey.900',
            borderRadius: 1,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <CabecalhoSecaoRecolhivel
            titulo="Livros"
            expandido={livrosExpandido}
            onToggle={() => setLivrosExpandido((v) => !v)}
            sx={{ color: isDarkMode ? 'grey.300' : 'grey.800' }}
          />
          <Collapse in={livrosExpandido} timeout="auto" unmountOnExit={false}>
        <Grid container spacing={1} sx={{ pt: 0.5 }}>
          {planoAtual.livros.map((livro) => (
            <Grid
              item
              xs={12}
              key={livro.id}
              sx={{
                minWidth: 0,
                '& .MuiPaper-root': {
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  borderRadius: 1,
                  bgcolor: isDarkMode ? 'grey.900' : 'grey.100',
                  color: isDarkMode ? 'white' : 'grey.900',
                  mb: 1,
                },
              }}
            >
              <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    fontSize: { xs: '0.9rem', sm: '1.1rem' },
                    color: isDarkMode ? 'grey.400' : 'grey.800',
                    mb: 1,
                  }}
                >
                  {livro.nome}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.5,
                    justifyContent: 'center',
                    '& .MuiButton-root': {
                      color: isDarkMode ? 'grey.100' : 'grey.800',
                      borderColor: isDarkMode ? 'grey.700' : 'grey.300',
                      minWidth: { xs: 35, sm: 40 },
                      height: { xs: 30, sm: 35 },
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&.MuiButton-contained': {
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                      },
                    },
                  }}
                >
                  {Array.from({ length: livro.capitulos }, (_, i) => i + 1).map((cap) => (
                    <Button
                      key={cap}
                      variant={isCapituloLido(livro.id, cap) ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => {
                        limparBibliaSessaoCache()
                        navigate(
                          `/?livro=${livro.id}&capitulo=${cap}&planoId=${encodeURIComponent(instanciaId)}&origem=plano`
                        )
                      }}
                      sx={{
                        position: 'relative',
                        lineHeight: 1,
                      }}
                    >
                      {cap}
                      {isCapituloLido(livro.id, cap) && (
                        <Check
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            fontSize: 16,
                            color: 'success.main',
                          }}
                        />
                      )}
                    </Button>
                  ))}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
          </Collapse>
        </Paper>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            py: { xs: 2, sm: 3 },
            mb: 2,
          }}
        >
          <PlanoRankingLeitura
            tamanho="grande"
            tick={tick}
            instanciaId={instanciaId}
            progresso={{
              capitulosLidos: capitulosLidosPlano.length,
              totalCapitulos: planoAtual.capitulos,
              progressoPct: calcularProgresso(),
            }}
          />
        </Box>
      </PlanoPinchZoomShell>

      <Dialog open={dialogProgressoAberto} onClose={() => setDialogProgressoAberto(false)} fullWidth maxWidth="sm">
        <DialogTitle>Progresso do plano</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: isDarkMode ? 'grey.400' : 'grey.700', mb: 0.5 }}>
            Progresso geral
          </Typography>
          <LinearProgress
            variant="determinate"
            value={calcularProgresso()}
            sx={{
              height: 8,
              borderRadius: 4,
              mb: 1,
              bgcolor: isDarkMode ? 'grey.800' : 'grey.300',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'primary.main',
              },
            }}
          />
          <Typography variant="body1" sx={{ color: isDarkMode ? 'grey.100' : 'grey.900', mb: 1 }}>
            {capitulosLidosPlano.length} de {planoAtual.capitulos} capítulos
          </Typography>
          <Typography variant="body2" sx={{ color: isDarkMode ? 'grey.400' : 'grey.700', display: 'block' }}>
            Prazo: {instancia.dataInicio} → {instancia.dataFim}
          </Typography>
          <Typography variant="body2" sx={{ color: isDarkMode ? 'grey.500' : 'grey.600', display: 'block', mt: 0.25 }}>
            Hoje (Brasília): {metricas?.hojeCivil || hojeBrasil()}
            {metricas?.indiceDiaPlanoHoje != null
              ? ` · dia ${metricas.indiceDiaPlanoHoje} do plano`
              : ''}
          </Typography>
          {metricas && (
            <Box sx={{ mt: 0.5 }}>
              <Typography
                variant="body2"
                sx={{
                  mt: 0.2,
                  mb: 0.55,
                  fontWeight: 700,
                  color: metricas.emDia ? 'success.main' : 'error.main',
                }}
              >
                {metricas.emDia ? 'Em dia no prazo' : 'Em atraso no prazo'}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: metricas.emDia ? (isDarkMode ? 'grey.300' : 'grey.800') : 'error.main',
                  fontWeight: metricas.emDia ? 400 : 600,
                }}
              >
                {textoRitmoPlano}
              </Typography>
              <Typography variant="body2" sx={{ color: isDarkMode ? 'grey.300' : 'grey.800', mt: 0.35 }}>
                {textoCapitulosLidos}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.35 }}>
                <Typography variant="body2" sx={{ color: isDarkMode ? 'grey.300' : 'grey.800' }}>
                  {textoLeituraHoje}
                </Typography>
                {metricas.emDiaHoje ? (
                  <Check sx={{ color: 'success.main', fontSize: 18 }} />
                ) : (
                  <Close sx={{ color: 'error.main', fontSize: 18 }} />
                )}
              </Box>
              <Typography variant="body2" sx={{ color: isDarkMode ? 'grey.300' : 'grey.800', mt: 0.35 }}>
                {textoCumprimentoHoje}
              </Typography>
              {metricas.emDia && capitulosAntecipados > 0 && (
                <Typography variant="body2" sx={{ color: 'info.main', mt: 0.35, fontWeight: 600 }}>
                  Capítulos antecipados: {capitulosAntecipados}
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: isDarkMode ? 'grey.300' : 'grey.800', mt: 0.35 }}>
                {textoDiasLidos}
              </Typography>
              <Typography variant="body2" sx={{ color: isDarkMode ? 'grey.300' : 'grey.800', mt: 0.35 }}>
                {textoDiasConsecutivos}
              </Typography>
              <Typography variant="body2" sx={{ color: isDarkMode ? 'grey.300' : 'grey.800', mt: 0.35 }}>
                {textoDiasRestantes}
              </Typography>
            </Box>
          )}
          {colocar.pode && (
            <Button variant="outlined" color="secondary" sx={{ mt: 1.5 }} onClick={handleColocarEmDia} fullWidth>
              Colocar leitura em dia
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogProgressoAberto(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogLimparAberto} onClose={() => setDialogLimparAberto(false)}>
        <DialogTitle>Limpar leituras</DialogTitle>
        <DialogContent>
          <Typography>
            Limpar todas as leituras deste plano? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogLimparAberto(false)}>Cancelar</Button>
          <Button onClick={confirmarLimparPlano} color="error" variant="contained">
            Limpar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </Box>
  )
}
