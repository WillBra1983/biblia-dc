import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Typography,
  Box,
  Divider,
  IconButton,
  Button
} from '@mui/material'
import NavigateNext from '@mui/icons-material/NavigateNext'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { breveCatecismo } from '../data/breveCatecismo'
import TextoComReferencias from '../components/TextoComReferencias'
import { useApp } from '../contexts/AppContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import CapitulosListaCards from '../components/CapitulosListaCards'
import PageReadingShell from '../components/PageReadingShell'
import { HISTORIA_CATECISMO_BREVE } from '../data/historiasWestminster'
import EditorialContentHeader from '../components/EditorialContentHeader'
import EditorialPageSurface from '../components/EditorialPageSurface'
import { EDITORIAL_IMAGES } from '../utils/editorialThemes'

export default function CatecismoBreve() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mostrarLista, setMostrarLista] = useState(true)
  const [perguntaAtual, setPerguntaAtual] = useState(() => {
    const saved = localStorage.getItem('catecismoBrevePergunta')
    return saved ? parseInt(saved) : 1
  })
  const { fontSize, textAlign, fontFamily, lineHeight } = useApp()
  const ff = resolveFontFamily(fontFamily)
  const lh = readingLineHeightToCss(lineHeight)

  // Resetar para lista quando navegar para esta página
  useEffect(() => {
    setMostrarLista(true)
  }, [location.pathname])

  // Deep link: /catecismo-breve?pergunta=12 (compatível com ?p=12)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const p = Number(params.get('pergunta') ?? params.get('p'))
    if (!Number.isInteger(p) || p < 1) return
    const existe = breveCatecismo.some((item) => item.numero === p)
    if (!existe) return
    setPerguntaAtual(p)
    localStorage.setItem('catecismoBrevePergunta', String(p))
    setMostrarLista(false)
  }, [location.search])

  // Quando estiver na lista, botão voltar deve voltar para o menu principal
  useEffect(() => {
    const currentState = window.history.state
    const stateType = mostrarLista ? 'catecismo-breve-lista' : 'catecismo-breve-pergunta'
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
    if (Array.isArray(refs)) {
      // Garante que cada referência esteja no formato correto
      return refs.map(ref => {
        // Remove espaços extras
        ref = ref.trim()
        // Corrige formato de capítulo e versículo
        ref = ref.replace(/(\d+)\.(\d+)/, '$1:$2')
        // Corrige referências com múltiplos versículos
        ref = ref.replace(/(\d+):(\d+)-(\d+)/, '$1:$2-$3')
        return ref
      })
    }
    // Se for string, divide e formata
    return refs
      .split(/[;,]/)
      .map(ref => ref.trim())
      .filter(Boolean)
      .map(ref => {
        ref = ref.trim()
        ref = ref.replace(/(\d+)\.(\d+)/, '$1:$2')
        ref = ref.replace(/(\d+):(\d+)-(\d+)/, '$1:$2-$3')
        return ref
      })
  }

  const pergunta = breveCatecismo.find(p => p.numero === perguntaAtual)
  
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
    localStorage.setItem('catecismoBrevePergunta', perg.numero.toString())
    setMostrarLista(false)
    navigate(`/catecismo-breve?pergunta=${perg.numero}`, { replace: true })
    window.history.pushState({ listaType: 'catecismo-breve-pergunta' }, '')
  }

  const handleVoltarLista = () => {
    setMostrarLista(true)
    navigate('/catecismo-breve', { replace: true })
  }

  // Se mostrarLista é true, mostra a lista de perguntas
  if (mostrarLista) {
    return (
      <CapitulosListaCards
        titulo="Catecismo Breve de Westminster"
        subtitulo="Síntese da fé cristã em perguntas e respostas para memorização, ensino e discipulado."
        historia={HISTORIA_CATECISMO_BREVE}
        etiqueta="Catecismo"
        capitulos={breveCatecismo}
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
          onClick={handleVoltarLista}
          sx={{ color: 'text.primary' }}
        >
          Voltar
        </Button>
      </Box>

      <EditorialContentHeader
        title={`Pergunta ${pergunta.numero}`}
        subtitle="Catecismo Breve de Westminster"
        eyebrow="Westminster"
        image={EDITORIAL_IMAGES.westminster}
        imagePosition="center 36%"
        sx={{ mb: 2 }}
      />

      <EditorialPageSurface
        sx={{
          width: '100%',
          boxSizing: 'border-box',
          p: { xs: 2, sm: 3, md: 4 }
        }}
      >
        <Box sx={{ width: '100%' }} key={perguntaAtual}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', position: 'fixed', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', px: 1, zIndex: 1000 }}>
              <IconButton
                onClick={() => {
                  const pergAnterior = breveCatecismo.find(p => p.numero === perguntaAtual - 1)
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
                  const pergProxima = breveCatecismo.find(p => p.numero === perguntaAtual + 1)
                  if (pergProxima) {
                    handlePerguntaChange(pergProxima)
                  }
                }}
                disabled={perguntaAtual === breveCatecismo.length}
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
            <Typography
              variant="body1"
              sx={{
                fontWeight: 'bold',
                mb: 3,
                color: 'inherit',
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
                color: 'inherit',
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
                  sx={{ textAlign: textAlign || 'left', color: 'inherit', fontFamily: ff, lineHeight: lh }}
                >
                  <TextoComReferencias 
                    texto={formatarReferencias(pergunta.referencias).join('; ')}
                    inline={true}
                    style={{ fontSize: `${fontSize}%`, fontFamily: ff, lineHeight: lh }}
                  />
                </Typography>
              </Box>
            )}
          </Box>
        </EditorialPageSurface>
    </PageReadingShell>
  )
}
