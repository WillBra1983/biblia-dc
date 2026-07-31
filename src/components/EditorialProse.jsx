import Box from '@mui/material/Box'
import TextoComReferencias from './TextoComReferencias'

const RE_HEADING = /^(?:#{1,3}\s+|\d+[.)]\s+|conclus[aã]o$|introdu[cç][aã]o$|s[ií]ntese\b)/i

function blocosDoTexto(texto) {
  return String(texto || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((bloco) => bloco.trim())
    .filter(Boolean)
}

function pareceSubtitulo(bloco) {
  return Boolean(
    bloco &&
    bloco.length <= 110 &&
    !/[.!?;:]$/.test(bloco) &&
    !RE_HEADING.test(bloco)
  )
}

function pareceTituloSecao(bloco) {
  if (!bloco || bloco.includes('\n')) return false
  return RE_HEADING.test(bloco) || (bloco.length <= 72 && !/[.!?;:]$/.test(bloco))
}

export function separarIntroducaoEditorial(texto) {
  const blocos = blocosDoTexto(texto)
  if (pareceSubtitulo(blocos[0])) {
    return { subtitle: blocos[0], body: blocos.slice(1).join('\n\n') }
  }
  return { subtitle: '', body: blocos.join('\n\n') }
}

export default function EditorialProse({
  text,
  fontSize = 100,
  textAlign = 'justify',
  lineHeight = 1.72,
  dropCap = true,
  children,
  sx,
}) {
  const blocos = blocosDoTexto(text)
  const primeiroParagrafo = blocos.findIndex((bloco) => !pareceTituloSecao(bloco))

  return (
    <Box
      component="article"
      sx={{
        position: 'relative',
        px: { xs: 2, sm: 4, md: 5 },
        py: { xs: 2.5, sm: 3.5 },
        border: '1px solid rgba(166, 128, 47, 0.28)',
        borderRadius: 2,
        color: '#17271f',
        backgroundColor: '#fffaf0',
        backgroundImage: 'radial-gradient(circle at 18% 12%, rgba(173,132,48,0.045) 0 1px, transparent 1.4px), linear-gradient(90deg, rgba(173,132,48,0.025), transparent 22%, transparent 78%, rgba(173,132,48,0.025))',
        backgroundSize: '22px 22px, 100% 100%',
        boxShadow: '0 5px 16px rgba(52, 41, 20, 0.07)',
        fontFamily: 'Georgia, "Times New Roman", serif',
        '&::after': {
          content: '""',
          display: 'block',
          width: 88,
          height: 1,
          mx: 'auto',
          mt: 3,
          background: 'linear-gradient(90deg, transparent, #b58a2f 28%, #b58a2f 72%, transparent)',
        },
        ...sx,
      }}
    >
      {blocos.map((bloco, index) => {
        const titulo = pareceTituloSecao(bloco)
        if (titulo) {
          const textoTitulo = bloco.replace(/^#{1,3}\s+/, '')
          return (
            <Box
              key={`${index}-${bloco.slice(0, 24)}`}
              component="h2"
              sx={{
                position: 'relative',
                m: 0,
                mt: index === 0 ? 0 : 3.2,
                mb: 1.35,
                pl: 2.2,
                color: '#173d31',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: { xs: '1.08rem', sm: '1.22rem' },
                lineHeight: 1.3,
                letterSpacing: 0,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: '0.18em',
                  width: 8,
                  height: 8,
                  border: '2px solid #b58a2f',
                  transform: 'rotate(45deg)',
                },
              }}
            >
              <TextoComReferencias
                texto={textoTitulo}
                inline
                component="span"
                style={{
                  color: 'inherit',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  lineHeight: 'inherit',
                }}
              />
            </Box>
          )
        }

        const capitular = dropCap && index === primeiroParagrafo
        return (
          <TextoComReferencias
            key={`${index}-${bloco.slice(0, 24)}`}
            texto={bloco}
            component="p"
            style={{
              margin: 0,
              marginTop: index === primeiroParagrafo ? 0 : '1.15em',
              color: 'inherit',
              fontFamily: 'inherit',
              fontSize: `${fontSize}%`,
              lineHeight,
              textAlign,
              hyphens: 'none',
              overflowWrap: 'break-word',
              ...(capitular
                ? {
                    '&::first-letter': {
                      float: 'left',
                      color: '#315b43',
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: '3.45em',
                      fontWeight: 700,
                      lineHeight: 0.78,
                      marginRight: '0.12em',
                      marginTop: '0.09em',
                      padding: '0.08em 0.11em',
                      border: '1px solid rgba(181,138,47,0.48)',
                      backgroundColor: 'rgba(255,255,255,0.42)',
                    },
                  }
                : {}),
            }}
          />
        )
      })}
      {children}
    </Box>
  )
}
