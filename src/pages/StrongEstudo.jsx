import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Button,
  Container,
  useTheme,
  Tooltip,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery
} from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import AutoAwesome from '@mui/icons-material/AutoAwesome'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import NavigateNext from '@mui/icons-material/NavigateNext'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { buscarBdbHebraico, buscarOcorrenciasStrongHebraico, buscarTokensOt } from '../services/otStrongService'
import { buscarOcorrenciasStrongGrego, buscarTokensNt } from '../services/ntStrongProvaService'
import { buscarIntervaloVersiculos } from '../services/bibliaService'
import { verificarBancoStepBible } from '../services/stepBibleLexiconService'
import { verificarBancoLexiconPtBr } from '../services/lexiconPtBrService'
import { carregarDetalheStrong } from '../services/carregarDetalheStrong'
import { limparTextoStepBible, montarDefinicaoExibicao, montarTwotPesquisaUrl } from '../utils/strongEstudoHelpers'
import { iaGeminiDisponivel, gerarResumoStrongGemini } from '../services/strongEstudoAiService'
import { limparResumoLexicalParaExibicao } from '../utils/strongEstudoHelpers'
import { useApp } from '../contexts/AppContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { saveStrongNote, subscribeStrongNote } from '../services/strongNotesCloudService'
import { livros as livrosData } from '../data/biblia'
import StrongLexiconAttributions from '../components/StrongLexiconAttributions'
import { strongResumoIaStorageKey } from '../utils/strongResumoIaStorage'
import { strongEvalPendingKey } from '../utils/strongResumoEvaluacao'
import { obterResumoStrongPublicadoPorCodigo } from '../services/strongResumoShareService'

let stepBibleDisponivelCachePromise = null
let lexiconPtBrDisponivelCachePromise = null

function obterStepBibleDisponivel() {
  if (!stepBibleDisponivelCachePromise) {
    stepBibleDisponivelCachePromise = verificarBancoStepBible().catch(() => false)
  }
  return stepBibleDisponivelCachePromise
}

function obterLexiconPtBrDisponivel() {
  if (!lexiconPtBrDisponivelCachePromise) {
    lexiconPtBrDisponivelCachePromise = verificarBancoLexiconPtBr().catch(() => false)
  }
  return lexiconPtBrDisponivelCachePromise
}

function StrongEstudo() {
  const theme = useTheme()
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const rawCode = params.code || ''
  const code = decodeURIComponent(String(rawCode || '')).trim().toUpperCase()
  const token = location.state?.token || null

  const [detalhe, setDetalhe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [traduzirStrongPtBr, setTraduzirStrongPtBr] = useState(true)
  const [bdbDetalhe, setBdbDetalhe] = useState({ code: '', loading: false, entry: null })
  const [aiResumo, setAiResumo] = useState({ status: 'idle', text: '', error: '' })
  const [historicoStrong, setHistoricoStrong] = useState([])
  const [historicoStrongIdx, setHistoricoStrongIdx] = useState(-1)
  const [notaTexto, setNotaTexto] = useState('')
  const [notaStatus, setNotaStatus] = useState('')
  const [ocorrencias, setOcorrencias] = useState([])
  const [ocorrenciasLoading, setOcorrenciasLoading] = useState(false)
  const [ocorrenciasLimite, setOcorrenciasLimite] = useState(5)
  const [ocorrenciaDialog, setOcorrenciaDialog] = useState({
    open: false,
    loading: false,
    idx: -1,
    item: null,
    original: '',
    traducao: ''
  })

  const { fontSize, fontFamily, textAlign, lineHeight } = useApp()
  const { user } = useFirebaseAuth()
  const ehGrego = code.startsWith('G')
  const sxTextoLeitura = useMemo(
    () => ({
      fontSize: `${(fontSize || 100) / 100}rem`,
      fontFamily: resolveFontFamily(fontFamily),
      textAlign: textAlign || 'left',
      lineHeight: readingLineHeightToCss(lineHeight)
    }),
    [fontSize, fontFamily, textAlign, lineHeight]
  )

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setDetalhe(null)

      // 1ª fase (paint inicial): Strong base + dicionário pt-BR.
      // O lexiconPtBr é um singleton SQLite em memória após a primeira abertura
      // (cache controlado por `lexiconPtBrService`), então em palavras seguintes
      // esta espera é praticamente instantânea. Com isto evitamos o efeito de
      // “piscar” a definição em inglês antes de carregar a versão portuguesa
      // — o usuário sempre vê pt-BR primeiro.
      const ptLex = await obterLexiconPtBrDisponivel()
      if (!active) return
      const { detalhe: rapido } = await carregarDetalheStrong(code, {
        stepBibleDisponivel: false,
        lexiconPtBrDisponivel: ptLex
      }).catch(() => ({ detalhe: null }))
      if (!active) return
      if (rapido) {
        setDetalhe(rapido)
        setLoading(false)
      } else if (token?.strong_code) {
        const sc = String(token.strong_code || '').trim().toUpperCase()
        if (sc === code) {
          setDetalhe({
            strong: code,
            greek_unicode: token.text || '',
            greek_translit: token.lemma_raw || '',
            definition: token.morph
              ? `Dados lexicais indisponíveis para ${code}. Morfologia: ${token.morph}`
              : `Dados lexicais indisponíveis para ${code}.`,
            derivation: token.morph || ''
          })
          setLoading(false)
        }
      }

      // 2ª fase: enriquece com StepBible (ocorrências/glosas adicionais).
      const step = await obterStepBibleDisponivel()
      if (!active) return
      const { detalhe: completo } = await carregarDetalheStrong(code, {
        stepBibleDisponivel: step,
        lexiconPtBrDisponivel: ptLex
      }).catch(() => ({ detalhe: null }))
      if (!active) return
      if (completo) setDetalhe(completo)
      if (!rapido) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [code, token])

  useEffect(() => {
    setAiResumo({ status: 'idle', text: '', error: '' })
  }, [code])

  useEffect(() => {
    setOcorrencias([])
    setOcorrenciasLoading(false)
    setOcorrenciasLimite(5)
    setOcorrenciaDialog({ open: false, loading: false, idx: -1, item: null, original: '', traducao: '' })
  }, [code])

  useEffect(() => {
    if (!code) return
    setHistoricoStrong((prev) => {
      if (!prev.length) {
        setHistoricoStrongIdx(0)
        return [code]
      }
      if (prev[prev.length - 1] === code) {
        setHistoricoStrongIdx(prev.length - 1)
        return prev
      }
      const found = prev.lastIndexOf(code)
      if (found >= 0) {
        setHistoricoStrongIdx(found)
        return prev
      }
      const next = [...prev, code].slice(-60)
      setHistoricoStrongIdx(next.length - 1)
      return next
    })
  }, [code])

  useEffect(() => {
    setNotaTexto('')
    setNotaStatus('')
    if (!user?.uid || !code) return
    return subscribeStrongNote(user.uid, code, ({ text }) => {
      setNotaTexto(text || '')
    })
  }, [user?.uid, code])

  const abrirBdbLocal = useCallback(async (bdbCode) => {
    const raw = String(bdbCode || '').replace(/^bdb\s+/i, '').trim()
    const cod = (raw.split(/[;,/|]/).map((p) => p.trim()).filter(Boolean)[0] || raw)
      .replace(/[;,:.\s]+$/g, '')
      .trim()
    if (!cod) return
    setBdbDetalhe({ code: cod, loading: true, entry: null })
    try {
      const entry = await buscarBdbHebraico(cod)
      setBdbDetalhe({ code: cod, loading: false, entry: entry || null })
    } catch {
      setBdbDetalhe({ code: cod, loading: false, entry: null })
    }
  }, [])

  useEffect(() => {
    const bdbInicial = String(
      detalhe?.lexicalIndex?.find((li) => li?.bdb && String(li.bdb).trim())?.bdb || ''
    ).trim()
    if (!bdbInicial) {
      setBdbDetalhe({ code: '', loading: false, entry: null })
      return
    }
    void abrirBdbLocal(bdbInicial)
  }, [detalhe, abrirBdbLocal])

  const irParaStrong = useCallback(
    (nextCode) => {
      const c = String(nextCode || '').trim().toUpperCase()
      if (!c) return
      navigate(`/estudo-strong/${encodeURIComponent(c)}`, { state: { token: null } })
    },
    [navigate]
  )

  const renderSomenteCodigosDerivacao = (texto) => {
    const raw = String(texto || '')
    if (!raw) return null
    const matches = [...raw.matchAll(/\b([HG]\d+|\d{1,5})\b/g)].map((m) => m[1])
    if (!matches.length) return null
    const isNT = ehGrego
    return matches.map((tok, idx) => {
      const resolved = /^[HG]\d+$/i.test(tok) ? tok.toUpperCase() : `${isNT ? 'G' : 'H'}${Number(tok)}`
      return (
        <React.Fragment key={`only-code-${idx}-${tok}`}>
          {idx > 0 ? ', ' : ''}
          <Box
            component="span"
            onClick={() => irParaStrong(resolved)}
            sx={{
              cursor: 'pointer',
              color: 'primary.main',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              fontWeight: 600
            }}
          >
            {tok}
          </Box>
        </React.Fragment>
      )
    })
  }

  const voltar = () => {
    if (location.state?.fromResumo) {
      navigate('/biblia')
      return
    }
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  const navegarHistoricoStrong = (delta) => {
    const targetIdx = historicoStrongIdx + delta
    if (targetIdx < 0 || targetIdx >= historicoStrong.length) return
    const targetCode = historicoStrong[targetIdx]
    if (!targetCode) return
    setHistoricoStrongIdx(targetIdx)
    navigate(`/estudo-strong/${encodeURIComponent(targetCode)}`, { state: { token: null } })
  }

  const handleAbrirResumo = async () => {
    if (!detalhe) return
    setAiResumo((prev) => ({ ...prev, status: 'loading', error: '' }))
    const publicado = await obterResumoStrongPublicadoPorCodigo(code).catch(() => null)
    if (publicado?.id && publicado?.resumo) {
      const resumoLimpo = limparResumoLexicalParaExibicao(publicado.resumo)
      try {
        sessionStorage.setItem(strongResumoIaStorageKey(code), resumoLimpo)
      } catch {
        /* ignore quota / modo privado */
      }
      setAiResumo({ status: 'idle', text: '', error: '' })
      navigate(`/estudo-strong/${encodeURIComponent(code)}/resumo?rid=${encodeURIComponent(publicado.id)}`, {
        state: { resumoIa: resumoLimpo }
      })
      return
    }
    if (!iaGeminiDisponivel()) {
      setAiResumo({
        status: 'error',
        text: '',
        error:
          'Ainda não há resumo publicado para este verbete e a IA não está configurada (chaves Gemini no .env).'
      })
      return
    }
    const r = await gerarResumoStrongGemini({ detalhe, traduzirStrongPtBr, token })
    if (r.ok && r.text) {
      try {
        sessionStorage.setItem(strongResumoIaStorageKey(code), r.text)
        sessionStorage.setItem(strongEvalPendingKey(code), '1')
      } catch {
        /* ignore quota / modo privado */
      }
      setAiResumo({ status: 'idle', text: '', error: '' })
      navigate(`/estudo-strong/${encodeURIComponent(code)}/resumo`, {
        state: { resumoIa: r.text, avaliacaoNecessaria: true }
      })
    } else setAiResumo({ status: 'error', text: '', error: r.error || 'Não foi possível gerar o resumo.' })
  }

  const salvarNota = () => {
    if (!user?.uid) return
    saveStrongNote(user.uid, code, notaTexto)
      .then(() => {
        setNotaStatus(String(notaTexto || '').trim() ? 'Anotação salva na nuvem.' : 'Anotação limpa na nuvem.')
      })
      .catch(() => {
        setNotaStatus('Não foi possível salvar agora. Tente novamente.')
      })
  }

  const significadoPtAlvo = useMemo(() => {
    const best =
      detalhe?.lexicalIndex?.find((li) => li?.short_def_pt && String(li.short_def_pt).trim())?.short_def_pt ||
      detalhe?.lexicalIndex?.find((li) => li?.short_def && String(li.short_def).trim())?.short_def ||
      detalhe?.definition_pt ||
      detalhe?.definition ||
      ''
    return String(best || '')
      .split(/[;|]/)[0]
      .trim()
  }, [detalhe])

  useEffect(() => {
    if (!code) return
    let active = true
    setOcorrenciasLoading(true)
    const req = code.startsWith('H')
      ? buscarOcorrenciasStrongHebraico(code, 20)
      : buscarOcorrenciasStrongGrego(code, 20)
    req
      .then((rows) => {
        if (!active) return
        setOcorrencias(rows || [])
      })
      .catch(() => {
        if (!active) return
        setOcorrencias([])
      })
      .finally(() => {
        if (active) setOcorrenciasLoading(false)
      })
    return () => {
      active = false
    }
  }, [code])

  const escaparRegExp = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const marcarTexto = (texto, termo) => {
    const raw = String(texto || '')
    const t = String(termo || '').trim()
    if (!raw || !t) return raw
    const regex = new RegExp(`(${escaparRegExp(t)})`, 'gi')
    const parts = raw.split(regex)
    return parts.map((p, idx) =>
      p.toLowerCase() === t.toLowerCase() ? (
        <Box key={`hl-${idx}`} component="mark" sx={{ bgcolor: '#f7d84b', color: '#111', px: 0.1 }}>
          {p}
        </Box>
      ) : (
        <React.Fragment key={`tx-${idx}`}>{p}</React.Fragment>
      )
    )
  }

  const abrirOcorrencia = async (item, idx = -1) => {
    if (!item) return
    setOcorrenciaDialog({ open: true, loading: true, idx, item, original: '', traducao: '' })
    try {
      const [versosPt, tokensOrig] = await Promise.all([
        buscarIntervaloVersiculos(item.livroId, item.capitulo, item.versiculo, item.versiculo),
        code.startsWith('H')
          ? buscarTokensOt(item.livroId, item.capitulo, item.versiculo)
          : buscarTokensNt(item.bookNum, item.capitulo, item.versiculo)
      ])
      const traducao = String(versosPt?.versiculos?.[0]?.texto || versosPt?.[0]?.texto || '')
      const original = (tokensOrig || []).map((t) => String(t.text || '').trim()).filter(Boolean).join(' ')
      setOcorrenciaDialog({ open: true, loading: false, idx, item, original, traducao })
    } catch {
      setOcorrenciaDialog((prev) => ({ ...prev, loading: false }))
    }
  }

  const navegarOcorrencia = (delta) => {
    const nextIdx = Number(ocorrenciaDialog.idx) + Number(delta)
    if (nextIdx < 0 || nextIdx >= ocorrencias.length) return
    void abrirOcorrencia(ocorrencias[nextIdx], nextIdx)
  }

  return (
    <Box sx={{ bgcolor: 'background.default', pb: 8, touchAction: 'pan-y' }}>
      <Container maxWidth="sm" sx={{ pt: 2, pb: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 0.5, mb: 1, rowGap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <IconButton
              onClick={voltar}
              aria-label="voltar"
              size="small"
              sx={{ color: 'primary.main', border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}
            >
              <ArrowBack />
            </IconButton>
            <Tooltip title="Verbete Strong anterior nesta sessão" placement="bottom">
              <span>
                <IconButton
                  size="small"
                  onClick={() => navegarHistoricoStrong(-1)}
                  disabled={historicoStrongIdx <= 0}
                  aria-label="referência anterior"
                  sx={{ color: 'primary.main', border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}
                >
                  <NavigateBefore fontSize="medium" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Próximo verbete Strong nesta sessão" placement="bottom">
              <span>
                <IconButton
                  size="small"
                  onClick={() => navegarHistoricoStrong(1)}
                  disabled={historicoStrongIdx < 0 || historicoStrongIdx >= historicoStrong.length - 1}
                  aria-label="próxima referência"
                  sx={{ color: 'primary.main', border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}
                >
                  <NavigateNext fontSize="medium" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minWidth: 0,
              px: 0.25
            }}
          >
            <Button
              variant="outlined"
              size="small"
              color="primary"
              aria-label="Resumo lexical"
              startIcon={
                aiResumo.status === 'loading' ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AutoAwesome fontSize="small" />
                )
              }
              onClick={() => void handleAbrirResumo()}
              disabled={aiResumo.status === 'loading' || !detalhe}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                px: { xs: 0.75, sm: 1.25 },
                fontSize: { xs: '0.7rem', sm: '0.8125rem' }
              }}
            >
              {aiResumo.status === 'loading' ? 'Abrindo…' : 'Resumo'}
            </Button>
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            <Button
              size="small"
              variant={traduzirStrongPtBr ? 'outlined' : 'contained'}
              onClick={() => setTraduzirStrongPtBr((v) => !v)}
              sx={{ minWidth: 42, px: 1.1, textTransform: 'lowercase', fontWeight: 700 }}
            >
              en
            </Button>
          </Box>
        </Box>

        {aiResumo.status === 'error' && !!aiResumo.error && (
          <Alert
            severity="warning"
            sx={{ mb: 1.25 }}
            onClose={() => setAiResumo({ status: 'idle', text: '', error: '' })}
          >
            {aiResumo.error}
          </Alert>
        )}

        {token && (
          <Typography variant="body2" sx={{ mb: 1.25, ...sxTextoLeitura }}>
            Token: <strong>{token.text || '-'}</strong>{' '}
            {token.lemma ? `| Lemma: ${token.lemma}` : token.lemma_raw ? `| Lemma: ${token.lemma_raw}` : ''}
          </Typography>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && !detalhe && (
          <Typography color="text.secondary">Verbete não encontrado para {code}.</Typography>
        )}

        {!loading && detalhe && (
          <Box sx={{ mt: 1, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 0.8, fontWeight: 700 }}>
              {detalhe.strong} — {detalhe.greek_unicode || '-'}
            </Typography>
            {detalhe.greek_translit && (
              <Typography variant="body2" sx={{ mb: 0.5, ...sxTextoLeitura }}>
                Transliteração: {detalhe.greek_translit}
              </Typography>
            )}
            {montarDefinicaoExibicao(detalhe) && (
              <Typography variant="body2" sx={{ mb: 0.5, ...sxTextoLeitura }}>
                Definição:{' '}
                {traduzirStrongPtBr
                  ? detalhe.definition_pt || detalhe.definition || montarDefinicaoExibicao(detalhe)
                  : detalhe.definition_original || montarDefinicaoExibicao(detalhe)}
              </Typography>
            )}
            {String(detalhe?.derivation_pt || detalhe?.derivation_original || detalhe?.derivation || '').trim() && (
              <>
                {(() => {
                  const notasRefs = traduzirStrongPtBr
                    ? String(detalhe.derivation_pt || detalhe.derivation || detalhe.derivation_original || '').trim()
                    : String(detalhe.derivation_original || detalhe.derivation || '').trim()
                  const codigos = renderSomenteCodigosDerivacao(notasRefs)
                  if (!codigos) return null
                  return (
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.25, ...sxTextoLeitura }}>
                      Referências: {codigos}
                    </Typography>
                  )
                })()}
              </>
            )}

            {!!detalhe.lexicalIndex?.length && (
              <Box sx={{ mt: 1, pt: 0.75, borderTop: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.4 }}>
                  Índice Lexical (acadêmico)
                </Typography>
                {detalhe.lexicalIndex.map((li) => (
                  <Typography key={`${li.entry_id}-${li.bdb || ''}-${li.twot || ''}`} variant="body2" color="text.secondary" sx={{ mb: 0.25, ...sxTextoLeitura }}>
                    {li.entry_id ? `${li.entry_id}` : '—'}
                    {li.pos ? ` · ${li.pos}` : ''}
                    {li.bdb ? ` · ${li.bdb}` : ''}
                    {li.twot && (
                      <>
                        {' · '}
                        <Box
                          component="a"
                          href={montarTwotPesquisaUrl(li.twot)}
                          target="_blank"
                          rel="noreferrer"
                          sx={{ color: 'primary.main', textDecoration: 'underline', textUnderlineOffset: '2px', fontWeight: 600 }}
                        >
                          {`TWOT ${li.twot}`}
                        </Box>
                      </>
                    )}
                    {(traduzirStrongPtBr ? li.short_def_pt || li.short_def : li.short_def_original || li.short_def)
                      ? ` · ${traduzirStrongPtBr ? li.short_def_pt || li.short_def : li.short_def_original || li.short_def}`
                      : ''}
                  </Typography>
                ))}
              </Box>
            )}

            {(bdbDetalhe.loading || bdbDetalhe.entry) && (
              <Box sx={{ mt: 1, p: 0.8, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : undefined }}>
                <Typography variant="subtitle2" sx={{ mb: 0.45 }}>
                  BDB {bdbDetalhe.code ? `(${bdbDetalhe.code})` : ''}
                </Typography>
                {bdbDetalhe.loading && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ...sxTextoLeitura }}>
                    Carregando verbete BDB...
                  </Typography>
                )}
                {!bdbDetalhe.loading && !!bdbDetalhe.entry && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ...sxTextoLeitura }}>
                    {String(
                      (traduzirStrongPtBr
                        ? bdbDetalhe.entry.content_text_pt || bdbDetalhe.entry.content_text || bdbDetalhe.entry.content_text_original
                        : bdbDetalhe.entry.content_text_original || bdbDetalhe.entry.content_text_pt || bdbDetalhe.entry.content_text) || ''
                    )}
                  </Typography>
                )}
              </Box>
            )}

            <Box sx={{ mt: 1, p: 0.8, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.45 }}>
                STEPBible
              </Typography>
              {!!detalhe.stepBibleEntries?.length ? (
                detalhe.stepBibleEntries.map((e, idx) => (
                  <Typography key={`${e.source}-${e.strongs_extended}-${idx}`} variant="body2" color="text.secondary" sx={{ mb: 0.45, ...sxTextoLeitura }}>
                    <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {`${String(e.source || '').replace('stepbible-', '').toUpperCase()}: `}
                    </Box>
                    {(() => {
                      const glossEn = limparTextoStepBible(e.gloss_original || e.gloss || '')
                      const glossPt = limparTextoStepBible(e.gloss_pt || '')
                      const glossLinha = traduzirStrongPtBr ? glossPt || glossEn : glossEn
                      return glossLinha ? `${glossLinha} · ` : ''
                    })()}
                    {(() => {
                      const definicaoPt = limparTextoStepBible(e.definition_pt || e.definition_original || '')
                      const definicaoEn = limparTextoStepBible(e.definition_clean || e.definition || '')
                      return traduzirStrongPtBr ? definicaoPt || definicaoEn : definicaoEn
                    })()}
                  </Typography>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={sxTextoLeitura}>
                  Nenhum conteúdo STEPBible disponível para este verbete.
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: 1.2, p: 0.8, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.6 }}>
                Anotação deste verbete ({code})
              </Typography>
              {!user?.uid ? (
                <Alert
                  severity="info"
                  action={
                    <Button size="small" variant="outlined" onClick={() => navigate('/chat')}>
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
                    minRows={3}
                    value={notaTexto}
                    onChange={(e) => setNotaTexto(e.target.value)}
                    placeholder="Escreva observações sobre esta palavra (contexto, aplicações, dúvidas, etc.)"
                  />
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                    <Button size="small" variant="contained" onClick={salvarNota}>
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

            <Box sx={{ mt: 1.2, p: 1.2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Ocorrências em outros textos
              </Typography>
              {ocorrenciasLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">Buscando ocorrências...</Typography>
                </Box>
              )}
              {!ocorrenciasLoading && ocorrencias.slice(0, ocorrenciasLimite).map((r, idx) => (
                <Box key={`occ-${idx}`} sx={{ mb: 0.65 }}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => void abrirOcorrencia(r, idx)}
                    sx={{ px: 0, textTransform: 'none', ...sxTextoLeitura }}
                  >
                    {`${livrosData.find((l) => Number(l.id) === Number(r.livroId))?.nome || 'Livro'} ${r.capitulo}:${r.versiculo}`}
                  </Button>
                </Box>
              ))}
              {!ocorrenciasLoading && ocorrencias.length > ocorrenciasLimite && (
                <Button size="small" variant="outlined" onClick={() => setOcorrenciasLimite((n) => n + 5)}>
                  Ver mais
                </Button>
              )}
              {!ocorrenciasLoading && !ocorrencias.length && (
                <Typography variant="body2" color="text.secondary">
                  Não encontramos ocorrências para este código no texto original.
                </Typography>
              )}
            </Box>
          </Box>
        )}

        <StrongLexiconAttributions />
      </Container>
      <Dialog
        open={ocorrenciaDialog.open}
        onClose={() => setOcorrenciaDialog({ open: false, loading: false, idx: -1, item: null, original: '', traducao: '' })}
        fullWidth
        maxWidth="md"
        fullScreen={fullScreenDialog}
      >
        <DialogTitle>
          {(() => {
            const it = ocorrenciaDialog.item
            if (!it) return 'Ocorrência detalhada'
            const livro = livrosData.find((l) => Number(l.id) === Number(it.livroId))?.nome || 'Livro'
            const pos = ocorrenciaDialog.idx >= 0 ? ocorrenciaDialog.idx + 1 : 0
            const total = ocorrencias.length
            return `${livro} ${it.capitulo}:${it.versiculo} ${pos > 0 && total > 0 ? `· ${pos}/${total}` : ''}`
          })()}
          {!!significadoPtAlvo && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.4, fontSize: '1rem' }}
            >
              "{significadoPtAlvo}"
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: { xs: '42vh', sm: '52vh' } }}>
          {ocorrenciaDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
              <CircularProgress size={22} />
            </Box>
          ) : (
            <>
              <Typography variant="subtitle2" sx={{ mb: 0.6 }}>
                Original
              </Typography>
              <Typography variant="body2" sx={{ mb: 1.1, ...sxTextoLeitura }}>
                {marcarTexto(ocorrenciaDialog.original, String(ocorrenciaDialog.item?.tokenOriginal || '').trim())}
              </Typography>
              <Typography variant="subtitle2" sx={{ mb: 0.6 }}>
                Tradução
              </Typography>
              <Typography variant="body2" sx={{ ...sxTextoLeitura }}>
                {marcarTexto(
                  ocorrenciaDialog.traducao,
                  String(
                    detalhe?.lexicalIndex?.find((li) => li?.short_def_pt || li?.short_def)?.short_def_pt ||
                    detalhe?.lexicalIndex?.find((li) => li?.short_def_pt || li?.short_def)?.short_def ||
                    ''
                  ).split(/[;,/]/)[0].trim().split(/\s+/)[0]
                )}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <IconButton
            onClick={() => navegarOcorrencia(-1)}
            disabled={ocorrenciaDialog.loading || ocorrenciaDialog.idx <= 0}
            aria-label="ocorrência anterior"
          >
            <NavigateBefore />
          </IconButton>
          <IconButton
            onClick={() => navegarOcorrencia(1)}
            disabled={
              ocorrenciaDialog.loading ||
              ocorrenciaDialog.idx < 0 ||
              ocorrenciaDialog.idx >= ocorrencias.length - 1
            }
            aria-label="próxima ocorrência"
          >
            <NavigateNext />
          </IconButton>
          <Button onClick={() => setOcorrenciaDialog({ open: false, loading: false, idx: -1, item: null, original: '', traducao: '' })}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default StrongEstudo
