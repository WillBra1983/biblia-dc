import React, { useMemo, useState } from 'react'
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import Add from '@mui/icons-material/Add'
import Remove from '@mui/icons-material/Remove'
import RestartAlt from '@mui/icons-material/RestartAlt'
import { useTheme } from '@mui/material/styles'
import AcordeAjudaPopover from './AcordeAjudaPopover'
import { transposeChord } from '../utils/chordTranspose'

const CHORD_COLORS = {
  light: { C: '#c62828', D: '#a54b00', E: '#6f6500', F: '#137333', G: '#1565c0', A: '#5e35b1', B: '#ad1457' },
  dark: { C: '#ff8a80', D: '#ffb35c', E: '#ddd36a', F: '#74cf84', G: '#79b8ff', A: '#b8a1e3', B: '#f294bd' }
}
function ChordSequence({ chords, offset, separator = ' / ', onChordClick }) {
  const theme = useTheme()
  return chords.map((chord, index) => {
    const transposed = transposeChord(chord, offset)
    const root = transposed.match(/^([A-G])/i)?.[1]?.toUpperCase() || 'C'
    return (
      <React.Fragment key={`${chord}-${index}`}>
        {index > 0 ? <Box component="span" sx={{ color: 'text.secondary' }}>{separator}</Box> : null}
        <Box
          component="button"
          type="button"
          onClick={(event) => onChordClick?.(event, transposed)}
          aria-label={`Ver acorde ${transposed}`}
          sx={{
            color: CHORD_COLORS[theme.palette.mode][root],
            fontWeight: 800,
            mr: index === chords.length - 1 ? '0.16em' : 0,
            p: 0,
            border: 0,
            borderBottom: '1px dotted currentColor',
            borderRadius: 0,
            bgcolor: 'transparent',
            font: 'inherit',
            lineHeight: 'inherit',
            cursor: 'pointer',
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
            },
          }}
        >
          {transposed}
        </Box>
      </React.Fragment>
    )
  })
}

function LyricText({ text }) {
  return String(text).split(/(\(\s*bis\s*\))/gi).map((part, index) => (
    /^\(\s*bis\s*\)$/i.test(part) ? (
      <Box component="span" key={index} sx={{ fontWeight: 800, fontStyle: 'italic', color: 'text.secondary' }}>
        {part}
      </Box>
    ) : <React.Fragment key={index}>{part}</React.Fragment>
  ))
}

function ChordLyricLine({ line, offset, textSx, onChordClick }) {
  const primary = (line.detalhes || []).filter(item => !item.alternativa)
  const alternative = (line.detalhes || []).filter(item => item.alternativa)
  const placements = primary.length ? primary : (line.detalhes || [])
  const words = useMemo(() => {
    const grouped = new Map()
    placements.forEach(item => {
      const index = Math.max(0, Math.min(line.letra.length, Number(item.indice) || 0))
      if (!grouped.has(index)) grouped.set(index, [])
      grouped.get(index).push(item.acorde)
    })
    const positions = [...grouped.keys()].sort((a, b) => a - b)
    const matches = [...line.letra.matchAll(/\S+\s*/g)]
    if (!matches.length) return [{ chunks: [{ text: line.letra, chords: [] }] }]
    return matches.map((match, wordIndex) => {
      const start = match.index
      const end = start + match[0].length
      const isLast = wordIndex === matches.length - 1
      const wordPositions = positions.filter(position => position >= start && (position < end || (isLast && position === end)))
      const chunks = []
      if (!wordPositions.length) return { chunks: [{ text: match[0], chords: [] }] }
      if (wordPositions[0] > start) {
        chunks.push({ text: line.letra.slice(start, wordPositions[0]), chords: [] })
      }
      wordPositions.forEach((position, index) => {
        const chunkEnd = wordPositions[index + 1] ?? end
        chunks.push({ text: line.letra.slice(position, chunkEnd), chords: grouped.get(position) })
      })
      return { chunks }
    })
  }, [line.letra, placements])

  return (
    <Box sx={{ ...textSx, mb: '0.9em' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', rowGap: 0.35 }}>
        {words.map((word, wordIndex) => (
          <Box component="span" key={wordIndex} sx={{ display: 'inline-flex', alignItems: 'flex-end', flexShrink: 0 }}>
            {word.chunks.map((chunk, chunkIndex) => (
              <Box component="span" key={`${chunkIndex}-${chunk.text}`} sx={{ display: 'inline-flex', flexDirection: 'column', flexShrink: 0 }}>
                <Typography
                  component="span"
                  sx={{ minHeight: '1.2em', fontSize: '0.78em', lineHeight: 1.15, fontWeight: 800, whiteSpace: 'pre' }}
                >
                  <ChordSequence chords={chunk.chords} offset={offset} onChordClick={onChordClick} />
                </Typography>
                <Typography component="span" sx={{ font: 'inherit', lineHeight: 'inherit', whiteSpace: 'pre' }}>
                  <LyricText text={chunk.text} />
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      {alternative.length > 0 ? (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.35, color: 'text.secondary', flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{line.anotacao || 'Alternativa'}:</Typography>
          <Typography variant="caption" sx={{ fontWeight: 800 }}>
            <ChordSequence chords={alternative.map(item => item.acorde)} offset={offset} separator="  " onChordClick={onChordClick} />
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
  const [acordeAjuda, setAcordeAjuda] = useState({ anchorEl: null, chord: '' })
  const currentKey = transposeChord(hino.tom, offset)
  const sectionsByLine = useMemo(() => {
    const result = new Map()
    ;(hino.secoes || []).forEach(section => {
      if (!result.has(section.indiceLinha)) result.set(section.indiceLinha, [])
      result.get(section.indiceLinha).push(section.texto)
    })
    return result
  }, [hino.secoes])

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
          let content
          if (line.tipo === 'cifra_letra') {
            content = (
              <ChordLyricLine
                line={line}
                offset={offset}
                textSx={textSx}
                onChordClick={(event, chord) => setAcordeAjuda({ anchorEl: event.currentTarget, chord })}
              />
            )
          }
          if (line.tipo === 'cifras') {
            content = (
              <Typography sx={{ ...textSx, mb: 0.75, fontWeight: 800, wordSpacing: '0.7em', overflowWrap: 'anywhere' }}>
                <ChordSequence
                  chords={line.cifras || []}
                  offset={offset}
                  separator="  "
                  onChordClick={(event, chord) => setAcordeAjuda({ anchorEl: event.currentTarget, chord })}
                />
                {line.anotacao ? `  ${line.anotacao}` : ''}
              </Typography>
            )
          }
          if (line.tipo === 'secao' || line.tipo === 'subtitulo') {
            content = <Typography sx={{ mt: 1.5, mb: 1, fontWeight: 800, fontStyle: 'italic' }}>{line.texto}</Typography>
          }
          if (line.tipo === 'nota') content = <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{line.texto}</Typography>
          if (!content) content = <Typography sx={{ ...textSx, mb: 1.1, whiteSpace: 'pre-wrap' }}><LyricText text={line.letra || line.texto} /></Typography>
          return (
            <React.Fragment key={index}>
              {(sectionsByLine.get(index) || []).map(section => (
                <Typography key={section} sx={{ ...textSx, mt: index === 0 ? 0 : 2, mb: 0.75, fontWeight: 800, color: 'text.primary' }}>
                  {section}:
                </Typography>
              ))}
              {content}
            </React.Fragment>
          )
        })}
      </Box>
      <AcordeAjudaPopover
        anchorEl={acordeAjuda.anchorEl}
        chord={acordeAjuda.chord}
        onClose={() => setAcordeAjuda({ anchorEl: null, chord: '' })}
      />
    </Box>
  )
}
