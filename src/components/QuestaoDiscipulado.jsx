import React, { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Box,
  Alert,
} from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import HandIcon from '@mui/icons-material/PanTool'
import TextoComReferencias from './TextoComReferencias'
import AudioPlayer from './AudioPlayer'
import { useApp } from '../contexts/AppContext'
import { readingLineHeightToCss } from '../utils/readingLineHeight'

export default function QuestaoDiscipulado({
  questao,
  onNext,
  onPrev,
  isFirst,
  isLast,
  resposta,
  onResponder,
  numero,
  onConcluirLicao,
  audioUrl,
}) {
  const { textAlign, lineHeight } = useApp()
  const ta = textAlign || 'left'
  const lh = readingLineHeightToCss(lineHeight)
  const [respostaAtual, setRespostaAtual] = useState(resposta || '')
  const [mostrarExplicacao, setMostrarExplicacao] = useState(false)
  const explicacaoRef = React.useRef(null)

  const respostaCorreta = React.useMemo(() => {
    return questao?.alternativas?.find((alt) => alt.correta)?.id
  }, [questao])

  useEffect(() => {
    setRespostaAtual(resposta || '')
    const jaRespondida = resposta !== undefined && resposta !== ''
    setMostrarExplicacao(jaRespondida)
  }, [questao, resposta])

  useEffect(() => {
    if (mostrarExplicacao && explicacaoRef.current) {
      explicacaoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [mostrarExplicacao])

  const handleChange = (event) => {
    const novaResposta = event.target.value
    setRespostaAtual(novaResposta)
    if (mostrarExplicacao) {
      setMostrarExplicacao(false)
    }
  }

  const handleVerificar = () => {
    if (!respostaAtual) return
    if (onResponder) {
      onResponder(respostaAtual)
    }
    setMostrarExplicacao(true)
  }

  if (!questao?.alternativas?.length) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="error">Erro: Questão sem alternativas</Typography>
      </Paper>
    )
  }

  const respostaRevelada = mostrarExplicacao

  return (
    <Paper sx={{ p: 3, position: 'relative', mb: 2, lineHeight: lh }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="span">
          Questão {numero}
        </Typography>
        {respostaAtual && !mostrarExplicacao && (
          <HandIcon color="primary" sx={{ ml: 1, transform: 'rotate(-45deg)' }} />
        )}
      </Box>

      <Box sx={{ mb: 3, textAlign: ta }}>
        <Typography variant="h6" gutterBottom sx={{ lineHeight: lh }}>
          {questao.pergunta}
        </Typography>

        {questao.referencias?.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <TextoComReferencias
              texto={questao.referencias.join('; ')}
              variant="references"
              style={{ textAlign: ta, lineHeight: lh }}
            />
          </Box>
        )}
        {audioUrl && (
          <Box sx={{ mt: 2 }}>
            <AudioPlayer url={audioUrl} label="Ouvir questão" />
          </Box>
        )}
      </Box>

      <FormControl component="fieldset" sx={{ width: '100%', textAlign: ta }}>
        <RadioGroup value={respostaAtual} onChange={handleChange}>
          {questao.alternativas.map((alt) => (
            <FormControlLabel
              key={alt.id}
              value={alt.id}
              control={<Radio />}
              label={alt.texto}
              sx={{
                mb: 1,
                ...(respostaRevelada && {
                  color: alt.correta ? 'success.main' : 'error.main',
                  fontWeight: alt.correta ? 'bold' : 'normal',
                }),
              }}
            />
          ))}
        </RadioGroup>
      </FormControl>

      {mostrarExplicacao && (
        <Box ref={explicacaoRef} data-explicacao sx={{ mt: 3, mb: 2 }}>
          <Alert
            severity={respostaAtual === respostaCorreta ? 'success' : 'error'}
            sx={{ mb: 2 }}
          >
            {respostaAtual === respostaCorreta ? 'Resposta correta!' : 'Resposta incorreta.'}
          </Alert>
          <Typography variant="subtitle1" gutterBottom>
            Explicação:
          </Typography>
          <Box sx={{ textAlign: ta }}>
            {questao.explicacao.split('\n\n').map((paragrafo, index) => (
              <Box
                key={index}
                sx={{
                  mb: 2,
                  textAlign: ta,
                  ...((paragrafo.startsWith('📚') ||
                    paragrafo.startsWith('✍️') ||
                    paragrafo.startsWith('✝️') ||
                    paragrafo.startsWith('🌿')) && {
                    bgcolor: 'rgba(0, 0, 0, 0.03)',
                    p: 2,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                  }),
                }}
              >
                <TextoComReferencias
                  texto={paragrafo}
                  component="span"
                  inline={true}
                  variant="default"
                  style={{ textAlign: ta, lineHeight: lh }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button
          onClick={onPrev}
          disabled={isFirst}
          startIcon={<ArrowBack />}
          size="small"
          sx={{
            minWidth: { xs: 'auto', sm: 100 },
            px: { xs: 1, sm: 2 },
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          }}
        >
          Anterior
        </Button>
        {!mostrarExplicacao ? (
          <Button
            onClick={handleVerificar}
            variant="contained"
            disabled={!respostaAtual}
            size="small"
            sx={{
              minWidth: { xs: 'auto', sm: 140 },
              px: { xs: 1, sm: 2 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            }}
          >
            Confirmar resposta
          </Button>
        ) : isLast ? (
          <Button
            onClick={onConcluirLicao}
            variant="contained"
            color="success"
            size="small"
            sx={{
              minWidth: { xs: 'auto', sm: 140 },
              px: { xs: 1, sm: 2 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            }}
          >
            Concluir Lição
          </Button>
        ) : (
          <Button
            onClick={onNext}
            variant="contained"
            size="small"
            sx={{
              minWidth: { xs: 'auto', sm: 140 },
              px: { xs: 1, sm: 2 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            }}
          >
            Próxima
          </Button>
        )}
      </Box>
    </Paper>
  )
}
