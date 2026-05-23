import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Typography, Box, Slider } from '@mui/material'
import { buscarIntervaloVersiculos, buscarPericopes } from '../services/bibliaService'
import ReferenciasPericope from './ReferenciasPericope'
import ReferenciasParalelasDialog from './ReferenciasParalelasDialog'
import { useApp } from '../contexts/AppContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { usePinchNumeric } from '../hooks/usePinchNumeric'

export default function TextoBiblico({ livroId, capitulo }) {
  const { isDarkMode, fontFamily, textAlign, lineHeight, semEspacoEntreVersiculos } = useApp()
  const compacto = !!semEspacoEntreVersiculos
  const lhCss = readingLineHeightToCss(lineHeight)
  const [versiculos, setVersiculos] = React.useState([])
  const [pericopes, setPericopes] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [erro, setErro] = React.useState(null)
  const [zoom, setZoom] = useState(100)
  const [refParalelaFragmento, setRefParalelaFragmento] = useState(null)
  const pinchRootRef = useRef(null)

  useEffect(() => {
    setZoom(100)
  }, [livroId, capitulo])

  const onPinchZoom = useCallback((v) => setZoom(v), [])
  usePinchNumeric(pinchRootRef, {
    enabled: true,
    value: zoom,
    onChange: onPinchZoom,
    min: 100,
    max: 200,
    step: 10,
  })

  React.useEffect(() => {
    const carregarConteudo = async () => {
      try {
        setLoading(true)
        setErro(null)
        
        // Carregar versículos e perícopes em paralelo
        const [resultadoVersiculos, pericopesCapitulo] = await Promise.all([
          buscarIntervaloVersiculos(livroId, capitulo, 1, 999),
          buscarPericopes(livroId, capitulo)
        ])
        
        setVersiculos(resultadoVersiculos.versiculos || [])
        setPericopes(pericopesCapitulo || [])
      } catch (error) {
        setErro('Erro ao carregar conteúdo')
      } finally {
        setLoading(false)
      }
    }
    carregarConteudo()
  }, [livroId, capitulo])

  // Vários títulos no mesmo versículo ficam em ordem no array.
  const pericopesPorVersiculo = React.useMemo(() => {
    return pericopes.reduce((map, pericope) => {
      const titulo = pericope.titulo ? String(pericope.titulo).trim() : ''
      if (!titulo) return map
      const refStr = pericope.referencias != null ? String(pericope.referencias).trim() : ''
      const v = pericope.versiculo
      if (!map[v]) map[v] = []
      map[v].push({
        titulo,
        referencias: refStr || null
      })
      return map
    }, {})
  }, [pericopes])

  const resolvedFontFamily = React.useMemo(() => resolveFontFamily(fontFamily), [fontFamily])
  return (
    <Box
      ref={pinchRootRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        width: '100%',
        bgcolor: isDarkMode ? 'black' : 'white',
        color: isDarkMode ? 'white' : 'black'
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: { xs: 2, sm: 3 }
        }}
      >
        {versiculos.map((versiculo) => (
          <React.Fragment key={versiculo.numero}>
            {pericopesPorVersiculo[versiculo.numero]?.length > 0 &&
              pericopesPorVersiculo[versiculo.numero].map((info, pi) => (
                <Box
                  key={`${versiculo.numero}-${pi}`}
                  sx={{
                    mb:
                      pi < pericopesPorVersiculo[versiculo.numero].length - 1
                        ? compacto
                          ? 0.75
                          : 1.25
                        : compacto
                          ? 1
                          : 2,
                    mt: compacto ? (pi === 0 ? 2 : 1.25) : pi === 0 ? 3 : 1.5,
                    borderBottom:
                      pi === pericopesPorVersiculo[versiculo.numero].length - 1
                        ? '1px solid'
                        : 'none',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)',
                    pb: compacto ? 0.5 : 1,
                    textAlign: textAlign || 'left'
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: `${zoom * 1.55}%`,
                      fontWeight: 600,
                      fontStyle: 'italic',
                      fontFamily: resolvedFontFamily,
                      color: isDarkMode ? 'white' : 'black'
                    }}
                  >
                    {info.titulo}
                  </Typography>
                  {info.referencias && (
                    <ReferenciasPericope
                      texto={info.referencias}
                      onClickRef={(seg) => setRefParalelaFragmento(seg)}
                      sx={{
                        fontSize: `${zoom * 1.05}%`,
                        fontFamily: resolvedFontFamily,
                        color: isDarkMode ? 'primary.light' : 'primary.main',
                        textAlign: textAlign || 'left'
                      }}
                    />
                  )}
                </Box>
              ))}
            <Typography
              sx={{
                mb: compacto ? 0 : 2,
                fontSize: `${zoom}%`,
                lineHeight: lhCss,
                fontFamily: resolvedFontFamily,
                textAlign: textAlign || 'left',
                color: isDarkMode ? 'white' : 'black'
              }}
            >
              {versiculo.texto}
            </Typography>
          </React.Fragment>
        ))}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          bgcolor: 'grey.900',
          color: 'white',
          px: 3,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          justifyContent: 'center',
          pb: 'calc(1.5 * 8px + env(safe-area-inset-bottom, 0px))'
        }}
      >
        <Slider
          value={zoom}
          min={100}
          max={200}
          step={10}
          onChange={(_, value) => {
            if (typeof value === 'number') setZoom(value)
          }}
          sx={{
            width: 120,
            color: 'white',
            '& .MuiSlider-rail': { bgcolor: 'grey.600' }
          }}
        />
        <Typography sx={{ minWidth: 45 }}>{zoom}%</Typography>
      </Box>

      <ReferenciasParalelasDialog
        open={Boolean(refParalelaFragmento)}
        fragmento={refParalelaFragmento}
        onClose={() => setRefParalelaFragmento(null)}
        fontFamily={fontFamily}
      />
    </Box>
  )
}