import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  TextField
} from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import Edit from '@mui/icons-material/Edit'
import Save from '@mui/icons-material/Save'
import ThumbDownAltOutlined from '@mui/icons-material/ThumbDownAltOutlined'
import ThumbUpAltOutlined from '@mui/icons-material/ThumbUpAltOutlined'
import HowToReg from '@mui/icons-material/HowToReg'
import { useApp } from '../contexts/AppContext'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { mesclarSxTextoIa } from '../utils/iaTextoStyles'
import { strongResumoIaStorageKey } from '../utils/strongResumoIaStorage'
import { limparResumoLexicalParaExibicao } from '../utils/strongEstudoHelpers'
import { strongEvalPendingKey } from '../utils/strongResumoEvaluacao'
import {
  buildAppShareLink,
  isPublicAppUrlUnreachableForOthers
} from '../services/bibliaEstudosService'
import {
  atualizarResumoStrongCompartilhavel,
  criarResumoStrongCompartilhavel,
  obterResumoStrongCompartilhavel,
  obterResumoStrongPublicadoPorCodigo
} from '../services/strongResumoShareService'
import { useEhAdmin } from '../hooks/useEhAdmin'
import { openNativeShareSheet } from '../utils/nativeShare'
import { avisarAsync, mostrarSnackbar } from '../utils/uiDialogs'

export default function StrongEstudoResumo() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loginWithGoogle, isConfigured: firebaseAuthOk } = useFirebaseAuth()
  const { ehAdmin, carregando: adminCarregando } = useEhAdmin(user?.uid || null)
  const params = useParams()
  const rawCode = params.code || ''
  const code = decodeURIComponent(String(rawCode || '')).trim().toUpperCase()
  const [textoSessao, setTextoSessao] = useState(() => {
    const fromState = location.state?.resumoIa
    if (typeof fromState === 'string' && fromState.trim()) return fromState.trim()
    try {
      const fromStore = sessionStorage.getItem(strongResumoIaStorageKey(code))
      if (fromStore && fromStore.trim()) return fromStore.trim()
    } catch {
      /* ignore */
    }
    return ''
  })
  const [editandoAdmin, setEditandoAdmin] = useState(false)
  const [rascunhoAdmin, setRascunhoAdmin] = useState('')
  const [adminSaveBusy, setAdminSaveBusy] = useState(false)
  const [adminSaveErro, setAdminSaveErro] = useState('')
  const [sharedId, setSharedId] = useState(() => {
    const p = new URLSearchParams(location.search || '')
    return String(p.get('rid') || '').trim()
  })
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState('')
  const [remoteResumo, setRemoteResumo] = useState(null)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareError, setShareError] = useState('')
  const [votoConcluido, setVotoConcluido] = useState(false)
  const [voto, setVoto] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [avaliacaoErro, setAvaliacaoErro] = useState('')
  const [loginDialogAberto, setLoginDialogAberto] = useState(false)
  const [loginDialogBusy, setLoginDialogBusy] = useState(false)
  const [dialogSaidaAberto, setDialogSaidaAberto] = useState(false)
  /** Após "Confirmar" sem sessão: ao receber `user`, publica o mesmo `textoLocal` automaticamente. */
  const salvarPendenteAposLoginRef = useRef(false)
  const tentativaSaidaRef = useRef(null)

  const precisaFluxoAvaliacao = useMemo(() => {
    try {
      if (sessionStorage.getItem(strongEvalPendingKey(code)) === '1') return true
    } catch {
      /* ignore */
    }
    return Boolean(location.state?.avaliacaoNecessaria)
  }, [code, location.state?.avaliacaoNecessaria])

  const { fontSize, fontFamily, lineHeight } = useApp()
  const sxTexto = useMemo(
    () =>
      mesclarSxTextoIa({
        fontSize: `${(fontSize || 100) / 100}rem`,
        fontFamily: resolveFontFamily(fontFamily),
        lineHeight: readingLineHeightToCss(lineHeight),
      }),
    [fontSize, fontFamily, lineHeight]
  )

  useEffect(() => {
    const p = new URLSearchParams(location.search || '')
    const rid = String(p.get('rid') || '').trim()
    setSharedId(rid)
  }, [location.search])

  useEffect(() => {
    let active = true
    if (!sharedId) {
      setRemoteLoading(true)
      setRemoteError('')
      obterResumoStrongPublicadoPorCodigo(code)
        .then((row) => {
          if (!active) return
          if (!row || !row.resumo) {
            setRemoteResumo(null)
            setRemoteError('')
            return
          }
          try {
            sessionStorage.removeItem(strongEvalPendingKey(code))
          } catch {
            /* ignore */
          }
          setRemoteResumo(row)
          setSharedId(row.id)
          const q = new URLSearchParams(location.search || '')
          if (!q.get('rid')) {
            q.set('rid', row.id)
            navigate(`/estudo-strong/${encodeURIComponent(code)}/resumo?${q.toString()}`, {
              replace: true,
              state: location.state
            })
          }
        })
        .catch(() => {
          if (!active) return
          setRemoteResumo(null)
          setRemoteError('')
        })
        .finally(() => {
          if (active) setRemoteLoading(false)
        })
      return () => {
        active = false
      }
    }
    setRemoteLoading(true)
    setRemoteError('')
    obterResumoStrongCompartilhavel(sharedId)
      .then((row) => {
        if (!active) return
        if (!row || !row.resumo) {
          setRemoteResumo(null)
          setRemoteError('Resumo compartilhado não encontrado.')
          return
        }
        try {
          sessionStorage.removeItem(strongEvalPendingKey(code))
        } catch {
          /* ignore */
        }
        setRemoteResumo(row)
      })
      .catch(() => {
        if (!active) return
        setRemoteResumo(null)
        setRemoteError('Não foi possível carregar o resumo compartilhado.')
      })
      .finally(() => {
        if (active) setRemoteLoading(false)
      })
    return () => {
      active = false
    }
  }, [sharedId, code, location.search, location.state, navigate])

  const texto = useMemo(
    () => limparResumoLexicalParaExibicao(remoteResumo?.resumo || textoSessao),
    [remoteResumo?.resumo, textoSessao]
  )

  /**
   * Resumo recém-gerado ainda sem avaliação: bloqueia voltar/compartilhar até o voto
   * (mesmo padrão do estudo bíblico por passagem).
   */
  const exigeAvaliacao = useMemo(
    () => precisaFluxoAvaliacao && !votoConcluido && !remoteResumo && Boolean(texto),
    [precisaFluxoAvaliacao, votoConcluido, remoteResumo, texto]
  )

  const acaoComAvaliacaoPrevia = useCallback(
    (callback) => {
      if (!exigeAvaliacao) {
        callback()
        return
      }
      tentativaSaidaRef.current = callback
      setDialogSaidaAberto(true)
    },
    [exigeAvaliacao]
  )

  const linhas = useMemo(() => {
    const raw = String(texto || '')
      .replace(/^##\s*/gm, '')
      .replace(/\*\*/g, '')
      .trim()
    if (!raw) return []
    return raw.split('\n').map((l) => l.trim()).filter(Boolean)
  }, [texto])

  const voltarAoVerbeteDirect = useCallback(() => {
    navigate(`/estudo-strong/${encodeURIComponent(code)}`, {
      replace: true,
      state: { token: null, fromResumo: true }
    })
  }, [navigate, code])

  const voltarAoVerbete = useCallback(() => {
    acaoComAvaliacaoPrevia(voltarAoVerbeteDirect)
  }, [acaoComAvaliacaoPrevia, voltarAoVerbeteDirect])

  const persistirResumoNaSessao = useCallback(
    (conteudo = texto) => {
      try {
        const t = String(conteudo || '').trim()
        if (t) sessionStorage.setItem(strongResumoIaStorageKey(code), t)
      } catch {
        /* ignore */
      }
    },
    [code, texto]
  )

  const iniciarEdicaoAdmin = useCallback(() => {
    setAdminSaveErro('')
    setRascunhoAdmin(texto)
    setEditandoAdmin(true)
  }, [texto])

  const cancelarEdicaoAdmin = useCallback(() => {
    setEditandoAdmin(false)
    setRascunhoAdmin('')
    setAdminSaveErro('')
  }, [])

  const salvarEdicaoAdmin = useCallback(async () => {
    setAdminSaveErro('')
    const limpo = limparResumoLexicalParaExibicao(rascunhoAdmin)
    if (!limpo) {
      setAdminSaveErro('O texto não pode ficar vazio.')
      return
    }
    setAdminSaveBusy(true)
    try {
      setTextoSessao(limpo)
      persistirResumoNaSessao(limpo)
      const rid = sharedId || remoteResumo?.id
      if (rid) {
        const atualizado = await atualizarResumoStrongCompartilhavel({ id: rid, resumo: limpo })
        setRemoteResumo(atualizado)
      }
      setEditandoAdmin(false)
      setRascunhoAdmin('')
      mostrarSnackbar({
        mensagem: rid ? 'Resumo atualizado e publicado.' : 'Texto corrigido. Pode confirmar como útil.',
        severidade: 'success'
      })
    } catch (e) {
      setAdminSaveErro(e?.message || 'Não foi possível salvar a edição.')
    } finally {
      setAdminSaveBusy(false)
    }
  }, [rascunhoAdmin, sharedId, remoteResumo?.id, persistirResumoNaSessao])

  const finalizarAvaliacaoNegativa = useCallback(
    (posAcao) => {
      try {
        sessionStorage.removeItem(strongEvalPendingKey(code))
        sessionStorage.removeItem(strongResumoIaStorageKey(code))
      } catch {
        /* ignore */
      }
      setVoto('down')
      setVotoConcluido(true)
      tentativaSaidaRef.current = null
      setDialogSaidaAberto(false)
      if (typeof posAcao === 'function') posAcao()
      else voltarAoVerbeteDirect()
    },
    [code, voltarAoVerbeteDirect]
  )

  const finalizarAvaliacaoPositiva = useCallback(
    async (posAcao) => {
      setAvaliacaoErro('')
      if (!user?.uid) {
        setVoto('up')
        persistirResumoNaSessao()
        salvarPendenteAposLoginRef.current = true
        tentativaSaidaRef.current = posAcao || tentativaSaidaRef.current
        setLoginDialogAberto(true)
        return
      }
      setConfirmBusy(true)
      try {
        const rid = await criarResumoStrongCompartilhavel({
          code,
          resumo: texto,
          authorUid: user.uid,
          authorName: user.displayName || user.email || 'Usuário'
        })
        try {
          sessionStorage.removeItem(strongEvalPendingKey(code))
        } catch {
          /* ignore */
        }
        setVoto('up')
        setVotoConcluido(true)
        setSharedId(rid)
        setRemoteResumo({
          id: rid,
          resumo: texto
        })
        const acaoPendente = typeof posAcao === 'function' ? posAcao : tentativaSaidaRef.current
        tentativaSaidaRef.current = null
        setDialogSaidaAberto(false)
        if (typeof acaoPendente === 'function') {
          acaoPendente()
        } else {
          const q = new URLSearchParams(location.search || '')
          q.set('rid', rid)
          navigate(`/estudo-strong/${encodeURIComponent(code)}/resumo?${q.toString()}`, {
            replace: true,
            state: { resumoIa: texto }
          })
        }
        mostrarSnackbar({
          mensagem: 'Obrigado! Resumo publicado para a comunidade.',
          severidade: 'success'
        })
      } catch (e) {
        setAvaliacaoErro(e?.message || 'Não foi possível confirmar.')
      } finally {
        setConfirmBusy(false)
      }
    },
    [
      user?.uid,
      user?.displayName,
      user?.email,
      texto,
      code,
      navigate,
      location.search,
      persistirResumoNaSessao
    ]
  )

  const confirmarAvaliacao = useCallback(async () => {
    setAvaliacaoErro('')
    if (!voto) return
    if (voto === 'down') {
      finalizarAvaliacaoNegativa()
      return
    }
    await finalizarAvaliacaoPositiva()
  }, [voto, finalizarAvaliacaoNegativa, finalizarAvaliacaoPositiva])

  const votarUtil = useCallback(async () => {
    await finalizarAvaliacaoPositiva(tentativaSaidaRef.current)
  }, [finalizarAvaliacaoPositiva])

  const votarNaoUtil = useCallback(() => {
    finalizarAvaliacaoNegativa(tentativaSaidaRef.current)
  }, [finalizarAvaliacaoNegativa])

  useEffect(() => {
    if (!user?.uid || !salvarPendenteAposLoginRef.current) return
    salvarPendenteAposLoginRef.current = false
    setLoginDialogAberto(false)
    void confirmarAvaliacao()
  }, [user?.uid, confirmarAvaliacao])

  const fecharLoginDialog = () => {
    salvarPendenteAposLoginRef.current = false
    setLoginDialogAberto(false)
    setLoginDialogBusy(false)
  }

  const entrarComGoogleNoDialog = async () => {
    if (!firebaseAuthOk) {
      setAvaliacaoErro('Login não disponível (Firebase não configurado).')
      return
    }
    setAvaliacaoErro('')
    setLoginDialogBusy(true)
    persistirResumoNaSessao()
    try {
      await loginWithGoogle()
    } catch (e) {
      setAvaliacaoErro(e?.message || 'Não foi possível entrar. Tente de novo.')
    } finally {
      setLoginDialogBusy(false)
    }
  }

  const garantirResumoPublicado = useCallback(async () => {
    if (sharedId) return sharedId
    if (!texto) throw new Error('Gere o resumo antes de compartilhar.')
    if (!user?.uid) throw new Error('Faça login para compartilhar este resumo.')
    const rid = await criarResumoStrongCompartilhavel({
      code,
      resumo: texto,
      authorUid: user?.uid || '',
      authorName: user?.displayName || user?.email || 'Usuário'
    })
    setSharedId(rid)
    const q = new URLSearchParams(location.search || '')
    q.set('rid', rid)
    navigate(
      `/estudo-strong/${encodeURIComponent(code)}/resumo?${q.toString()}`,
      { replace: true, state: { resumoIa: texto } }
    )
    return rid
  }, [sharedId, texto, code, user?.uid, user?.displayName, user?.email, location.search, navigate])

  const compartilharResumo = useCallback(async () => {
    setShareError('')
    setShareBusy(true)
    try {
      if (exigeAvaliacao) {
        setShareError('Avalie o resumo antes de compartilhar.')
        return
      }
      if (!sharedId && votoConcluido && voto === 'down') {
        setShareError('Este resumo não foi marcado como útil — não há link público.')
        return
      }
      const rid = sharedId || (await garantirResumoPublicado())
      const url = buildAppShareLink(
        `/estudo-strong/${encodeURIComponent(code)}/resumo`,
        `?rid=${encodeURIComponent(rid)}`
      )
      const title = `Resumo lexical ${code}`
      const text = 'Acesse este conteúdo no Bíblia DC.'
      try {
        const opened = await openNativeShareSheet({ title, text, url })
        if (opened) return
      } catch {
        /* segue fallback */
      }
      try {
        await navigator.clipboard.writeText(url)
        if (isPublicAppUrlUnreachableForOthers()) {
          await avisarAsync({
            titulo: 'Link copiado',
            mensagem:
              'Link copiado! Agora é só colar no WhatsApp ou em outro aplicativo.\n\n' +
              'Nota: este ambiente usa localhost ou rede local — no celular não abre. ' +
              'Defina VITE_PUBLIC_APP_URL no .env e gere o build.',
            severidade: 'warning'
          })
        } else {
          mostrarSnackbar({
            mensagem: 'Link copiado! Agora é só colar onde quiser.',
            severidade: 'success'
          })
        }
        return
      } catch {
        /* fallback final */
      }
      await avisarAsync({
        titulo: 'Copie este link para compartilhar',
        mensagem: url,
        severidade: 'info'
      })
    } catch (e) {
      setShareError(e?.message || 'Não foi possível publicar/compartilhar este resumo.')
    } finally {
      setShareBusy(false)
    }
  }, [exigeAvaliacao, sharedId, votoConcluido, voto, garantirResumoPublicado, code])

  useEffect(() => {
    const onReq = () => {
      acaoComAvaliacaoPrevia(() => {
        void compartilharResumo()
      })
    }
    window.addEventListener('strong-resumo-share-request', onReq)
    return () => window.removeEventListener('strong-resumo-share-request', onReq)
  }, [acaoComAvaliacaoPrevia, compartilharResumo])

  return (
    <Box sx={{ bgcolor: 'background.default', pb: 6, minHeight: '100%', touchAction: 'pan-y' }}>
      <Container maxWidth="sm" sx={{ pt: 2, pb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IconButton
            onClick={voltarAoVerbete}
            aria-label="voltar ao verbete"
            size="small"
            sx={{ color: 'primary.main', border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
            Resumo lexical · {code || '—'}
          </Typography>
        </Box>
        {!!shareError && (
          <Alert severity="warning" sx={{ mb: 1.5 }} onClose={() => setShareError('')}>
            {shareError}
          </Alert>
        )}
        {!!remoteError && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {remoteError}
          </Alert>
        )}
        {remoteLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.5 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Carregando resumo compartilhado...
            </Typography>
          </Box>
        )}

        {!texto && !remoteLoading ? (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Não há resumo disponível neste link/sessão. Gere o resumo a partir do verbete Strong e compartilhe.
            </Alert>
            <Button variant="contained" onClick={voltarAoVerbete}>
              Ir ao dicionário Strong
            </Button>
          </>
        ) : (
          <>
            {ehAdmin && !adminCarregando && texto && !editandoAdmin && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={iniciarEdicaoAdmin}
                  disabled={adminSaveBusy}
                >
                  Editar texto (admin)
                </Button>
              </Box>
            )}
            {exigeAvaliacao && (
              <Alert severity="info" icon={<HowToReg />} sx={{ mb: 2, alignItems: 'center' }}>
                <Typography variant="body2" fontWeight={600}>
                  Sua avaliação é importante.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Antes de voltar ou compartilhar, indique se este resumo foi útil. Sua resposta ajuda a manter o que é
                  bom e descartar o que precisa de revisão.
                </Typography>
              </Alert>
            )}
            {exigeAvaliacao && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 1.5,
                  borderColor: 'primary.main',
                  bgcolor: 'primary.50',
                  borderWidth: 2
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                  Este resumo foi útil para você?
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Sua resposta ajuda a destacar resumos bons e revisar os que precisam de melhoria.
                  {ehAdmin && !adminCarregando ? (
                    <>
                      {' '}
                      Se precisar corrigir um trecho antes de publicar, use <strong>Editar texto (admin)</strong>.
                    </>
                  ) : null}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button
                    variant={voto === 'up' ? 'contained' : 'outlined'}
                    color="primary"
                    size="medium"
                    startIcon={<ThumbUpAltOutlined />}
                    onClick={() => setVoto('up')}
                    disabled={confirmBusy}
                  >
                    Foi útil
                  </Button>
                  <Button
                    variant={voto === 'down' ? 'contained' : 'outlined'}
                    color="warning"
                    size="medium"
                    startIcon={<ThumbDownAltOutlined />}
                    onClick={() => setVoto('down')}
                    disabled={confirmBusy}
                  >
                    Pode melhorar
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!voto || confirmBusy}
                    onClick={() => void confirmarAvaliacao()}
                  >
                    {confirmBusy ? 'Confirmando...' : 'Confirmar'}
                  </Button>
                </Stack>
                {!!avaliacaoErro && (
                  <Alert severity="warning" sx={{ mt: 1.5 }} onClose={() => setAvaliacaoErro('')}>
                    {avaliacaoErro}
                  </Alert>
                )}
              </Paper>
            )}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
              {editandoAdmin ? (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Edição administrativa
                  </Typography>
                  <TextField
                    multiline
                    fullWidth
                    minRows={14}
                    maxRows={28}
                    value={rascunhoAdmin}
                    onChange={(e) => setRascunhoAdmin(e.target.value)}
                    disabled={adminSaveBusy}
                    placeholder="Corrija o resumo antes de publicar ou compartilhar."
                    sx={{
                      mb: 1.5,
                      '& .MuiInputBase-root': {
                        fontFamily: resolveFontFamily(fontFamily),
                        fontSize: `${(fontSize || 100) / 100}rem`,
                        lineHeight: readingLineHeightToCss(lineHeight)
                      }
                    }}
                  />
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Save />}
                      disabled={adminSaveBusy}
                      onClick={() => void salvarEdicaoAdmin()}
                    >
                      {adminSaveBusy ? 'Salvando…' : 'Salvar edição'}
                    </Button>
                    <Button size="small" disabled={adminSaveBusy} onClick={cancelarEdicaoAdmin}>
                      Cancelar
                    </Button>
                  </Stack>
                  {!!adminSaveErro && (
                    <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setAdminSaveErro('')}>
                      {adminSaveErro}
                    </Alert>
                  )}
                </>
              ) : (
                <>
              <Box sx={{ display: 'grid', gap: 0.6 }}>
                {linhas.map((linha, idx) => {
                  const isTitulo = /^(Identificação|Definição|Uso e ocorrências|Contexto bíblico \(exemplos\)|Ligações nos dados|Rede léxica e âncoras no índice)\b/i.test(
                    linha
                  )
                  return (
                    <Typography
                      key={`resumo-linha-${idx}`}
                      component="div"
                      variant={isTitulo ? 'subtitle2' : 'body2'}
                      sx={{
                        ...(isTitulo ? { fontWeight: 700, color: 'text.primary', mt: 0.8 } : {}),
                        ...sxTexto,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {linha}
                    </Typography>
                  )
                })}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                Este é um resumo gerado por IA, levando em conta os léxicos e materiais próprios, bem como materiais
                disponibilizados digitalmente. Embora seja um bom suporte para estudos, não temos a pretensão de substituir
                um estudo exegético minucioso. Para estudo avançado, aprofunde-se em fontes acadêmicas e análises
                exegéticas confiáveis.
              </Typography>
                </>
              )}
            </Paper>
          </>
        )}
      </Container>

      <Dialog
        open={dialogSaidaAberto}
        onClose={() => {
          tentativaSaidaRef.current = null
          setDialogSaidaAberto(false)
        }}
        aria-labelledby="dialog-avaliacao-resumo-strong"
      >
        <DialogTitle id="dialog-avaliacao-resumo-strong">Antes de prosseguir, avalie</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Este resumo ainda não recebeu sua avaliação. Sua resposta nos ajuda a destacar os bons e revisar os que
            precisam de melhoria.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5, p: 2 }}>
          <Button
            onClick={() => {
              tentativaSaidaRef.current = null
              setDialogSaidaAberto(false)
            }}
            color="inherit"
          >
            Voltar à leitura
          </Button>
          <Button
            onClick={votarNaoUtil}
            color="warning"
            variant="outlined"
            startIcon={<ThumbDownAltOutlined />}
            disabled={confirmBusy}
          >
            Pode melhorar
          </Button>
          <Button
            onClick={() => void votarUtil()}
            color="primary"
            variant="contained"
            startIcon={<ThumbUpAltOutlined />}
            disabled={confirmBusy}
          >
            Foi útil
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={loginDialogAberto} onClose={fecharLoginDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Salvar este resumo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            O texto gerado continua nesta página e foi guardado na sessão do navegador. Entre com sua conta para
            publicar o resumo e gerar o link de partilha — não é preciso gerar outro texto.
          </Typography>
          {!firebaseAuthOk ? (
            <Alert severity="warning">Login indisponível: Firebase não está configurado neste ambiente.</Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
          <Button
            variant="contained"
            size="large"
            disabled={loginDialogBusy || !firebaseAuthOk}
            onClick={() => void entrarComGoogleNoDialog()}
          >
            {loginDialogBusy ? (
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                <CircularProgress size={20} color="inherit" />
                <span>Entrando…</span>
              </Stack>
            ) : (
              'Continuar com Google'
            )}
          </Button>
          <Button color="inherit" onClick={fecharLoginDialog} disabled={loginDialogBusy}>
            Agora não
          </Button>
          <Button
            size="small"
            onClick={() => {
              fecharLoginDialog()
              navigate('/chat')
            }}
            disabled={loginDialogBusy}
          >
            Entrar com e-mail (abre Mensagens)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
