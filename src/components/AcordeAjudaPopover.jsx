import { useEffect, useMemo, useState } from 'react'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import NavigateNext from '@mui/icons-material/NavigateNext'
import {
  Box,
  IconButton,
  Popover,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import chordVoicings from '../data/hinarioChordVoicings.json'

const NOTE_VALUES = {
  C: 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, F: 5,
  'F#': 6, GB: 6, G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11,
}
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function parseChord(chord) {
  const match = String(chord || '').match(/^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/i)
  if (!match) return null
  const [, rootRaw, suffixRaw, bassRaw] = match
  const root = NOTE_VALUES[rootRaw.toUpperCase()]
  if (root == null) return null
  return {
    root,
    rootName: NOTE_NAMES[root],
    suffix: suffixRaw.toLowerCase(),
    bass: bassRaw ? NOTE_VALUES[bassRaw.toUpperCase()] : null,
  }
}

function chordIntervals(suffix) {
  if (suffix === '\u00ba' || suffix === '\u00b0' || suffix === 'dim7') return [0, 3, 6, 9]
  if (suffix === 'dim') return [0, 3, 6]
  if (suffix === '5+') return [0, 4, 8]
  if (suffix === '4') return [0, 5, 7]
  if (suffix === 'm4') return [0, 3, 5, 7]
  if (suffix === 'm7') return [0, 3, 7, 10]
  if (suffix === '7') return [0, 4, 7, 10]
  if (suffix === '7+') return [0, 4, 7, 11]
  if (suffix === 'm') return [0, 3, 7]
  return [0, 4, 7]
}

const E_ROOT_FRET = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7]
const A_ROOT_FRET = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2]
const AUGMENTED_GUITAR_SHAPES = [
  [null, 3, 2, 1, 1, null], // C5+
  [null, 0, 3, 2, 2, null], // C#5+
  [null, 5, 8, 7, 7, null], // D5+
  [null, 2, 1, 0, 0, null], // D#5+
  [null, 3, 2, 1, 1, null], // E5+
  [null, 0, 3, 2, 2, null], // F5+
  [null, 1, 4, 3, 3, null], // F#5+
  [null, 2, 1, 0, 0, null], // G5+
  [null, 3, 2, 1, 1, null], // G#5+
  [null, 0, 3, 2, 2, null], // A5+
  [null, 1, 4, 3, 3, null], // A#5+
  [null, 2, 1, 0, 0, null], // B5+
]

function guitarShapeFor(parsed) {
  if (!parsed || parsed.suffix === 'm4') return null
  if (parsed.suffix === '5+') {
    return {
      family: 'augmented',
      rootFret: 0,
      frets: AUGMENTED_GUITAR_SHAPES[parsed.root],
    }
  }
  const shape = (family, rootFret) => {
    const eShapes = {
      '': [0, 2, 2, 1, 0, 0],
      m: [0, 2, 2, 0, 0, 0],
      '4': [0, 2, 2, 2, 0, 0],
      '7': [0, 2, 0, 1, 0, 0],
      '7+': [0, 2, 1, 1, 0, 0],
      m7: [0, 2, 0, 0, 0, 0],
    }
    const aShapes = {
      '': [null, 0, 2, 2, 2, 0],
      m: [null, 0, 2, 2, 1, 0],
      '4': [null, 0, 2, 2, 3, 0],
      '7': [null, 0, 2, 0, 2, 0],
      '7+': [null, 0, 2, 1, 2, 0],
      m7: [null, 0, 2, 0, 1, 0],
      dim: [null, 0, 1, 2, 1, null],
      '\u00ba': [null, 0, 1, 2, 1, 2],
      '\u00b0': [null, 0, 1, 2, 1, 2],
      dim7: [null, 0, 1, 2, 1, 2],
    }
    const template = (family === 'E' ? eShapes : aShapes)[parsed.suffix]
    if (!template) return null
    return {
      family,
      rootFret,
      frets: template.map((value) => value == null ? null : rootFret + value),
    }
  }
  const candidates = [
    shape('E', E_ROOT_FRET[parsed.root]),
    shape('A', A_ROOT_FRET[parsed.root]),
  ].filter(Boolean)
  return candidates.sort((left, right) => {
    const max = (item) => Math.max(...item.frets.filter((value) => value != null))
    return max(left) - max(right)
  })[0] || null
}

function GuitarDiagram({ parsed, voicing, leftHanded }) {
  const shape = useMemo(() => {
    if (voicing) {
      return {
        family: 'database',
        rootFret: 0,
        frets: voicing.frets,
        fingers: voicing.fingers || [0, 0, 0, 0, 0, 0],
        barres: voicing.barres || [],
      }
    }
    return guitarShapeFor(parsed)
  }, [parsed, voicing])
  if (!shape) {
    return (
      <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        Posição de violão indisponível para esta variação.
      </Typography>
    )
  }
  const positiveFrets = shape.frets.filter((value) => Number.isInteger(value) && value > 0)
  const baseFret = positiveFrets.length && Math.max(...positiveFrets) > 4
    ? Math.min(...positiveFrets)
    : 1
  const fretCount = Math.max(4, Math.max(...positiveFrets, baseFret) - baseFret + 1)
  const generatedBarres = shape.rootFret > 0 && !['5+', 'dim', '\u00ba', '\u00b0', 'dim7'].includes(parsed.suffix)
    ? [{ fret: shape.rootFret, from: shape.family === 'E' ? 0 : 1, to: 5 }]
    : []
  const strings = shape.frets.map((fret, originalIndex) => ({
    fret,
    finger: shape.fingers?.[originalIndex] || 0,
    originalIndex,
  }))
  const displayedStrings = leftHanded ? [...strings].reverse() : strings
  const barres = (shape.barres || generatedBarres).map((barre) => leftHanded
    ? { ...barre, from: 5 - barre.to, to: 5 - barre.from }
    : barre)
  const coveredByBarre = (stringIndex, fret) => barres.some(
    (barre) => barre.fret === fret && stringIndex >= barre.from && stringIndex <= barre.to
  )
  const stringLeft = (index) => `${index * 20}%`
  const fretTop = (fret) => `${(fret - baseFret + 0.5) * (100 / fretCount)}%`

  return (
    <Box sx={{ width: 238, mx: 'auto', pt: 1 }} aria-label={`Diagrama de violão para ${parsed.rootName}`}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', mb: 0.5, pl: 3.5 }}>
        {displayedStrings.map(({ fret, originalIndex }) => (
          <Typography key={originalIndex} component="span" sx={{ textAlign: 'center', fontSize: '0.76rem', fontWeight: 800 }}>
            {fret == null ? '×' : fret === 0 ? '○' : ''}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
        <Typography sx={{ width: 26, pt: 0.75, fontSize: '0.72rem', color: 'text.secondary', textAlign: 'right' }}>
          {baseFret}ª
        </Typography>
        <Box sx={{ flex: 1, height: 132, position: 'relative', mx: 1 }}>
          {Array.from({ length: 6 }, (_, index) => (
            <Box
              key={`string-${index}`}
              sx={{
                position: 'absolute',
                left: stringLeft(index),
                top: 0,
                bottom: 0,
                width: index < 3 ? '2px' : '1px',
                bgcolor: 'text.secondary',
                transform: 'translateX(-50%)',
              }}
            />
          ))}
          {Array.from({ length: fretCount + 1 }, (_, index) => (
            <Box
              key={`fret-${index}`}
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${index * (100 / fretCount)}%`,
                height: index === 0 && baseFret === 1 ? '3px' : '1px',
                bgcolor: 'text.secondary',
                transform: 'translateY(-50%)',
              }}
            />
          ))}
          {barres.map((barre, index) => (
            <Box
              key={`barre-${index}`}
              aria-label={`Pestana na casa ${barre.fret}`}
              sx={{
                position: 'absolute',
                zIndex: 2,
                left: `calc(${stringLeft(barre.from)} - 5px)`,
                width: `calc(${(barre.to - barre.from) * 20}% + 10px)`,
                top: fretTop(barre.fret),
                height: 10,
                borderRadius: 5,
                bgcolor: 'primary.main',
                transform: 'translateY(-50%)',
                color: 'common.white',
                fontSize: '0.62rem',
                fontWeight: 900,
                lineHeight: '10px',
                textAlign: 'center',
              }}
            >
              {barre.finger || 1}
            </Box>
          ))}
          {displayedStrings.map(({ fret, finger, originalIndex }, stringIndex) => {
            if (fret == null || fret <= 0 || coveredByBarre(stringIndex, fret)) return null
            return (
              <Box
                key={`finger-${originalIndex}`}
                aria-label={`Dedo na corda ${6 - originalIndex}, casa ${fret}`}
                sx={{
                  position: 'absolute',
                  zIndex: 3,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  left: stringLeft(stringIndex),
                  top: fretTop(fret),
                  transform: 'translate(-50%, -50%)',
                  color: 'common.white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.64rem',
                  fontWeight: 900,
                }}
              >
                {finger || ''}
              </Box>
            )
          })}
        </Box>
      </Box>
      {parsed.bass != null && parsed.bass !== parsed.root && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          Baixo: {NOTE_NAMES[parsed.bass]}
        </Typography>
      )}
    </Box>
  )
}

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11]
const BLACK_KEYS = [
  { note: 1, afterWhite: 0 },
  { note: 3, afterWhite: 1 },
  { note: 6, afterWhite: 3 },
  { note: 8, afterWhite: 4 },
  { note: 10, afterWhite: 5 },
]
const KEYBOARD_WHITE_NOTES = Array.from({ length: 21 }, (_, index) => (
  WHITE_KEYS[index % 7] + Math.floor(index / 7) * 12
))
const KEYBOARD_BLACK_NOTES = Array.from({ length: 3 }, (_, octave) => BLACK_KEYS.map(
  ({ note, afterWhite }) => ({
    note: note + octave * 12,
    left: (octave * 7 + afterWhite + 1) * 14 - 4.5,
  })
)).flat()

const KEYBOARD_TONE_COLOR = '#FFEB3B'
const KEYBOARD_TONE_BORDER = '#C9A800'
const KEYBOARD_ROOT_COLOR = '#8BC34A'
const KEYBOARD_ROOT_BORDER = '#4D7C0F'
const KEYBOARD_HIGHLIGHT_TEXT = '#17200B'

function keyboardVoicing(parsed, inversion) {
  const core = chordIntervals(parsed.suffix).map((interval) => 12 + parsed.root + interval)
  if (parsed.bass != null) return [parsed.bass, ...core]
  let notes = [...core.slice(inversion), ...core.slice(0, inversion).map((note) => note + 12)]
  if (Math.max(...notes) > 35) notes = notes.map((note) => note - 12)
  return notes
}

function KeyboardDiagram({ parsed, inversion }) {
  const tones = new Set(keyboardVoicing(parsed, inversion))
  const isRoot = (note) => note % 12 === parsed.root
  const keyColor = (note) => isRoot(note) ? KEYBOARD_ROOT_COLOR : KEYBOARD_TONE_COLOR
  const keyBorder = (note) => isRoot(note) ? KEYBOARD_ROOT_BORDER : KEYBOARD_TONE_BORDER
  return (
    <Box sx={{ width: 294, height: 126, mx: 'auto', mt: 2, position: 'relative' }} aria-label={`Teclado para ${parsed.rootName}`}>
      <Box sx={{ display: 'flex', height: 120 }}>
        {KEYBOARD_WHITE_NOTES.map((note) => (
          <Box
            key={note}
            sx={{
              width: 14,
              height: 120,
              border: 1,
              borderColor: tones.has(note) ? keyBorder(note) : 'text.secondary',
              bgcolor: tones.has(note) ? keyColor(note) : 'background.paper',
              color: tones.has(note) ? KEYBOARD_HIGHLIGHT_TEXT : 'text.primary',
              boxShadow: tones.has(note) && isRoot(note)
                ? `inset 0 0 0 2px ${KEYBOARD_ROOT_BORDER}`
                : 'none',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              pb: 0.75,
              boxSizing: 'border-box',
              fontSize: '0.52rem',
              fontWeight: 800,
            }}
          >
            {tones.has(note) ? NOTE_NAMES[note % 12] : ''}
          </Box>
        ))}
      </Box>
      {KEYBOARD_BLACK_NOTES.map(({ note, left }) => (
        <Box
          key={note}
          sx={{
            position: 'absolute',
            left,
            top: 0,
            width: 9,
            height: 74,
            zIndex: 1,
            bgcolor: tones.has(note) ? keyColor(note) : 'grey.900',
            color: tones.has(note) ? KEYBOARD_HIGHLIGHT_TEXT : 'common.white',
            border: 1,
            borderColor: tones.has(note) ? keyBorder(note) : 'grey.700',
            boxShadow: tones.has(note) && isRoot(note)
              ? `inset 0 0 0 2px ${KEYBOARD_ROOT_BORDER}`
              : 'none',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            pb: 0.5,
            boxSizing: 'border-box',
            fontSize: '0.48rem',
            fontWeight: 800,
          }}
        >
          {tones.has(note) ? NOTE_NAMES[note % 12] : ''}
        </Box>
      ))}
    </Box>
  )
}

export default function AcordeAjudaPopover({ anchorEl, chord, onClose }) {
  const [tab, setTab] = useState(0)
  const [guitarIndex, setGuitarIndex] = useState(0)
  const [keyboardIndex, setKeyboardIndex] = useState(0)
  const [leftHanded, setLeftHanded] = useState(() => (
    typeof window !== 'undefined' && window.localStorage.getItem('hinario-acordes-canhoto') === '1'
  ))
  const parsed = useMemo(() => parseChord(chord), [chord])
  const voicings = chordVoicings[chord] || []
  const guitarCount = Math.max(1, voicings.length)
  const keyboardCount = parsed?.bass != null ? 1 : chordIntervals(parsed?.suffix).length

  useEffect(() => {
    setTab(0)
    setGuitarIndex(0)
    setKeyboardIndex(0)
  }, [chord])

  const chooseHand = (_, value) => {
    if (value == null) return
    const nextLeftHanded = value === 'left'
    setLeftHanded(nextLeftHanded)
    window.localStorage.setItem('hinario-acordes-canhoto', nextLeftHanded ? '1' : '0')
  }

  if (!parsed) return null

  return (
    <Popover
      open={Boolean(anchorEl && parsed)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{ paper: { sx: { width: 356, maxWidth: 'calc(100vw - 16px)', p: 1.5 } } }}
    >
      <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', textAlign: 'center', mb: 0.5 }}>
        {chord}
      </Typography>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="fullWidth" aria-label="Instrumento do acorde">
        <Tab label="Violão" />
        <Tab label="Teclado" />
      </Tabs>
      <Box sx={{ minHeight: 238, pt: 1 }}>
        {tab === 0 ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={leftHanded ? 'left' : 'right'}
                onChange={chooseHand}
                aria-label="Mão usada no violão"
              >
                <ToggleButton value="right">Destro</ToggleButton>
                <ToggleButton value="left">Canhoto</ToggleButton>
              </ToggleButtonGroup>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title="Posição anterior">
                  <span>
                    <IconButton
                      size="small"
                      disabled={guitarCount <= 1}
                      onClick={() => setGuitarIndex((guitarIndex - 1 + guitarCount) % guitarCount)}
                      aria-label="Posição anterior do acorde"
                    >
                      <NavigateBefore />
                    </IconButton>
                  </span>
                </Tooltip>
                <Typography variant="caption" sx={{ minWidth: 42, textAlign: 'center', fontWeight: 800 }}>
                  {guitarIndex + 1}/{guitarCount}
                </Typography>
                <Tooltip title="Próxima posição">
                  <span>
                    <IconButton
                      size="small"
                      disabled={guitarCount <= 1}
                      onClick={() => setGuitarIndex((guitarIndex + 1) % guitarCount)}
                      aria-label="Próxima posição do acorde"
                    >
                      <NavigateNext />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
            <GuitarDiagram parsed={parsed} voicing={voicings[guitarIndex]} leftHanded={leftHanded} />
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tooltip title="Inversão anterior">
                <span>
                  <IconButton
                    size="small"
                    disabled={keyboardCount <= 1}
                    onClick={() => setKeyboardIndex((keyboardIndex - 1 + keyboardCount) % keyboardCount)}
                    aria-label="Inversão anterior"
                  >
                    <NavigateBefore />
                  </IconButton>
                </span>
              </Tooltip>
              <Typography sx={{ minWidth: 126, textAlign: 'center', fontSize: '0.82rem', fontWeight: 800 }}>
                {parsed.bass != null
                  ? `Baixo: ${NOTE_NAMES[parsed.bass]}`
                  : keyboardIndex === 0 ? 'Fundamental' : `${keyboardIndex}ª inversão`}
              </Typography>
              <Tooltip title="Próxima inversão">
                <span>
                  <IconButton
                    size="small"
                    disabled={keyboardCount <= 1}
                    onClick={() => setKeyboardIndex((keyboardIndex + 1) % keyboardCount)}
                    aria-label="Próxima inversão"
                  >
                    <NavigateNext />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
            <KeyboardDiagram parsed={parsed} inversion={keyboardIndex} />
          </>
        )}
      </Box>
    </Popover>
  )
}
