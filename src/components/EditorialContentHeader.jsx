import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextoComReferencias from './TextoComReferencias'

function camadasImagem(image) {
  if (!image) return undefined

  const principal = String(image)
  const indiceMenuFundos = principal.indexOf('/menu-fundos/')
  const alternativaRaiz = indiceMenuFundos >= 0 ? principal.slice(indiceMenuFundos) : ''

  // O site roda sob /biblia/, enquanto os apps nativos usam a raiz. A segunda
  // camada preserva a imagem em servidores antigos que ainda expõem os assets na raiz.
  return alternativaRaiz && alternativaRaiz !== principal
    ? `url("${principal}"), url("${alternativaRaiz}")`
    : `url("${principal}")`
}

export default function EditorialContentHeader({
  title,
  subtitle,
  eyebrow,
  image,
  imagePosition = 'center',
  sx,
}) {
  if (!title) return null

  return (
    <Box
      component="header"
      sx={{
        position: 'relative',
        minHeight: { xs: 238, sm: 270 },
        overflow: 'hidden',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#e8e5dc',
        backgroundImage: camadasImagem(image),
        backgroundSize: 'cover',
        backgroundPosition: imagePosition,
        boxShadow: '0 6px 18px rgba(17, 51, 38, 0.1)',
        display: 'flex',
        alignItems: 'flex-end',
        isolation: 'isolate',
        ...sx,
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: -1,
          bgcolor: 'rgba(8, 31, 24, 0.08)',
        }}
      />
      <Box
        sx={{
          width: '100%',
          minHeight: { xs: 124, sm: 136 },
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.4 },
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,253,247,0.08) 100%)',
          color: '#123d33',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {eyebrow ? (
          <Typography
            component="div"
            sx={{
              mb: 0.6,
              color: '#85631b',
              fontSize: '0.76rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 0,
              textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 1px 4px rgba(255,255,255,0.9)',
            }}
          >
            <TextoComReferencias
              texto={eyebrow}
              inline
              component="span"
              style={{ color: 'inherit', font: 'inherit', textTransform: 'inherit' }}
            />
          </Typography>
        ) : null}

        <Typography
          component="h1"
          sx={{
            m: 0,
            color: '#123d33',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: { xs: '1.42rem', sm: '1.82rem' },
            fontWeight: 700,
            lineHeight: 1.18,
            letterSpacing: 0,
            overflowWrap: 'anywhere',
            textShadow: '-1px -1px 0 rgba(255,255,255,0.98), 1px -1px 0 rgba(255,255,255,0.98), -1px 1px 0 rgba(255,255,255,0.98), 1px 1px 0 rgba(255,255,255,0.98), 0 2px 6px rgba(255,255,255,0.92)',
          }}
        >
          <TextoComReferencias
            texto={title}
            inline
            component="span"
            style={{ color: 'inherit', font: 'inherit', lineHeight: 'inherit' }}
          />
        </Typography>

        {subtitle ? (
          <Typography
            component="p"
            sx={{
              mt: 0.65,
              mb: 0,
              color: '#6f5421',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: { xs: '0.88rem', sm: '0.98rem' },
              fontStyle: 'italic',
              lineHeight: 1.35,
              letterSpacing: 0,
              overflowWrap: 'anywhere',
              textShadow: '-1px -1px 0 rgba(255,255,255,0.98), 1px -1px 0 rgba(255,255,255,0.98), -1px 1px 0 rgba(255,255,255,0.98), 1px 1px 0 rgba(255,255,255,0.98), 0 1px 4px rgba(255,255,255,0.9)',
            }}
          >
            <TextoComReferencias
              texto={subtitle}
              inline
              component="span"
              style={{ color: 'inherit', font: 'inherit', lineHeight: 'inherit' }}
            />
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}
