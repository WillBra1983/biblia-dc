#!/usr/bin/env python3
"""Gera uma base pequena de digitações para os acordes usados pelo hinário."""

import argparse
import json
import re
from pathlib import Path


NOTE_VALUES = {
    "C": 0, "C#": 1, "DB": 1, "D": 2, "D#": 3, "EB": 3,
    "E": 4, "F": 5, "F#": 6, "GB": 6, "G": 7, "G#": 8,
    "AB": 8, "A": 9, "A#": 10, "BB": 10, "B": 11,
}
NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
TUNING_MIDI = [40, 45, 50, 55, 59, 64]
SOURCE_SUFFIX = {
    "": "major", "m": "minor", "4": "sus4", "7": "7",
    "5+": "aug", "7+": "maj7", "m7": "m7", "dim": "dim",
    "\u00ba": "dim7", "\u00b0": "dim7", "dim7": "dim7",
}
INTERVALS = {
    "": [0, 4, 7], "m": [0, 3, 7], "4": [0, 5, 7],
    "7": [0, 4, 7, 10], "5+": [0, 4, 8], "7+": [0, 4, 7, 11],
    "m7": [0, 3, 7, 10], "dim": [0, 3, 6],
    "\u00ba": [0, 3, 6, 9], "\u00b0": [0, 3, 6, 9], "dim7": [0, 3, 6, 9],
    "m4": [0, 3, 5, 7],
}
OPTIONAL_INTERVALS = {
    "7": {7}, "7+": {7}, "m7": {7},
}

# Inversões presentes no hinário, revisadas separadamente porque a base de
# origem contém principalmente posições com a fundamental no baixo.
SLASH_VOICINGS = {
    "A/C#": "x42220", "A/G": "302220", "Am/F#": "202210", "Am/G": "302210",
    "B/A": "x04442", "Bm/A": "x04432", "C#m/B": "x22120", "C/G": "332010",
    "D/A": "x00232", "D/E": "000232", "D/F#": "200232", "D7/A": "x00212",
    "Dm/C": "x30231", "Dm/F": "1x0231", "E/G#": "4x2100", "F/G": "3x3211",
    "G/B": "x20033", "G/F": "1x0003", "Gm/Bb": "x10033", "Gm/E": "0x0333",
}
SPECIAL_VOICINGS = {"Em4": "002000"}

# Primeiras posições ensinadas e usadas com mais frequência. A base de origem
# contém muitas inversões válidas em casas baixas; sem esta prioridade, algumas
# delas apareciam antes da forma aberta ou da pestana tradicional.
COMMON_VOICINGS = {
    "C": ("x32010", "032010"), "C#": ("x46664", "012341"),
    "D": ("xx0232", "000132"), "D#": ("xx1343", "001243"),
    "E": ("022100", "023100"), "F": ("133211", "134211"),
    "F#": ("244322", "134211"), "G": ("320003", "210003"),
    "G#": ("466544", "134211"), "A": ("x02220", "001230"),
    "A#": ("x13331", "012341"), "B": ("x24442", "012341"),
    "Bb": ("x13331", "012341"), "Eb": ("xx1343", "001243"),

    "Cm": ("x35543", "013421"), "C#m": ("x46654", "013421"),
    "Dm": ("xx0231", "000231"), "D#m": ("x68876", "013421"),
    "Em": ("022000", "012000"), "Fm": ("133111", "134111"),
    "F#m": ("244222", "134111"), "Gm": ("355333", "134111"),
    "G#m": ("466444", "134111"), "Am": ("x02210", "002310"),
    "A#m": ("x13321", "013421"), "Bm": ("x24432", "013421"),
    "Bbm": ("x13321", "013421"), "Ebm": ("x68876", "013421"),

    "C4": ("x33011", "034011"), "C#4": ("x46674", "012341"),
    "D4": ("xx0233", "000123"), "D#4": ("x68896", "012341"),
    "E4": ("022200", "012300"), "F4": ("133311", "123411"),
    "F#4": ("244422", "123411"), "G4": ("330013", "230014"),
    "G#4": ("466644", "123411"), "A4": ("x02230", "001240"),
    "A#4": ("x13341", "012341"), "B4": ("x24452", "012341"),

    "C7": ("x32310", "032410"), "C#7": ("x46464", "013141"),
    "D7": ("xx0212", "000213"), "D#7": ("x68686", "013141"),
    "E7": ("020100", "020100"), "F7": ("131211", "132411"),
    "F#7": ("242322", "132411"), "G7": ("320001", "320001"),
    "G#7": ("464544", "132411"), "A7": ("x02020", "001020"),
    "A#7": ("x13131", "013141"), "B7": ("x24242", "013141"),

    "C7+": ("x32000", "032000"), "C#7+": ("x46564", "013241"),
    "D7+": ("xx0222", "000123"), "D#7+": ("x68786", "013241"),
    "E7+": ("021100", "032100"), "F7+": ("132211", "134211"),
    "F#7+": ("243322", "134211"), "G7+": ("320002", "320004"),
    "G#7+": ("465544", "134211"), "A7+": ("x02120", "002130"),
    "A#7+": ("x13231", "013241"), "B7+": ("x24342", "013241"),

    "Cm7": ("x35343", "013141"), "C#m7": ("x46454", "013141"),
    "Dm7": ("xx0211", "000211"), "D#m7": ("x68676", "013141"),
    "Em7": ("020000", "020000"), "Fm7": ("131111", "132111"),
    "F#m7": ("242222", "132111"), "Gm7": ("353333", "132111"),
    "G#m7": ("464444", "132111"), "Am7": ("x02010", "002010"),
    "A#m7": ("x13121", "013141"), "Bm7": ("x24232", "013141"),
}
PREFERRED_VOICINGS = {
    chord: [{"frets": frets, "fingers": fingers}]
    for chord, (frets, fingers) in COMMON_VOICINGS.items()
}
PREFERRED_VOICINGS.update({
    "D5+": [{"frets": "x5433x", "fingers": "043120"}],
    # Uma casa acima da posição equivalente de G diminuto.
    "G#\u00ba": [{"frets": "4x343x", "fingers": "301420"}],
})
MAX_POSITIONS_PER_CHORD = 12


def decode_fret(char):
    if char.lower() == "x":
        return None
    if char.isdigit():
        return int(char)
    return ord(char.lower()) - ord("a") + 10


def decode_sequence(value):
    return [decode_fret(char) for char in value]


def parse_chord(chord):
    match = re.fullmatch(r"([A-G](?:#|b)?)(.*?)(?:/([A-G](?:#|b)?))?", chord, re.I)
    if not match:
        raise ValueError(f"Acorde inválido: {chord}")
    root, suffix, bass = match.groups()
    return NOTE_VALUES[root.upper()], suffix, NOTE_VALUES[bass.upper()] if bass else None


def sounding_notes(frets):
    return [TUNING_MIDI[index] + fret for index, fret in enumerate(frets) if fret is not None]


def infer_barres(frets, fingers, raw_barres):
    values = raw_barres if isinstance(raw_barres, list) else list(str(raw_barres or ""))
    barre_frets = {decode_fret(str(value)) for value in values}
    repeated = {}
    for string_index, (fret, finger) in enumerate(zip(frets, fingers)):
        if fret and finger:
            repeated.setdefault((finger, fret), []).append(string_index)
    barre_frets.update(fret for (_, fret), strings in repeated.items() if len(strings) >= 2)
    result = []
    for fret in sorted(barre_frets):
        matching_fingers = [
            (finger, strings)
            for (finger, item_fret), strings in repeated.items()
            if item_fret == fret and len(strings) >= 2
        ]
        if matching_fingers:
            finger, touched = max(matching_fingers, key=lambda item: len(item[1]))
        else:
            finger = 1
            touched = [index for index, item in enumerate(frets) if item == fret]
        if len(touched) >= 2:
            first, last = min(touched), max(touched)
            if any(frets[index] is None or frets[index] < fret for index in range(first, last + 1)):
                return None
            # Uma pestana curta e isolada no centro exige uma posição pouco
            # natural. Mantemos apenas as que alcançam uma borda do braço.
            if first > 0 and last < 5:
                return None
            result.append({"fret": fret, "from": first, "to": last, "finger": finger})
    return result


def valid_position(frets, root, suffix, bass=None):
    notes = sounding_notes(frets)
    if not notes:
        return False
    expected = {(root + interval) % 12 for interval in INTERVALS[suffix]}
    required = {
        (root + interval) % 12
        for interval in INTERVALS[suffix]
        if interval not in OPTIONAL_INTERVALS.get(suffix, set())
    }
    actual = {note % 12 for note in notes}
    allowed = expected | ({bass} if bass is not None else set())
    return required.issubset(actual) and actual.issubset(allowed) and (
        bass is None or min(notes) % 12 == bass
    )


def compact_position(frets, fingers=None, barres=None):
    return {
        "frets": frets,
        "fingers": fingers or [0] * 6,
        "barres": barres or [],
    }


def load_source_positions(source_root, chord):
    root, suffix, bass = parse_chord(chord)
    if bass is not None or suffix == "m4":
        return []
    source_file = source_root / NOTE_NAMES[root] / f"{SOURCE_SUFFIX[suffix]}.json"
    data = json.loads(source_file.read_text(encoding="utf-8"))
    candidates = []
    for index, raw in enumerate(data.get("positions", [])):
        raw_frets = raw.get("frets", "")
        if len(raw_frets) != 6:
            continue
        frets = decode_sequence(raw_frets)
        positive = [fret for fret in frets if fret and fret > 0]
        if (
            max((fret or 0) for fret in frets) > 24
            or (positive and max(positive) - min(positive) > 4)
            or not valid_position(frets, root, suffix)
        ):
            continue
        raw_fingers = raw.get("fingers", "000000")
        fingers = decode_sequence(raw_fingers) if len(raw_fingers) == 6 else [0] * 6
        barres = infer_barres(frets, fingers, raw.get("barres"))
        if barres is None:
            continue
        position = compact_position(frets, fingers, barres)
        candidates.append((index, position))
    unique = []
    seen = set()
    for _, position in candidates:
        key = tuple(position["frets"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(position)
        if len(unique) == MAX_POSITIONS_PER_CHORD:
            break
    return unique


def preferred_positions(chord):
    result = []
    root, suffix, bass = parse_chord(chord)
    for raw in PREFERRED_VOICINGS.get(chord, []):
        frets = decode_sequence(raw["frets"])
        if not valid_position(frets, root, suffix, bass):
            raise ValueError(f"Posição principal inválida: {chord} {raw['frets']}")
        fingers = decode_sequence(raw.get("fingers", "000000"))
        barres = infer_barres(frets, fingers, raw.get("barres"))
        if barres is None:
            raise ValueError(f"Pestana principal inválida: {chord} {raw['frets']}")
        result.append(compact_position(frets, fingers, barres))
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--hinario", default="public/hinario-cifras.json", type=Path)
    parser.add_argument("--output", default="src/data/hinarioChordVoicings.json", type=Path)
    args = parser.parse_args()

    hymnal = json.loads(args.hinario.read_text(encoding="utf-8"))["hinos"]
    chords = {
        detail["acorde"]
        for hymn in hymnal
        for line in hymn.get("linhas", [])
        for detail in line.get("detalhes", [])
        if detail.get("acorde")
    }
    suffixes = {
        parse_chord(chord)[1]
        for chord in chords
        if parse_chord(chord)[2] is None and parse_chord(chord)[1] != "m4"
    }
    chords.update(
        f"{root}{suffix}"
        for suffix in suffixes
        for root in NOTE_NAMES
    )
    chords = sorted(chords)
    output = {}
    for chord in chords:
        if chord in SLASH_VOICINGS or chord in SPECIAL_VOICINGS:
            raw = SLASH_VOICINGS.get(chord, SPECIAL_VOICINGS.get(chord))
            frets = decode_sequence(raw)
            root, suffix, bass = parse_chord(chord)
            if not valid_position(frets, root, suffix, bass):
                raise ValueError(f"Digitação especial inválida: {chord} {raw}")
            output[chord] = [compact_position(frets)]
        else:
            output[chord] = load_source_positions(args.source, chord)
        preferred = preferred_positions(chord)
        if preferred:
            seen = {tuple(position["frets"]) for position in preferred}
            output[chord] = preferred + [
                position for position in output[chord]
                if tuple(position["frets"]) not in seen
            ][:MAX_POSITIONS_PER_CHORD - len(preferred)]
        if not output[chord]:
            raise ValueError(f"Nenhuma posição encontrada para {chord}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(output)} acordes; {sum(map(len, output.values()))} posições; {args.output}")


if __name__ == "__main__":
    main()
