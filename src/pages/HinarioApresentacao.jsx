import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Fade,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material'
import Close from '@mui/icons-material/Close'
import CheckCircle from '@mui/icons-material/CheckCircle'
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BarraFormatacaoApresentacao from '../components/BarraFormatacaoApresentacao'
import { useLeituraApresentacao } from '../contexts/LeituraApresentacaoContext'
import { hinarioService } from '../services/hinarioService'
import { montarSlidesApresentacaoHino } from '../utils/hinarioSlides'
import { FUNDO_VERDE_PADRAO } from '../utils/fundoVerdePagina'
import {
  estiloSombraApresentacao,
  pesoFonteApresentacao,
  resolverParCoresApresentacao,
} from '../constants/apresentacaoCores'
import { useApp } from '../contexts/AppContext'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { resolveFontFamily } from '../utils/fontFamily'

const LARGURA_PAINEL = 220
/** Faixa fixa no topo (nome do hino não acompanha o slide). */
const ALTURA_FAIXA_REFERENCIA = { xs: 44, sm: 52 }

export default function HinarioApresentacao() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const numeroParam = searchParams.get('numero')
  const { fontSize, lineHeight, textAlign, fontFamily } = useApp()
  const { corLetra, negrito, toggleNegrito } = useLeituraApresentacao()
  const lh = readingLineHeightToCss(lineHeight)
  const ff = resolveFontFamily(fontFamily)
  const escala = (fontSize || 100) / 100
  const { corTexto, corLivro } = useMemo(
    () => resolverParCoresApresentacao(corLetra),
    [corLetra]
  )
  const sombraTexto = useMemo(() => estiloSombraApresentacao(corTexto), [corTexto])
  const sombraHino = useMemo(() => estiloSombraApresentacao(corLivro), [corLivro])
  const pesoTexto = pesoFonteApresentacao(negrito, 'texto')
  const pesoHino = pesoFonteApresentacao(negrito, 'livro')
  const areaSlideRef = useRef(null)
  const textoSlideRef = useRef(null)

  const [hino, setHino] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [slideIdx, setSlideIdx] = useState(0)
  const [exibidos, setExibidos] = useState(() => new Set())
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    let ativo = true
    if (!numeroParam) {
      setErro('Informe o número do hino na URL (?numero=1).')
      setCarregando(false)
      return
    }
    setCarregando(true)
    setErro(null)
    void hinarioService
      .buscarHino(numeroParam)
      .then((h) => {
        if (!ativo) return
        if (!h) {
          setErro('Hino não encontrado.')
          setHino(null)
        } else {
          setHino(h)
          setSlideIdx(0)
          setExibidos(new Set([0]))
        }
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar o hino.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [numeroParam])

  const slides = useMemo(() => {
    if (!hino) return []
    return montarSlidesApresentacaoHino(hino.conteudo, {
      numero: hino.numero,
      titulo: hino.titulo,
    })
  }, [hino])

  const totalSlides = slides.length
  const slideAtual = slides[slideIdx]
  const ehSlideTitulo = slideAtual?.tipo === 'titulo'
  const textoSlide = slideAtual?.texto ?? ''

  useLayoutEffect(() => {
    const area = areaSlideRef.current
    const texto = textoSlideRef.current
    if (!area || !texto) return

    const ajustar = () => {
      texto.style.removeProperty('font-size')
      const preferido = parseFloat(getComputedStyle(texto).fontSize)
      const cabe = () => texto.offsetHeight <= area.clientHeight && texto.scrollWidth <= area.clientWidth
      if (cabe()) return

      let minimo = Math.min(preferido, 12)
      let maximo = preferido
      while (maximo - minimo > 0.5) {
        const tamanho = (minimo + maximo) / 2
        texto.style.fontSize = `${tamanho}px`
        if (cabe()) minimo = tamanho
        else maximo = tamanho
      }
      texto.style.fontSize = `${minimo}px`
    }

    ajustar()
    const observer = new ResizeObserver(ajustar)
    observer.observe(area)
    return () => observer.disconnect()
  }, [textoSlide, slideIdx, ff, lh, pesoTexto, escala, carregando])

  const marcarExibido = useCallback((idx) => {
    setExibidos((prev) => {
      if (prev.has(idx)) return prev
      const next = new Set(prev)
      next.add(idx)
      return next
    })
  }, [])

  const irParaSlide = useCallback(
    (idx) => {
      const i = Math.max(0, Math.min(totalSlides - 1, idx))
      setSlideIdx(i)
      marcarExibido(i)
    },
    [totalSlides, marcarExibido]
  )

  const irAnterior = useCallback(() => {
    irParaSlide(slideIdx - 1)
  }, [irParaSlide, slideIdx])

  const irProximo = useCallback(() => {
    marcarExibido(slideIdx)
    irParaSlide(slideIdx + 1)
  }, [irParaSlide, slideIdx, marcarExibido])

  const sair = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    }
    navigate(-1)
  }, [navigate])

  useEffect(() => {
    marcarExibido(slideIdx)
  }, [slideIdx, marcarExibido])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        irProximo()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        irAnterior()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        sair()
      } else if (e.key === 'Home') {
        e.preventDefault()
        irParaSlide(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        irParaSlide(totalSlides - 1)
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        toggleNegrito()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [irAnterior, irProximo, sair, irParaSlide, totalSlides, toggleNegrito])

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      /* ignorar */
    }
  }

  const clicarArea = (e) => {
    const { left, width } = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - left) / Math.max(width, 1)
    if (x < 0.25) irAnterior()
    else if (x < 0.75) irProximo()
  }

  const shellSx = {
    position: 'fixed',
    inset: 0,
    bgcolor: FUNDO_VERDE_PADRAO,
    color: '#ffffff',
    zIndex: 1400,
    pt: 'env(safe-area-inset-top, 0px)',
    pb: 'env(safe-area-inset-bottom, 0px)',
  }

  if (carregando) {
    return (
      <Box sx={{ ...shellSx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: corLetra }} />
      </Box>
    )
  }

  const rotuloHinoFixo =
    hino?.numero != null && hino?.titulo
      ? `${hino.numero}. ${hino.titulo}`.trim()
      : hino?.titulo?.trim() || (hino?.numero != null ? String(hino.numero) : '')

  const referenciaFixaTopo = rotuloHinoFixo ? (
    <Box
      sx={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minHeight: ALTURA_FAIXA_REFERENCIA,
        px: { xs: 2, sm: 4 },
        pt: { xs: 1.5, sm: 2 },
        pb: 0.5,
        pointerEvents: 'none',
      }}
    >
      <Typography
        sx={{
          textAlign: 'right',
          color: corLivro,
          fontFamily: ff,
          fontWeight: pesoHino,
          fontSize: `clamp(${0.95 * escala}rem, ${2.4 * escala}vw, ${1.35 * escala}rem)`,
          letterSpacing: '0.04em',
          lineHeight: 1.2,
          ...sombraHino,
        }}
      >
        {rotuloHinoFixo}
      </Typography>
    </Box>
  ) : null

  if (erro || !hino) {
    return (
      <Box
        sx={{
          ...shellSx,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          p: 3,
        }}
      >
        <Typography variant="h6" textAlign="center">
          {erro || 'Erro'}
        </Typography>
        <IconButton onClick={sair} sx={{ color: '#ffffff' }} aria-label="Voltar">
          <Close />
        </IconButton>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        ...shellSx,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {referenciaFixaTopo}
          <Box
            onClick={clicarArea}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              px: { xs: 2, sm: 4, md: 6 },
              py: 1,
              minHeight: 0,
            }}
          >
            <Box ref={areaSlideRef} sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'auto' }}>
              <Fade in key={slideIdx} timeout={160}>
                <Typography
                  ref={textoSlideRef}
                  sx={{
                    m: 'auto',
                    overflowWrap: 'anywhere',
                    textAlign: textAlign || 'center',
                    whiteSpace: 'pre-wrap',
                    color: corTexto,
                    fontWeight: pesoTexto,
                    fontFamily: ff,
                    fontSize: ehSlideTitulo
                      ? `clamp(${1.5 * escala}rem, ${5 * escala}vw, ${3.25 * escala}rem)`
                      : `clamp(${1.2 * escala}rem, ${3.6 * escala}vw, ${2.65 * escala}rem)`,
                    lineHeight: lh,
                    maxWidth: 'min(1000px, 100%)',
                    ...sombraTexto,
                  }}
                >
                  {textoSlide}
                </Typography>
              </Fade>
            </Box>
          </Box>
          {hino.referencia && slideIdx === totalSlides - 1 ? (
            <Typography
              variant="caption"
              sx={{ px: 3, pb: 1, opacity: 0.75, fontStyle: 'italic', color: corTexto, flexShrink: 0 }}
            >
              {hino.referencia}
            </Typography>
          ) : null}
        </Box>

        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            width: { xs: 168, sm: LARGURA_PAINEL },
            flexShrink: 0,
            borderLeft: '1px solid rgba(255,255,255,0.2)',
            bgcolor: 'rgba(0,0,0,0.22)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
            <Typography
              variant="caption"
              sx={{
                px: 1.5,
                py: 1,
                fontWeight: 700,
                letterSpacing: 0.5,
                borderBottom: '1px solid rgba(255,255,255,0.15)',
                flexShrink: 0,
              }}
            >
              Partes do hino
            </Typography>
            <List dense sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
              {slides.map((s, idx) => {
                const ativo = idx === slideIdx
                const jaPassou = exibidos.has(idx) && !ativo
                return (
                  <Box key={s.id}>
                    {idx > 0 && s.tipo === 'coro' && slides[idx - 1]?.tipo !== 'coro' ? (
                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 0.25 }} />
                    ) : null}
                    <ListItemButton
                      selected={ativo}
                      onClick={() => irParaSlide(idx)}
                      sx={{
                        py: 0.75,
                        '&.Mui-selected': {
                          bgcolor: 'rgba(255,255,255,0.18)',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
                        },
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                        {jaPassou ? (
                          <CheckCircle fontSize="small" sx={{ color: '#a5d6a7' }} />
                        ) : (
                          <RadioButtonUnchecked fontSize="small" sx={{ opacity: 0.45 }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={s.label}
                        primaryTypographyProps={{
                          fontWeight: ativo ? 700 : 500,
                          fontSize: '0.8rem',
                          letterSpacing: 0.3,
                        }}
                      />
                    </ListItemButton>
                  </Box>
                )
              })}
            </List>
        </Box>
      </Box>

      <BarraFormatacaoApresentacao
        emFluxo
        zIndex={1500}
        fullscreen={fullscreen}
        onToggleFullscreen={toggleFullscreen}
        onSair={sair}
        navegacao={{
          label: slideAtual?.label ?? '',
          index: slideIdx,
          total: totalSlides,
          onPrev: irAnterior,
          onNext: irProximo,
          prevDisabled: slideIdx <= 0,
          nextDisabled: slideIdx >= totalSlides - 1,
        }}
      />

    </Box>
  )
}
