import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { useTheme } from '@mui/material/styles'
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
  // Separadores Markdown nao sao titulos: evita aplicar o marcador de secao a `---`.
  if (pareceSeparador(bloco)) return false
  // Citacoes curtas tambem podem parecer titulos pelo tamanho; preserve o bloco `>`.
  if (pareceCitacao(bloco)) return false
  return RE_HEADING.test(bloco) || (bloco.length <= 72 && !/[.!?;:]$/.test(bloco))
}

function nivelTitulo(bloco) {
  const valor = String(bloco || '')
  if (/^###\s+/.test(valor)) return 3
  if (/^##\s+/.test(valor)) return 2
  if (/^#\s+/.test(valor)) return 1
  if (/^\d+[.)]\s+/.test(valor)) return 2
  return 3
}

function tituloComMarcador(bloco) {
  // Use o losango somente em secoes de segundo nivel (`##`), reduzindo o ruido visual.
  return /^##\s+/.test(String(bloco || ''))
}

function linhasDoBloco(bloco) {
  return String(bloco || '')
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
}

function pareceCitacao(bloco) {
  const linhas = linhasDoBloco(bloco)
  return linhas.length > 0 && linhas.every((linha) => /^>\s?/.test(linha))
}

function pareceLista(bloco) {
  const linhas = linhasDoBloco(bloco)
  return linhas.length > 0 && linhas.every((linha) => /^(?:[-*]|\d+[.)])\s+/.test(linha))
}

function pareceSeparador(bloco) {
  return /^[-*_]{3,}$/.test(String(bloco || '').trim())
}

function textoSemMarcador(linha) {
  return String(linha || '').replace(/^>\s?/, '').replace(/^(?:[-*]|\d+[.)])\s+/, '').trim()
}

export function separarIntroducaoEditorial(texto) {
  const blocos = blocosDoTexto(texto)

  // No discipulado, o titulo principal ja aparece no cabeçalho ilustrado.
  // Retiramos sua repetição do corpo e promovemos o segundo nivel a subtitulo.
  if (/^#\s+/.test(blocos[0] || '')) {
    blocos.shift()
    if (/^##\s+/.test(blocos[0] || '')) {
      return {
        subtitle: blocos.shift().replace(/^##\s+/, ''),
        body: blocos.join('\n\n'),
      }
    }
  }

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
  glossary,
  children,
  sx,
}) {
  const theme = useTheme()
  const darkMode = theme.palette.mode === 'dark'
  const colors = darkMode
    ? {
        text: '#f3ead8', surface: '#18211d', heading: '#f2d48d', muted: '#d8ccb4',
        accent: '#d6ad52', link: '#8bd8ad', dropCap: '#a9dfbf', dropCapBg: 'rgba(7, 18, 13, 0.52)',
      }
    : {
        text: '#17271f', surface: '#fffaf0', heading: '#173d31', muted: '#4d442f',
        accent: '#a7791f', link: '#075c3b', dropCap: '#315b43', dropCapBg: 'rgba(255,255,255,0.42)',
      }
  const [verbeteAberto, setVerbeteAberto] = useState(null)
  const blocos = blocosDoTexto(text)
  const primeiroParagrafo = blocos.findIndex((bloco) => (
    !pareceTituloSecao(bloco) && !pareceCitacao(bloco) && !pareceLista(bloco) && !pareceSeparador(bloco)
  ))

  return (
    <Box
      component="article"
      sx={{
        position: 'relative',
        px: { xs: 2, sm: 4, md: 5 },
        py: { xs: 2.5, sm: 3.5 },
        border: '1px solid rgba(166, 128, 47, 0.28)',
        borderRadius: 2,
        color: colors.text,
        backgroundColor: colors.surface,
        backgroundImage: 'radial-gradient(circle at 18% 12%, rgba(173,132,48,0.045) 0 1px, transparent 1.4px), linear-gradient(90deg, rgba(173,132,48,0.025), transparent 22%, transparent 78%, rgba(173,132,48,0.025))',
        backgroundSize: '22px 22px, 100% 100%',
        boxShadow: darkMode ? '0 5px 18px rgba(0,0,0,.26)' : '0 5px 16px rgba(52, 41, 20, 0.07)',
        fontFamily: 'Georgia, "Times New Roman", serif',
        '&::after': {
          content: '""',
          display: 'block',
          width: 88,
          height: 1,
          mx: 'auto',
          mt: 3,
          background: `linear-gradient(90deg, transparent, ${colors.accent} 28%, ${colors.accent} 72%, transparent)`,
        },
        '& a, & .MuiLink-root': { color: colors.link },
        ...sx,
      }}
    >
      {blocos.map((bloco, index) => {
        const titulo = pareceTituloSecao(bloco)
        if (titulo) {
          const textoTitulo = bloco.replace(/^#{1,3}\s+/, '')
          const comMarcador = tituloComMarcador(bloco)
          const nivel = nivelTitulo(bloco)
          return (
            <Box
              key={`${index}-${bloco.slice(0, 24)}`}
              component={nivel === 3 ? 'h3' : 'h2'}
              sx={{
                position: 'relative',
                m: 0,
                mt: index === 0 ? 0 : nivel === 3 ? 2.2 : 3.2,
                mb: nivel === 3 ? 1 : 1.35,
                pl: comMarcador ? 2.2 : 0,
                color: colors.heading,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: nivel === 1
                  ? { xs: '1.24rem', sm: '1.42rem' }
                  : nivel === 2
                    ? { xs: '1.08rem', sm: '1.22rem' }
                    : { xs: '1rem', sm: '1.1rem' },
                fontWeight: nivel === 3 ? 700 : 800,
                lineHeight: 1.3,
                letterSpacing: 0,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: '0.18em',
                  width: 8,
                  height: 8,
                  border: `2px solid ${colors.accent}`,
                  transform: 'rotate(45deg)',
                  display: comMarcador ? 'block' : 'none',
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

        if (pareceCitacao(bloco)) {
          return (
            <Box
              key={`${index}-${bloco.slice(0, 24)}`}
              component="blockquote"
              sx={{
                m: 0,
                mt: index === 0 ? 0 : 1.5,
                pl: 2,
                py: 0.35,
                borderLeft: '3px solid rgba(181,138,47,0.52)',
                color: colors.muted,
                fontStyle: 'italic',
              }}
            >
              {linhasDoBloco(bloco).map((linha, linhaIndex) => (
                <TextoComReferencias
                  key={`${index}-quote-${linhaIndex}`}
                  texto={textoSemMarcador(linha)}
                  component="div"
                  style={{
                    margin: 0,
                    fontFamily: 'inherit',
                    fontSize: `${fontSize}%`,
                    lineHeight,
                    textAlign,
                  }}
                />
              ))}
            </Box>
          )
        }

        if (pareceSeparador(bloco)) {
          return (
            <Box
              key={`${index}-${bloco}`}
              aria-hidden="true"
              sx={{
                height: 1,
                my: { xs: 2, sm: 2.5 },
                background: 'linear-gradient(90deg, transparent, rgba(181,138,47,0.68), transparent)',
              }}
            />
          )
        }

        if (pareceLista(bloco)) {
          const listaOrdenada = linhasDoBloco(bloco).every((linha) => /^\d+[.)]\s+/.test(linha))
          return (
            <Box
              key={`${index}-${bloco.slice(0, 24)}`}
              component={listaOrdenada ? 'ol' : 'ul'}
              sx={{
                mt: index === 0 ? 0 : 1.15,
                mb: 0,
                pl: { xs: 3.2, sm: 3.6 },
                color: 'inherit',
                fontFamily: 'inherit',
                fontSize: `${fontSize}%`,
                lineHeight,
                textAlign,
                listStylePosition: 'outside',
                listStyleType: listaOrdenada ? 'decimal' : 'disc',
                '& li': { display: 'list-item', pl: 0.35, mb: 0.35 },
                '& li::marker': {
                  color: colors.accent,
                  fontWeight: 700,
                },
              }}
            >
              {linhasDoBloco(bloco).map((linha, linhaIndex) => (
                <Box component="li" key={`${index}-list-${linhaIndex}`}>
                  <TextoComReferencias
                    texto={textoSemMarcador(linha)}
                    inline
                    component="span"
                    style={{
                      color: 'inherit',
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      lineHeight: 'inherit',
                      textAlign: 'inherit',
                    }}
                  />
                </Box>
              ))}
            </Box>
          )
        }

        const capitular = dropCap && index === primeiroParagrafo
        const blocoCurto = bloco.length <= 120
        const estiloParagrafo = {
              margin: 0,
              marginTop: index === primeiroParagrafo ? 0 : blocoCurto ? '0.72em' : '1.05em',
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
                      color: colors.dropCap,
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: '3.45em',
                      fontWeight: 700,
                      lineHeight: 0.78,
                      marginRight: '0.12em',
                      marginTop: '0.09em',
                      padding: '0.08em 0.11em',
                      border: '1px solid rgba(181,138,47,0.48)',
                      backgroundColor: colors.dropCapBg,
                    },
                  }
                : {}),
            }

        const partesGlossario = glossary
          ? bloco.split(/(\[\[[^\]]+\]\])/g).filter(Boolean)
          : [bloco]
        const contemVerbete = partesGlossario.some((parte) => /^\[\[[^\]]+\]\]$/.test(parte))

        if (contemVerbete) {
          return (
            <Box key={`${index}-${bloco.slice(0, 24)}`} component="p" sx={estiloParagrafo}>
              {partesGlossario.map((parte, parteIndex) => {
                const correspondencia = parte.match(/^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/)
                if (!correspondencia) {
                  return (
                    <TextoComReferencias
                      key={`${index}-texto-${parteIndex}`}
                      texto={parte}
                      inline
                      component="span"
                      style={{ color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
                    />
                  )
                }

                const chave = correspondencia[1].trim().toLowerCase()
                const rotulo = (correspondencia[2] || correspondencia[1]).trim()
                if (!glossary[chave]) return rotulo

                return (
                  <Box
                    key={`${index}-verbete-${parteIndex}`}
                    component="button"
                    type="button"
                    onClick={() => setVerbeteAberto(glossary[chave])}
                    aria-label={`Abrir explicação de ${rotulo}`}
                    sx={{
                      display: 'inline',
                      p: 0,
                      border: 0,
                      borderBottom: '1px dotted currentColor',
                      color: colors.link,
                      bgcolor: 'transparent',
                      font: 'inherit',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {rotulo}
                  </Box>
                )
              })}
            </Box>
          )
        }

        return (
          <TextoComReferencias
            key={`${index}-${bloco.slice(0, 24)}`}
            texto={bloco}
            component="p"
            style={estiloParagrafo}
          />
        )
      })}
      {children}
      <Dialog open={Boolean(verbeteAberto)} onClose={() => setVerbeteAberto(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontFamily: 'Georgia, serif', fontWeight: 800, color: darkMode ? '#f2d48d' : '#173d31' }}>
          {verbeteAberto?.titulo}
        </DialogTitle>
        <DialogContent>
          <TextoComReferencias
            texto={verbeteAberto?.texto || ''}
            component="div"
            style={{ fontFamily: 'Georgia, serif', fontSize: `${fontSize}%`, lineHeight: 1.65 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerbeteAberto(null)} sx={{ fontWeight: 800 }}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
