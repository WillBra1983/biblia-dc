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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material'
import VolumeUpOutlined from '@mui/icons-material/VolumeUpOutlined'
import HeadphonesOutlined from '@mui/icons-material/HeadphonesOutlined'
import StarOutline from '@mui/icons-material/StarOutline'
import { limparTextoStepBible, montarDefinicaoExibicao, montarTwotPesquisaUrl } from '../utils/strongEstudoHelpers'
import {
  limparTextoTokenPassagem,
  montarLeituraToken,
  formatarTextoMorphHb,
  formatarReferenciaPassagemToken,
  formasLexicaisEquivalentes,
  referenciaPassagemCompleta,
  montarTranslitTokenHebraico,
} from '../utils/strongTokenHelpers'
import { fontFamilyStrongPassagem, sxHebrewVocalizado } from '../utils/hebrewDisplay'
import { livros as livrosData } from '../data/biblia'
import { buscarIntervaloVersiculos } from '../services/bibliaService'
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
      const he = formatarTextoMorphHb(String(t.text || '')).trim()
      if (!he) return null
      const strong = String(t.strong_code || '').trim()
      const lex = xlitMap[strong]
      const { translit } = montarTranslitTokenHebraico(he, {
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
    itemBg: dark ? 'rgba(255,255,255,0.06)' : '#f4f4f6',
    itemBorder: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
    heroScript: dark ? '#fff' : '#111',
    noteBg: '#ffffff',
    noteText: '#1a1a1a',
    noteBorder: 'rgba(0,0,0,0.12)',
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
            const he = formatarTextoMorphHb(String(t.text || '')).trim()
            if (!he) return null
            const strong = String(t.strong_code || '').trim()
            const lex = xlitMap[strong]
            const { translit: tr } = montarTranslitTokenHebraico(he, {
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
                  const match = popup.alvo && texto === popup.alvo
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
                    const match = popup.alvo && texto === popup.alvo
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

export function BarraTokenPassagem({ tokenTexto, ehGrego, detalhe, tokenRef }) {
  const fontSerifLexico = fontFamilyStrongPassagem(ehGrego)
  const p = useStrongDictPalette()
  const textoLimpo = limparTextoTokenPassagem(tokenTexto)
  const textoExibicao = ehGrego ? textoLimpo : formatarTextoMorphHb(textoLimpo)
  const refPassagem = formatarReferenciaPassagemToken(tokenRef)
  const mesmaFormaQueLema = formasLexicaisEquivalentes(textoExibicao, detalhe?.greek_unicode)
  const { translit, fonetica, linha } = montarLeituraToken(textoLimpo, ehGrego, {
    lemmaUnicode: detalhe?.greek_unicode,
    lemmaTranslit: detalhe?.greek_translit,
    lemmaPron: detalhe?.pronunciation,
  })

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.15,
        borderRadius: 2.5,
        bgcolor: p.itemBg,
        border: '1px solid',
        borderColor: p.itemBorder,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
      }}
    >
      {!!refPassagem && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap' }}>
          <Typography component="span" sx={{ fontSize: '0.9rem', color: p.label, fontWeight: 600 }}>
            Passagem:{' '}
          </Typography>
          <Typography
            component="span"
            sx={{ fontSize: '0.9rem', color: 'text.primary', fontWeight: 700 }}
          >
            {refPassagem}
          </Typography>
          <BotaoOuvirVersiculo tokenRef={tokenRef} ehGrego={ehGrego} />
        </Box>
      )}

      <Typography
        component="h2"
        sx={{
          m: 0,
          pt: 0.2,
          pb: 0.25,
          textAlign: 'center',
          fontWeight: 700,
          fontSize: { xs: '1.02rem', sm: '1.08rem' },
          color: 'text.primary',
          letterSpacing: 0.2,
        }}
      >
        Significado Original
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 0.5,
          rowGap: 0.35,
          direction: 'ltr',
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: '0.9rem',
            color: p.label,
            fontWeight: 600,
            direction: 'ltr',
            unicodeBidi: 'isolate',
          }}
        >
          Token:
        </Typography>
        <Typography
          component="span"
          className={ehGrego ? undefined : 'hebrew-vocalizado'}
          sx={{
            ...(ehGrego
              ? { fontFamily: fontSerifLexico, fontWeight: 800, direction: 'ltr', unicodeBidi: 'plaintext' }
              : { ...sxHebrewVocalizado, fontSize: { xs: '1.85rem', sm: '2.1rem' } }),
            fontWeight: ehGrego ? 800 : 400,
            lineHeight: 1.15,
            color: 'text.primary',
          }}
        >
          {textoExibicao}
        </Typography>
        {!!linha && (
          <>
            <Typography
              component="span"
              sx={{ color: p.label, fontWeight: 600, mx: 0.15, direction: 'ltr', unicodeBidi: 'isolate' }}
            >
              &gt;&gt;
            </Typography>
            <Box
              component="span"
              sx={{
                fontStyle: 'italic',
                color: 'text.primary',
                fontSize: { xs: '1rem', sm: '1.08rem' },
                direction: 'ltr',
              }}
            >
              {translit}
              {!!fonetica && translit !== fonetica && (
                <>
                  <Box component="span" sx={{ fontStyle: 'normal', color: p.label, mx: 0.5 }}>
                    |
                  </Box>
                  {fonetica}
                </>
              )}
            </Box>
          </>
        )}
        <Box sx={{ display: 'inline-flex', alignItems: 'center', direction: 'ltr' }}>
          {/* Removido: áudio do token (forma exata). Mantemos só o áudio do versículo. */}
        </Box>
      </Box>

      {!refPassagem && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BotaoOuvirVersiculo tokenRef={tokenRef} ehGrego={ehGrego} />
        </Box>
      )}

      {!ehGrego && !mesmaFormaQueLema && (
        <Typography component="p" sx={{ m: 0, fontSize: '0.75rem', color: p.label, lineHeight: 1.35 }}>
          Forma na passagem (pode incluir prefixo ou flexão). O <em>lemma</em> abaixo é a entrada do dicionário Strong.
        </Typography>
      )}
    </Box>
  )
}

export default function StrongVerbeteApresentacao({
  detalhe,
  code,
  ehGrego,
  traduzirStrongPtBr,
  sxTextoLeitura,
  token,
  bdbDetalhe,
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

  const definicao =
    traduzirStrongPtBr
      ? detalhe.definition_pt || detalhe.definition || montarDefinicaoExibicao(detalhe)
      : detalhe.definition_original || montarDefinicaoExibicao(detalhe)

  const pronuncia = String(detalhe.pronunciation || '').trim()
  const posLabel = detalhe.lexicalIndex?.find((li) => li?.pos)?.pos || ''

  const usosPt = [
    ...new Set(
      (detalhe.lexicalIndex || []).flatMap((li) => {
        const raw = String(
          traduzirStrongPtBr ? li.short_def_pt || li.short_def : li.short_def_original || li.short_def || ''
        ).trim()
        if (!raw) return []
        return raw.split(/[;|]/).map((p) => p.trim()).filter(Boolean)
      })
    ),
  ]

  const derivacaoRaw = traduzirStrongPtBr
    ? String(detalhe.derivation_pt || detalhe.derivation || detalhe.derivation_original || '').trim()
    : String(detalhe.derivation_original || detalhe.derivation || '').trim()

  const codigosDerivacao = derivacaoRaw ? renderSomenteCodigosDerivacao(derivacaoRaw) : null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

      {/* Card do lema (entrada Strong) */}
      <ItemCaixa sx={{ py: 1.75 }}>
        <Typography
          sx={{
            m: 0,
            mb: 0.75,
            fontSize: '0.78rem',
            color: p.label,
            fontWeight: 500,
          }}
        >
          Lemma:
        </Typography>

        <Typography
          component="p"
          className={ehGrego ? undefined : 'hebrew-vocalizado'}
          sx={{
            m: 0,
            mb: detalhe.greek_translit ? 0.35 : 1,
            ...(ehGrego
              ? { fontFamily: fontSerifLexico, fontWeight: 800, fontSize: { xs: '2rem', sm: '2.35rem' } }
              : { ...sxHebrewVocalizado, fontSize: { xs: '2rem', sm: '2.35rem' } }),
            lineHeight: 1.15,
            color: p.heroScript,
            wordBreak: 'break-word',
          }}
        >
          {detalhe.greek_unicode || '—'}
        </Typography>

        {!!detalhe.greek_translit && (
          <Typography
            sx={{
              m: 0,
              mb: pronuncia ? 0.35 : 1.25,
              fontStyle: 'italic',
              fontSize: { xs: '1.05rem', sm: '1.15rem' },
              color: 'text.primary',
            }}
          >
            {detalhe.greek_translit}
          </Typography>
        )}

        {(!!pronuncia || !!(detalhe.greek_unicode || detalhe.greek_translit)) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 1.25, flexWrap: 'wrap' }}>
            {!!pronuncia && (
              <Typography
                sx={{
                  m: 0,
                  fontStyle: 'italic',
                  fontSize: '0.98rem',
                  color: 'text.primary',
                }}
              >
                {pronuncia}
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: definicao ? 1.5 : 0 }}>
          <ChipMeta label={detalhe.strong || code} />
          <ChipMeta label={ehGrego ? 'Grego' : 'Hebraico'} icon={<StarOutline />} />
          {!!posLabel && <ChipMeta label={posLabel} />}
        </Box>

        {!!definicao && (
          <Box>
            <SecaoRotulo>Definição</SecaoRotulo>
            <Typography variant="body1" sx={{ ...sxTextoLeitura, color: 'text.primary', lineHeight: 1.65, m: 0 }}>
              {definicao}
            </Typography>
          </Box>
        )}
      </ItemCaixa>

      {!!codigosDerivacao && (
        <Box>
          <SecaoRotulo>Referências Strong relacionadas</SecaoRotulo>
          <Typography variant="body1" sx={{ ...sxTextoLeitura, color: 'text.secondary' }}>
            {codigosDerivacao}
          </Typography>
        </Box>
      )}

      {!!usosPt.length && (
        <Box>
          <SecaoRotulo>Uso em português</SecaoRotulo>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {usosPt.map((uso, idx) => (
              <ItemCaixa key={`uso-${idx}`}>
                <Typography sx={{ ...sxTextoLeitura, color: 'text.primary', m: 0 }}>
                  {uso}
                </Typography>
              </ItemCaixa>
            ))}
          </Box>
        </Box>
      )}

      {!!detalhe.lexicalIndex?.length && (
        <Box>
          <SecaoRotulo>Índice lexical (acadêmico)</SecaoRotulo>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {detalhe.lexicalIndex.map((li) => (
              <ItemCaixa key={`${li.entry_id}-${li.bdb || ''}-${li.twot || ''}`}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: 'text.primary', mb: 0.35, ...sxTextoLeitura }}
                >
                  {[li.entry_id, li.pos].filter(Boolean).join(' · ') || '—'}
                </Typography>
                {(li.bdb || li.twot) && (
                  <Typography variant="body2" component="div" sx={{ color: 'text.secondary', ...sxTextoLeitura }}>
                    {li.bdb ? `BDB ${li.bdb}` : ''}
                    {li.bdb && li.twot ? ' · ' : ''}
                    {li.twot && (
                      <Box
                        component="a"
                        href={montarTwotPesquisaUrl(li.twot)}
                        target="_blank"
                        rel="noreferrer"
                        sx={{
                          color: 'primary.main',
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px',
                          fontWeight: 600,
                        }}
                      >
                        {`TWOT ${li.twot}`}
                      </Box>
                    )}
                  </Typography>
                )}
                {(traduzirStrongPtBr ? li.short_def_pt || li.short_def : li.short_def_original || li.short_def) && (
                  <Typography variant="body2" sx={{ mt: 0.5, color: 'text.primary', ...sxTextoLeitura }}>
                    {traduzirStrongPtBr ? li.short_def_pt || li.short_def : li.short_def_original || li.short_def}
                  </Typography>
                )}
              </ItemCaixa>
            ))}
          </Box>
        </Box>
      )}

      {(bdbDetalhe.loading || bdbDetalhe.entry) && (
        <Box>
          <SecaoRotulo>BDB {bdbDetalhe.code ? `(${bdbDetalhe.code})` : ''}</SecaoRotulo>
          {bdbDetalhe.loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Carregando verbete BDB…
              </Typography>
            </Box>
          ) : (
            <ItemCaixa>
              <Typography variant="body1" sx={{ ...sxTextoLeitura, color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                {String(
                  (traduzirStrongPtBr
                    ? bdbDetalhe.entry.content_text_pt ||
                      bdbDetalhe.entry.content_text ||
                      bdbDetalhe.entry.content_text_original
                    : bdbDetalhe.entry.content_text_original ||
                      bdbDetalhe.entry.content_text_pt ||
                      bdbDetalhe.entry.content_text) || ''
                )}
              </Typography>
            </ItemCaixa>
          )}
        </Box>
      )}

      <Box>
        <SecaoRotulo>STEPBible</SecaoRotulo>
        {!!detalhe.stepBibleEntries?.length ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {detalhe.stepBibleEntries.map((e, idx) => {
              const glossEn = limparTextoStepBible(e.gloss_original || e.gloss || '')
              const glossPt = limparTextoStepBible(e.gloss_pt || '')
              const glossLinha = traduzirStrongPtBr ? glossPt || glossEn : glossEn
              const definicaoPt = limparTextoStepBible(e.definition_pt || e.definition_original || '')
              const definicaoEn = limparTextoStepBible(e.definition_clean || e.definition || '')
              const definicaoSb = traduzirStrongPtBr ? definicaoPt || definicaoEn : definicaoEn
              return (
                <ItemCaixa key={`${e.source}-${e.strongs_extended}-${idx}`}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, ...sxTextoLeitura }}
                  >
                    {String(e.source || '').replace('stepbible-', '').toUpperCase()}
                  </Typography>
                  {!!glossLinha && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.35, ...sxTextoLeitura }}>
                      {glossLinha}
                    </Typography>
                  )}
                  {!!definicaoSb && (
                    <Typography variant="body2" sx={{ color: 'text.primary', ...sxTextoLeitura }}>
                      {definicaoSb}
                    </Typography>
                  )}
                </ItemCaixa>
              )
            })}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={sxTextoLeitura}>
            Nenhum conteúdo STEPBible disponível para este verbete.
          </Typography>
        )}
      </Box>

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
