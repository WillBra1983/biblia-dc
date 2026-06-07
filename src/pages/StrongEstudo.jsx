import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Container,
  Tooltip,
} from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import NavigateNext from '@mui/icons-material/NavigateNext'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { verificarBancoLexiconPtBr } from '../services/lexiconPtBrService'
import { carregarDetalheStrong } from '../services/carregarDetalheStrong'
import { textoCurtoLexicalPt } from '../utils/strongTextoPt'
import { resolverResumoLexicalInline } from '../services/strongResumoInlineService'
import { useApp } from '../contexts/AppContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { saveStrongNote, subscribeStrongNote } from '../services/strongNotesCloudService'
import StrongVerbeteApresentacao, { CabecalhoStrongPassagem } from '../components/StrongVerbeteApresentacao'
import StrongOcorrenciaDialog from '../components/StrongOcorrenciaDialog'
import { useStrongOcorrenciaDialog } from '../hooks/useStrongOcorrenciaDialog'
import {
  buscarOcorrenciasStrong,
  contarOcorrenciasStrong,
  STRONG_OCORRENCIAS_PREVIEW,
} from '../services/strongOcorrenciasService'
import { strongResumoIaStorageKey } from '../utils/strongResumoIaStorage'
import {
  carregarTokenPassagem,
  limparTokenPassagem,
  salvarTokenPassagem,
} from '../utils/strongTokenContext'
import {
  deveExibirBarraToken,
  chaveCacheAnaliseToken,
} from '../utils/strongTokenHelpers'
import { limparResumoLemmaLocalStrong, limparResumoTokenLocalStrong } from '../utils/strongResumoLocalCache'

let lexiconPtBrDisponivelCachePromise = null

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
  const [resumoLexical, setResumoLexical] = useState({
    status: 'idle',
    lemmaText: '',
    tokenText: '',
    refPassagem: '',
    tokenIndisponivelOffline: false,
    text: '',
    error: '',
  })
  const [historicoStrong, setHistoricoStrong] = useState([])
  const [historicoStrongIdx, setHistoricoStrongIdx] = useState(-1)
  const [notaTexto, setNotaTexto] = useState('')
  const [notaStatus, setNotaStatus] = useState('')
  const [ocorrencias, setOcorrencias] = useState([])
  const [ocorrenciasTotal, setOcorrenciasTotal] = useState(null)
  const [ocorrenciasLoading, setOcorrenciasLoading] = useState(false)

  const resumoReqRef = useRef(0)

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
      lineHeight: readingLineHeightToCss(lineHeight),
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

      const ptLex = await obterLexiconPtBrDisponivel()
      if (!active) return
      const { detalhe: rapido } = await carregarDetalheStrong(code, {
        stepBibleDisponivel: false,
        lexiconPtBrDisponivel: ptLex,
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
            derivation: token.morph || '',
          })
          setLoading(false)
        }
      }

      const { detalhe: completo } = await carregarDetalheStrong(code, {
        stepBibleDisponivel: false,
        lexiconPtBrDisponivel: ptLex,
      }).catch(() => ({ detalhe: null }))
      if (!active) return
      if (completo) setDetalhe(completo)
      if (!rapido) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [code, token])

  const carregarResumoInline = useCallback(
    async (forcar = false) => {
      if (!detalhe || !code) return
      const reqId = ++resumoReqRef.current
      setResumoLexical({
        status: 'loading',
        lemmaText: '',
        tokenText: '',
        refPassagem: '',
        tokenIndisponivelOffline: false,
        text: '',
        error: '',
      })

      if (forcar) {
        try {
          limparResumoLemmaLocalStrong(code)
          if (token) limparResumoTokenLocalStrong(chaveCacheAnaliseToken(code, token))
          sessionStorage.removeItem(strongResumoIaStorageKey(code, token))
        } catch {
          /* ignore */
        }
      }

      const r = await resolverResumoLexicalInline({
        code,
        detalhe,
        token,
        user,
        ehGrego,
        forcar,
      })
      if (reqId !== resumoReqRef.current) return

      if (r.ok && r.lemmaText) {
        setResumoLexical({
          status: 'ready',
          lemmaText: r.lemmaText,
          tokenText: r.tokenText || '',
          refPassagem: r.refPassagem || '',
          tokenIndisponivelOffline: Boolean(r.tokenIndisponivelOffline),
          text: r.lemmaText,
          error: '',
        })
      } else {
        setResumoLexical({
          status: 'error',
          lemmaText: '',
          tokenText: '',
          refPassagem: '',
          tokenIndisponivelOffline: false,
          text: '',
          error: r.error || 'Não foi possível carregar o estudo lexical.',
        })
      }
    },
    [code, detalhe, token, user, ehGrego]
  )

  useEffect(() => {
    setResumoLexical({
      status: 'idle',
      lemmaText: '',
      tokenText: '',
      refPassagem: '',
      tokenIndisponivelOffline: false,
      text: '',
      error: '',
    })
  }, [code])

  useEffect(() => {
    if (!detalhe || loading) return
    void carregarResumoInline(false)
  }, [detalhe, loading, carregarResumoInline])

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
              fontWeight: 600,
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
      detalhe?.lexicalIndex?.map((li) => textoCurtoLexicalPt(li)).find((t) => t) ||
      detalhe?.definition_pt ||
      detalhe?.definition ||
      resumoLexical.lemmaText ||
      resumoLexical.text ||
      ''
    return String(best || '')
      .split(/[;|]/)[0]
      .trim()
  }, [detalhe, resumoLexical.lemmaText, resumoLexical.text])

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
          <Typography
            component="h1"
            variant="subtitle1"
            sx={{
              flex: 1,
              textAlign: 'center',
              fontWeight: 800,
              letterSpacing: '0.04em',
              minWidth: 0,
              px: 0.5,
            }}
          >
            {code || 'Strong'}
          </Typography>
          <Box sx={{ width: 40, flexShrink: 0 }} aria-hidden />
        </Box>

        {deveExibirBarraToken(token) && (
          <CabecalhoStrongPassagem tokenRef={token} ehGrego={ehGrego} />
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
            sxTextoLeitura={sxTextoLeitura}
            token={token}
            resumoLexical={resumoLexical}
            onRegenerarResumo={() => void carregarResumoInline(true)}
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
