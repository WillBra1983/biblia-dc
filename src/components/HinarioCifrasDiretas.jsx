import React, { useMemo, useState } from 'react'
import { Box, Chip, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import Add from '@mui/icons-material/Add'
import Remove from '@mui/icons-material/Remove'
import RestartAlt from '@mui/icons-material/RestartAlt'
import { alpha, useTheme } from '@mui/material/styles'

const NOTE_VALUES = {
  C: 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, F: 5,
  'F#': 6, GB: 6, G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11
}
const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const CHORD_COLORS = {
  light: { C: '#c62828', D: '#b45309', E: '#746500', F: '#087f23', G: '#1565c0', A: '#5e35b1', B: '#ad1457' },
  dark: { C: '#ff8a80', D: '#ffb74d', E: '#e6d45a', F: '#69d17d', G: '#75b7ff', A: '#b39ddb', B: '#f48fb1' }
}

const transposeChord = (chord, offset) => {
  const match = String(chord).match(/^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/i)
  if (!match) return chord
  const [, root, suffix, bass] = match
  const rootValue = NOTE_VALUES[root.toUpperCase()]
  if (rootValue == null) return chord
  let result = `${SHARP_NOTES[(rootValue + offset + 120) % 12]}${suffix}`
  if (bass) {
    const bassValue = NOTE_VALUES[bass.toUpperCase()]
    if (bassValue != null) result += `/${SHARP_NOTES[(bassValue + offset + 120) % 12]}`
  }
  return result
}

function ChordSequence({ chords, offset, separator = ' / ' }) {
  const theme = useTheme()
  return chords.map((chord, index) => {
    const transposed = transposeChord(chord, offset)
    const root = transposed.match(/^([A-G])/i)?.[1]?.toUpperCase() || 'C'
    const color = CHORD_COLORS[theme.palette.mode][root]
    return (
      <React.Fragment key={`${chord}-${index}`}>
        {index > 0 ? <Box component="span" sx={{ color: 'text.secondary' }}>{separator}</Box> : null}
        <Box
          component="span"
          sx={{
            color,
            bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.2 : 0.11),
            borderRadius: '2px',
            outline: `1px solid ${alpha(color, theme.palette.mode === 'dark' ? 0.52 : 0.3)}`,
            outlineOffset: '-1px',
            boxShadow: `inset -1px 0 0 ${theme.palette.background.paper}`
          }}
        >
          {transposed}
        </Box>
      </React.Fragment>
    )
  })
}

function ChordLyricLine({ line, offset, textSx }) {
  const primary = (line.detalhes || []).filter(item => !item.alternativa)
  const alternative = (line.detalhes || []).filter(item => item.alternativa)
  const placements = primary.length ? primary : (line.detalhes || [])
  const chunks = useMemo(() => {
    const grouped = new Map()
    placements.forEach(item => {
      const index = Math.max(0, Math.min(line.letra.length, Number(item.indice) || 0))
      if (!grouped.has(index)) grouped.set(index, [])
      grouped.get(index).push(item.acorde)
    })
    const positions = [...grouped.keys()].sort((a, b) => a - b)
    const result = []
    if (positions[0] > 0) result.push({ text: line.letra.slice(0, positions[0]), chords: [] })
    positions.forEach((position, index) => {
      const end = positions[index + 1] ?? line.letra.length
      result.push({ text: line.letra.slice(position, end), chords: grouped.get(position) })
    })
    if (!positions.length) result.push({ text: line.letra, chords: [] })
    return result
  }, [line.letra, placements])

  return (
    <Box sx={{ mb: 1.1 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', rowGap: 0.35 }}>
        {chunks.map((chunk, index) => (
          <Box component="span" key={`${index}-${chunk.text}`} sx={{ display: 'inline-flex', flexDirection: 'column', minWidth: 0 }}>
            <Typography
              component="span"
              sx={{ minHeight: '1.25em', fontSize: '0.82em', lineHeight: 1.15, fontWeight: 800, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
            >
              <ChordSequence chords={chunk.chords} offset={offset} />
            </Typography>
            <Typography component="span" sx={{ ...textSx, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{chunk.text}</Typography>
          </Box>
        ))}
      </Box>
      {alternative.length > 0 ? (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.35, color: 'text.secondary', flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{line.anotacao || 'Alternativa'}:</Typography>
          <Typography variant="caption" sx={{ fontWeight: 800 }}>
            <ChordSequence chords={alternative.map(item => item.acorde)} offset={offset} separator="  " />
          </Typography>
        </Stack>
      ) : line.anotacao ? (
        <Typography variant="caption" color="text.secondary">{line.anotacao}</Typography>
      ) : null}
    </Box>
  )
}

export default function HinarioCifrasDiretas({ hino, textSx }) {
  const [offset, setOffset] = useState(0)
  const currentKey = transposeChord(hino.tom, offset)

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={0.5}
        sx={{ position: 'sticky', top: 0, zIndex: 2, px: 1, py: 0.75, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Tom</Typography>
        <Tooltip title="Descer meio tom"><IconButton size="small" onClick={() => setOffset(value => value - 1)}><Remove /></IconButton></Tooltip>
        <Chip label={currentKey} color="primary" sx={{ minWidth: 58, fontWeight: 800, borderRadius: 1 }} />
        <Tooltip title="Subir meio tom"><IconButton size="small" onClick={() => setOffset(value => value + 1)}><Add /></IconButton></Tooltip>
        <Tooltip title="Voltar ao tom original"><span><IconButton size="small" disabled={offset === 0} onClick={() => setOffset(0)}><RestartAlt /></IconButton></span></Tooltip>
        <Typography variant="caption" color="text.secondary">Original: {hino.tom}</Typography>
      </Stack>

      <Box sx={{ width: '100%', maxWidth: 920, mx: 'auto', px: { xs: 1, sm: 2.5 }, py: 2 }}>
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
          {hino.compassos?.map(value => <Chip key={value} size="small" variant="outlined" label={value} sx={{ borderRadius: 1 }} />)}
          {hino.detalhe ? <Chip size="small" variant="outlined" label={hino.detalhe} sx={{ borderRadius: 1 }} /> : null}
        </Stack>
        {hino.linhas.map((line, index) => {
          if (line.tipo === 'cifra_letra') return <ChordLyricLine key={index} line={line} offset={offset} textSx={textSx} />
          if (line.tipo === 'cifras') {
            return (
              <Typography key={index} sx={{ mb: 0.75, fontWeight: 800, wordSpacing: '0.7em', overflowWrap: 'anywhere' }}>
                <ChordSequence chords={line.cifras || []} offset={offset} separator="  " />
                {line.anotacao ? `  ${line.anotacao}` : ''}
              </Typography>
            )
          }
          if (line.tipo === 'secao' || line.tipo === 'subtitulo') {
            return <React.Fragment key={index}><Divider sx={{ my: 2 }} /><Typography sx={{ mb: 1, fontWeight: 800, textAlign: 'center' }}>{line.texto}</Typography></React.Fragment>
          }
          if (line.tipo === 'nota') return <Typography key={index} variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{line.texto}</Typography>
          return <Typography key={index} sx={{ ...textSx, mb: 1.1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{line.letra || line.texto}</Typography>
        })}
      </Box>
    </Box>
  )
}
