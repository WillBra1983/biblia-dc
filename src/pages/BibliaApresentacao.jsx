import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Fade,
} from '@mui/material'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import NavigateNext from '@mui/icons-material/NavigateNext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  buscarCapitulo,
  buscarPericopes,
  carregarTodosLivros,
} from '../services/bibliaService'
import { useApp } from '../contexts/AppContext'
import { useLeituraApresentacao } from '../contexts/LeituraApresentacaoContext'
import BarraFormatacaoApresentacao from '../components/BarraFormatacaoApresentacao'
import LivrosCards from '../components/LivrosCards'
import { FUNDO_VERDE_PADRAO } from '../utils/fundoVerdePagina'
import {
  estiloSombraApresentacao,
  pesoFonteApresentacao,
  resolverParCoresApresentacao,
} from '../constants/apresentacaoCores'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { resolveFontFamily } from '../utils/fontFamily'
import {
  MODO_BIBLIA_APRESENTACAO_PERICOPE,
  MODO_BIBLIA_APRESENTACAO_VERSICULO,
  carregarModoBibliaApresentacao,
  gravarModoBibliaApresentacao,
  montarSlidesModoPericope,
  montarSlidesModoVersiculo,
} from '../utils/bibliaApresentacaoSlides'

const LARGURA_PAINEL_LIVRO = 132
const LARGURA_PAINEL_CAPITULOS = 88
const LARGURA_PAINEL_VERSICULOS = 72
/** Faixa fixa no topo da área central (livro + capítulo não acompanham o versículo). */
const ALTURA_FAIXA_REFERENCIA = { xs: 44, sm: 52 }
function parseIntPositivo(raw, fallback) {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

export default function BibliaApresentacao() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const livroIdParam = parseIntPositivo(searchParams.get('livro'), 1)
  const capituloParam = parseIntPositivo(searchParams.get('capitulo'), 1)

  const { fontSize, fontFamily, textAlign, lineHeight } = useApp()
  const { corLetra, negrito, toggleNegrito } = useLeituraApresentacao()
  const lh = readingLineHeightToCss(lineHeight)
  const ff = resolveFontFamily(fontFamily)
  const escala = (fontSize || 100) / 100
  const alinhamentoSlide = textAlign || 'center'

  const [modoExibicao, setModoExibicao] = useState(carregarModoBibliaApresentacao)
  const [slideIdx, setSlideIdx] = useState(0)
  const [livros, setLivros] = useState([])
  const [livro, setLivro] = useState(null)
  const [capitulo, setCapitulo] = useState(capituloParam)
  const [resultados, setResultados] = useState([])
  const [pericopesCapitulo, setPericopesCapitulo] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [livrosDialogOpen, setLivrosDialogOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const painelDirRef = useRef(null)

  const modoPericope = modoExibicao === MODO_BIBLIA_APRESENTACAO_PERICOPE

  const { corTexto, corTitulo, corLivro } = useMemo(
    () => resolverParCoresApresentacao(corLetra),
    [corLetra]
  )
  const sombraTexto = useMemo(() => estiloSombraApresentacao(corTexto), [corTexto])
  const sombraTitulo = useMemo(() => estiloSombraApresentacao(corTitulo), [corTitulo])
  const sombraLivro = useMemo(() => estiloSombraApresentacao(corLivro), [corLivro])
  const pesoTexto = pesoFonteApresentacao(negrito, 'texto')
  const pesoLivro = pesoFonteApresentacao(negrito, 'livro')
  const pesoNumero = pesoFonteApresentacao(negrito, 'numero')

  useEffect(() => {
    let ativo = true
    void carregarTodosLivros()
      .then((lista) => {
        if (!ativo) return
        setLivros(lista || [])
        const encontrado = (lista || []).find((l) => l.id === livroIdParam)
        setLivro(encontrado || lista?.[0] || null)
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar os livros.')
      })
    return () => {
      ativo = false
    }
  }, [livroIdParam])

  const carregarCapituloAtual = useCallback(async (livroId, cap) => {
    setCarregando(true)
    setErro('')
    try {
      const [versiculos, pericopes] = await Promise.all([
        buscarCapitulo(livroId, cap),
        buscarPericopes(livroId, cap),
      ])
      setResultados(versiculos || [])
      setPericopesCapitulo(pericopes || [])
      setCapitulo(cap)
      setSlideIdx(0)
      try {
        localStorage.setItem(
          'ultimaLeitura',
          JSON.stringify({ livroId, capitulo: cap })
        )
        window.dispatchEvent(new Event('localStorageChange'))
      } catch {
        /* ignore */
      }
    } catch {
      setErro('Erro ao carregar o capítulo.')
      setResultados([])
      setPericopesCapitulo([])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (!livro?.id) return
    const cap = Math.min(Math.max(1, capituloParam), livro.maxCapitulos || 1)
    void carregarCapituloAtual(livro.id, cap)
  }, [livro?.id, livro?.maxCapitulos, capituloParam, carregarCapituloAtual])

  const sincronizarUrl = useCallback(
    (livroId, cap) => {
      const next = new URLSearchParams(searchParams)
      next.set('livro', String(livroId))
      next.set('capitulo', String(cap))
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const slides = useMemo(() => {
    if (modoPericope) return montarSlidesModoPericope(resultados, pericopesCapitulo)
    return montarSlidesModoVersiculo(resultados)
  }, [modoPericope, resultados, pericopesCapitulo])

  const totalSlides = slides.length
  const slideAtual = slides[slideIdx]
  const indiceLivro = livros.findIndex((l) => l.id === livro?.id)

  const irParaSlide = useCallback(
    (idx) => {
      if (totalSlides === 0) return
      setSlideIdx(Math.max(0, Math.min(totalSlides - 1, idx)))
    },
    [totalSlides]
  )

  const irParaCapitulo = useCallback(
    (cap) => {
      if (!livro?.id) return
      const c = Math.max(1, Math.min(livro.maxCapitulos, cap))
      sincronizarUrl(livro.id, c)
    },
    [livro, sincronizarUrl]
  )

  const irCapituloAnterior = useCallback(() => {
    if (!livro || carregando) return
    if (capitulo > 1) {
      irParaCapitulo(capitulo - 1)
      return
    }
    if (indiceLivro > 0) {
      const ant = livros[indiceLivro - 1]
      setLivro(ant)
      sincronizarUrl(ant.id, ant.maxCapitulos)
    }
  }, [livro, carregando, capitulo, indiceLivro, livros, irParaCapitulo, sincronizarUrl])

  const irCapituloProximo = useCallback(() => {
    if (!livro || carregando) return
    if (capitulo < livro.maxCapitulos) {
      irParaCapitulo(capitulo + 1)
      return
    }
    if (indiceLivro >= 0 && indiceLivro < livros.length - 1) {
      const prox = livros[indiceLivro + 1]
      setLivro(prox)
      sincronizarUrl(prox.id, 1)
    }
  }, [livro, carregando, capitulo, indiceLivro, livros, irParaCapitulo, sincronizarUrl])

  const temCapAnterior = capitulo > 1 || indiceLivro > 0
  const temCapProximo =
    (livro && capitulo < livro.maxCapitulos) ||
    (indiceLivro >= 0 && indiceLivro < livros.length - 1)

  const irSlideAnterior = useCallback(() => {
    if (slideIdx > 0) {
      irParaSlide(slideIdx - 1)
      return
    }
    irCapituloAnterior()
  }, [slideIdx, irParaSlide, irCapituloAnterior])

  const irSlideProximo = useCallback(() => {
    if (slideIdx < totalSlides - 1) {
      irParaSlide(slideIdx + 1)
      return
    }
    irCapituloProximo()
  }, [slideIdx, totalSlides, irParaSlide, irCapituloProximo])

  const temSlideAnterior = slideIdx > 0 || temCapAnterior
  const temSlideProximo = slideIdx < totalSlides - 1 || temCapProximo

  const sair = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    }
    navigate(`/?livro=${livro?.id || 1}&capitulo=${capitulo}`, { replace: true })
  }, [navigate, livro?.id, capitulo])

  const selecionarLivro = useCallback(
    (novoLivro) => {
      setLivro(novoLivro)
      setLivrosDialogOpen(false)
      const cap = Math.min(capitulo, novoLivro.maxCapitulos || 1)
      sincronizarUrl(novoLivro.id, cap)
    },
    [capitulo, sincronizarUrl]
  )

  const alternarModoExibicao = useCallback((modo) => {
    const next =
      modo === MODO_BIBLIA_APRESENTACAO_PERICOPE
        ? MODO_BIBLIA_APRESENTACAO_PERICOPE
        : MODO_BIBLIA_APRESENTACAO_VERSICULO
    setModoExibicao(next)
    gravarModoBibliaApresentacao(next)
    setSlideIdx(0)
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

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        irSlideProximo()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        irSlideAnterior()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        sair()
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        toggleNegrito()
      } else if (e.key === 'Home') {
        e.preventDefault()
        irParaSlide(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        irParaSlide(totalSlides - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    irSlideAnterior,
    irSlideProximo,
    sair,
    toggleNegrito,
    irParaSlide,
    totalSlides,
  ])

  const clicarAreaCentral = (e) => {
    const limiteDir =
      window.innerWidth -
      (painelDirRef.current?.offsetWidth ??
        LARGURA_PAINEL_CAPITULOS + LARGURA_PAINEL_VERSICULOS)
    const x = e.clientX / Math.max(limiteDir, 1)
    if (x < 0.22) irSlideAnterior()
    else if (x > 0.78) irSlideProximo()
  }

  const labelNavegacao = useMemo(() => {
    if (!livro) return ''
    if (slideAtual) {
      return `${livro.nome} ${capitulo} · ${slideAtual.label}`
    }
    return `${livro.nome} ${capitulo}`
  }, [livro, capitulo, slideAtual])

  const indiceNavegacao = slideIdx
  const totalNavegacao = Math.max(totalSlides, 1)

  const shellSx = {
    position: 'fixed',
    inset: 0,
    bgcolor: FUNDO_VERDE_PADRAO,
    color: corLetra,
    zIndex: 1400,
    pt: 'env(safe-area-inset-top, 0px)',
    pb: 'env(safe-area-inset-bottom, 0px)',
  }

  const referenciaLivroCapitulo =
    livro?.nome && capitulo ? `${livro.nome} ${capitulo}` : livro?.nome || ''

  const referenciaFixaTopo = referenciaLivroCapitulo ? (
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
          fontWeight: pesoLivro,
          fontSize: `clamp(${0.95 * escala}rem, ${2.4 * escala}vw, ${1.35 * escala}rem)`,
          letterSpacing: '0.04em',
          lineHeight: 1.2,
          ...sombraLivro,
        }}
      >
        {referenciaLivroCapitulo}
      </Typography>
    </Box>
  ) : null

  const shellSlide = {
    width: '100%',
    maxWidth: 'min(920px, 88vw)',
  }

  const renderSlideAtual = () => {
    if (!slideAtual) {
      return (
        <Typography textAlign="center" sx={{ color: corLetra }}>
          Nenhum versículo neste capítulo.
        </Typography>
      )
    }
    if (slideAtual.tipo === 'pericope-bloco') {
      const estiloVerso = {
        textAlign: alinhamentoSlide,
        whiteSpace: 'pre-wrap',
        color: corTexto,
        fontWeight: pesoTexto,
        fontFamily: ff,
        fontSize: `clamp(${1.2 * escala}rem, ${3.8 * escala}vw, ${2.55 * escala}rem)`,
        lineHeight: lh,
        ...sombraTexto,
      }
      const numeroSx = {
        opacity: 0.85,
        fontWeight: pesoNumero,
        mr: 0.5,
        fontSize: '0.72em',
        verticalAlign: 'super',
        lineHeight: 0,
      }
      return (
        <Box sx={shellSlide}>
          {slideAtual.titulo ? (
            <Typography
              sx={{
                textAlign: 'center',
                whiteSpace: 'pre-wrap',
                color: corTitulo,
                fontWeight: pesoTexto,
                fontStyle: 'italic',
                textDecoration: 'underline',
                textUnderlineOffset: '0.2em',
                fontFamily: ff,
                fontSize: `clamp(${1.35 * escala}rem, ${4.2 * escala}vw, ${2.75 * escala}rem)`,
                lineHeight: lh,
                mb: 2,
                ...sombraTitulo,
              }}
            >
              {slideAtual.titulo}
            </Typography>
          ) : null}
          {slideAtual.versiculos.map((item, vi) => (
            <Typography key={item.versiculo} component="div" sx={{ ...estiloVerso, ...(vi > 0 ? { mt: 1.25 } : {}) }}>
              <Box component="span" sx={numeroSx}>
                {item.versiculo}
              </Box>
              {item.textoSemNumero}
            </Typography>
          ))}
        </Box>
      )
    }
    return (
      <Box sx={shellSlide}>
        <Typography
          component="div"
          sx={{
            textAlign: alinhamentoSlide,
            whiteSpace: 'pre-wrap',
            color: corTexto,
            fontWeight: pesoTexto,
            fontFamily: ff,
            fontSize: `clamp(${1.2 * escala}rem, ${3.8 * escala}vw, ${2.55 * escala}rem)`,
            lineHeight: lh,
            ...sombraTexto,
          }}
        >
          <Box
            component="span"
            sx={{
              opacity: 0.85,
              fontWeight: pesoNumero,
              mr: 0.5,
              fontSize: '0.72em',
              verticalAlign: 'super',
              lineHeight: 0,
            }}
          >
            {slideAtual.versiculo}
          </Box>
          {slideAtual.textoSemNumero}
        </Typography>
      </Box>
    )
  }

  if (!livro && !erro) {
    return (
      <Box sx={{ ...shellSx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: corLetra }} />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        ...shellSx,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            width: { xs: 96, sm: LARGURA_PAINEL_LIVRO },
            flexShrink: 0,
            borderRight: '1px solid rgba(255,255,255,0.2)',
            bgcolor: 'rgba(0,0,0,0.22)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            px: 1,
            py: 2,
            gap: 1.5,
          }}
        >
          <IconButton
            onClick={irCapituloAnterior}
            disabled={!temCapAnterior || carregando}
            aria-label="Capítulo anterior"
            sx={{ color: corLetra, opacity: 0.9 }}
          >
            <NavigateBefore />
          </IconButton>
          <ListItemButton
            onClick={() => setLivrosDialogOpen(true)}
            sx={{
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              py: 1.5,
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '0.85rem', sm: '0.95rem' },
                lineHeight: 1.2,
                color: corLetra,
                fontFamily: ff,
                wordBreak: 'break-word',
              }}
            >
              {livro?.nome || '—'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75, mt: 0.5, color: corLetra }}>
              Trocar livro
            </Typography>
          </ListItemButton>
        </Box>

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
            onClick={clicarAreaCentral}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: modoPericope ? 'flex-start' : 'center',
              justifyContent: 'center',
              overflow: modoPericope ? 'auto' : 'hidden',
              px: { xs: 2, sm: 4 },
              pb: { xs: 2, sm: 3 },
              minHeight: 0,
              cursor: 'default',
            }}
          >
            {carregando ? (
              <CircularProgress sx={{ color: corLetra }} />
            ) : erro ? (
              <Typography textAlign="center" sx={{ color: corLetra }}>
                {erro}
              </Typography>
            ) : (
              <Fade in key={slideAtual?.id ?? slideIdx} timeout={220}>
                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                  {renderSlideAtual()}
                </Box>
              </Fade>
            )}
          </Box>
        </Box>

        <Box
          ref={painelDirRef}
          onClick={(e) => e.stopPropagation()}
          sx={{
            display: 'flex',
            flexShrink: 0,
            borderLeft: '1px solid rgba(255,255,255,0.2)',
            bgcolor: 'rgba(0,0,0,0.22)',
          }}
        >
          <Box
            sx={{
              width: { xs: 72, sm: LARGURA_PAINEL_CAPITULOS },
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                px: 1,
                py: 1,
                fontWeight: 700,
                textAlign: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.15)',
                flexShrink: 0,
                color: corLetra,
              }}
            >
              Cap.
            </Typography>
            <List dense sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
              {livro
                ? Array.from({ length: livro.maxCapitulos }, (_, i) => i + 1).map((cap) => {
                    const ativo = cap === capitulo
                    return (
                      <ListItemButton
                        key={cap}
                        selected={ativo}
                        onClick={() => irParaCapitulo(cap)}
                        disabled={carregando}
                        sx={{
                          justifyContent: 'center',
                          py: 0.6,
                          minHeight: 36,
                          '&.Mui-selected': {
                            bgcolor: 'rgba(255,255,255,0.2)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.24)' },
                          },
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                        }}
                      >
                        <ListItemText
                          primary={String(cap)}
                          primaryTypographyProps={{
                            fontWeight: ativo ? 800 : 500,
                            fontSize: ativo ? '1.05rem' : '0.9rem',
                            textAlign: 'center',
                            color: corLetra,
                          }}
                        />
                      </ListItemButton>
                    )
                  })
                : null}
            </List>
          </Box>

          <Box
            sx={{
              width: { xs: 56, sm: LARGURA_PAINEL_VERSICULOS },
              borderLeft: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                px: 0.5,
                py: 1,
                fontWeight: 700,
                textAlign: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.15)',
                flexShrink: 0,
                color: corLetra,
              }}
            >
              {modoPericope ? 'Per.' : 'V.'}
            </Typography>
            <List dense sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
              {slides.map((s, idx) => {
                const ativo = idx === slideIdx
                const rotuloPainel =
                  s.tipo === 'pericope-bloco'
                    ? s.titulo
                      ? '§'
                      : s.inicio === s.fim
                        ? String(s.inicio)
                        : `${s.inicio}`
                    : s.label.replace('v. ', '')
                return (
                  <ListItemButton
                    key={s.id}
                    selected={ativo}
                    onClick={() => irParaSlide(idx)}
                    disabled={carregando}
                    sx={{
                      justifyContent: 'center',
                      py: 0.45,
                      minHeight: 32,
                      '&.Mui-selected': {
                        bgcolor: 'rgba(255,255,255,0.2)',
                      },
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                    }}
                  >
                    <ListItemText
                      primary={rotuloPainel}
                      primaryTypographyProps={{
                        fontWeight: ativo ? 800 : 500,
                        fontSize: '0.78rem',
                        textAlign: 'center',
                        color: corLetra,
                      }}
                    />
                  </ListItemButton>
                )
              })}
            </List>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              py: 1,
            }}
          >
            <IconButton
              onClick={irSlideAnterior}
              disabled={!temSlideAnterior || carregando}
              aria-label="Anterior"
              sx={{ color: corLetra }}
            >
              <NavigateBefore />
            </IconButton>
            <IconButton
              onClick={irSlideProximo}
              disabled={!temSlideProximo || carregando}
              aria-label="Próximo"
              sx={{ color: corLetra }}
            >
              <NavigateNext />
            </IconButton>
          </Box>
        </Box>
      </Box>

      <BarraFormatacaoApresentacao
        zIndex={1500}
        fullscreen={fullscreen}
        onToggleFullscreen={toggleFullscreen}
        onSair={sair}
        modoBiblia={{
          modo: modoExibicao,
          onAlternarModo: alternarModoExibicao,
        }}
        navegacao={{
          label: labelNavegacao,
          index: indiceNavegacao,
          total: totalNavegacao,
          onPrev: irSlideAnterior,
          onNext: irSlideProximo,
          prevDisabled: !temSlideAnterior || carregando,
          nextDisabled: !temSlideProximo || carregando,
        }}
      />

      <LivrosCards
        livros={livros}
        livroAtual={livro}
        onSelectLivro={selecionarLivro}
        open={livrosDialogOpen}
        onClose={() => setLivrosDialogOpen(false)}
      />
    </Box>
  )
}
