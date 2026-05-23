import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
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
import ThumbDown from '@mui/icons-material/ThumbDown'
import ThumbUp from '@mui/icons-material/ThumbUp'
import { useApp } from '../contexts/AppContext'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
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
  /** Após "Confirmar" sem sessão: ao receber `user`, publica o mesmo `textoLocal` automaticamente. */
  const salvarPendenteAposLoginRef = useRef(false)

  const precisaFluxoAvaliacao = useMemo(() => {
    try {
      if (sessionStorage.getItem(strongEvalPendingKey(code)) === '1') return true
    } catch {
      /* ignore */
    }
    return Boolean(location.state?.avaliacaoNecessaria)
  }, [code, location.state?.avaliacaoNecessaria])

  const { fontSize, fontFamily, textAlign, lineHeight } = useApp()
  const alinhamentoResumo = textAlign || 'justify'
  const sxTexto = useMemo(
    () => ({
      fontSize: `${(fontSize || 100) / 100}rem`,
      fontFamily: resolveFontFamily(fontFamily),
      textAlign: alinhamentoResumo,
      lineHeight: readingLineHeightToCss(lineHeight),
      ...(alinhamentoResumo === 'justify' ? { pr: '5pt' } : {})
    }),
    [fontSize, fontFamily, alinhamentoResumo, lineHeight]
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

  const mostraAvaliacao = precisaFluxoAvaliacao && !votoConcluido && !remoteResumo

  const linhas = useMemo(() => {
    const raw = String(texto || '')
      .replace(/^##\s*/gm, '')
      .replace(/\*\*/g, '')
      .trim()
    if (!raw) return []
    return raw.split('\n').map((l) => l.trim()).filter(Boolean)
  }, [texto])

  const voltarAoVerbete = () => {
    navigate(`/estudo-strong/${encodeURIComponent(code)}`, {
      replace: true,
      state: { token: null, fromResumo: true },
    })
  }

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

  const confirmarAvaliacao = useCallback(async () => {
    setAvaliacaoErro('')
    if (!voto) return
    if (voto === 'down') {
      try {
        sessionStorage.removeItem(strongEvalPendingKey(code))
        sessionStorage.removeItem(strongResumoIaStorageKey(code))
      } catch {
        /* ignore */
      }
      setVotoConcluido(true)
      navigate(`/estudo-strong/${encodeURIComponent(code)}`, { replace: true, state: { token: null } })
      return
    }
    if (!user?.uid) {
      persistirResumoNaSessao()
      salvarPendenteAposLoginRef.current = true
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
      setVotoConcluido(true)
      setSharedId(rid)
      setRemoteResumo({
        id: rid,
        resumo: texto
      })
      const q = new URLSearchParams(location.search || '')
      q.set('rid', rid)
      navigate(`/estudo-strong/${encodeURIComponent(code)}/resumo?${q.toString()}`, {
        replace: true,
        state: { resumoIa: texto }
      })
    } catch (e) {
      setAvaliacaoErro(e?.message || 'Não foi possível confirmar.')
    } finally {
      setConfirmBusy(false)
    }
  }, [
    user?.uid,
    user?.displayName,
    user?.email,
    voto,
    texto,
    code,
    navigate,
    location.search,
    persistirResumoNaSessao
  ])

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
      if (mostraAvaliacao) {
        setShareError('Confirme sua avaliação antes de compartilhar.')
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
      const text = `Acesse este conteúdo: ${url}`
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
  }, [mostraAvaliacao, sharedId, votoConcluido, voto, garantirResumoPublicado, code])

  useEffect(() => {
    const onReq = () => {
      void compartilharResumo()
    }
    window.addEventListener('strong-resumo-share-request', onReq)
    return () => window.removeEventListener('strong-resumo-share-request', onReq)
  }, [compartilharResumo])

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
            {mostraAvaliacao && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Este texto acabou de ser gerado. O que você acha?
                  {ehAdmin && !adminCarregando ? (
                    <>
                      {' '}
                      Se precisar corrigir um trecho antes de publicar, use <strong>Editar texto (admin)</strong>.
                    </>
                  ) : null}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <IconButton
                    color={voto === 'up' ? 'primary' : 'default'}
                    onClick={() => setVoto('up')}
                    aria-label="útil"
                    disabled={confirmBusy}
                  >
                    <ThumbUp />
                  </IconButton>
                  <IconButton
                    color={voto === 'down' ? 'error' : 'default'}
                    onClick={() => setVoto('down')}
                    aria-label="não útil"
                    disabled={confirmBusy}
                  >
                    <ThumbDown />
                  </IconButton>
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
                Resumo gerado por IA. Para estudo avançado, aprofunde-se em fontes acadêmicas e análises exegéticas
                confiáveis.
              </Typography>
                </>
              )}
            </Paper>
          </>
        )}
      </Container>

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
