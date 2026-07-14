import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Typography,
  Box,
  Paper,
  Divider,
  IconButton,
  Button
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import NavigateNext from '@mui/icons-material/NavigateNext'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import { catecismoMaior } from '../data/catecismoMaior'
import TextoComReferencias from '../components/TextoComReferencias'
import { useApp } from '../contexts/AppContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import CapitulosListaCards from '../components/CapitulosListaCards'
import PageReadingShell from '../components/PageReadingShell'
import { HISTORIA_CATECISMO_MAIOR } from '../data/historiasWestminster'

export default function CatecismoMaior() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mostrarLista, setMostrarLista] = useState(true)
  const [perguntaAtual, setPerguntaAtual] = useState(() => {
    const saved = localStorage.getItem('catecismoMaiorPergunta')
    return saved ? parseInt(saved) : 1
  })
  const { fontSize, textAlign, fontFamily, lineHeight } = useApp()
  const ff = resolveFontFamily(fontFamily)
  const lh = readingLineHeightToCss(lineHeight)

  // Resetar para lista quando navegar para esta página
  useEffect(() => {
    setMostrarLista(true)
  }, [location.pathname])

  // Deep link: /catecismo-maior?pergunta=45 (compatível com ?p=45)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const p = Number(params.get('pergunta') ?? params.get('p'))
    if (!Number.isInteger(p) || p < 1) return
    const existe = catecismoMaior.some((item) => item.numero === p)
    if (!existe) return
    setPerguntaAtual(p)
    localStorage.setItem('catecismoMaiorPergunta', String(p))
    setMostrarLista(false)
  }, [location.search])

  // Quando estiver na lista, botão voltar deve voltar para o menu principal
  useEffect(() => {
    const currentState = window.history.state
    const stateType = mostrarLista ? 'catecismo-maior-lista' : 'catecismo-maior-pergunta'
    if (!currentState?.listaType || currentState.listaType !== stateType) {
      window.history.pushState({ listaType: stateType }, '')
    }
    const handlePopState = () => {
      if (mostrarLista) {
        navigate('/biblia')
      } else {
        setMostrarLista(true)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [mostrarLista, navigate])

  const formatarReferencias = (refs) => {
    if (!refs) return []
    const normalizar = (ref) => {
      const t = String(ref).trim()
        .replace(/(\d+)\.(\d+)/g, '$1:$2')
        .replace(/(\d+):(\d+)-(\d+)/g, '$1:$2-$3')
      return t
    }
    if (Array.isArray(refs)) return refs.map(normalizar)
    return refs.split(/[;,]/).map(normalizar).filter(Boolean)
  }

  const pergunta = catecismoMaior.find(p => p.numero === perguntaAtual)
  
  useEffect(() => {
    if (!mostrarLista) {
      // Scroll imediato do window
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      
      // Scroll dos containers principais
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        document.querySelectorAll('main.MuiBox-root').forEach(el => {
          el.scrollTop = 0
        })
        // Scroll de qualquer container com overflow
        document.querySelectorAll('[style*="overflow"], [class*="overflow"]').forEach(el => {
          if (el.scrollTop !== undefined) {
            el.scrollTop = 0
          }
        })
      }, 50)
    }
  }, [perguntaAtual, mostrarLista])

  const handlePerguntaChange = (perg) => {
    setPerguntaAtual(perg.numero)
    localStorage.setItem('catecismoMaiorPergunta', perg.numero.toString())
    setMostrarLista(false)
    navigate(`/catecismo-maior?pergunta=${perg.numero}`, { replace: true })
    window.history.pushState({ listaType: 'catecismo-maior-pergunta' }, '')
  }

  const handleVoltarLista = () => {
    setMostrarLista(true)
  }

  // Se mostrarLista é true, mostra a lista de perguntas
  if (mostrarLista) {
    return (
      <CapitulosListaCards
        titulo="Catecismo Maior de Westminster"
        subtitulo="Perguntas e respostas com profundidade doutrinária para estudo, ensino e revisão pessoal."
        historia={HISTORIA_CATECISMO_MAIOR}
        etiqueta="Catecismo"
        capitulos={catecismoMaior}
        capituloAtual={pergunta}
        onSelectCapitulo={handlePerguntaChange}
        open={mostrarLista}
        gradient="linear-gradient(135deg, #0f3a1d 0%, #14532d 58%, #1e3a5f 100%)"
      />
    )
  }

  return (
    <PageReadingShell maxWidth={820}>
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => window.history.back()}
          sx={{ color: 'text.primary' }}
        >
          Voltar
        </Button>
      </Box>

      <Box sx={{ position: 'relative', width: '100%' }} key={perguntaAtual}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', position: 'fixed', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', px: 1, zIndex: 1000 }}>
            <IconButton
              onClick={() => {
                const pergAnterior = catecismoMaior.find(p => p.numero === perguntaAtual - 1)
                if (pergAnterior) {
                  handlePerguntaChange(pergAnterior)
                }
              }}
              disabled={perguntaAtual === 1}
              sx={{ 
                bgcolor: '#004d40',
                opacity: 0.6,
                color: 'white',
                '&:hover': { 
                  bgcolor: '#004d40',
                  opacity: 0.9 
                },
                '&.Mui-disabled': {
                  opacity: 0.2
                }
              }}
            >
              <NavigateBefore />
            </IconButton>

            <IconButton
              onClick={() => {
                const pergProxima = catecismoMaior.find(p => p.numero === perguntaAtual + 1)
                if (pergProxima) {
                  handlePerguntaChange(pergProxima)
                }
              }}
              disabled={perguntaAtual === catecismoMaior.length}
              sx={{ 
                bgcolor: '#004d40',
                opacity: 0.6,
                color: 'white',
                '&:hover': { 
                  bgcolor: '#004d40',
                  opacity: 0.9 
                },
                '&.Mui-disabled': {
                  opacity: 0.2
                }
              }}
            >
              <NavigateNext />
            </IconButton>
          </Box>
          <Paper
            elevation={2}
            sx={{
              bgcolor: 'background.paper',
              width: '100%',
              boxSizing: 'border-box',
              p: { xs: 2, sm: 3, md: 4 }
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                color: 'text.primary',
                fontSize: `${fontSize}%`,
                textAlign: textAlign || 'left',
                fontFamily: ff,
                lineHeight: lh,
              }}
            >
              {pergunta.numero}. {pergunta.pergunta}
            </Typography>

            <Typography 
              component="div"
              sx={{ 
                textAlign: textAlign || 'left',
                mt: 2,
                color: 'text.primary',
                fontFamily: ff,
                lineHeight: lh,
              }}
            >
              <TextoComReferencias texto={pergunta.resposta} style={{ fontSize: `${fontSize}%`, fontFamily: ff, lineHeight: lh }} />
            </Typography>

            {pergunta.referencias && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ my: 1 }} />
                <Typography 
                  variant="body2" 
                  sx={{
                    color: 'text.primary',
                    textAlign: textAlign || 'left',
                    fontFamily: ff,
                    lineHeight: lh,
                    '& > span': {
                      color: 'primary.main',
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }
                  }}
                >
                  <TextoComReferencias 
                    texto={formatarReferencias(pergunta.referencias).join('; ')}
                    inline={true}
                    style={{ fontSize: `${fontSize}%`, fontFamily: ff, lineHeight: lh }}
                  />
                </Typography>
              </Box>
            )}
          </Paper>
      </Box>
    </PageReadingShell>
  )
} 