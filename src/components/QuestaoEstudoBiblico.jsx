import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Paper,
  Typography,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Box,
  Alert
} from '@mui/material'
import ArrowBack from '@mui/icons-material/ArrowBack'
import ArrowForward from '@mui/icons-material/ArrowForward'
import CheckCircle from '@mui/icons-material/CheckCircle'
import TextoComReferencias from './TextoComReferencias'
import { useApp } from '../contexts/AppContext'
import { readingLineHeightToCss } from '../utils/readingLineHeight'

import { montarAlternativasEstudoBiblico } from '../utils/questoesAlternativas'

export default function QuestaoEstudoBiblico({
  questao,
  numero,
  total,
  indice,
  lineHeight: lineHeightProp,
  onNext,
  onPrev,
  isFirst,
  isLast,
  onConcluir
}) {
  const { textAlign, lineHeight, fontSize, fontFamily } = useApp()
  const ta = textAlign || 'left'
  const lh = readingLineHeightToCss(lineHeightProp ?? lineHeight)
  const fs = `${fontSize || 100}%`
  const ff = fontFamily || undefined
  const baseTxt = { lineHeight: lh, textAlign: ta, fontSize: fs, ...(ff ? { fontFamily: ff } : {}) }
  const [escolha, setEscolha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const exRef = useRef(null)
  const tipo = String(questao?.tipo || '').toLowerCase()
  const isVerResposta = tipo === 'ver_resposta'
  const isVerdadeiroFalso = tipo === 'verdadeiro_falso'
  const isMultipla = !isVerResposta && !isVerdadeiroFalso

  const alternativas = useMemo(() => {
    if (isVerResposta) return []
    if (Array.isArray(questao?.alternativas) && questao.alternativas.length > 0) {
      return questao.alternativas
    }
    return montarAlternativasEstudoBiblico(questao)
  }, [questao, isVerResposta])

  const escolhaItem = alternativas.find((a) => a.id === escolha)
  const acertou = Boolean(escolhaItem?.correta)

  useEffect(() => {
    setEscolha('')
    setMostrar(false)
  }, [questao])

  useEffect(() => {
    if (mostrar && exRef.current) {
      exRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [mostrar])

  if (!isVerResposta && !alternativas.length) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography color="text.secondary">Questão sem alternativas válidas.</Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ p: 3, mb: 2, lineHeight: lh, color: 'text.primary' }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Pergunta {indice + 1} de {total}
      </Typography>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ textAlign: ta }}>
        {numero ? `Questão ${numero}` : 'Questão'}
      </Typography>
      <Box sx={{ mb: 2, textAlign: ta }}>
        <TextoComReferencias texto={String(questao?.pergunta || '')} style={baseTxt} />
      </Box>

      {isMultipla || isVerdadeiroFalso ? (
        <FormControl component="fieldset" sx={{ width: '100%', textAlign: ta, color: 'text.primary' }}>
          <RadioGroup
            value={escolha}
            onChange={(e) => {
              if (mostrar) return
              setEscolha(e.target.value)
            }}
          >
            {alternativas.map((alt) => (
              <FormControlLabel
                key={alt.id}
                value={alt.id}
                control={<Radio size="small" />}
                disabled={mostrar}
                sx={{
                  alignItems: 'flex-start',
                  ml: 0,
                  mb: 0.5,
                  ...(mostrar && {
                    color: alt.correta ? 'success.main' : escolha === alt.id ? 'error.main' : 'text.secondary'
                  })
                }}
                label={
                  <Box component="span" sx={{ display: 'block', pt: 0.25 }}>
                    <TextoComReferencias
                      texto={alt.texto}
                      inline
                      component="span"
                      style={baseTxt}
                    />
                  </Box>
                }
              />
            ))}
          </RadioGroup>
        </FormControl>
      ) : null}

      {mostrar && (
        <Box ref={exRef} sx={{ mt: 2 }}>
          {!isVerResposta ? (
            <Alert severity={acertou ? 'success' : 'error'} sx={{ mb: 1 }}>
              {acertou ? 'Resposta correta.' : 'Resposta incorreta.'}
            </Alert>
          ) : null}
          {(isVerResposta || !acertou) && questao?.respostaCerta ? (
            <Alert severity="info" sx={{ mb: 1 }}>
              Resposta: {String(questao.respostaCerta)}
            </Alert>
          ) : null}
          {questao?.explicacao ? (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Explicação
              </Typography>
              <Box sx={{ textAlign: ta }}>
                <TextoComReferencias texto={String(questao.explicacao)} style={baseTxt} />
              </Box>
            </>
          ) : null}
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, flexWrap: 'wrap', gap: 1 }}>
        <Button
          onClick={onPrev}
          disabled={isFirst}
          startIcon={<ArrowBack />}
          size="small"
          sx={{ minWidth: { xs: 'auto', sm: 100 } }}
        >
          Anterior
        </Button>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', flex: 1 }}>
          {mostrar && (
            <Button
              size="small"
              onClick={() => {
                setEscolha('')
                setMostrar(false)
              }}
            >
              Tentar de novo
            </Button>
          )}

          {!mostrar ? (
            <Button
              variant="contained"
              disabled={!isVerResposta && !escolha}
              onClick={() => setMostrar(true)}
              size="small"
            >
              {isVerResposta ? 'Ver resposta' : 'Verificar'}
            </Button>
          ) : isLast ? (
            <Button
              variant="contained"
              color="success"
              onClick={onConcluir}
              size="small"
              startIcon={<CheckCircle />}
              sx={{ minWidth: { xs: 'auto', sm: 140 } }}
            >
              Concluir estudo
            </Button>
          ) : (
            <Button variant="contained" onClick={onNext} size="small" endIcon={<ArrowForward />} sx={{ minWidth: { xs: 'auto', sm: 140 } }}>
              Próxima
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  )
}
