import { useEffect, useState } from 'react'
import { Box, Fade, IconButton, Stack, Typography } from '@mui/material'
import FormatBold from '@mui/icons-material/FormatBold'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import NavigateNext from '@mui/icons-material/NavigateNext'
import Close from '@mui/icons-material/Close'
import Fullscreen from '@mui/icons-material/Fullscreen'
import FullscreenExit from '@mui/icons-material/FullscreenExit'
import LeituraConfigButton from './LeituraConfigButton'
import { CORES_APRESENTACAO_LEITURA } from '../constants/apresentacaoCores'
import { useLeituraApresentacao } from '../contexts/LeituraApresentacaoContext'

const TEXTO_UI = '#ffffff'

/**
 * Barra inferior do modo apresentação (hinário em slides e Bíblia).
 */
export default function BarraFormatacaoApresentacao({
  navegacao = null,
  onSair = null,
  fullscreen = false,
  onToggleFullscreen = null,
  /** { modo: 'versiculo'|'pericope', onAlternarModo: (modo) => void } */
  modoBiblia = null,
  zIndex = 1400,
}) {
  const { corLetra, negrito, setCorLetra, toggleNegrito } = useLeituraApresentacao()
  const [uiVisivel, setUiVisivel] = useState(true)

  useEffect(() => {
    let timer
    const mostrar = () => {
      setUiVisivel(true)
      clearTimeout(timer)
      timer = window.setTimeout(() => setUiVisivel(false), 4000)
    }
    window.addEventListener('mousemove', mostrar)
    window.addEventListener('touchstart', mostrar, { passive: true })
    mostrar()
    return () => {
      window.removeEventListener('mousemove', mostrar)
      window.removeEventListener('touchstart', mostrar)
      clearTimeout(timer)
    }
  }, [])

  const abrirConfigLeitura = () => {
    window.dispatchEvent(new Event('salvation-abrir-leitura-config'))
  }

  return (
    <>
      <LeituraConfigButton hidden />
      <Fade in={uiVisivel}>
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex,
            borderTop: '1px solid rgba(255,255,255,0.15)',
            bgcolor: 'rgba(0,0,0,0.2)',
            pb: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            flexWrap="wrap"
            gap={0.75}
            sx={{ px: 1, py: 0.75 }}
          >
            <IconButton
              onClick={toggleNegrito}
              aria-label={negrito ? 'Desativar negrito' : 'Ativar negrito'}
              sx={{
                color: TEXTO_UI,
                bgcolor: negrito ? 'rgba(255,255,255,0.22)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.35)',
              }}
            >
              <FormatBold />
            </IconButton>

            {CORES_APRESENTACAO_LEITURA.map(({ cor, corLivro, label }) => {
              const ativa = corLetra.toLowerCase() === cor.toLowerCase()
              return (
                <IconButton
                  key={cor}
                  size="small"
                  onClick={() => setCorLetra(cor)}
                  aria-label={`Tema ${label}: texto ${label}, livro contrastante`}
                  sx={{
                    p: 0.35,
                    border: ativa ? '2px solid #fff' : '1px solid rgba(255,255,255,0.4)',
                    borderRadius: '50%',
                  }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      display: 'flex',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                      border: '1px solid rgba(255,255,255,0.35)',
                    }}
                  >
                    <Box sx={{ flex: 1, bgcolor: cor }} aria-hidden />
                    <Box sx={{ flex: 1, bgcolor: corLivro }} aria-hidden />
                  </Box>
                </IconButton>
              )
            })}

            <IconButton
              onClick={abrirConfigLeitura}
              aria-label="Tamanho e fonte (Aa)"
              sx={{
                color: TEXTO_UI,
                fontWeight: 800,
                fontFamily: '"Source Serif 4", Georgia, serif',
                fontSize: '1.05rem',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 1,
                px: 1,
              }}
            >
              Aa
            </IconButton>

            {modoBiblia ? (
              <>
                <IconButton
                  size="small"
                  onClick={() => modoBiblia.onAlternarModo?.('versiculo')}
                  aria-label="Um versículo por slide"
                  sx={{
                    color: TEXTO_UI,
                    fontWeight: modoBiblia.modo === 'versiculo' ? 800 : 500,
                    fontSize: '0.72rem',
                    border: '1px solid rgba(255,255,255,0.35)',
                    borderRadius: 1,
                    px: 0.85,
                    bgcolor:
                      modoBiblia.modo === 'versiculo' ? 'rgba(255,255,255,0.22)' : 'transparent',
                  }}
                >
                  Versículo
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => modoBiblia.onAlternarModo?.('pericope')}
                  aria-label="Um bloco de perícope por slide"
                  sx={{
                    color: TEXTO_UI,
                    fontWeight: modoBiblia.modo === 'pericope' ? 800 : 500,
                    fontSize: '0.72rem',
                    border: '1px solid rgba(255,255,255,0.35)',
                    borderRadius: 1,
                    px: 0.85,
                    bgcolor:
                      modoBiblia.modo === 'pericope' ? 'rgba(255,255,255,0.22)' : 'transparent',
                  }}
                >
                  Perícope
                </IconButton>
              </>
            ) : null}
          </Stack>

          {(navegacao || onSair || onToggleFullscreen) && (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 1, pb: 1 }}
            >
              {onSair ? (
                <IconButton onClick={onSair} sx={{ color: TEXTO_UI }} aria-label="Sair">
                  <Close />
                </IconButton>
              ) : (
                <Box sx={{ width: 40 }} />
              )}

              {navegacao ? (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <IconButton
                    onClick={navegacao.onPrev}
                    disabled={navegacao.prevDisabled}
                    sx={{ color: TEXTO_UI }}
                    aria-label="Anterior"
                  >
                    <NavigateBefore />
                  </IconButton>
                  <Typography variant="body2" sx={{ minWidth: 88, textAlign: 'center', color: TEXTO_UI }}>
                    {navegacao.label} ({navegacao.index + 1}/{navegacao.total})
                  </Typography>
                  <IconButton
                    onClick={navegacao.onNext}
                    disabled={navegacao.nextDisabled}
                    sx={{ color: TEXTO_UI }}
                    aria-label="Próximo"
                  >
                    <NavigateNext />
                  </IconButton>
                </Stack>
              ) : (
                <Box sx={{ flex: 1 }} />
              )}

              {onToggleFullscreen ? (
                <IconButton
                  onClick={onToggleFullscreen}
                  sx={{ color: TEXTO_UI }}
                  aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                >
                  {fullscreen ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>
              ) : (
                <Box sx={{ width: 40 }} />
              )}
            </Stack>
          )}
        </Box>
      </Fade>
    </>
  )
}
