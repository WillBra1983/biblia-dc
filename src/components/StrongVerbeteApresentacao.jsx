import React, { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  TextField,
  Button,
  Alert,
  CircularProgress,
  useTheme,
  IconButton,
  Tooltip,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material'
import VolumeUpOutlined from '@mui/icons-material/VolumeUpOutlined'
import HeadphonesOutlined from '@mui/icons-material/HeadphonesOutlined'
import StarOutline from '@mui/icons-material/StarOutline'
import {
  limparTextoTokenPassagem,
  montarLeituraToken,
  formatarTextoMorphHb,
  formatarTextoMorphHbVocalizado,
  formatarReferenciaPassagemToken,
  referenciaPassagemCompleta,
  montarTranslitTokenHebraico,
  deveExibirBarraToken,
  formasLexicaisEquivalentes,
} from '../utils/strongTokenHelpers'
import { fontFamilyStrongPassagem, sxHebrewVocalizado } from '../utils/hebrewDisplay'
import { livros as livrosData } from '../data/biblia'
import { buscarIntervaloVersiculos } from '../services/bibliaService'
import VersiculoPopup from './VersiculoPopup'
import { buscarTokensOt, buscarTokensOtCapitulo, buscarStrongHebrewMap } from '../services/otStrongService'
import {
  pararPronunciaStrong,
  pronunciaDisponivel,
  reproduzirPronunciaFormaToken,
  reproduzirPronunciaStrong,
} from '../utils/strongPronunciationAudio'
import {
  audioVersiculoHebraicoDisponivel,
  aguardarAudioVersiculoHebraicoDisponivel,
  versiculoNoTimestamp,
  obterIndiceAudioHebraico,
  pararAudioVersiculoHebraico,
  reproduzirCapituloHebraico,
  reproduzirVersiculoHebraico,
} from '../utils/otHebrewVerseAudio'
import { mostrarSnackbar } from '../utils/uiDialogs'
import { biblicalAudioEnabled } from '../config/biblicalAudio'

function textoTokenPopup(t) {
  return typeof t === 'string' ? t : String(t?.he || '')
}

function translitTokenPopup(t) {
  const tr = typeof t === 'object' ? String(t?.tr || '').trim() : ''
  if (tr) return tr
  return montarTranslitTokenHebraico(textoTokenPopup(t)).translit
}

async function montarTokensComTranslit(tokensOrig) {
  const codes = (tokensOrig || []).map((t) => t.strong_code).filter(Boolean)
  const xlitMap = await buscarStrongHebrewMap(codes)
  return (tokensOrig || [])
    .map((t) => {
      const strong = String(t.strong_code || '').trim()
      const lex = xlitMap[strong]
      const he = formatarTextoMorphHbVocalizado(String(t.text || ''), lex?.headword).trim()
      if (!he) return null
      const { translit } = montarTranslitTokenHebraico(String(t.text || ''), {
        lemmaUnicode: lex?.headword,
        lemmaTranslit: lex?.xlit,
        lemmaPron: lex?.pron,
      })
      return { he, tr: translit, strong }
    })
    .filter(Boolean)
}

function useStrongDictPalette() {
  const theme = useTheme()
  const dark = theme.palette.mode === 'dark'
  return {
    label: dark ? 'rgba(255,255,255,0.48)' : 'rgba(0,0,0,0.45)',
    chipBg: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    chipBorder: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
    /** Cards principais (token, lemma, definição) — segue o tema claro/escuro. */
    cardBg: theme.palette.background.paper,
    cardBorder: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)',
    /** Caixas secundárias (usos, índice, BDB interno). */
    itemBg: dark ? 'rgba(255,255,255,0.06)' : '#f4f4f6',
    itemBorder: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
    heroScript: dark ? '#fff' : '#111',
    noteBg: theme.palette.background.paper,
    noteText: theme.palette.text.primary,
    noteBorder: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
  }
}

/** Palavra original centralizada (coluna do meio). */
function sxPalavraColunaCentro({ ehGrego, fontSerifLexico, fontSize, color }) {
  const base = {
    m: 0,
    width: '100%',
    textAlign: 'center',
    lineHeight: 1.15,
    color,
  }
  if (ehGrego) {
    return {
      ...base,
      fontFamily: fontSerifLexico,
      fontWeight: 800,
      fontSize,
      direction: 'ltr',
      unicodeBidi: 'plaintext',
    }
  }
  return {
    ...base,
    ...sxHebrewVocalizado,
    fontSize,
    fontWeight: 400,
  }
}

function SecaoRotulo({ children, sx = {} }) {
  const p = useStrongDictPalette()
  return (
    <Typography
      component="p"
      sx={{
        m: 0,
        mb: 0.75,
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: p.label,
        ...sx,
      }}
    >
      {children}
    </Typography>
  )
}

function ItemCaixa({ children, onClick, sx = {} }) {
  const p = useStrongDictPalette()
  const theme = useTheme()
  const dark = theme.palette.mode === 'dark'
  return (
    <Box
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      sx={{
        px: 1.75,
        py: 1.25,
        borderRadius: 2.5,
        bgcolor: p.itemBg,
        border: '1px solid',
        borderColor: p.itemBorder,
        ...(onClick
          ? {
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
              '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.1)' : '#ebebed' },
            }
          : {}),
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

/** Card principal (token, lemma, definição) — papel no claro, surface no escuro. */
function CardCaixa({ children, sx = {} }) {
  const p = useStrongDictPalette()
  return (
    <Box
      sx={{
        px: 1.75,
        py: 1.35,
        borderRadius: 2.5,
        bgcolor: p.cardBg,
        border: '1px solid',
        borderColor: p.cardBorder,
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

function IconeInfoLexico({ dica, ariaLabel }) {
  return (
    <Tooltip title={dica} arrow enterTouchDelay={0}>
      <Typography
        component="span"
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click()
        }}
        sx={{
          fontSize: { xs: '0.9rem', sm: '0.95rem' },
          fontWeight: 700,
          fontStyle: 'italic',
          lineHeight: 1,
          cursor: 'help',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        i
      </Typography>
    </Tooltip>
  )
}

function RotuloLexicoGrande({ rotulo, dica, ariaLabel }) {
  const p = useStrongDictPalette()
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 0.35,
        color: p.label,
        width: '100%',
        pr: { xs: 0.25, sm: 0.5 },
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: { xs: '1.05rem', sm: '1.14rem' },
          fontWeight: 700,
          color: 'inherit',
          lineHeight: 1.2,
          unicodeBidi: 'isolate',
        }}
      >
        {rotulo}
      </Typography>
      {!!dica && <IconeInfoLexico dica={dica} ariaLabel={ariaLabel} />}
    </Box>
  )
}

/** Três colunas: rótulo (esq.) | palavra + transliteração (centro) | espaço (dir.). */
function LinhaFormaLexica3Col({
  rotulo,
  dica,
  ariaLabel,
  ehGrego,
  unicode,
  translitLinhas,
  fontSerifLexico,
  fontSizePalavra,
  colorPalavra,
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(72px, 26%) 1fr minmax(40px, 12%)',
          sm: 'minmax(88px, 22%) 1fr minmax(56px, 16%)',
        },
        alignItems: 'center',
        columnGap: { xs: 0.75, sm: 1.25 },
        py: { xs: 0.65, sm: 0.85 },
      }}
    >
      <RotuloLexicoGrande rotulo={rotulo} dica={dica} ariaLabel={ariaLabel} />

      <Box sx={{ justifySelf: 'center', width: '100%', maxWidth: 300, mx: 'auto' }}>
        <Typography
          component="p"
          className={ehGrego ? undefined : 'hebrew-vocalizado'}
          sx={sxPalavraColunaCentro({
            ehGrego,
            fontSerifLexico,
            fontSize: fontSizePalavra,
            color: colorPalavra,
          })}
        >
          {unicode || '—'}
        </Typography>
        <LinhasTranslit linhas={translitLinhas} alinhar="center" />
      </Box>

      <Box aria-hidden="true" />
    </Box>
  )
}

function LinhasTranslit({ linhas, alinhar = 'left' }) {
  const items = (linhas || []).filter(Boolean)
  if (!items.length) return null
  return (
    <Box sx={{ mt: 0.5, textAlign: alinhar, width: '100%' }}>
      {items.map((linha, idx) => (
        <Typography
          key={`${linha}-${idx}`}
          component="p"
          sx={{
            m: 0,
            mb: idx < items.length - 1 ? 0.2 : 0,
            fontStyle: 'italic',
            fontSize: { xs: '1rem', sm: '1.08rem' },
            color: 'text.primary',
            lineHeight: 1.35,
          }}
        >
          {linha}
        </Typography>
      ))}
    </Box>
  )
}

function ChipMeta({ label, icon, onClick, href }) {
  const p = useStrongDictPalette()
  const sx = {
    height: 28,
    fontSize: '0.78rem',
    fontWeight: 600,
    bgcolor: p.chipBg,
    border: '1px solid',
    borderColor: p.chipBorder,
    color: 'text.primary',
    '& .MuiChip-icon': { color: 'text.secondary', fontSize: 16 },
  }
  if (href) {
    return (
      <Chip
        component="a"
        href={href}
        target="_blank"
        rel="noreferrer"
        clickable
        label={label}
        icon={icon}
        sx={sx}
      />
    )
  }
  if (onClick) {
    return <Chip clickable label={label} icon={icon} onClick={onClick} sx={sx} />
  }
  return <Chip label={label} icon={icon} sx={sx} />
}

function BotaoPronuncia({ strongCode, unicode, translit, pronuncia, ehGrego, compact = false, formaExata = false }) {
  const [estado, setEstado] = useState('idle')
  const podeOuvir = pronunciaDisponivel() && !!(unicode || translit || pronuncia)
  const dica = formaExata
    ? 'Ouvir transliteração da forma na passagem'
    : 'Ouvir transliteração do léma (como na linha em itálico)'

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices()
    }
    return () => pararPronunciaStrong()
  }, [])

  const ouvir = useCallback(async () => {
    if (!podeOuvir) return
    if (estado === 'playing') {
      pararPronunciaStrong()
      setEstado('idle')
      return
    }
    pararAudioVersiculoHebraico()
    setEstado('loading')
    try {
      if (formaExata) {
        await reproduzirPronunciaFormaToken({ unicode, translit, pronuncia, ehGrego })
      } else {
        await reproduzirPronunciaStrong({
          strongCode,
          unicode,
          translit,
          pronuncia,
          ehGrego,
        })
      }
      setEstado('playing')
      window.setTimeout(() => setEstado('idle'), 2800)
    } catch {
      setEstado('idle')
      mostrarSnackbar({
        mensagem: 'Não foi possível reproduzir a pronúncia neste dispositivo.',
        severidade: 'info',
      })
    }
  }, [podeOuvir, estado, strongCode, unicode, translit, pronuncia, ehGrego, formaExata])

  if (!podeOuvir) return null

  return (
    <Tooltip title={dica}>
      <span>
        <IconButton
          size="small"
          onClick={() => void ouvir()}
          aria-label="Ouvir pronúncia"
          sx={{
            ml: compact ? 0 : 0.25,
            p: compact ? 0.35 : undefined,
            border: compact ? 'none' : '1px solid',
            borderColor: 'divider',
            bgcolor: compact ? 'transparent' : 'background.paper',
          }}
        >
          {estado === 'loading' ? (
            <CircularProgress size={16} />
          ) : (
            <VolumeUpOutlined sx={{ fontSize: 18 }} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  )
}

function BotaoOuvirVersiculo({ tokenRef, ehGrego }) {
  const [estado, setEstado] = useState('idle')
  const ref = referenciaPassagemCompleta(tokenRef)
  const [podeOuvir, setPodeOuvir] = useState(() =>
    biblicalAudioEnabled &&
    !!ref &&
    audioVersiculoHebraicoDisponivel({ ...ref, ehGrego })
  )

  useEffect(() => {
    let cancelled = false
    if (!biblicalAudioEnabled || !ref || ehGrego) {
      setPodeOuvir(false)
      return undefined
    }
    void aguardarAudioVersiculoHebraicoDisponivel({ ...ref, ehGrego }).then((ok) => {
      if (!cancelled) setPodeOuvir(ok)
    })
    return () => {
      cancelled = true
    }
  }, [ref, ehGrego])

  const [popup, setPopup] = useState({
    open: false,
    loading: false,
    modo: 'verso',
    capituloLoading: false,
    versoAtual: null,
    versosCapitulo: [],
    tokens: [],
    alvo: '',
    pt: '',
    ref: ''
  })

  useEffect(() => () => pararAudioVersiculoHebraico(), [])

  const carregarPopup = useCallback(async () => {
    if (!ref) return
    const refLabel = formatarReferenciaPassagemToken(tokenRef)
    const alvo = formatarTextoMorphHb(tokenRef?.text || '').trim()
    setPopup({ open: true, loading: true, modo: 'verso', capituloLoading: false, versoAtual: ref.versiculo, versosCapitulo: [], tokens: [], alvo, pt: '', ref: refLabel })
    try {
      const [versosPt, tokensOrig] = await Promise.all([
        buscarIntervaloVersiculos(ref.livroId, ref.capitulo, ref.versiculo, ref.versiculo),
        buscarTokensOt(ref.livroId, ref.capitulo, ref.versiculo),
      ])
      const pt = String(versosPt?.versiculos?.[0]?.texto || versosPt?.[0]?.texto || '')
      const tokens = await montarTokensComTranslit(tokensOrig)
      setPopup((p) => ({ ...p, open: true, loading: false, modo: 'verso', tokens, alvo, pt, ref: refLabel }))
    } catch {
      setPopup((p) => ({ ...p, open: true, loading: false, modo: 'verso', tokens: [], alvo, pt: '', ref: refLabel }))
    }
  }, [ref, tokenRef])

  const ouvir = useCallback(async () => {
    if (!podeOuvir || !ref) return
    if (estado === 'playing' || estado === 'loading') {
      pararAudioVersiculoHebraico()
      setEstado('idle')
      setPopup((p) => ({ ...p, open: false }))
      return
    }
    pararPronunciaStrong()
    setEstado('loading')
    try {
      void carregarPopup()
      await reproduzirVersiculoHebraico({
        ...ref,
        onEnd: () => setEstado('idle'),
      })
      setEstado('playing')
    } catch {
      setEstado('idle')
      mostrarSnackbar({
        mensagem: 'Não foi possível reproduzir o versículo. Verifique a conexão.',
        severidade: 'info',
      })
    }
  }, [podeOuvir, estado, ref])

  const ouvirDeNovo = useCallback(async () => {
    if (!podeOuvir || !ref) return
    pararAudioVersiculoHebraico()
    setEstado('loading')
    try {
      await reproduzirVersiculoHebraico({
        ...ref,
        onEnd: () => setEstado('idle'),
      })
      setEstado('playing')
    } catch {
      setEstado('idle')
      mostrarSnackbar({
        mensagem: 'Não foi possível reproduzir o versículo. Verifique a conexão.',
        severidade: 'info',
      })
    }
  }, [podeOuvir, ref])

  const ouvirCapitulo = useCallback(async () => {
    if (!ref) return
    if (estado === 'playing' || estado === 'loading') {
      pararAudioVersiculoHebraico()
      setEstado('idle')
      return
    }
    setEstado('loading')
    try {
      setPopup((p) => ({ ...p, open: true, modo: 'capitulo', capituloLoading: true, versoAtual: ref.versiculo }))
      const [indice, byVerse, versosPt] = await Promise.all([
        obterIndiceAudioHebraico(ref.livroId, ref.capitulo),
        buscarTokensOtCapitulo(ref.livroId, ref.capitulo),
        buscarIntervaloVersiculos(ref.livroId, ref.capitulo, 1, 999),
      ])
      const ptMap = new Map((versosPt?.versiculos || []).map((v) => [Number(v.numero), String(v.texto || '')]))
      const allCodes = Object.values(byVerse || {})
        .flat()
        .map((t) => t.strong_code)
        .filter(Boolean)
      const xlitMap = await buscarStrongHebrewMap(allCodes)
      const lista = (indice?.verses || []).map((v) => {
        const n = Number(v.verse)
        const tokens = (byVerse?.[n] || [])
          .map((t) => {
            const strong = String(t.strong_code || '').trim()
            const lex = xlitMap[strong]
            const he = formatarTextoMorphHbVocalizado(String(t.text || ''), lex?.headword).trim()
            if (!he) return null
            const { translit: tr } = montarTranslitTokenHebraico(String(t.text || ''), {
              lemmaUnicode: lex?.headword,
              lemmaTranslit: lex?.xlit,
              lemmaPron: lex?.pron,
            })
            return { he, tr, strong }
          })
          .filter(Boolean)
        return {
          verse: n,
          start: Number(v.start_sec) || 0,
          end: Number(v.end_sec) || 0,
          tokens,
          pt: ptMap.get(n) || '',
        }
      })
      setPopup((p) => ({ ...p, capituloLoading: false, versosCapitulo: lista, versoAtual: ref.versiculo }))

      await reproduzirCapituloHebraico({
        livroId: ref.livroId,
        capitulo: ref.capitulo,
        startSec: null,
        onTimeUpdate: (t) => {
          const atual = versiculoNoTimestamp(lista, t)
          if (atual?.verse) {
            setPopup((p) => (p.versoAtual === atual.verse ? p : { ...p, versoAtual: atual.verse }))
          }
        },
        onEnd: () => setEstado('idle'),
      })
      setEstado('playing')
    } catch {
      setEstado('idle')
      mostrarSnackbar({
        mensagem: 'Não foi possível reproduzir o capítulo. Verifique a conexão.',
        severidade: 'info',
      })
    }
  }, [ref, estado])

  if (!podeOuvir) return null

  const refLabel = formatarReferenciaPassagemToken(tokenRef)

  return (
    <>
      <Tooltip title={`Ouvir versículo hebraico (${refLabel})`}>
        <span>
          <IconButton
            size="small"
            onClick={() => void ouvir()}
            aria-label="Ouvir versículo hebraico"
            sx={{ p: 0.35, color: 'primary.main' }}
          >
            {estado === 'loading' ? (
              <CircularProgress size={16} />
            ) : (
              <HeadphonesOutlined sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </span>
      </Tooltip>

      <Dialog
        open={popup.open}
        onClose={() => setPopup((p) => ({ ...p, open: false }))}
        fullWidth
        maxWidth={popup.modo === 'capitulo' ? 'lg' : 'sm'}
        scroll="paper"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Áudio do versículo</DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden', px: { xs: 1.5, sm: 2.5 } }}>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, mb: 1 }}>
            {popup.ref || refLabel}
          </Typography>
          {popup.modo === 'capitulo' && popup.versoAtual && (
            <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 1 }}>
              Verso em reprodução: <strong>{popup.versoAtual}</strong>
            </Typography>
          )}

          {popup.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={22} />
            </Box>
          ) : (
            <>
              {popup.modo === 'capitulo' && popup.capituloLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={22} />
                </Box>
              ) : null}
              {popup.modo === 'capitulo' ? (
                (() => {
                  const atual = popup.versosCapitulo.find((v) => v.verse === popup.versoAtual) || null
                  const tokensCap = atual?.tokens || []
                  const ptCap = atual?.pt || ''
                  return (
                    <>
                      <Box
                        className="hebrew-vocalizado"
                        sx={{
                          ...sxHebrewVocalizado,
                          fontSize: { xs: '1.25rem', sm: '1.55rem' },
                          mb: 1,
                          lineHeight: 1.45,
                          width: '100%',
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'flex-start',
                          gap: 0.5,
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                        }}
                      >
                        {(tokensCap.length ? tokensCap : [{ he: '—', tr: '' }]).map((t, idx) => (
                          <Box key={`cap-${idx}-${textoTokenPopup(t)}`} component="span" sx={{ color: 'text.primary' }}>
                            {textoTokenPopup(t)}
                          </Box>
                        ))}
                      </Box>
                      {!!tokensCap.length && (
                        <Box sx={{ mt: 0.15, mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.95, direction: 'rtl', unicodeBidi: 'plaintext' }}>
                          {tokensCap.map((t, idx) => (
                            <Box key={`cap-tr-${idx}-${textoTokenPopup(t)}`} sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: 18 }}>
                              <Box component="span" sx={{ fontSize: '0.78rem', fontStyle: 'italic', fontWeight: 800, color: 'text.secondary', direction: 'ltr', unicodeBidi: 'isolate' }}>
                                {translitTokenPopup(t) || '—'}
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}
                      <Divider sx={{ my: 1 }} />
                      <Typography sx={{ fontSize: '1rem', color: 'text.primary', lineHeight: 1.55, overflowWrap: 'anywhere' }}>
                        {ptCap || '—'}
                      </Typography>
                    </>
                  )
                })()
              ) : (
                <>
              <Box
                className="hebrew-vocalizado"
                sx={{
                  ...sxHebrewVocalizado,
                  fontSize: { xs: '1.25rem', sm: '1.55rem' },
                  mb: 1,
                  lineHeight: 1.45,
                  width: '100%',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'flex-start',
                  gap: 0.5,
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {(popup.tokens?.length ? popup.tokens : [{ he: '—', tr: '' }]).map((t, idx) => {
                  const texto = textoTokenPopup(t)
                  const match = popup.alvo && formasLexicaisEquivalentes(texto, popup.alvo)
                  return (
                    <Box
                      key={`${idx}-${texto}`}
                      component="span"
                      sx={{
                        color: match ? 'primary.main' : 'text.primary',
                      }}
                    >
                      {texto}
                    </Box>
                  )
                })}
              </Box>

              {!!popup.tokens?.length && (
                <Box
                  sx={{
                    mt: 0.15,
                    mb: 1,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.95,
                    direction: 'rtl',
                    unicodeBidi: 'plaintext',
                  }}
                >
                  {popup.tokens.map((t, idx) => {
                    const texto = textoTokenPopup(t)
                    const match = popup.alvo && formasLexicaisEquivalentes(texto, popup.alvo)
                    const tr = translitTokenPopup(t)
                    return (
                      <Box
                        key={`tr-${idx}-${texto}`}
                        sx={{
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          minWidth: 18,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            fontSize: '0.78rem',
                            fontStyle: 'italic',
                            fontWeight: 800,
                            color: match ? 'primary.main' : 'text.secondary',
                            direction: 'ltr',
                            unicodeBidi: 'isolate',
                          }}
                        >
                          {tr || '—'}
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              )}

              <Divider sx={{ my: 1 }} />

              <Typography sx={{ fontSize: '1rem', color: 'text.primary', lineHeight: 1.55, overflowWrap: 'anywhere' }}>
                {popup.pt || '—'}
              </Typography>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25, justifyContent: 'space-between' }}>
          <Button onClick={() => setPopup((p) => ({ ...p, open: false }))} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Fechar
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => void ouvirCapitulo()}
              startIcon={<HeadphonesOutlined />}
              sx={{ textTransform: 'none', fontWeight: 800 }}
            >
              Ouvir capítulo
            </Button>
            <Button
              variant="contained"
              onClick={() => void ouvirDeNovo()}
              startIcon={<HeadphonesOutlined />}
              sx={{ textTransform: 'none', fontWeight: 800 }}
            >
              Ouvir de novo
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  )
}

const DICA_TOKEN_PASSAGEM =
  'Forma como aparece no texto bíblico. (pode incluir prefixo ou flexão.)'

const DICA_LEMMA_STRONG = 'Palavra como aparece no Dicionário Strong.'

function PassagemClicavel({ tokenRef, refPassagem }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [versiculosPopup, setVersiculosPopup] = useState(null)

  const abrirPassagem = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const ref = referenciaPassagemCompleta(tokenRef)
    if (!ref) return
    try {
      const livro = livrosData.find((l) => Number(l.id) === Number(ref.livroId))
      const resultado = await buscarIntervaloVersiculos(
        ref.livroId,
        ref.capitulo,
        ref.versiculo,
        ref.versiculo
      )
      const lista = resultado?.versiculos || resultado || []
      if (!lista.length) return
      setVersiculosPopup(
        lista.map((v) => ({
          ...v,
          livro: livro?.nome || '',
        }))
      )
    } catch {
      /* ignore */
    }
  }, [tokenRef])

  return (
    <>
      <Link
        component="button"
        type="button"
        onClick={(e) => void abrirPassagem(e)}
        sx={{
          fontSize: '0.9rem',
          color: isDark ? theme.palette.primary.light : 'primary.main',
          fontWeight: 700,
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
          verticalAlign: 'baseline',
          p: 0,
          border: 0,
          bgcolor: 'transparent',
          fontFamily: 'inherit',
          '&:hover': { opacity: 0.88 },
        }}
      >
        {refPassagem}
      </Link>
      {versiculosPopup && (
        <VersiculoPopup versiculos={versiculosPopup} onClose={() => setVersiculosPopup(null)} />
      )}
    </>
  )
}

export function CabecalhoStrongPassagem({ tokenRef, ehGrego, mostrarTitulo = true }) {
  const p = useStrongDictPalette()
  const refPassagem = formatarReferenciaPassagemToken(tokenRef)

  if (!refPassagem && !mostrarTitulo) return null

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr auto 1fr' },
        alignItems: 'center',
        gap: 0.75,
        mb: 1.25,
        minHeight: 32,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          flexWrap: 'wrap',
          justifySelf: { xs: 'start', sm: 'start' },
        }}
      >
        {!!refPassagem && (
          <>
            <Typography component="span" sx={{ fontSize: '0.9rem', color: p.label, fontWeight: 600 }}>
              Passagem:{' '}
            </Typography>
            <PassagemClicavel tokenRef={tokenRef} refPassagem={refPassagem} />
            <BotaoOuvirVersiculo tokenRef={tokenRef} ehGrego={ehGrego} />
          </>
        )}
      </Box>

      {mostrarTitulo && (
        <Typography
          component="h2"
          sx={{
            m: 0,
            textAlign: 'center',
            fontWeight: 700,
            fontSize: { xs: '1.02rem', sm: '1.08rem' },
            color: 'text.primary',
            letterSpacing: 0.2,
            justifySelf: 'center',
            gridColumn: { xs: '1', sm: '2' },
            gridRow: { xs: refPassagem ? '2' : '1', sm: '1' },
          }}
        >
          Significado Original
        </Typography>
      )}

      <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
    </Box>
  )
}

function ParagrafosResumo({ texto, sxTextoLeitura, keyPrefix = 'par' }) {
  if (!texto) return null
  const partes = texto.split(/\n\n+/).filter(Boolean)
  return partes.map((par, idx) => (
    <Typography
      key={`${keyPrefix}-${idx}`}
      variant="body1"
      sx={{
        ...sxTextoLeitura,
        color: 'text.primary',
        lineHeight: 1.65,
        m: 0,
        mb: idx < partes.length - 1 ? 1.25 : 0,
        whiteSpace: 'pre-wrap',
      }}
    >
      {par.trim()}
    </Typography>
  ))
}

function BlocoResumoLexical({ resumoLexical, sxTextoLeitura, onRegenerar, tokenForma, ehGrego, fontSerifLexico }) {
  const { status, lemmaText, tokenText, refPassagem, tokenIndisponivelOffline, text, error } =
    resumoLexical || {}
  const lemma = lemmaText || text
  const translitToken = String(tokenForma?.translit || '').trim()

  if (status === 'loading') {
    return (
      <CardCaixa sx={{ py: 2 }}>
        <SecaoRotulo>Estudo lexical</SecaoRotulo>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1 }}>
          <CircularProgress size={22} />
          <Typography variant="body2" color="text.secondary" sx={sxTextoLeitura}>
            Organizando significado e usos bíblicos…
          </Typography>
        </Box>
      </CardCaixa>
    )
  }

  if (status === 'error' && error) {
    return (
      <Alert
        severity="warning"
        sx={{ mb: 0.5 }}
        action={
          onRegenerar ? (
            <Button size="small" onClick={onRegenerar} sx={{ textTransform: 'none' }}>
              Tentar de novo
            </Button>
          ) : null
        }
      >
        {error}
      </Alert>
    )
  }

  if (!lemma) return null

  const mostrarSecaoToken = !!tokenText || tokenIndisponivelOffline

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {mostrarSecaoToken && (
        <>
          {!!tokenText && (
            <CardCaixa sx={{ py: 1.35 }}>
              <SecaoRotulo>
                Token Explicado{refPassagem ? ` · ${refPassagem}` : ''}
              </SecaoRotulo>
              {tokenForma?.unicode ? (
                <Box sx={{ textAlign: 'center', mb: 1.25, mt: 0.25 }}>
                  <Typography
                    component="div"
                    sx={{
                      ...(ehGrego ? { fontFamily: fontSerifLexico } : sxHebrewVocalizado),
                      fontSize: { xs: '1.65rem', sm: '1.85rem' },
                      color: 'text.primary',
                      lineHeight: 1.45,
                    }}
                  >
                    {tokenForma.unicode}
                  </Typography>
                  {translitToken ? (
                    <Typography
                      variant="body2"
                      sx={{ ...sxTextoLeitura, color: 'text.secondary', mt: 0.35, fontStyle: 'italic' }}
                    >
                      {translitToken}
                    </Typography>
                  ) : null}
                </Box>
              ) : null}
              <ParagrafosResumo texto={tokenText} sxTextoLeitura={sxTextoLeitura} keyPrefix="token" />
            </CardCaixa>
          )}

          {tokenIndisponivelOffline && !tokenText && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              O token explicado ainda não está guardado neste aparelho. Abra uma vez com internet (mesma referência)
              para gerar e ficar disponível offline.
            </Alert>
          )}
        </>
      )}

      <CardCaixa sx={{ py: 1.35 }}>
        <SecaoRotulo>Léma Explicado</SecaoRotulo>
        <ParagrafosResumo texto={lemma} sxTextoLeitura={sxTextoLeitura} keyPrefix="lemma" />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25, opacity: 0.85 }}>
          Entrada lexical do Strong (léma de dicionário) — o mesmo texto vale em qualquer passagem com este código.
        </Typography>
      </CardCaixa>
    </Box>
  )
}

export default function StrongVerbeteApresentacao({
  detalhe,
  code,
  ehGrego,
  sxTextoLeitura,
  token,
  resumoLexical,
  onRegenerarResumo,
  notaTexto,
  setNotaTexto,
  salvarNota,
  notaStatus,
  user,
  onIrLogin,
  ocorrencias,
  ocorrenciasLoading,
  ocorrenciasTotal,
  onVerTodasOcorrencias,
  onAbrirOcorrencia,
  renderSomenteCodigosDerivacao,
}) {
  const p = useStrongDictPalette()
  const fontSerifLexico = fontFamilyStrongPassagem(ehGrego)

  const pronuncia = String(detalhe.pronunciation || '').trim()
  const posLabel = detalhe.lexicalIndex?.find((li) => li?.pos)?.pos || ''

  const derivacaoRaw = String(detalhe.derivation_pt || detalhe.derivation || '').trim()

  const codigosDerivacao = derivacaoRaw ? renderSomenteCodigosDerivacao(derivacaoRaw) : null
  const temBarraToken = deveExibirBarraToken(token)

  const translitLemma = [
    detalhe.greek_translit,
    pronuncia && pronuncia !== detalhe.greek_translit ? pronuncia : '',
  ].filter(Boolean)

  const textoTokenLimpo = temBarraToken
    ? limparTextoTokenPassagem(token?.text || token?.word || '')
    : ''
  const headwordLemma = String(detalhe?.greek_unicode || '').trim()
  const textoTokenExibicao = temBarraToken
    ? (ehGrego ? textoTokenLimpo : formatarTextoMorphHbVocalizado(textoTokenLimpo, headwordLemma))
    : ''
  const lemmaUnicodeExibicao = ehGrego
    ? headwordLemma
    : formatarTextoMorphHbVocalizado(headwordLemma, headwordLemma)
  const leituraToken = temBarraToken
    ? montarLeituraToken(textoTokenLimpo, ehGrego, {
        lemmaUnicode: detalhe?.greek_unicode,
        lemmaTranslit: detalhe?.greek_translit,
        lemmaPron: detalhe?.pronunciation,
      })
    : null
  const translitTokenLinhas = leituraToken
    ? [
        leituraToken.linha ? leituraToken.translit : '',
        leituraToken.fonetica && leituraToken.fonetica !== leituraToken.translit
          ? leituraToken.fonetica
          : '',
      ].filter(Boolean)
    : []

  const tokenIgualLemma =
    temBarraToken &&
    formasLexicaisEquivalentes(textoTokenLimpo, headwordLemma)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>

      {!temBarraToken && (
        <CabecalhoStrongPassagem tokenRef={token} ehGrego={ehGrego} mostrarTitulo />
      )}

      <CardCaixa sx={{ py: 1.35, mb: 0.25 }}>
        {temBarraToken && !tokenIgualLemma && (
          <>
            <LinhaFormaLexica3Col
              rotulo="Token:"
              dica={DICA_TOKEN_PASSAGEM}
              ariaLabel="O que é o token na passagem"
              ehGrego={ehGrego}
              unicode={textoTokenExibicao}
              translitLinhas={translitTokenLinhas}
              fontSerifLexico={fontSerifLexico}
              fontSizePalavra={{ xs: '1.85rem', sm: '2.1rem' }}
              colorPalavra="text.primary"
            />
            <Divider sx={{ my: 0.5, borderColor: p.cardBorder }} />
          </>
        )}

        <LinhaFormaLexica3Col
          rotulo="Lemma:"
          dica={DICA_LEMMA_STRONG}
          ariaLabel="O que é o lemma no dicionário Strong"
          ehGrego={ehGrego}
          unicode={lemmaUnicodeExibicao}
          translitLinhas={translitLemma}
          fontSerifLexico={fontSerifLexico}
          fontSizePalavra={{ xs: '2rem', sm: '2.35rem' }}
          colorPalavra={p.heroScript}
        />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.25 }}>
          <ChipMeta label={detalhe.strong || code} />
          <ChipMeta label={ehGrego ? 'Grego' : 'Hebraico'} icon={<StarOutline />} />
          {!!posLabel && <ChipMeta label={posLabel} />}
        </Box>
      </CardCaixa>

      <BlocoResumoLexical
        resumoLexical={resumoLexical}
        sxTextoLeitura={sxTextoLeitura}
        onRegenerar={onRegenerarResumo}
        ehGrego={ehGrego}
        fontSerifLexico={fontSerifLexico}
        tokenForma={
          temBarraToken && textoTokenExibicao
            ? {
                unicode: textoTokenExibicao,
                translit: translitTokenLinhas[0] || leituraToken?.translit || '',
              }
            : null
        }
      />

      {!!codigosDerivacao && (
        <Box>
          <SecaoRotulo>Referências Strong relacionadas</SecaoRotulo>
          <Typography component="div" variant="body1" sx={{ ...sxTextoLeitura, color: 'text.primary', m: 0 }}>
            {codigosDerivacao}
          </Typography>
        </Box>
      )}

      <Box>
        <SecaoRotulo>Anotação deste verbete ({code})</SecaoRotulo>
        {!user?.uid ? (
          <Alert
            severity="info"
            action={
              <Button size="small" variant="outlined" onClick={onIrLogin}>
                Entrar
              </Button>
            }
          >
            Faça login para criar e sincronizar anotações deste dicionário entre seus dispositivos.
          </Alert>
        ) : (
          <>
            <TextField
              fullWidth
              multiline
              minRows={4}
              value={notaTexto}
              onChange={(e) => setNotaTexto(e.target.value)}
              placeholder="Escreva observações sobre esta palavra (contexto, aplicações, dúvidas, etc.)"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: p.noteBg,
                  color: p.noteText,
                  borderRadius: 2.5,
                  '& fieldset': { borderColor: p.noteBorder },
                  '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.25)' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                },
                '& .MuiInputBase-input::placeholder': { color: 'rgba(0,0,0,0.42)', opacity: 1 },
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, mt: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button size="small" variant="contained" onClick={salvarNota} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Salvar anotação
              </Button>
              {!!notaStatus && (
                <Typography variant="caption" color="text.secondary">
                  {notaStatus}
                </Typography>
              )}
            </Box>
          </>
        )}
      </Box>

      <Box>
        <SecaoRotulo>Ocorrências em outros textos</SecaoRotulo>
        {ocorrenciasTotal != null && ocorrenciasTotal > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, ...sxTextoLeitura }}>
            {ocorrenciasTotal === 1
              ? '1 referência no texto original.'
              : `${ocorrenciasTotal} referências no texto original.`}
          </Typography>
        )}
        {ocorrenciasLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Buscando ocorrências…
            </Typography>
          </Box>
        )}
        {!ocorrenciasLoading && !!ocorrencias.length && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {ocorrencias.map((r, idx) => (
              <ItemCaixa key={`occ-${idx}`} onClick={() => onAbrirOcorrencia(r, idx)}>
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
            {ocorrenciasTotal != null && ocorrenciasTotal > 0 && (
              <Button
                size="small"
                variant={ocorrenciasTotal > ocorrencias.length ? 'contained' : 'outlined'}
                onClick={onVerTodasOcorrencias}
                sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600, borderRadius: 2, mt: 0.25 }}
              >
                {ocorrenciasTotal > ocorrencias.length
                  ? `Ver todas (${ocorrenciasTotal})`
                  : 'Ver lista completa'}
              </Button>
            )}
          </Box>
        )}
        {!ocorrenciasLoading && !ocorrencias.length && (
          <Typography variant="body2" color="text.secondary" sx={sxTextoLeitura}>
            Não encontramos ocorrências para este código no texto original.
          </Typography>
        )}
      </Box>
    </Box>
  )
}
