import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Button,
  Container,
} from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import { useNavigate, useParams } from 'react-router-dom'
import { useTheme } from '@mui/material'
import { useApp } from '../contexts/AppContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { livros as livrosData } from '../data/biblia'
import StrongOcorrenciaDialog from '../components/StrongOcorrenciaDialog'
import { useStrongOcorrenciaDialog } from '../hooks/useStrongOcorrenciaDialog'
import { carregarDetalheStrong } from '../services/carregarDetalheStrong'
import { verificarBancoLexiconPtBr } from '../services/lexiconPtBrService'
import { fontFamilyStrongPassagem, sxHebrewVocalizado } from '../utils/hebrewDisplay'
import {
  buscarOcorrenciasStrong,
  contarOcorrenciasStrong,
  STRONG_OCORRENCIAS_PAGINA,
} from '../services/strongOcorrenciasService'

function ItemCaixa({ children, onClick }) {
  return (
    <Box
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      sx={{
        px: 1.75,
        py: 1.25,
        borderRadius: 2.5,
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f4f6'),
        border: '1px solid',
        borderColor: 'divider',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.15s ease',
        '&:hover': onClick
          ? { bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#ebebed') }
          : {},
      }}
    >
      {children}
    </Box>
  )
}

export default function StrongEstudoOcorrencias() {
  const navigate = useNavigate()
  const params = useParams()
  const theme = useTheme()
  const code = decodeURIComponent(String(params.code || '')).trim().toUpperCase()
  const ehGrego = code.startsWith('G')
  const fontLexico = fontFamilyStrongPassagem(ehGrego)

  const [detalhe, setDetalhe] = useState(null)
  const [total, setTotal] = useState(null)
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [carregandoMais, setCarregandoMais] = useState(false)

  const { fontSize, fontFamily, textAlign, lineHeight } = useApp()
  const sxTextoLeitura = useMemo(
    () => ({
      fontSize: `${(fontSize || 100) / 100}rem`,
      fontFamily: resolveFontFamily(fontFamily),
      textAlign: textAlign || 'left',
      lineHeight: readingLineHeightToCss(lineHeight),
    }),
    [fontSize, fontFamily, textAlign, lineHeight]
  )

  const { dialog, abrir, fechar } = useStrongOcorrenciaDialog(code)

  useEffect(() => {
    let active = true
    setDetalhe(null)
    ;(async () => {
      const ptLex = await verificarBancoLexiconPtBr().catch(() => false)
      const { detalhe: d } = await carregarDetalheStrong(code, {
        stepBibleDisponivel: false,
        lexiconPtBrDisponivel: ptLex,
      }).catch(() => ({ detalhe: null }))
      if (active && d) setDetalhe(d)
    })()
    return () => {
      active = false
    }
  }, [code])

  useEffect(() => {
    let active = true
    setLoading(true)
    setLista([])
    setTotal(null)
    Promise.all([
      contarOcorrenciasStrong(code),
      buscarOcorrenciasStrong(code, STRONG_OCORRENCIAS_PAGINA, 0),
    ])
      .then(([n, rows]) => {
        if (!active) return
        setTotal(n)
        setLista(rows || [])
      })
      .catch(() => {
        if (!active) return
        setTotal(0)
        setLista([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [code])

  const carregarMais = useCallback(async () => {
    if (carregandoMais || loading) return lista
    if (total != null && lista.length >= total) return lista
    setCarregandoMais(true)
    try {
      const rows = await buscarOcorrenciasStrong(code, STRONG_OCORRENCIAS_PAGINA, lista.length)
      if (!rows?.length) return lista
      const nova = [...lista, ...rows]
      setLista(nova)
      return nova
    } finally {
      setCarregandoMais(false)
    }
  }, [carregandoMais, loading, code, lista, total])

  /** Garante que `indice` exista em memória (carrega lotes até lá). */
  const garantirIndiceCarregado = useCallback(
    async (indice) => {
      let acumulado = lista
      while (
        indice >= acumulado.length &&
        (total == null || acumulado.length < total)
      ) {
        const rows = await buscarOcorrenciasStrong(code, STRONG_OCORRENCIAS_PAGINA, acumulado.length)
        if (!rows?.length) break
        acumulado = [...acumulado, ...rows]
        setLista(acumulado)
      }
      return acumulado
    },
    [lista, total, code]
  )

  const navegarCompleta = useCallback(
    async (delta) => {
      const nextIdx = Number(dialog.idx) + Number(delta)
      const max = total ?? lista.length
      if (nextIdx < 0 || nextIdx >= max) return
      const listaAtual = await garantirIndiceCarregado(nextIdx)
      if (nextIdx < listaAtual.length) {
        void abrir(listaAtual[nextIdx], nextIdx)
      }
    },
    [dialog.idx, total, lista.length, garantirIndiceCarregado, abrir]
  )

  const totalDialog = total ?? lista.length

  const voltarVerbete = () => navigate(`/estudo-strong/${encodeURIComponent(code)}`)

  const temMais = total != null && lista.length < total

  return (
    <Box sx={{ bgcolor: 'background.default', pb: 8, minHeight: '100%' }}>
      <Container maxWidth="sm" sx={{ pt: 1.5, pb: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
          <IconButton
            onClick={voltarVerbete}
            aria-label="voltar ao verbete"
            size="small"
            sx={{
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 800, flex: 1 }}>
            Ocorrências
          </Typography>
        </Box>

        {(detalhe?.greek_unicode || detalhe?.greek_translit) && (
          <Box sx={{ textAlign: 'center', mb: 2.5 }}>
            {!!detalhe.greek_unicode && (
              <Typography
                component="p"
                className={ehGrego ? undefined : 'hebrew-vocalizado'}
                sx={{
                  ...(ehGrego
                    ? { fontFamily: fontLexico, fontWeight: 800, fontSize: { xs: '2.35rem', sm: '2.75rem' } }
                    : { ...sxHebrewVocalizado, fontSize: { xs: '2.35rem', sm: '2.75rem' } }),
                  lineHeight: 1.15,
                  color: theme.palette.mode === 'dark' ? '#fff' : '#111',
                  wordBreak: 'break-word',
                  m: 0,
                  mb: detalhe.greek_translit ? 1 : 0,
                }}
              >
                {detalhe.greek_unicode}
              </Typography>
            )}
            {!!detalhe.greek_translit && (
              <Typography
                component="p"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.35rem', sm: '1.55rem' },
                  letterSpacing: 0.2,
                  color: 'text.primary',
                  m: 0,
                }}
              >
                {detalhe.greek_translit}
              </Typography>
            )}
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.5 }}>
          Referências distintas (livro, capítulo e versículo) no texto original — {code}.
          {total != null && total > 0 && (
            <>
              {' '}
              <strong>{total}</strong> {total === 1 ? 'ocorrência' : 'ocorrências'} no total.
            </>
          )}
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && !lista.length && (
          <Typography color="text.secondary">
            Não encontramos ocorrências para {code} no texto original.
          </Typography>
        )}

        {!loading && !!lista.length && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {lista.map((r, idx) => (
              <ItemCaixa key={`occ-${r.livroId}-${r.capitulo}-${r.versiculo}-${idx}`} onClick={() => void abrir(r, idx)}>
                <Typography
                  sx={{
                    ...sxTextoLeitura,
                    color: 'primary.main',
                    fontWeight: 600,
                    m: 0,
                  }}
                >
                  {`${livrosData.find((l) => Number(l.id) === Number(r.livroId))?.nome || 'Livro'} ${r.capitulo}:${r.versiculo}`}
                </Typography>
              </ItemCaixa>
            ))}
            {temMais && (
              <Button
                size="small"
                variant="outlined"
                disabled={carregandoMais}
                onClick={() => void carregarMais()}
                sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600, borderRadius: 2, mt: 0.5 }}
                startIcon={carregandoMais ? <CircularProgress size={14} /> : null}
              >
                {carregandoMais
                  ? 'Carregando…'
                  : `Carregar mais (${lista.length} de ${total})`}
              </Button>
            )}
          </Box>
        )}
      </Container>

      <StrongOcorrenciaDialog
        open={dialog.open}
        loading={dialog.loading}
        item={dialog.item}
        idx={dialog.idx}
        total={totalDialog}
        original={dialog.original}
        traducao={dialog.traducao}
        termoDestaque={String(dialog.item?.tokenOriginal || '').trim()}
        sxTextoLeitura={sxTextoLeitura}
        onClose={fechar}
        onPrev={() => void navegarCompleta(-1)}
        onNext={() => void navegarCompleta(1)}
        prevDisabled={dialog.idx <= 0}
        nextDisabled={dialog.idx < 0 || dialog.idx >= totalDialog - 1}
      />
    </Box>
  )
}
