import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  IconButton,
  Link
} from '@mui/material'
import BookmarkAddOutlined from '@mui/icons-material/BookmarkAddOutlined'
import BookmarkRemoveOutlined from '@mui/icons-material/BookmarkRemoveOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import NavigateNext from '@mui/icons-material/NavigateNext'
import CheckIcon from '@mui/icons-material/Check'
import { useNavigate, useParams, useSearchParams, Link as RouterLink } from 'react-router-dom'
import { get, ref } from 'firebase/database'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { getFirebaseDatabase } from '../config/firebase'
import TextoComReferencias from '../components/TextoComReferencias'
import QuestaoEstudoBiblico from '../components/QuestaoEstudoBiblico'
import ProvaEstudoBiblicoAluno from '../components/ProvaEstudoBiblicoAluno'
import { useApp } from '../contexts/AppContext'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import {
  obterEstudoBiblico,
  normalizarPerguntas,
  sanitizarEstudoLeituraAluno,
  registarLeituraEstudo,
  salvarEstudoParaUtilizador,
  removerEstudoSalvo,
  estudoBiblicoLeituraUrl,
  normalizarStudyIdEstudoArg
} from '../services/bibliaEstudosService'
import { embaralharPerguntasEstudoBiblico } from '../utils/questoesAlternativas'
import { ensureUserForChatExport, pushPendingChatExport } from '../utils/chatExportSend'
import { avisarAsync } from '../utils/uiDialogs'
import { buildEstudoBiblicoChatExport } from '../utils/appExportPayload'
import CompartilharMenu from '../components/CompartilharMenu'
import { urlLeitorBiblia } from '../utils/bibliaDeepLinks'

export default function EstudoBiblicoVer() {
  const { studyId: studyIdParam } = useParams()
  const [searchParams] = useSearchParams()
  const estudoQ = searchParams.get('estudo')
  const studyId = useMemo(
    () => normalizarStudyIdEstudoArg(studyIdParam, estudoQ),
    [studyIdParam, estudoQ]
  )
  const navigate = useNavigate()
  const { user, isConfigured } = useFirebaseAuth()
  const { lineHeight, fontSize, fontFamily } = useApp()
  const lh = readingLineHeightToCss(lineHeight)
  const leituraStyle = {
    lineHeight: lh,
    fontSize: `${fontSize || 100}%`,
    ...(fontFamily ? { fontFamily } : {})
  }

  const [loading, setLoading] = useState(true)
  const [study, setStudy] = useState(null)
  const [err, setErr] = useState(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [idxPergunta, setIdxPergunta] = useState(0)
  const [mostrarDevocionalPosQuestionario, setMostrarDevocionalPosQuestionario] = useState(false)
  const [diaDevocionalAtual, setDiaDevocionalAtual] = useState(1)
  const leituraRegistada = useRef(false)

  useEffect(() => {
    setIdxPergunta(0)
    setMostrarDevocionalPosQuestionario(false)
    setDiaDevocionalAtual(1)
  }, [studyId])

  const meditacoesDevocional = useMemo(
    () => {
      const src = Array.isArray(study?.meditacao)
        ? study.meditacao
        : study?.meditacao && typeof study.meditacao === 'object'
          ? Object.values(study.meditacao)
          : []
      return src
        .map((m) => ({ ...(m || {}), dia: Number(m?.dia) || 0 }))
        .filter((m) => m.dia >= 1 && m.dia <= 7)
        .sort((a, b) => Number(a.dia || 0) - Number(b.dia || 0))
    },
    [study?.meditacao]
  )
  const handleConcluirEstudo = useCallback(() => {
    if (meditacoesDevocional.length > 0) {
      setMostrarDevocionalPosQuestionario(true)
      const primeiroDia = Number(meditacoesDevocional[0]?.dia) || 1
      setDiaDevocionalAtual(primeiroDia)
      setToast('Questionário concluído! Agora siga a devocional do estudo.')
      return
    }
    setToast('Estudo concluído! Obrigado por estudar com a Palavra.')
  }, [meditacoesDevocional])
  const isAuthor = user?.uid && study?.authorUid === user.uid
  const modoProva = Boolean(study?.modoProva)

  const perguntas = useMemo(() => {
    const brutas = normalizarPerguntas(study?.perguntas)
    if (!brutas.length || modoProva) return brutas
    return embaralharPerguntasEstudoBiblico(brutas, studyId)
  }, [study?.perguntas, studyId, modoProva])
  const totalPerguntas = perguntas.length
  const indiceSeguro = totalPerguntas ? Math.min(idxPergunta, totalPerguntas - 1) : 0
  const perguntaAtual = totalPerguntas ? perguntas[indiceSeguro] : null

  const indiceDiaAtual = useMemo(
    () => meditacoesDevocional.findIndex((m) => Number(m.dia) === Number(diaDevocionalAtual)),
    [meditacoesDevocional, diaDevocionalAtual]
  )
  const meditacaoAtual = indiceDiaAtual >= 0 ? meditacoesDevocional[indiceDiaAtual] : null
  const textoEstudo = useMemo(() => {
    const intro = String(study?.introducao || '').trim()
    const cit = String(study?.citacoes || '').trim()
    if (!intro && !cit) return ''
    if (!intro) return cit
    if (!cit) return intro
    if (intro.includes(cit)) return intro
    return `${intro}\n\n${cit}`
  }, [study?.introducao, study?.citacoes])

  const refreshSaved = useCallback(async () => {
    if (!user?.uid || !studyId || !getFirebaseDatabase()) return
    const snap = await get(ref(getFirebaseDatabase(), `users/${user.uid}/estudosBiblicosSalvos/${studyId}`))
    setSaved(snap.exists())
  }, [user?.uid, studyId])

  useEffect(() => {
    if (!studyId) {
      setLoading(false)
      setErr('Link inválido: falta o identificador do estudo (use o botão "Compartilhar" desta página).')
      setStudy(null)
      return
    }
    let cancel = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const s = await obterEstudoBiblico(studyId)
        if (cancel) return
        if (!s) {
          setErr('Estudo não encontrado ou foi removido.')
          setStudy(null)
          return
        }
        setStudy(sanitizarEstudoLeituraAluno(s, user?.uid))
      } catch (e) {
        if (!cancel) setErr(e?.message || 'Erro ao carregar.')
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [studyId, user?.uid])

  useEffect(() => {
    if (!user?.uid || !studyId || !study) return
    void refreshSaved()
  }, [user?.uid, studyId, study, refreshSaved])

  useEffect(() => {
    if (!user?.uid || !studyId || !study || leituraRegistada.current) return
    const k = `bibliaEstudoLeitura:${studyId}`
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(k)) return
    leituraRegistada.current = true
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(k, '1')
    void registarLeituraEstudo(studyId, user.uid).catch(() => {})
  }, [user?.uid, studyId, study])

  const handleEnviarEstudoPeloChat = () => {
    if (!ensureUserForChatExport(user, navigate)) return
    if (!study) return
    const { serialized, previewText, error } = buildEstudoBiblicoChatExport({
      studyId,
      tema: study.tema,
      authorName: study.authorName,
      referenciaCompacta: study.referenciaCompacta
    })
    if (error || !serialized) {
      avisarAsync({
        titulo: 'Não foi possível enviar',
        mensagem: error || 'Não foi possível preparar o envio.',
        severidade: 'error'
      })
      return
    }
    pushPendingChatExport(navigate, {
      exportKind: 'estudo_biblico',
      exportPayload: serialized,
      previewText
    })
  }

  const linkCompartilharEstudo = useMemo(() => {
    if (!study || !studyId) return ''
    return estudoBiblicoLeituraUrl(studyId, {
      livroId: study.livroId,
      capitulo: study.capitulo,
      versiculos: study.versiculos
    })
  }, [study, studyId])

  const linkLeitorBiblia = useMemo(() => {
    const li = Number(study?.livroId)
    const cap = Number(study?.capitulo)
    if (!study || !Number.isInteger(li) || li < 1 || !Number.isInteger(cap) || cap < 1) return ''
    const vers = Array.isArray(study.versiculos)
      ? study.versiculos.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)
      : []
    return urlLeitorBiblia({ livroId: li, capitulo: cap, versiculos: vers })
  }, [study])

  const toggleSave = async () => {
    if (!user?.uid || !study) return
    setBusy(true)
    try {
      if (saved) {
        await removerEstudoSalvo(studyId, user.uid)
        setSaved(false)
        setToast('Removido dos seus estudos salvos.')
      } else {
        await salvarEstudoParaUtilizador(studyId, user.uid, {
          tema: study.tema,
          authorName: study.authorName
        })
        setSaved(true)
        setToast('Salvo em Estudos salvos.')
      }
    } catch (e) {
      setErr(e?.message || 'Não foi possível atualizar.')
    } finally {
      setBusy(false)
    }
  }

  if (!isConfigured) {
    return (
      <Box sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
        <Alert severity="warning">Firebase não configurado.</Alert>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (err && !study) {
    return (
      <Box sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
        <Alert severity="error">{err}</Alert>
      </Box>
    )
  }

  if (!study) {
    return (
      <Box sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
        <Alert severity="warning">Não foi possível carregar o estudo.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ px: { xs: 1, sm: 2 }, pt: 2, pb: 8, maxWidth: 720, mx: 'auto', color: 'text.primary' }}>
      {user === null && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Faça login para salvar o estudo na sua lista e registrar a leitura. O conteúdo pode ser lido sem conta.
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        <Typography variant="h6" sx={{ flex: '1 1 auto' }}>
          {study.tema || 'Estudo compartilhado'}
        </Typography>
        {isAuthor && (
          <Button
            size="small"
            startIcon={<EditOutlined />}
            onClick={() =>
              navigate(`/estudos-biblicos/${encodeURIComponent(studyId)}/edit`)
            }
          >
            Editar
          </Button>
        )}
      </Box>

      {study.referenciaCompacta ? (
        linkLeitorBiblia ? (
          <Link
            component={RouterLink}
            to={linkLeitorBiblia}
            variant="body2"
            color="primary"
            underline="hover"
            sx={{ mb: 1, display: 'inline-block', fontWeight: 600 }}
            aria-label="Abrir o texto bíblico desta referência na Bíblia"
          >
            {study.referenciaCompacta}
          </Link>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {study.referenciaCompacta}
          </Typography>
        )
      ) : null}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
        <Chip size="small" label={`Leituras: ${study.readsCount ?? 0}`} variant="outlined" />
        <Chip size="small" label={`Salvos: ${study.savesCount ?? 0}`} variant="outlined" />
        <CompartilharMenu
          linkUrl={linkCompartilharEstudo}
          linkTitle={study.tema || 'Estudo compartilhado'}
          linkText={`Acesse este estudo: ${linkCompartilharEstudo}`}
          onEnviarChat={handleEnviarEstudoPeloChat}
          chatLabel="Enviar pelo chat interno"
          variant="text"
        />
        {!isAuthor && user?.uid && (
          <Button
            size="small"
            startIcon={saved ? <BookmarkRemoveOutlined /> : <BookmarkAddOutlined />}
            disabled={busy}
            onClick={() => void toggleSave()}
          >
            {saved ? 'Remover dos salvos' : 'Guardar'}
          </Button>
        )}
        {!isAuthor && user === null && (
          <Button size="small" variant="outlined" onClick={() => navigate('/chat')}>
            Entrar para guardar
          </Button>
        )}
      </Box>

      {study.authorName ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Por {study.authorName}
        </Typography>
      ) : null}

      <Typography variant="subtitle2" gutterBottom>
        Texto do Estudo
      </Typography>
      <Box sx={{ mb: 3 }}>
        <TextoComReferencias texto={textoEstudo} style={leituraStyle} />
      </Box>

      <Typography variant="h6" sx={{ mb: 1 }}>
        {modoProva ? 'Avaliação' : 'Perguntas'}
      </Typography>
      {totalPerguntas > 0 && meditacoesDevocional.length > 0 && !modoProva && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ao concluir a última pergunta, a devocional do próprio estudo abre abaixo.
        </Typography>
      )}
      {totalPerguntas === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Este estudo ainda não tem perguntas.
        </Typography>
      ) : modoProva ? (
        <ProvaEstudoBiblicoAluno
          study={study}
          studyId={studyId}
          user={user}
          isAuthor={isAuthor}
          navigate={navigate}
          onToast={setToast}
        />
      ) : (
        <QuestaoEstudoBiblico
          key={indiceSeguro}
          questao={perguntaAtual}
          numero={indiceSeguro + 1}
          total={totalPerguntas}
          indice={indiceSeguro}
          lineHeight={lineHeight}
          isFirst={indiceSeguro === 0}
          isLast={indiceSeguro === totalPerguntas - 1}
          onPrev={() => setIdxPergunta((i) => Math.max(0, i - 1))}
          onNext={() => setIdxPergunta((i) => Math.min(totalPerguntas - 1, i + 1))}
          onConcluir={handleConcluirEstudo}
        />
      )}

      {mostrarDevocionalPosQuestionario && meditacaoAtual && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" align="center" sx={{ mb: 1.5 }}>
            Parabéns! Você concluiu o questionário.
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" align="center" sx={{ mb: 2 }}>
            Agora siga os dias de meditação.
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" align="center" sx={{ mb: 2 }}>
            Jornada devocional de 7 dias deste estudo
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap', mb: 3 }}>
            {meditacoesDevocional.map((m) => {
              const dia = Number(m.dia) || 0
              const ativo = dia === Number(diaDevocionalAtual)
              const concluido = indiceDiaAtual >= 0 && dia < Number(diaDevocionalAtual)
              return (
                <Box
                  key={`dev-dia-${dia}`}
                  onClick={() => setDiaDevocionalAtual(dia)}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    bgcolor: concluido ? 'success.main' : ativo ? 'primary.main' : 'action.selected',
                    color: concluido || ativo ? '#fff' : 'text.primary',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.86rem'
                  }}
                >
                  {concluido ? <CheckIcon sx={{ fontSize: 20 }} /> : dia}
                </Box>
              )
            })}
          </Box>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="subtitle1" align="center" sx={{ mb: 1 }}>
              Dia {meditacaoAtual.dia}: {meditacaoAtual.titulo}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Leitura:{' '}
              <TextoComReferencias
                texto={meditacaoAtual.leitura || ''}
                inline
                component="span"
                style={leituraStyle}
              />
            </Typography>
            <Box sx={{ mb: 2 }}>
              <TextoComReferencias texto={meditacaoAtual.texto || ''} style={leituraStyle} />
            </Box>
            {meditacaoAtual.reflexao ? (
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                <strong>Reflexão:</strong> {meditacaoAtual.reflexao}
              </Typography>
            ) : null}
            {meditacaoAtual.oracao ? (
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                <strong>Oração:</strong> {meditacaoAtual.oracao}
              </Typography>
            ) : null}
            {meditacaoAtual.conselho_pastoral ? (
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                <strong>Conselho Pastoral:</strong> {meditacaoAtual.conselho_pastoral}
              </Typography>
            ) : null}
            {meditacaoAtual.desafio ? (
              <Typography variant="body2">
                <strong>Desafio:</strong> {meditacaoAtual.desafio}
              </Typography>
            ) : null}
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 2 }}>
            <IconButton
              disabled={indiceDiaAtual <= 0}
              onClick={() => {
                if (indiceDiaAtual > 0) setDiaDevocionalAtual(Number(meditacoesDevocional[indiceDiaAtual - 1].dia))
              }}
              color="primary"
              sx={{ bgcolor: 'action.hover' }}
            >
              <NavigateBefore />
            </IconButton>
            <IconButton
              disabled={indiceDiaAtual < 0 || indiceDiaAtual >= meditacoesDevocional.length - 1}
              onClick={() => {
                if (indiceDiaAtual >= 0 && indiceDiaAtual < meditacoesDevocional.length - 1) {
                  setDiaDevocionalAtual(Number(meditacoesDevocional[indiceDiaAtual + 1].dia))
                }
              }}
              color="primary"
              sx={{ bgcolor: 'action.hover' }}
            >
              <NavigateNext />
            </IconButton>
          </Box>
        </Box>
      )}

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />

      {err && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}
    </Box>
  )
}
