const NOTE_VALUES = {
  C: 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, F: 5,
  'F#': 6, GB: 6, G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11,
}

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const transposeChord = (chord, offset) => {
  if (((Number(offset) || 0) % 12 + 12) % 12 === 0) return String(chord)
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
