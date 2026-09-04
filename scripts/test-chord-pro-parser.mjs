import assert from 'node:assert/strict'
import { parsePastedChordSong } from '../src/utils/chordProParser.js'
import { transposeChord } from '../src/utils/chordTranspose.js'

const copiedFromWeb = `Tom:  Db

[Intro] F#9  Bbm7 &#x20;
">G#
&#x20;       Fm7  Bbm7 &#x20;
">G#

&#x20;    Db                F#9        &#x20;
As muitas gerações rendidas em louvor
">Db
As muitas gerações rendidas em louvor
&#x20;   Bbm7        G#          &#x20;
Cantando ao cordeiro uma canção
">F#9
Cantando ao cordeiro uma canção
&#x20;   &#x20;
Teu nome é o maior
">G#
Teu nome é o maior

&#x20;     Bbm7       G#      &#x20;
Cantaremos para sempre, e amém

">F#7M
Cantaremos para sempre, e amém`

const song = parsePastedChordSong(copiedFromWeb, { title: 'Santo pra Sempre' })
const content = song.linhas.filter(line => line.tipo !== 'espaco')

assert.equal(song.tom, 'Db')
assert.deepEqual(content[0].cifras, ['F#9', 'Bbm7', 'G#'])
assert.deepEqual(content[1].cifras, ['Fm7', 'Bbm7', 'G#'])
assert.deepEqual(content[2].cifras, ['Db', 'F#9', 'Db'])
assert.deepEqual(content[3].cifras, ['Bbm7', 'G#', 'F#9'])
assert.deepEqual(content[4].cifras, ['G#'])
assert.deepEqual(content[5].cifras, ['Bbm7', 'G#', 'F#7M'])
assert.ok(content[2].detalhes.at(-1).indice < content[2].letra.length)
assert.ok(content[3].detalhes.at(-1).indice < content[3].letra.length)
assert.ok(content[5].detalhes.at(-1).indice < content[5].letra.length)
assert.equal(content.filter(line => line.letra === 'As muitas gerações rendidas em louvor').length, 1)
assert.equal(content.some(line => String(line.letra || line.texto).includes('">')), false)
assert.equal(transposeChord('Db', 0), 'Db')
assert.equal(transposeChord('Bbm7', 0), 'Bbm7')

console.log('Parser de cifras coladas: OK')
