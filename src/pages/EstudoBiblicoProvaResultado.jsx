import { useState, useEffect } from 'react'
import { Box, Typography, Alert, CircularProgress, Paper, Button } from '@mui/material'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import TextoComReferencias from '../components/TextoComReferencias'
import { obterEntregaProvaBiblica } from '../services/bibliaEstudosService'
import { useApp } from '../contexts/AppContext'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { formatarNotaProvaPtBr } from '../utils/provaPontos'

export default function EstudoBiblicoProvaResultado() {
  const [searchParams] = useSearchParams()
  const id = String(searchParams.get('id') || '').trim()
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
  const [err, setErr] = useState(null)
  const [row, setRow] = useState(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setErr('Link inválido.')
      return
    }
    if (user === undefined) return

    let cancel = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        if (!user?.uid) {
          setErr('Faça login para ver o resultado desta avaliação.')
          setRow(null)
          return
        }
        const r = await obterEntregaProvaBiblica(id)
        if (cancel) return
        if (!r) {
          setErr('Resultado não encontrado ou sem permissão para ver.')
          setRow(null)
          return
        }
        if (r.professorUid !== user.uid && r.alunoUid !== user.uid) {
          setErr('Só o professor ou o aluno desta avaliação podem ver este resultado.')
          setRow(null)
          return
        }
        setRow(r)
      } catch (e) {
        if (!cancel) setErr(e?.message || 'Erro ao carregar.')
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [id, user])

  if (!isConfigured) {
    return (
      <Box sx={{ p: 2 }}>
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

  if (err || !row) {
    return (
      <Box sx={{ p: 2, maxWidth: 560, mx: 'auto' }}>
        <Alert severity="error">{err || 'Indisponível.'}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/estudos-biblicos')}>
          Voltar aos estudos
        </Button>
      </Box>
    )
  }

  const itens = Array.isArray(row.itens) ? row.itens : Object.values(row.itens || {})

  return (
    <Box sx={{ p: 2, pb: 8, maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Resultado da avaliação (somente leitura)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {row.tema || 'Estudo compartilhado'}
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
        <Typography variant="body2">
          <strong>Professor:</strong> {row.professorName || '—'}
        </Typography>
        <Typography variant="body2">
          <strong>Aluno:</strong> {row.alunoName || '—'}
        </Typography>
        <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 700 }}>
          Nota: {formatarNotaProvaPtBr(row.pontuacaoObtida)} / {formatarNotaProvaPtBr(row.pontuacaoMax)}
        </Typography>
        {row.resultUrl ? (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, wordBreak: 'break-all' }}>
            Link: {row.resultUrl}
          </Typography>
        ) : null}
      </Paper>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Questões e respostas
      </Typography>
      {itens.map((it, i) => (
        <Paper key={i} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Questão {i + 1} · {formatarNotaProvaPtBr(it.pontosObtidos)}/
            {formatarNotaProvaPtBr(it.pontosQuestao)} pts
          </Typography>
          <Box sx={{ my: 1 }}>
            <TextoComReferencias texto={String(it.pergunta || '')} style={leituraStyle} />
          </Box>
          <Typography variant="body2">
            <strong>Resposta do aluno:</strong> {String(it.respostaAluno || '—')}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            <strong>Resposta esperada:</strong> {String(it.respostaCorreta || '—')}
          </Typography>
        </Paper>
      ))}
    </Box>
  )
}
