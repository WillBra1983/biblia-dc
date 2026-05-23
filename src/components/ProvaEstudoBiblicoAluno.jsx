import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import ArrowForward from '@mui/icons-material/ArrowForward'
import Send from '@mui/icons-material/Send'
import TextoComReferencias from './TextoComReferencias'
import { useApp } from '../contexts/AppContext'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { shuffleArrayDeterministic } from '../utils/seededShuffle'
import {
  normalizarPerguntas,
  publicarEntregaProvaBiblica,
  buildProvaEntregaPublicUrl,
  iniciarSessaoProvaBiblicaAluno,
  avaliarProvaBiblicaAluno
} from '../services/bibliaEstudosService'
import { buildProvaBiblicaChatExport } from '../utils/appExportPayload'
import { ensureUserForChatExport, pushPendingChatExport } from '../utils/chatExportSend'
import { avisarAsync } from '../utils/uiDialogs'
import {
  round2,
  sanitizarPontosQuestaoProva,
  formatarNotaProvaPtBr
} from '../utils/provaPontos'

function montarAlternativas(questao, studyId, idx) {
  const tipo = String(questao?.tipo || '').toLowerCase()
  const seed = `${studyId}-${idx}`
  if (tipo === 'ver_resposta') return []
  if (tipo === 'verdadeiro_falso') {
    const correta =
      String(questao?.respostaCerta || '').trim().toLowerCase() === 'falso' ? 'Falso' : 'Verdadeiro'
    const errada = correta === 'Verdadeiro' ? 'Falso' : 'Verdadeiro'
    const itens = [
      { id: 'c', texto: correta, correta: true },
      { id: 'e0', texto: errada, correta: false }
    ]
    return shuffleArrayDeterministic(itens, seed)
  }
  const limpas = (questao?.respostasErradas || [])
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .slice(0, 4)
  const itens = [
    { id: 'c', texto: String(questao?.respostaCerta || '').trim(), correta: true },
    ...limpas.map((texto, i) => ({ id: `e${i}`, texto, correta: false }))
  ].filter((x) => x.texto.length > 0)
  return shuffleArrayDeterministic(itens, seed)
}

/**
 * Modo prova: sem feedback por questão; resultado e envio ao professor ao final.
 */
export default function ProvaEstudoBiblicoAluno({
  study,
  studyId,
  user,
  isAuthor,
  navigate,
  onToast
}) {
  const { textAlign, lineHeight, fontSize, fontFamily } = useApp()
  const ta = textAlign || 'left'
  const lh = readingLineHeightToCss(lineHeight)
  const fs = `${fontSize || 100}%`
  const ff = fontFamily || undefined
  const baseTxt = { lineHeight: lh, textAlign: ta, fontSize: fs, ...(ff ? { fontFamily: ff } : {}) }

  const [sessaoProva, setSessaoProva] = useState(null)
  const [carregandoSessao, setCarregandoSessao] = useState(!isAuthor)
  const [erroSessao, setErroSessao] = useState('')

  useEffect(() => {
    if (isAuthor) {
      setCarregandoSessao(false)
      setSessaoProva(null)
      return
    }
    let cancelled = false
    setCarregandoSessao(true)
    setErroSessao('')
    iniciarSessaoProvaBiblicaAluno(studyId)
      .then((data) => {
        if (!cancelled) setSessaoProva(data)
      })
      .catch((e) => {
        if (!cancelled) setErroSessao(e?.message || 'Não foi possível iniciar a avaliação.')
      })
      .finally(() => {
        if (!cancelled) setCarregandoSessao(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthor, studyId])

  const perguntas = useMemo(() => {
    if (isAuthor) return normalizarPerguntas(study?.perguntas)
    return Array.isArray(sessaoProva?.perguntas) ? sessaoProva.perguntas : []
  }, [isAuthor, study?.perguntas, sessaoProva?.perguntas])

  const total = perguntas.length

  const alternativasPorIndice = useMemo(() => {
    const m = {}
    perguntas.forEach((q, i) => {
      if (isAuthor) {
        m[i] = montarAlternativas(q, studyId, i)
      } else {
        m[i] = Array.isArray(q.alternativas) ? q.alternativas : []
      }
    })
    return m
  }, [perguntas, studyId, isAuthor])

  const [idx, setIdx] = useState(0)
  /** escolha por índice: id da alternativa ou texto livre */
  const [escolhas, setEscolhas] = useState({})
  const [fase, setFase] = useState('responder')
  const [dialogConcluir, setDialogConcluir] = useState(false)
  const [dialogEnviarChat, setDialogEnviarChat] = useState(false)
  /** Índices em que a resposta já foi confirmada ao avançar — não pode editar nem “chutar de novo”. */
  const [indicesTravados, setIndicesTravados] = useState({})
  const [itensResultado, setItensResultado] = useState([])
  const [totais, setTotais] = useState({ obtida: 0, max: 0 })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [concluindo, setConcluindo] = useState(false)

  const indiceSeguro = total ? Math.min(idx, total - 1) : 0
  const q = total ? perguntas[indiceSeguro] : null
  const alts = q ? alternativasPorIndice[indiceSeguro] || [] : []
  const tipo = String(q?.tipo || '').toLowerCase()
  const isVerResposta = tipo === 'ver_resposta'

  const escolhaAtual = escolhas[indiceSeguro]
  const travado = Boolean(indicesTravados[indiceSeguro])

  const podeAvancar = useMemo(() => {
    if (!q) return false
    if (isVerResposta) return String(escolhaAtual || '').trim().length > 0
    return Boolean(escolhaAtual)
  }, [q, isVerResposta, escolhaAtual])

  const calcularResultado = useCallback(() => {
    let obtida = 0
    let max = 0
    const itens = []
    perguntas.forEach((questao, i) => {
      const pontosQ = sanitizarPontosQuestaoProva(questao.pontos)
      max = round2(max + pontosQ)
      const t = String(questao?.tipo || '').toLowerCase()
      let acertou = false
      let respostaAluno = ''
      let respostaCorreta = String(questao?.respostaCerta || '').trim()

      if (t === 'ver_resposta') {
        respostaAluno = String(escolhas[i] || '').trim()
        acertou = respostaAluno.length > 0
        const pts = acertou ? pontosQ : 0
        obtida = round2(obtida + pts)
        itens.push({
          pergunta: String(questao?.pergunta || ''),
          tipo: t,
          pontosQuestao: pontosQ,
          pontosObtidos: pts,
          respostaAluno,
          respostaCorreta,
          acertou
        })
        return
      }

      const esc = escolhas[i]
      const lista = alternativasPorIndice[i] || []
      const item = lista.find((a) => a.id === esc)
      acertou = Boolean(item?.correta)
      respostaAluno = item?.texto || ''
      if (!item && esc) respostaAluno = String(esc)

      const pts = acertou ? pontosQ : 0
      obtida = round2(obtida + pts)
      itens.push({
        pergunta: String(questao?.pergunta || ''),
        tipo: t,
        pontosQuestao: pontosQ,
        pontosObtidos: pts,
        respostaAluno,
        respostaCorreta,
        acertou
      })
    })
    return { itens, obtida: round2(obtida), max: round2(max) }
  }, [perguntas, escolhas, alternativasPorIndice])

  const abrirDialogConcluir = () => setDialogConcluir(true)
  const confirmarConcluir = () => {
    setDialogConcluir(false)
    setIndicesTravados((prev) => ({ ...prev, [indiceSeguro]: true }))
    void (async () => {
      setConcluindo(true)
      try {
        let itens
        let obtida
        let max
        if (isAuthor) {
          const r = calcularResultado()
          itens = r.itens
          obtida = r.obtida
          max = r.max
        } else {
          const sessionId = sessaoProva?.sessionId
          if (!sessionId) throw new Error('Sessão da avaliação inválida. Recarregue a página.')
          const r = await avaliarProvaBiblicaAluno(sessionId, escolhas)
          itens = r.itens || []
          obtida = r.obtida
          max = r.max
        }
        setItensResultado(itens)
        setTotais({ obtida, max })
        setFase('resultado')
        onToast?.(
          `Avaliação concluída: ${formatarNotaProvaPtBr(obtida)} / ${formatarNotaProvaPtBr(max)}.`
        )
      } catch (e) {
        avisarAsync({
          titulo: 'Não foi possível concluir',
          mensagem: e?.message || 'Tente novamente.',
          severidade: 'error'
        })
      } finally {
        setConcluindo(false)
      }
    })()
  }

  const enviarAoProfessor = async () => {
    if (!ensureUserForChatExport(user, navigate)) return
    if (!study?.authorUid || isAuthor) return
    setDialogEnviarChat(false)
    setEnviando(true)
    try {
      const { itens, obtida, max } =
        itensResultado.length && totais.max > 0
          ? { itens: itensResultado, obtida: totais.obtida, max: totais.max }
          : calcularResultado()

      const submissionId = await publicarEntregaProvaBiblica(user.uid, {
        studyId,
        tema: study.tema || '',
        professorUid: study.authorUid,
        professorName: study.authorName || '',
        alunoName: user.displayName || user.email?.split('@')[0] || 'Aluno',
        alunoEmail: user.email || '',
        pontuacaoObtida: obtida,
        pontuacaoMax: max,
        itens
      })
      const resultUrl = buildProvaEntregaPublicUrl(submissionId)
      const notaTexto = `${formatarNotaProvaPtBr(obtida)} / ${formatarNotaProvaPtBr(max)}`
      const { serialized, previewText } = buildProvaBiblicaChatExport({
        submissionId,
        studyId,
        tema: study.tema || '',
        professorName: study.authorName || '',
        alunoName: user.displayName || user.email?.split('@')[0] || 'Aluno',
        notaTexto,
        resultUrl,
        itens
      })
      pushPendingChatExport(navigate, {
        exportKind: 'prova_biblica',
        exportPayload: serialized,
        previewText,
        suggestedPeerUid: study.authorUid
      })
      setEnviado(true)
      onToast?.('Abra o chat com o professor e toque em «Enviar agora».')
    } catch (e) {
      avisarAsync({
        titulo: 'Não foi possível enviar',
        mensagem: e?.message || 'Não foi possível enviar a avaliação.',
        severidade: 'error'
      })
    } finally {
      setEnviando(false)
    }
  }

  if (carregandoSessao) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (erroSessao) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {erroSessao}
      </Alert>
    )
  }

  if (!total || !q) return null

  if (fase === 'resultado') {
    const { obtida, max } = totais
    return (
      <Box>
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Resultado: {formatarNotaProvaPtBr(obtida)} de {formatarNotaProvaPtBr(max)} ponto
            {max === 1 ? '' : 's'}
          </Typography>
          <Typography variant="body2">
            Confira abaixo cada questão, a sua resposta e a resposta esperada.
          </Typography>
        </Alert>

        {itensResultado.map((it, i) => (
          <Paper key={i} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Questão {i + 1} · {formatarNotaProvaPtBr(it.pontosObtidos)}/
              {formatarNotaProvaPtBr(it.pontosQuestao)} pts
            </Typography>
            <Box sx={{ my: 1 }}>
              <TextoComReferencias texto={it.pergunta} style={baseTxt} />
            </Box>
            <Typography variant="body2" color={it.acertou ? 'success.main' : 'error.main'} fontWeight={600}>
              A sua resposta: {it.respostaAluno || '—'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Resposta esperada: {it.respostaCorreta || '—'}
            </Typography>
          </Paper>
        ))}

        <Divider sx={{ my: 2 }} />

        {!isAuthor && user?.uid ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : <Send />}
              disabled={enviando || enviado}
              onClick={() => setDialogEnviarChat(true)}
            >
              {enviado ? 'Envio preparado — finalize no chat' : 'Enviar para o Editor'}
            </Button>
            {enviado ? (
              <Typography variant="body2" color="text.secondary">
                Foi aberta a conversa sugerida com o autor do estudo. Toque em «Enviar agora» no topo do chat.
              </Typography>
            ) : null}
          </Box>
        ) : null}

        {isAuthor ? (
          <Typography variant="body2" color="text.secondary">
            Como autor deste estudo, o envio ao professor não está disponível nesta sessão.
          </Typography>
        ) : null}

        {!user?.uid ? (
          <Button variant="outlined" onClick={() => navigate('/chat')}>
            Entre para enviar a avaliação ao professor
          </Button>
        ) : null}
      </Box>
    )
  }

  return (
    <>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          Questão {indiceSeguro + 1} de {total}
        </Typography>
        <Box sx={{ mb: 2, textAlign: ta }}>
          <TextoComReferencias texto={String(q?.pergunta || '')} style={baseTxt} />
        </Box>

        {isVerResposta ? (
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="A sua resposta"
            value={escolhaAtual || ''}
            onChange={(e) => setEscolhas((prev) => ({ ...prev, [indiceSeguro]: e.target.value }))}
            sx={{ mt: 1 }}
            InputProps={{ readOnly: travado }}
            helperText={travado ? 'Resposta registrada — não pode ser alterada.' : undefined}
          />
        ) : (
          <FormControl component="fieldset" sx={{ width: '100%' }} disabled={travado}>
            <RadioGroup
              value={escolhaAtual || ''}
              onChange={(e) => setEscolhas((prev) => ({ ...prev, [indiceSeguro]: e.target.value }))}
            >
              {alts.map((alt) => (
                <FormControlLabel
                  key={alt.id}
                  value={alt.id}
                  control={<Radio size="small" />}
                  label={
                    <TextoComReferencias texto={alt.texto} inline component="span" style={baseTxt} />
                  }
                />
              ))}
            </RadioGroup>
            {travado ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Resposta registrada — não pode ser alterada.
              </Typography>
            ) : null}
          </FormControl>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, flexWrap: 'wrap', gap: 1 }}>
          <Button
            startIcon={<ArrowBack />}
            disabled={indiceSeguro === 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
          >
            Anterior
          </Button>
          {indiceSeguro < total - 1 ? (
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              disabled={!podeAvancar}
              onClick={() => {
                setIndicesTravados((prev) => ({ ...prev, [indiceSeguro]: true }))
                setIdx((i) => Math.min(total - 1, i + 1))
              }}
            >
              Próxima
            </Button>
          ) : (
            <Button variant="contained" color="success" disabled={!podeAvancar} onClick={abrirDialogConcluir}>
              Concluir avaliação
            </Button>
          )}
        </Box>
      </Paper>

      <Dialog open={dialogConcluir} onClose={() => setDialogConcluir(false)}>
        <DialogTitle>Concluir a avaliação?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Depois de confirmar, as respostas ficam definitivas e verá a nota (ex.: 8,0 / 10,0) e o gabarito de cada
            questão. Em seguida poderá enviar o resultado ao elaborador pelo chat.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogConcluir(false)}>Não</Button>
          <Button
            variant="contained"
            onClick={confirmarConcluir}
            disabled={concluindo}
            autoFocus
          >
            {concluindo ? 'Calculando…' : 'Sim, concluir'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogEnviarChat} onClose={() => { if (!enviando) setDialogEnviarChat(false) }}>
        <DialogTitle>Enviar ao elaborador?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Será aberta a conversa com o editor do estudo. A mensagem incluirá a nota (
            {formatarNotaProvaPtBr(totais.obtida)} / {formatarNotaProvaPtBr(totais.max)}), o link do resultado e um
            resumo das questões com as respostas e o gabarito. Confirma o envio?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogEnviarChat(false)} disabled={enviando}>
            Não
          </Button>
          <Button variant="contained" onClick={() => void enviarAoProfessor()} disabled={enviando} autoFocus>
            Sim, enviar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
