import { useEffect } from 'react'
import { Box, Dialog, Typography, Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { ehMedalhaCircularNaEscada, srcEscadaPorVariante } from '../utils/planoEscadaImagens'
import { dispararConfetePorTipo } from '../utils/celebracaoConfetti'

/** Evita confete duplicado (Strict Mode / re-render ao abrir outro diálogo) para a mesma celebração. */
let ultimoConfeteDisparadoParaChave = null

/**
 * Medalha / troféu em destaque + mensagem; arte em `public/medalhas-plano/`.
 * Confetes em viewport inteira (canvas global), acima do Dialog.
 */
export default function PlanoEscadaCelebracao({
  aberto,
  onFechar,
  mensagem,
  variante = 'bronze',
  eventoChave,
  tipoConfete,
  tituloDestaque,
}) {
  const theme = useTheme()
  const src = srcEscadaPorVariante(variante)
  const medalhaCircular = ehMedalhaCircularNaEscada(variante)

  useEffect(() => {
    if (!aberto || !eventoChave) {
      if (!eventoChave) ultimoConfeteDisparadoParaChave = null
      return
    }
    const tipo = tipoConfete
    if (!tipo || tipo === 'nenhum') return
    if (ultimoConfeteDisparadoParaChave === eventoChave) return

    const run = () => {
      ultimoConfeteDisparadoParaChave = eventoChave
      dispararConfetePorTipo(tipo, {
        zIndex: theme.zIndex.modal + 200,
      })
    }

    const t = requestAnimationFrame(() => {
      requestAnimationFrame(run)
    })
    return () => cancelAnimationFrame(t)
  }, [aberto, eventoChave, tipoConfete, theme.zIndex.modal])

  return (
    <Dialog
      open={aberto}
      onClose={onFechar}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'visible',
          bgcolor: 'transparent',
          boxShadow: 'none',
          backgroundImage: 'none',
          position: 'relative',
        },
      }}
      BackdropProps={{
        sx: { bgcolor: 'rgba(0,0,0,0.72)' },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          minHeight: { xs: 360, sm: 400 },
          py: 3,
          px: 2,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            pointerEvents: 'auto',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              maxWidth: '100%',
            }}
          >
            <Box
              component="img"
              src={src}
              alt=""
              sx={{
                display: 'block',
                width: medalhaCircular ? { xs: 200, sm: 240 } : { xs: 'auto', sm: 'auto' },
                maxWidth: 'min(92vw, 320px)',
                height: 'auto',
                maxHeight: medalhaCircular ? { xs: 200, sm: 240 } : { xs: 280, sm: 320 },
                objectFit: 'contain',
                filter: 'drop-shadow(0 14px 28px rgba(0,0,0,0.55))',
                animation: aberto ? 'plEscPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
                '@keyframes plEscPop': {
                  '0%': { transform: 'scale(0.2)', opacity: 0 },
                  '100%': { transform: 'scale(1)', opacity: 1 },
                },
              }}
            />
          </Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: 'common.white',
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              mb: 1,
            }}
          >
            {tituloDestaque || 'Parabéns!'}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.92)',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              maxWidth: 320,
              mb: 2,
            }}
          >
            {mensagem}
          </Typography>
          <Button variant="contained" color="inherit" onClick={onFechar} sx={{ fontWeight: 700 }}>
            Continuar
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}
