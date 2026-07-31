import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  IconButton,
  Button
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import NavigateNext from '@mui/icons-material/NavigateNext'
import TextoComReferencias from '../components/TextoComReferencias'
import { confissaoFeData } from '../data/confissaoFe'
import { useTheme } from '@mui/material'
import { useApp } from '../contexts/AppContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import CapitulosListaCards from '../components/CapitulosListaCards'
import PageReadingShell from '../components/PageReadingShell'
import { HISTORIA_CONFISSAO_WESTMINSTER } from '../data/historiasWestminster'
import EditorialContentHeader from '../components/EditorialContentHeader'
import { EDITORIAL_IMAGES } from '../utils/editorialThemes'

export default function Confissao() {
  const theme = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const { fontSize, textAlign, fontFamily, lineHeight } = useApp()
  const ff = resolveFontFamily(fontFamily)
  const lh = readingLineHeightToCss(lineHeight)
  const topoRef = useRef(null)
  const [mostrarLista, setMostrarLista] = useState(true)
  const [capituloAtual, setCapituloAtual] = useState(() => {
    const savedCap = localStorage.getItem('confissaoCapitulo')
    const initialCap = savedCap ? parseInt(savedCap) : 1
    return confissaoFeData.find(cap => cap.capitulo === initialCap) || confissaoFeData[0]
  })

  // Resetar para lista quando navegar para esta página
  useEffect(() => {
    setMostrarLista(true)
  }, [location.pathname])

  // Deep link: /confissao?capitulo=3 (compatível com ?c=3)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const cap = Number(params.get('capitulo') ?? params.get('c'))
    if (!Number.isInteger(cap) || cap < 1) return
    const capData = confissaoFeData.find((item) => item.capitulo === cap)
    if (!capData) return
    setCapituloAtual(capData)
    localStorage.setItem('confissaoCapitulo', String(cap))
    setMostrarLista(false)
  }, [location.search])

  // Suporte ao botão voltar do celular: pushState e popstate
  useEffect(() => {
    const currentState = window.history.state
    const stateType = mostrarLista ? 'confissao-lista' : 'confissao-capitulo'

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

  useEffect(() => {
    if (!mostrarLista) {
      // Scroll imediato do window
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      
      // Scroll dos containers principais
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        if (topoRef.current) {
          topoRef.current.scrollIntoView({ behavior: 'auto', block: 'start' })
        }
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
  }, [capituloAtual, mostrarLista])

  // Atualiza localStorage quando mudar de capítulo
  const handleCapituloChange = (cap) => {
    setCapituloAtual(cap)
    localStorage.setItem('confissaoCapitulo', cap.capitulo.toString())
    setMostrarLista(false)
    navigate(`/confissao?capitulo=${cap.capitulo}`, { replace: true })
    window.history.pushState({ listaType: 'confissao-capitulo' }, '')
  }

  const handleVoltarLista = () => {
    setMostrarLista(true)
    navigate('/confissao', { replace: true })
  }

  // Se mostrarLista é true, mostra a lista de capítulos
  if (mostrarLista) {
    return (
      <CapitulosListaCards
        titulo="Confissão de Fé de Westminster"
        subtitulo="Leitura guiada por capítulos: doutrina, referências bíblicas e continuidade histórica."
        historia={HISTORIA_CONFISSAO_WESTMINSTER}
        etiqueta="Documento confessional"
        capitulos={confissaoFeData}
        capituloAtual={capituloAtual}
        onSelectCapitulo={handleCapituloChange}
        open={mostrarLista}
        gradient="linear-gradient(135deg, #123524 0%, #14532d 58%, #7c5d22 100%)"
      />
    )
  }

  return (
    <PageReadingShell maxWidth={820}>
      {/* Botão de voltar — fica acima da coluna de leitura e segue o padrão
          das demais páginas da família Westminster. */}
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleVoltarLista}
          sx={{ color: 'text.primary' }}
        >
          Voltar
        </Button>
      </Box>

      <Box ref={topoRef}>
        {/* Botões fixos de navegação capítulo a capítulo (laterais). */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          position: 'fixed',
          top: '50%',
          left: 0,
          right: 0,
          transform: 'translateY(-50%)',
          px: 1,
          zIndex: 1000
        }}>
          <IconButton
            onClick={() => {
              const capAnterior = confissaoFeData.find(cap => cap.capitulo === capituloAtual.capitulo - 1)
              if (capAnterior) {
                handleCapituloChange(capAnterior)
              }
            }}
            disabled={capituloAtual.capitulo === 1}
            sx={{
              bgcolor: '#004d40',
              opacity: 0.6,
              color: 'white',
              '&:hover': { bgcolor: '#004d40', opacity: 0.9 },
              '&.Mui-disabled': { opacity: 0.2 }
            }}
          >
            <NavigateBefore />
          </IconButton>

          <IconButton
            onClick={() => {
              const capProximo = confissaoFeData.find(cap => cap.capitulo === capituloAtual.capitulo + 1)
              if (capProximo) {
                handleCapituloChange(capProximo)
              }
            }}
            disabled={capituloAtual.capitulo === confissaoFeData.length}
            sx={{
              bgcolor: '#004d40',
              opacity: 0.6,
              color: 'white',
              '&:hover': { bgcolor: '#004d40', opacity: 0.9 },
              '&.Mui-disabled': { opacity: 0.2 }
            }}
          >
            <NavigateNext />
          </IconButton>
        </Box>

        <EditorialContentHeader
          title={`Capítulo ${capituloAtual.capitulo} - ${capituloAtual.titulo}`}
          subtitle="Confissão de Fé de Westminster"
          eyebrow="Westminster"
          image={EDITORIAL_IMAGES.westminster}
          imagePosition="center 36%"
          sx={{ mb: 2.5 }}
        />

        {capituloAtual.paragrafos.map((paragrafo) => (
          <Typography
            key={paragrafo.numero}
            component="p"
            sx={{
              mb: 2,
              color: theme.palette.text.primary,
              fontSize: `${fontSize}%`,
              textAlign: textAlign || 'left',
              fontFamily: ff,
              lineHeight: lh,
            }}
          >
            <TextoComReferencias
              texto={`${paragrafo.numero}. ${paragrafo.texto}`}
              inline
              style={{ fontSize: `${fontSize}%`, fontFamily: ff, lineHeight: lh }}
            />
          </Typography>
        ))}
      </Box>
    </PageReadingShell>
  )
}
