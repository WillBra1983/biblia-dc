import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Button,
  Container,
  Tooltip,
  Alert,
} from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import AutoAwesome from '@mui/icons-material/AutoAwesome'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import NavigateNext from '@mui/icons-material/NavigateNext'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { buscarBdbHebraico } from '../services/otStrongService'
import { verificarBancoStepBible } from '../services/stepBibleLexiconService'
import { verificarBancoLexiconPtBr } from '../services/lexiconPtBrService'
import { carregarDetalheStrong } from '../services/carregarDetalheStrong'
import { limparResumoLexicalParaExibicao } from '../utils/strongEstudoHelpers'
import { iaGeminiDisponivel, gerarResumoStrongGemini } from '../services/strongEstudoAiService'
import { useApp } from '../contexts/AppContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { saveStrongNote, subscribeStrongNote } from '../services/strongNotesCloudService'
import StrongLexiconAttributions from '../components/StrongLexiconAttributions'
import StrongVerbeteApresentacao, { BarraTokenPassagem } from '../components/StrongVerbeteApresentacao'
import StrongOcorrenciaDialog from '../components/StrongOcorrenciaDialog'
import { useStrongOcorrenciaDialog } from '../hooks/useStrongOcorrenciaDialog'
import {
  buscarOcorrenciasStrong,
  contarOcorrenciasStrong,
  STRONG_OCORRENCIAS_PREVIEW,
} from '../services/strongOcorrenciasService'
import { strongResumoIaStorageKey } from '../utils/strongResumoIaStorage'
import { strongEvalPendingKey } from '../utils/strongResumoEvaluacao'
import { obterResumoStrongPublicadoPorCodigo } from '../services/strongResumoShareService'
import { mostrarSnackbar } from '../utils/uiDialogs'
import { estaSemRede, MSG_SEM_INTERNET_RECURSO } from '../utils/conteudoLocalOffline'
import {
  carregarTokenPassagem,
  limparTokenPassagem,
  limparTextoTokenPassagem,
  salvarTokenPassagem,
} from '../utils/strongTokenContext'
import { deveExibirBarraToken } from '../utils/strongTokenHelpers'

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
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const rawCode = params.code || ''
  const code = decodeURIComponent(String(rawCode || '')).trim().toUpperCase()
  const tokenFromState = location.state?.token || null
  const token = tokenFromState || carregarTokenPassagem(code) || null

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
  const [ocorrenciasTotal, setOcorrenciasTotal] = useState(null)
  const [ocorrenciasLoading, setOcorrenciasLoading] = useState(false)

  const { fontSize, fontFamily, textAlign, lineHeight } = useApp()
  const { user } = useFirebaseAuth()
  const { dialog: ocorrenciaDialog, abrir: abrirOcorrencia, fechar: fecharOcorrencia, navegar: navegarOcorrencia } =
    useStrongOcorrenciaDialog(code)
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
    if (tokenFromState && code) {
      salvarTokenPassagem(code, tokenFromState)
    }
  }, [tokenFromState, code])

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
    setOcorrenciasTotal(null)
    setOcorrenciasLoading(false)
    fecharOcorrencia()
  }, [code, fecharOcorrencia])

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
      limparTokenPassagem()
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
    limparTokenPassagem()
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
    if (estaSemRede()) {
      setAiResumo({ status: 'idle', text: '', error: '' })
      mostrarSnackbar({ mensagem: MSG_SEM_INTERNET_RECURSO, severidade: 'info' })
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
    Promise.all([
      contarOcorrenciasStrong(code),
      buscarOcorrenciasStrong(code, STRONG_OCORRENCIAS_PREVIEW, 0),
    ])
      .then(([total, rows]) => {
        if (!active) return
        setOcorrenciasTotal(total)
        setOcorrencias(rows || [])
      })
      .catch(() => {
        if (!active) return
        setOcorrenciasTotal(0)
        setOcorrencias([])
      })
      .finally(() => {
        if (active) setOcorrenciasLoading(false)
      })
    return () => {
      active = false
    }
  }, [code])

  const irOcorrenciasCompletas = () => {
    navigate(`/estudo-strong/${encodeURIComponent(code)}/ocorrencias`)
  }

  return (
    <Box sx={{ bgcolor: 'background.default', pb: 8, touchAction: 'pan-y', minHeight: '100%' }}>
      <Container maxWidth="sm" sx={{ pt: 1.5, pb: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 0.5, mb: 1.25, rowGap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <IconButton
              onClick={voltar}
              aria-label="voltar"
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
            <Tooltip title="Verbete Strong anterior nesta sessão" placement="bottom">
              <span>
                <IconButton
                  size="small"
                  onClick={() => navegarHistoricoStrong(-1)}
                  disabled={historicoStrongIdx <= 0}
                  aria-label="referência anterior"
                  sx={{ color: 'text.primary', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
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
                  sx={{ color: 'text.primary', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
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
              aria-label="Resumo do token"
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
              {aiResumo.status === 'loading' ? 'Abrindo…' : 'Resumo do Token'}
            </Button>
          </Box>
        </Box>

        {deveExibirBarraToken(token) && (
          <BarraTokenPassagem
            tokenTexto={limparTextoTokenPassagem(token?.text || token?.word || '')}
            ehGrego={ehGrego}
            detalhe={detalhe}
            tokenRef={token}
          />
        )}

        {aiResumo.status === 'error' && !!aiResumo.error && (
          <Alert
            severity="warning"
            sx={{ mb: 1.25 }}
            onClose={() => setAiResumo({ status: 'idle', text: '', error: '' })}
          >
            {aiResumo.error}
          </Alert>
        )}


        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && !detalhe && (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            Verbete não encontrado para {code}.
          </Typography>
        )}

        {!loading && detalhe && (
          <StrongVerbeteApresentacao
            detalhe={detalhe}
            code={code}
            ehGrego={ehGrego}
            traduzirStrongPtBr={traduzirStrongPtBr}
            sxTextoLeitura={sxTextoLeitura}
            token={token}
            bdbDetalhe={bdbDetalhe}
            notaTexto={notaTexto}
            setNotaTexto={setNotaTexto}
            salvarNota={salvarNota}
            notaStatus={notaStatus}
            user={user}
            onIrLogin={() => navigate('/chat')}
            ocorrencias={ocorrencias}
            ocorrenciasLoading={ocorrenciasLoading}
            ocorrenciasTotal={ocorrenciasTotal}
            onVerTodasOcorrencias={irOcorrenciasCompletas}
            onAbrirOcorrencia={(r, idx) => void abrirOcorrencia(r, idx)}
            renderSomenteCodigosDerivacao={renderSomenteCodigosDerivacao}
          />
        )}

        <StrongLexiconAttributions />
      </Container>
      <StrongOcorrenciaDialog
        open={ocorrenciaDialog.open}
        loading={ocorrenciaDialog.loading}
        item={ocorrenciaDialog.item}
        idx={ocorrenciaDialog.idx}
        total={ocorrenciasTotal ?? ocorrencias.length}
        original={ocorrenciaDialog.original}
        traducao={ocorrenciaDialog.traducao}
        significadoPtAlvo={significadoPtAlvo}
        termoDestaque={String(ocorrenciaDialog.item?.tokenOriginal || '').trim()}
        sxTextoLeitura={sxTextoLeitura}
        onClose={fecharOcorrencia}
        onPrev={() => navegarOcorrencia(ocorrencias, -1)}
        onNext={() => navegarOcorrencia(ocorrencias, 1)}
        prevDisabled={ocorrenciaDialog.idx <= 0}
        nextDisabled={ocorrenciaDialog.idx < 0 || ocorrenciaDialog.idx >= ocorrencias.length - 1}
      />
    </Box>
  )
}

export default StrongEstudo
