#!/usr/bin/env python3
"""Converte todo o hinario cifrado em area experimental e auditavel.

Este arquivo nunca escreve nos bancos, paginas ou ativos usados pelo aplicativo.
"""

from __future__ import annotations

import argparse
import difflib
import html
import importlib.util
import json
import re
import sqlite3
import sys
import unicodedata
from pathlib import Path

import pdfplumber
from PIL import Image


TEXT_CORRECTIONS = {
    "L o u v a i-o sim,": "Louvai-o sim,",
    "S oberano Senhor do que é feito.": "Soberano Senhor do que é feito.",
    "P o i s e m mim não há justiça,": "Pois em mim não há justiça,",
    "É a m e nsagem que me deu,": "É a mensagem que me deu,",
    "F a z e o m i l a g r e , ó g r ande Deus:": "Faze o milagre, ó grande Deus:",
    "Nunca a ninguém rejeitou, !": "Nunca a ninguém rejeitou!",
    "A M É M , A M É M , A -----------M É M .": "AMÉM, AMÉM, AMÉM.",
}
TITLE_CORRECTIONS = {"SAUDANDO O ANO A NOVO.": "SAUDANDO O ANO NOVO."}
LYRICS_REFERENCE: dict[str, list[dict]] = {}
LYRICS_SECTIONS: dict[str, list[dict]] = {}
PDF_UNASSIGNED: list[dict] = []
EDITORIAL_SOURCE_OVERRIDES = {
    "77": {
        "Alegria, alegria nele sempre reinará!": ["Santo gozo, santo gozo", "Nele sempre reinará!"],
    },
    "119": {
        "Concedendo a todos iluminação!": ["Despertando em todos santa inspiração!"],
    },
    "339": {
        "O amor de Cristo e seu perdão": ["O gozo deste coração"],
    },
}
SECTION_PATTERN = re.compile(r"(?i)^\s*(estrofe\s+\d+|coro|estribilho|refr[aã]o|ponte)\s*:?\s*$")


def clean_lyric_text(value: str) -> str:
    value = TEXT_CORRECTIONS.get(value, value)
    value = re.sub(r"\(\s*b\s+i\s+s\s*\)", "(bis)", value, flags=re.I)
    value = re.sub(r"-{2,}", "", value)
    value = re.sub(r"\s+([,;:!?\.])", r"\1", value)
    value = re.sub(r"[,;:]\s*([!?])", r"\1", value)
    value = re.sub(r"([,;:!?])\1+", r"\1", value)
    value = re.sub(r"([,;:!?])(?=\S)", r"\1 ", value)
    return value.strip()


def clean_title_text(value: str) -> str:
    value = re.sub(r"\s+([,;:!?\.])", r"\1", value).strip()
    return TITLE_CORRECTIONS.get(value, value)


def comparable_text(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.casefold())
    value = "".join(char for char in value if not unicodedata.combining(char))
    return "".join(char for char in value if char.isalnum())


def load_lyrics_reference(path: Path) -> tuple[dict[str, list[dict]], dict[str, list[dict]]]:
    result: dict[str, list[dict]] = {}
    sections_by_hymn: dict[str, list[dict]] = {}
    with sqlite3.connect(path) as connection:
        rows = connection.execute("select numero, conteudo from hinos").fetchall()
    for number, content in rows:
        hymn_id = str(number).lstrip("0") or "0"
        candidates = []
        sections = []
        pending_section = None
        for line in content.splitlines():
            line = line.strip()
            section_match = SECTION_PATTERN.fullmatch(line)
            if section_match:
                pending_section = section_match.group(1).strip().title()
                continue
            compact = comparable_text(line)
            if compact:
                candidates.append({"texto": line, "comparavel": compact})
                if pending_section:
                    sections.append({"texto": pending_section, "ancora": line})
                    pending_section = None
        result[hymn_id] = candidates
        sections_by_hymn[hymn_id] = sections
    return result, sections_by_hymn


def section_anchor_score(anchor: str, lines: list[str], start: int) -> float:
    anchor_compact = comparable_text(anchor)
    return max(
        difflib.SequenceMatcher(None, anchor_compact, comparable_text(" ".join(lines[start : start + size]))).ratio()
        for size in range(1, min(4, len(lines) - start) + 1)
    )


def resolve_lyric_sections(hymn_id: str, structured: list[dict]) -> list[dict]:
    candidates = [
        (index, line.get("letra") or line.get("texto") or "")
        for index, line in enumerate(structured)
        if line.get("letra") or line.get("texto")
    ]
    texts = [text for _, text in candidates]
    cursor = 0
    resolved = []
    for section in LYRICS_SECTIONS.get(hymn_id, []):
        found = None
        for position in range(cursor, len(texts)):
            score = section_anchor_score(section["ancora"], texts, position)
            if score >= 0.78:
                found = (position, score)
                break
        if found is None:
            options = [
                (section_anchor_score(section["ancora"], texts, position), position)
                for position in range(cursor, len(texts))
            ]
            best_score, best_position = max(options, default=(0, 0))
            if best_score >= 0.68:
                found = (best_position, best_score)
        if found is None:
            continue
        position, score = found
        resolved.append({
            "indice_linha": candidates[position][0],
            "texto": section["texto"],
            "similaridade": round(score, 3),
            "origem": "public/hinario.db",
        })
        cursor = position + 1
    return resolved


def resolve_lyric(hymn_id: str, value: str) -> tuple[str, dict | None]:
    compact = comparable_text(value)
    candidates = LYRICS_REFERENCE.get(hymn_id, [])
    scored = [(difflib.SequenceMatcher(None, compact, item["comparavel"]).ratio(), item) for item in candidates]
    if not scored:
        return value, None
    score, candidate = max(scored, key=lambda item: item[0])
    if score < 0.90 or candidate["comparavel"] == compact:
        return value, None
    return clean_lyric_text(candidate["texto"]), {
        "origem": "public/hinario.db",
        "similaridade": round(score, 3),
        "texto_pdf_limpo": value,
    }


def comparable_with_positions(value: str) -> tuple[str, list[int]]:
    """Retorna o texto comparavel e a posicao de cada caractere no original."""
    chars = []
    positions = []
    for index, char in enumerate(value):
        normalized = unicodedata.normalize("NFKD", char.casefold())
        for normalized_char in normalized:
            if not unicodedata.combining(normalized_char) and normalized_char.isalnum():
                chars.append(normalized_char)
                positions.append(index)
    return "".join(chars), positions


def aligned_target_position(opcodes: list[tuple], source_position: int) -> int:
    """Projeta uma posicao do PDF na letra editorial alinhada."""
    for tag, source_start, source_end, target_start, target_end in opcodes:
        if source_start <= source_position < source_end:
            if tag == "equal":
                return target_start + source_position - source_start
            source_span = max(1, source_end - source_start)
            target_span = max(1, target_end - target_start)
            relative = (source_position - source_start) / source_span
            return target_start + min(target_span - 1, int(relative * target_span))
    if not opcodes:
        return 0
    return opcodes[-1][4]


def align_editorial_lines(source_lines: list[tuple], editorial: list[dict]) -> dict[int, int]:
    """Alinha linhas em ordem, descartando repeticoes excedentes do PDF."""
    source_comparable = [comparable_text(line["letra"]) for _, line in source_lines]
    target_comparable = [item["comparavel"] for item in editorial]
    source_count = len(source_comparable)
    target_count = len(target_comparable)
    negative_infinity = float("-inf")
    scores = [[negative_infinity] * (target_count + 1) for _ in range(source_count + 1)]
    backtrack = [[None] * (target_count + 1) for _ in range(source_count + 1)]
    scores[0][0] = 0.0

    for source_index in range(source_count + 1):
        for target_index in range(target_count + 1):
            current = scores[source_index][target_index]
            if current == negative_infinity:
                continue
            if source_index < source_count:
                candidate = current - 0.12
                if candidate > scores[source_index + 1][target_index]:
                    scores[source_index + 1][target_index] = candidate
                    backtrack[source_index + 1][target_index] = (source_index, target_index, "skip_source")
            if target_index < target_count:
                candidate = current - 0.75
                if candidate > scores[source_index][target_index + 1]:
                    scores[source_index][target_index + 1] = candidate
                    backtrack[source_index][target_index + 1] = (source_index, target_index, "skip_target")
            if source_index < source_count and target_index < target_count:
                similarity = difflib.SequenceMatcher(
                    None,
                    source_comparable[source_index],
                    target_comparable[target_index],
                    autojunk=False,
                ).ratio()
                if similarity >= 0.55:
                    # Em linhas repetidas (especialmente coros), prefere a primeira
                    # ocorrencia musical disponivel no fluxo do PDF.
                    candidate = current + similarity * 2 - source_index * 0.00001
                    if candidate > scores[source_index + 1][target_index + 1]:
                        scores[source_index + 1][target_index + 1] = candidate
                        backtrack[source_index + 1][target_index + 1] = (source_index, target_index, "match")

    matches = {}
    source_index = source_count
    target_index = target_count
    while source_index > 0 or target_index > 0:
        step = backtrack[source_index][target_index]
        if step is None:
            break
        previous_source, previous_target, action = step
        if action == "match":
            matches[target_index - 1] = source_index - 1
        source_index, target_index = previous_source, previous_target
    return matches


def remap_line_details(source_line: dict, target_text: str) -> list[dict]:
    source_text = source_line["letra"]
    source_comparable, source_positions = comparable_with_positions(source_text)
    target_comparable, target_positions = comparable_with_positions(target_text)
    if not source_positions or not target_positions:
        return []
    opcodes = difflib.SequenceMatcher(None, source_comparable, target_comparable, autojunk=False).get_opcodes()
    remapped = []
    for detail in source_line.get("cifras_detalhadas", []):
        original_index = max(0, int(detail.get("indice", 0) or 0))
        source_position = next(
            (index for index, position in enumerate(source_positions) if position >= original_index),
            len(source_positions) - 1,
        )
        target_position = aligned_target_position(opcodes, source_position)
        target_position = max(0, min(target_position, len(target_positions) - 1))
        mapped = {**detail, "indice": target_positions[target_position]}
        remapped.append(mapped)
    return sorted(remapped, key=lambda detail: (detail.get("indice", 0), detail.get("x", 0)))


def without_bis_marker(value: str) -> str:
    return re.sub(r"\s*\(\s*bis\s*\)\s*", "", value, flags=re.I).strip()


def source_group_text(source_lines: list[tuple], positions: list[int]) -> str:
    return " ".join(source_lines[position][1]["letra"] for position in positions)


def expand_source_groups(source_lines: list[tuple], editorial: list[dict], matches: dict[int, int]) -> dict[int, list[int]]:
    """Agrupa quebras do PDF que formam uma unica linha editorial."""
    matched_positions = set(matches.values())
    groups = {target_index: [source_position] for target_index, source_position in matches.items()}
    claimed = set(matched_positions)
    for target_index in sorted(matches):
        source_position = matches[target_index]
        left_blocker = max((position for position in matched_positions if position < source_position), default=-1)
        right_blocker = min((position for position in matched_positions if position > source_position), default=len(source_lines))
        base_score = difflib.SequenceMatcher(
            None,
            comparable_text(source_lines[source_position][1]["letra"]),
            editorial[target_index]["comparavel"],
            autojunk=False,
        ).ratio()
        candidates = []
        for start in range(max(left_blocker + 1, source_position - 3), source_position + 1):
            for end in range(source_position + 1, min(right_blocker, source_position + 4) + 1):
                positions = list(range(start, end))
                if any(position in claimed and position != source_position for position in positions):
                    continue
                similarity = difflib.SequenceMatcher(
                    None,
                    comparable_text(source_group_text(source_lines, positions)),
                    editorial[target_index]["comparavel"],
                    autojunk=False,
                ).ratio()
                candidates.append((similarity, -len(positions), positions))
        best_score, _, best_positions = max(candidates, default=(base_score, -1, [source_position]))
        if len(best_positions) > 1 and best_score >= 0.68 and best_score >= base_score + 0.08:
            groups[target_index] = best_positions
            claimed.update(best_positions)
    return groups


def assign_unordered_editorial_groups(
    source_lines: list[tuple],
    editorial: list[dict],
    matches: dict[int, int],
    groups: dict[int, list[int]],
) -> None:
    """Recupera estrofes cuja ordem no PDF difere da ordem editorial."""
    claimed = {position for positions in groups.values() for position in positions}
    for target_index, item in enumerate(editorial):
        if target_index in groups:
            continue
        candidates = []
        for start in range(len(source_lines)):
            if start in claimed:
                continue
            for length in range(1, 5):
                positions = list(range(start, min(len(source_lines), start + length)))
                if len(positions) != length or any(position in claimed for position in positions):
                    break
                similarity = difflib.SequenceMatcher(
                    None,
                    comparable_text(source_group_text(source_lines, positions)),
                    item["comparavel"],
                    autojunk=False,
                ).ratio()
                candidates.append((similarity, -length, positions))
        similarity, _, positions = max(candidates, default=(0.0, 0, []))
        if similarity >= 0.68:
            groups[target_index] = positions
            matches[target_index] = positions[0]
            claimed.update(positions)


def apply_editorial_source_overrides(
    hymn_id: str,
    source_lines: list[tuple],
    editorial: list[dict],
    matches: dict[int, int],
    groups: dict[int, list[int]],
) -> None:
    """Liga variantes conhecidas de letra às linhas musicais exatas do PDF."""
    overrides = EDITORIAL_SOURCE_OVERRIDES.get(hymn_id, {})
    for target_text, source_texts in overrides.items():
        target_key = comparable_text(target_text)
        target_index = next(
            (index for index, item in enumerate(editorial) if item["comparavel"] == target_key),
            None,
        )
        source_keys = [comparable_text(text) for text in source_texts]
        source_positions = next(
            (
                list(range(start, start + len(source_keys)))
                for start in range(len(source_lines) - len(source_keys) + 1)
                if [
                    comparable_text(source_lines[position][1]["letra"])
                    for position in range(start, start + len(source_keys))
                ] == source_keys
            ),
            None,
        )
        if target_index is None or source_positions is None:
            raise RuntimeError(f"Variacao editorial nao localizada no hino {hymn_id}: {target_text}")

        for other_target, positions in list(groups.items()):
            remaining = [position for position in positions if position not in source_positions]
            if remaining:
                groups[other_target] = remaining
                matches[other_target] = remaining[0]
            elif other_target != target_index:
                groups.pop(other_target, None)
                matches.pop(other_target, None)
        groups[target_index] = source_positions
        matches[target_index] = source_positions[0]


def partition_editorial_text(value: str, source_texts: list[str]) -> list[str]:
    """Reparte a letra oficial somente entre palavras, seguindo as quebras do PDF."""
    if len(source_texts) <= 1:
        return [value]
    words = re.findall(r"\S+", value)
    if len(words) < len(source_texts):
        return [value] + [""] * (len(source_texts) - 1)
    weights = [max(1, len(comparable_text(text))) for text in source_texts]
    word_weights = [max(1, len(comparable_text(word))) for word in words]
    total_source = sum(weights)
    total_words = sum(word_weights)
    boundaries = []
    source_accumulated = 0
    previous_word = 0
    for line_index, weight in enumerate(weights[:-1], 1):
        source_accumulated += weight
        desired = source_accumulated / total_source * total_words
        word_accumulated = 0
        best_word = previous_word + 1
        best_distance = float("inf")
        max_word = len(words) - (len(source_texts) - line_index)
        for word_index, word_weight in enumerate(word_weights, 1):
            word_accumulated += word_weight
            if word_index <= previous_word or word_index > max_word:
                continue
            distance = abs(word_accumulated - desired)
            if distance < best_distance:
                best_distance = distance
                best_word = word_index
        boundaries.append(best_word)
        previous_word = best_word
    segments = []
    start = 0
    for end in boundaries + [len(words)]:
        segments.append(" ".join(words[start:end]))
        start = end
    return segments


def editorial_word_coverage(source: str, target: str) -> float:
    source_words = [comparable_text(word) for word in re.findall(r"[\wÀ-ÿ]+", source)]
    target_words = {comparable_text(word) for word in re.findall(r"[\wÀ-ÿ]+", target)}
    source_words = [word for word in source_words if word]
    if not source_words:
        return 0.0
    return sum(1 for word in source_words if word in target_words) / len(source_words)


def apply_editorial_lyrics(hymn_id: str, structured: list[dict]) -> list[dict]:
    """Usa a letra oficial como base e projeta nela as cifras extraidas do PDF."""
    editorial = LYRICS_REFERENCE.get(hymn_id, [])
    if not editorial:
        return structured

    source_lines = [(index, line) for index, line in enumerate(structured) if line.get("letra")]
    matches = align_editorial_lines(source_lines, editorial)
    source_groups = expand_source_groups(source_lines, editorial, matches)
    assign_unordered_editorial_groups(source_lines, editorial, matches, source_groups)
    apply_editorial_source_overrides(hymn_id, source_lines, editorial, matches, source_groups)
    matched_source_positions = {position for positions in source_groups.values() for position in positions}
    repetitions = []
    source_position = 0
    while source_position < len(source_lines):
        if source_position in matched_source_positions:
            source_position += 1
            continue
        previous_match = max(
            ((target_index, matched_position) for target_index, matched_position in matches.items() if matched_position < source_position),
            key=lambda item: item[1],
            default=None,
        )
        anchor_target = previous_match[0] if previous_match else 0
        pdf_candidates = [
            (
                difflib.SequenceMatcher(
                    None,
                    comparable_text(source_group_text(source_lines, list(range(source_position, min(len(source_lines), source_position + len(group_positions)))))),
                    comparable_text(source_group_text(source_lines, group_positions)),
                    autojunk=False,
                ).ratio(),
                -abs(target_index - anchor_target),
                -target_index,
                target_index,
                len(group_positions),
            )
            for target_index, group_positions in source_groups.items()
            if source_position + len(group_positions) <= len(source_lines)
            and not any(position in matched_source_positions for position in range(source_position, source_position + len(group_positions)))
        ]
        similarity, _, _, target_index, group_length = max(pdf_candidates, default=(0.0, 0, 0, -1, 1))
        if similarity < 0.92:
            source_comparable = comparable_text(source_lines[source_position][1]["letra"])
            editorial_candidates = [
                (
                    difflib.SequenceMatcher(None, source_comparable, item["comparavel"], autojunk=False).ratio(),
                    -abs(candidate_target - anchor_target),
                    -candidate_target,
                    candidate_target,
                    1,
                )
                for candidate_target, item in enumerate(editorial)
                if candidate_target in matches
            ]
            similarity, _, _, target_index, group_length = max(editorial_candidates, default=(0.0, 0, 0, -1, 1))
        group_positions = list(range(source_position, source_position + group_length))
        use_source_text = False
        if similarity < 0.88:
            lexical_candidates = [
                (
                    editorial_word_coverage(source_lines[source_position][1]["letra"], item["texto"]),
                    -abs(candidate_target - anchor_target),
                    -candidate_target,
                    candidate_target,
                )
                for candidate_target, item in enumerate(editorial)
                if candidate_target in matches
            ]
            lexical_score, _, _, lexical_target = max(lexical_candidates, default=(0.0, 0, 0, -1))
            if lexical_score >= 0.85:
                similarity = lexical_score
                target_index = lexical_target
                group_length = 1
                group_positions = [source_position]
                use_source_text = True
        if similarity >= 0.88 and any(source_lines[position][1].get("cifras_detalhadas") for position in group_positions):
            repetitions.append({
                "target_index": target_index,
                "source_position": source_position,
                "source_positions": group_positions,
                "use_source_text": use_source_text,
            })
            source_position += group_length
        else:
            source_position += 1

    repeated_targets = {item["target_index"] for item in repetitions}
    used_source_positions = {
        position
        for positions in source_groups.values()
        for position in positions
    }
    used_source_positions.update(
        position
        for repetition in repetitions
        for position in repetition["source_positions"]
    )
    unassigned_chord_lines = [
        position
        for position, (_, line) in enumerate(source_lines)
        if line.get("cifras_detalhadas") and position not in used_source_positions
    ]
    if unassigned_chord_lines:
        for position in unassigned_chord_lines:
            source_structured_index, line = source_lines[position]
            best_similarity = max(
                (
                    difflib.SequenceMatcher(None, comparable_text(line["letra"]), item["comparavel"], autojunk=False).ratio()
                    for item in editorial
                ),
                default=0.0,
            )
            PDF_UNASSIGNED.append({
                "hino": hymn_id,
                "indice_linha": source_structured_index,
                "texto": line["letra"],
                "cifras": [detail["acorde"] for detail in line.get("cifras_detalhadas", [])],
                "melhor_similaridade_editorial": round(best_similarity, 3),
            })
    matched_points = sorted((target_index, source_position) for target_index, source_position in matches.items())

    def target_order_position(target_index: int) -> float:
        if target_index in matches:
            return float(matches[target_index])
        previous = next((point for point in reversed(matched_points) if point[0] < target_index), None)
        following = next((point for point in matched_points if point[0] > target_index), None)
        if previous and following:
            target_span = following[0] - previous[0]
            relative = (target_index - previous[0]) / target_span
            return previous[1] + relative * (following[1] - previous[1])
        if previous:
            return previous[1] + (target_index - previous[0]) * 0.01
        if following:
            return following[1] - (following[0] - target_index) * 0.01
        return float(target_index)

    events = [
        {
            "order": target_order_position(target_index),
            "target_index": target_index,
            "source_positions": source_groups.get(target_index, []),
            "repetition": False,
            "use_source_text": False,
        }
        for target_index in range(len(editorial))
    ]
    events.extend({"order": float(item["source_position"]), "repetition": True, **item} for item in repetitions)
    events.sort(key=lambda event: (event["order"], event["target_index"], event["repetition"]))

    rebuilt = []
    for event in events:
        target_index = event["target_index"]
        target_text = editorial[target_index]["texto"]
        if target_index in repeated_targets:
            target_text = without_bis_marker(target_text)
        source_positions = event["source_positions"]
        source_texts = [source_lines[position][1]["letra"] for position in source_positions]
        if event.get("use_source_text"):
            segments = [without_bis_marker(text) for text in source_texts]
        else:
            segments = partition_editorial_text(target_text, source_texts) if source_positions else [target_text]
        for segment_index, segment in enumerate(segments):
            source_structured_index = None
            source_line = None
            if source_positions:
                source_structured_index, source_line = source_lines[source_positions[segment_index]]
            details = remap_line_details(source_line, segment) if source_line is not None else []
            source_chords = [detail["acorde"] for detail in source_line.get("cifras_detalhadas", [])] if source_line else []
            mapped_chords = [detail["acorde"] for detail in details]
            if mapped_chords != source_chords:
                raise RuntimeError(f"Sequencia de cifras alterada no hino {hymn_id}, linha editorial {target_index + 1}.")
            rebuilt.append({
                "tipo": "cifra_letra" if details else "texto",
                "letra": segment,
                "texto": segment,
                "cifras": mapped_chords,
                "cifras_detalhadas": details,
                "correcao_editorial": {"origem": "public/hinario.db", "exata": True},
                "repeticao_pdf": event["repetition"],
                "alinhamento_pdf": {
                    "indice_linha": source_structured_index,
                    "letra": source_line.get("letra") if source_line else None,
                    "cifras": source_chords,
                },
            })

    # Preserva raras introducoes/interludios sem alterar a letra oficial.
    extras = [line for line in structured if line.get("tipo") in {"cifras", "nota", "subtitulo"}]
    if extras:
        rebuilt = extras + rebuilt
    return rebuilt


def load_extractor(path: Path):
    spec = importlib.util.spec_from_file_location("extrator_hinario_completo", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Nao foi possivel carregar {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def parse_number(tokens: list[str]) -> tuple[int, str | None, int] | None:
    match = re.fullmatch(r"(\d+)(?:-([A-Z]))?", tokens[0], re.I)
    if not match:
        return None
    suffix = match.group(2)
    consumed = 1
    if suffix is None and len(tokens) >= 3 and tokens[1] == "-" and re.fullmatch(r"[A-Z]", tokens[2], re.I):
        suffix = tokens[2].upper()
        consumed = 3
    return int(match.group(1)), suffix, consumed


def parse_heading_rows(rows, extractor):
    if not rows:
        return None
    tokens = [word["text"].strip() for word in rows[0].words]
    number_data = parse_number(tokens)
    if number_data is None:
        return None
    number, suffix, title_start = number_data
    consumed_rows = 1
    meter_indexes = [index for index, token in enumerate(tokens) if extractor.METER_RE.fullmatch(token)]
    if not meter_indexes and len(rows) > 1 and extractor.METER_RE.fullmatch(rows[1].text):
        tokens.append(rows[1].text)
        meter_indexes = [len(tokens) - 1]
        consumed_rows = 2
    if not meter_indexes:
        return None

    first_meter = meter_indexes[0]
    key = None
    key_start = first_meter
    if first_meter >= 2 and tokens[first_meter - 1] == "-" and re.fullmatch(r"[A-G](?:#|b)?", tokens[first_meter - 2], re.I):
        key = tokens[first_meter - 2] + "m"
        key_start = first_meter - 2
    elif first_meter >= 1:
        candidate = tokens[first_meter - 1].replace("-", "m")
        if extractor.CHORD_RE.fullmatch(candidate):
            key = candidate
            key_start = first_meter - 1

    title_end = key_start if key is not None else first_meter
    title = " ".join(tokens[title_start:title_end]).strip()
    meters = [tokens[index] for index in meter_indexes]
    extra = " ".join(tokens[first_meter + 1 :]).strip()
    warnings = []
    if key is None:
        warnings.append("Tom ausente no cabecalho do PDF; deve ser conferido pela primeira cifra.")
    return {
        "numero": number,
        "sufixo": suffix,
        "id": f"{number}-{suffix}" if suffix else str(number),
        "titulo": title,
        "tom_original": key,
        "compassos": meters,
        "detalhe_cabecalho": extra,
        "linhas_cabecalho": consumed_rows,
        "avisos_cabecalho": warnings,
    }


def parse_supplement(rows):
    if not rows:
        return None
    if rows[0].text.upper().startswith("AMÉM TRÍPLICE"):
        return {
            "numero": None,
            "sufixo": None,
            "id": "amem-triplice",
            "titulo": "AMÉM TRÍPLICE",
            "tom_original": "G",
            "compassos": ["4/4"],
            "detalhe_cabecalho": "",
            "linhas_cabecalho": 1,
            "avisos_cabecalho": [],
        }
    return None


def column_rows(page, bbox, extractor):
    crop = page.crop(bbox)
    words = crop.extract_words(x_tolerance=1, y_tolerance=2, use_text_flow=False)
    words = [{**word, "text": extractor.repair_pdf_text(word["text"])} for word in words]
    return [row for row in extractor.group_rows(words) if row.top < page.height - 48]


def infer_missing_key(heading: dict, segments: list[dict], extractor) -> None:
    if heading["tom_original"] is not None:
        return
    if heading["id"] == "281":
        heading["tom_original"] = "G"
        heading["avisos_cabecalho"] = []
        heading["auditoria_manual"] = [
            "O PDF omite o tom no cabecalho; G foi confirmado visualmente pela primeira cifra na pagina 161."
        ]
        return
    for segment in segments:
        for row in segment["rows"]:
            if extractor.is_chord_row(row):
                chords = extractor.chord_tokens(row)
                if chords:
                    heading["tom_original"] = re.match(r"[A-G](?:#|b)?", chords[0]["text"], re.I).group(0)
                    heading["avisos_cabecalho"].append(
                        f"Tom inferido como {heading['tom_original']} a partir da primeira cifra; origem exige revisao visual."
                    )
                    return


def looks_like_unparsed_chords(text: str) -> bool:
    compact = re.sub(r"[A-Ga-g#b0-9m+°/()\-\s]", "", text)
    roots = len(re.findall(r"[A-G](?:#|b)?", text))
    return roots >= 2 and len(compact) <= 1


def classify_text_row(value: str) -> str:
    stripped = value.strip()
    if re.match(r"(?i)^música\s+do\s+", stripped):
        return "nota"
    if re.fullmatch(r"\(\s*NA\s+[^)]+\)", stripped):
        return "subtitulo"
    if stripped.upper() in {"LOUVOR", "DECLARAÇÃO", "ORAÇÃO", "CORO", "ESTRIBILHO"}:
        return "secao"
    return "texto"


def detailed_chords(row, extractor) -> dict:
    spans = []
    opened = None
    for word in row.words:
        raw = word["text"]
        if "(" in raw and opened is None:
            opened = word["x0"]
        if ")" in raw and opened is not None:
            spans.append((opened, word["x1"]))
            opened = None
    if opened is not None:
        spans.append((opened, max(word["x1"] for word in row.words)))
    normalized = extractor.normalize_chord_tokens(row.words)
    chords = [item for item in normalized if extractor.is_chord_text(item["text"])]
    annotations = [item["text"] for item in normalized if not extractor.is_chord_text(item["text"])]
    origin = min((word["x0"] for word in row.words), default=0)
    details = []
    for chord in chords:
        center = (chord["x0"] + chord["x1"]) / 2
        details.append({
            "acorde": chord["text"],
            "x": round(chord["x0"] - origin, 1),
            "alternativa": any(start <= center <= end for start, end in spans),
        })
    return {"tokens": chords, "detalhes": details, "anotacao": " ".join(annotations).strip()}


def chordpro_from_structured(lines: list[dict]) -> str:
    """Gera a representacao de auditoria a partir das mesmas linhas usadas no app."""
    rendered = []
    for line in lines:
        lyric = line.get("letra")
        details = line.get("cifras_detalhadas", [])
        if lyric is not None:
            chords_by_index: dict[int, list[str]] = {}
            for detail in details:
                index = max(0, min(len(lyric), int(detail.get("indice", 0))))
                chords_by_index.setdefault(index, []).append(detail["acorde"])
            chunks = []
            for index in range(len(lyric) + 1):
                chunks.extend(f"[{chord}]" for chord in chords_by_index.get(index, []))
                if index < len(lyric):
                    chunks.append(lyric[index])
            rendered.append("".join(chunks))
            continue
        if line.get("cifras"):
            rendered.append(" ".join(f"[{chord}]" for chord in line["cifras"]))
        elif line.get("texto"):
            rendered.append(f"{{comment: {line['texto']}}}")
    return "\n".join(rendered).strip()


def structure_hymn(heading: dict, segments: list[dict], extractor) -> dict:
    infer_missing_key(heading, segments, extractor)
    structured = []
    chordpro = []
    warnings = list(heading["avisos_cabecalho"])
    pending = None
    source_columns = []

    for segment in segments:
        source_columns.append({"pagina": segment["pagina"], "coluna": segment["coluna"], "linhas": len(segment["rows"])})
        for row in segment["rows"]:
            if extractor.is_chord_row(row):
                if pending is not None:
                    standalone_data = detailed_chords(pending["row"], extractor)
                    standalone = standalone_data["tokens"]
                    structured.append({
                        "tipo": "cifras",
                        "cifras": [item["text"] for item in standalone],
                        "cifras_fonte": pending["row"].text,
                        "cifras_detalhadas": standalone_data["detalhes"],
                        "anotacao": standalone_data["anotacao"],
                        "pagina": pending["pagina"],
                        "coluna": pending["coluna"],
                        "y": round(pending["row"].top, 1),
                    })
                    chordpro.append(" ".join(f"[{item['text']}]" for item in standalone))
                pending = {"row": row, "pagina": segment["pagina"], "coluna": segment["coluna"]}
                continue
            if pending is not None:
                chord_data = detailed_chords(pending["row"], extractor)
                chords = chord_data["tokens"]
                primary_chords = [token for token, detail in zip(chords, chord_data["detalhes"]) if not detail["alternativa"]]
                alternative_chords = [token for token, detail in zip(chords, chord_data["detalhes"]) if detail["alternativa"]]
                pdf_lyric_text = clean_lyric_text(row.text)
                lyric_text, editorial = resolve_lyric(heading["id"], pdf_lyric_text)
                source_lyric_text = " ".join(item["text"] for item in row.words).strip()
                for token, detail in zip(chords, chord_data["detalhes"]):
                    source_position = extractor.character_offset(row.words, token["x0"])
                    detail["indice"] = extractor.remap_character_offset(source_lyric_text, lyric_text, source_position)
                structured.append({
                    "tipo": "cifra_letra",
                    "cifras": [item["text"] for item in chords],
                    "cifras_fonte": pending["row"].text,
                    "cifras_detalhadas": chord_data["detalhes"],
                    "anotacao": chord_data["anotacao"],
                    "letra": lyric_text,
                    "letra_fonte": row.text,
                    "correcao_editorial": editorial,
                    "pagina": pending["pagina"],
                    "coluna": pending["coluna"],
                    "y_cifra": round(pending["row"].top, 1),
                    "y_letra": round(row.top, 1),
                })
                chordpro_line = extractor.chordpro_line_with_tokens(primary_chords or chords, row.words, lyric_text)
                chordpro.append(chordpro_line)
                if alternative_chords:
                    label = chord_data["anotacao"] or "alternativa"
                    chordpro.append(f"{{comment: {label}}}")
                    chordpro.append(extractor.chordpro_line_with_tokens(alternative_chords, row.words, lyric_text))
                pending = None
            else:
                pdf_lyric_text = clean_lyric_text(row.text)
                lyric_text, editorial = resolve_lyric(heading["id"], pdf_lyric_text)
                text_type = classify_text_row(lyric_text)
                structured.append({
                    "tipo": text_type,
                    "letra": lyric_text if text_type == "texto" else None,
                    "texto": lyric_text,
                    "letra_fonte": row.text if text_type == "texto" else None,
                    "correcao_editorial": editorial if text_type == "texto" else None,
                    "texto_fonte": row.text,
                    "pagina": segment["pagina"],
                    "coluna": segment["coluna"],
                    "y": round(row.top, 1),
                })
                chordpro.append(lyric_text if text_type == "texto" else f"{{comment: {lyric_text}}}")
                if text_type == "texto" and looks_like_unparsed_chords(row.text):
                    warnings.append(f"Possivel linha de cifras nao reconhecida em p{segment['pagina']} y={row.top:.1f}: {row.text}")

    if pending is not None:
        standalone_data = detailed_chords(pending["row"], extractor)
        standalone = standalone_data["tokens"]
        structured.append({
            "tipo": "cifras",
            "cifras": [item["text"] for item in standalone],
            "cifras_fonte": pending["row"].text,
            "cifras_detalhadas": standalone_data["detalhes"],
            "anotacao": standalone_data["anotacao"],
            "pagina": pending["pagina"],
            "coluna": pending["coluna"],
            "y": round(pending["row"].top, 1),
        })
        chordpro.append(" ".join(f"[{item['text']}]" for item in standalone))
    if not any(item["tipo"] == "cifra_letra" for item in structured):
        warnings.append("Nenhuma linha de cifras reconhecida.")

    structured = apply_editorial_lyrics(heading["id"], structured)
    original = chordpro_from_structured(structured)
    result = {
        **{key: value for key, value in heading.items() if key not in {"linhas_cabecalho", "avisos_cabecalho"}},
        "fontes": source_columns,
        "auditoria_manual": heading.get("auditoria_manual", []),
        "linhas": structured,
        "chordpro": original,
        "tom_teste_mais_2": extractor.transpose_chord(heading["tom_original"], 2) if heading["tom_original"] else None,
        "chordpro_teste_mais_2": extractor.transpose_chordpro(original, 2),
        "avisos": list(dict.fromkeys(warnings)),
        "status": "revisar" if warnings else "validacao_automatica_ok",
    }
    result["titulo_fonte"] = result["titulo"]
    result["titulo"] = clean_title_text(result["titulo"])
    result["secoes_editoriais"] = resolve_lyric_sections(result["id"], structured)
    result["linhas_fonte_total"] = sum(item["linhas"] for item in source_columns)
    result["linhas_estruturadas_total"] = sum(2 if item["tipo"] == "cifra_letra" else 1 for item in structured)
    return result


def crop_sources(hymn: dict, rendered_dir: Path, output_dir: Path) -> list[str]:
    paths = []
    target_dir = output_dir / "fontes-completas"
    target_dir.mkdir(parents=True, exist_ok=True)
    for part, source_data in enumerate(hymn["fontes"], 1):
        page_number = source_data["pagina"]
        source = rendered_dir / f"pagina-{page_number:03d}.jpg"
        if not source.exists():
            continue
        target = target_dir / f"hino-{hymn['id'].lower()}-parte-{part:02d}.jpg"
        if target.exists():
            paths.append(target.relative_to(output_dir).as_posix())
            continue
        with Image.open(source) as image:
            midpoint = image.width // 2
            box = (0, 0, midpoint, image.height) if source_data["coluna"] == "esquerda" else (midpoint, 0, image.width, image.height)
            image.crop(box).save(target, "JPEG", quality=84)
        paths.append(target.relative_to(output_dir).as_posix())
    return paths


def html_report(hymns: list[dict]) -> str:
    cards = []
    for hymn in hymns:
        images = "".join(f'<img loading="lazy" src="{html.escape(path)}" alt="Fonte {html.escape(hymn["id"])}">' for path in hymn.get("imagens_fonte", []))
        warnings = "<li>Sem alertas automáticos</li>" if not hymn["avisos"] else "".join(f"<li>{html.escape(item)}</li>" for item in hymn["avisos"])
        cards.append(f"""
        <article id="hino-{html.escape(hymn['id'].lower())}" data-status="{hymn['status']}">
          <header><h2>{html.escape(hymn['id'])}. {html.escape(hymn['titulo'])}</h2><span>{html.escape(str(hymn['tom_original']))} · {html.escape(', '.join(hymn['compassos']))}</span></header>
          <div class="grid"><section class="sources">{images or '<p>Recortes ainda não gerados.</p>'}</section><section><h3>Original estruturado</h3><pre>{html.escape(hymn['chordpro'])}</pre><h3>Teste +2</h3><pre>{html.escape(hymn['chordpro_teste_mais_2'])}</pre></section></div>
          <ul class="warnings">{warnings}</ul>
        </article>""")
    pending = sum(1 for hymn in hymns if hymn["avisos"])
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Auditoria completa do hinário</title><style>
body{{font-family:Arial,sans-serif;margin:0;background:#f2f4f3;color:#152019}}main{{max-width:1500px;margin:auto;padding:20px}}.summary{{position:sticky;top:0;z-index:2;background:#fff;border:1px solid #ccd5cf;padding:14px;margin-bottom:20px}}article{{background:#fff;border:1px solid #cbd4ce;margin:0 0 24px}}header{{display:flex;justify-content:space-between;gap:16px;padding:12px 16px;border-bottom:1px solid #dbe2de}}h2{{font-size:19px;margin:0}}.grid{{display:grid;grid-template-columns:minmax(300px,43%) 1fr;gap:18px;padding:16px}}.sources{{display:grid;gap:10px}}img{{width:100%;height:auto;border:1px solid #ddd}}pre{{white-space:pre-wrap;font:15px/1.5 Consolas,monospace}}.warnings{{margin:0;padding:12px 34px;background:#fff8db;border-top:1px solid #eadb9c}}article[data-status="validacao_automatica_ok"] .warnings{{background:#edf8f0}}@media(max-width:800px){{.grid{{grid-template-columns:1fr}}}}
</style></head><body><main><div class="summary"><strong>{len(hymns)} itens</strong> · {pending} com pendências automáticas · relatório experimental, sem ligação com o aplicativo.</div>{''.join(cards)}</main></body></html>"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=Path, default=Path("public/hinario-com-cifras.pdf"))
    parser.add_argument("--extractor", type=Path, default=Path("scripts/experiments/extrair-cifras-coordenadas.py"))
    parser.add_argument("--output", type=Path, default=Path("output/hinario-cifras-experimento"))
    parser.add_argument("--rendered-pages", type=Path, default=Path("tmp/pdfs/hinario-experimento-completo"))
    parser.add_argument("--lyrics-db", type=Path, default=Path("public/hinario.db"))
    parser.add_argument("--app-output", type=Path, default=Path("public/hinario-cifras.json"))
    parser.add_argument("--pages", default="3-236")
    args = parser.parse_args()
    global LYRICS_REFERENCE, LYRICS_SECTIONS, PDF_UNASSIGNED
    LYRICS_REFERENCE, LYRICS_SECTIONS = load_lyrics_reference(args.lyrics_db)
    PDF_UNASSIGNED = []
    extractor = load_extractor(args.extractor)
    start_page, end_page = (int(value) for value in args.pages.split("-", 1))
    entries = []
    current = None

    with pdfplumber.open(args.pdf) as pdf:
        for page_number in range(start_page, min(end_page, len(pdf.pages)) + 1):
            page = pdf.pages[page_number - 1]
            midpoint = page.width / 2
            for column_name, bbox in (
                ("esquerda", (0, 0, midpoint, page.height)),
                ("direita", (midpoint, 0, page.width, page.height)),
            ):
                rows = column_rows(page, bbox, extractor)
                if not rows:
                    continue
                heading = parse_heading_rows(rows, extractor) or parse_supplement(rows)
                if heading:
                    if current:
                        entries.append(structure_hymn(current["heading"], current["segments"], extractor))
                    current = {"heading": heading, "segments": []}
                    content = rows[heading["linhas_cabecalho"] :]
                    if content:
                        current["segments"].append({"pagina": page_number, "coluna": column_name, "rows": content})
                elif current:
                    current["segments"].append({"pagina": page_number, "coluna": column_name, "rows": rows})
        if current:
            entries.append(structure_hymn(current["heading"], current["segments"], extractor))

    args.output.mkdir(parents=True, exist_ok=True)
    for hymn in entries:
        hymn["imagens_fonte"] = crop_sources(hymn, args.rendered_pages, args.output)
    manifest = {
        "experimental": True,
        "integrado_ao_aplicativo": False,
        "fonte": str(args.pdf),
        "paginas": [start_page, end_page],
        "quantidade": len(entries),
        "pendencias": sum(1 for item in entries if item["avisos"]),
        "linhas_pdf_sem_destino_editorial": PDF_UNASSIGNED,
        "hinos": entries,
    }
    (args.output / "hinos-completos.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (args.output / "comparacao-completa.html").write_text(html_report(entries), encoding="utf-8")
    app_entries = []
    for hymn in entries:
        app_lines = []
        for line in hymn["linhas"]:
            item = {"tipo": line["tipo"]}
            if line.get("letra") is not None:
                item["letra"] = line["letra"]
            if line.get("texto") is not None:
                item["texto"] = line["texto"]
            if line.get("cifras") is not None:
                item["cifras"] = line["cifras"]
                item["detalhes"] = line.get("cifras_detalhadas", [])
                if line.get("anotacao"):
                    item["anotacao"] = line["anotacao"]
            app_lines.append(item)
        app_entries.append({
            "id": hymn["id"],
            "titulo": hymn["titulo"],
            "tom": hymn["tom_original"],
            "compassos": hymn["compassos"],
            "detalhe": hymn["detalhe_cabecalho"],
            "secoes": [
                {"indiceLinha": section["indice_linha"], "texto": section["texto"]}
                for section in hymn.get("secoes_editoriais", [])
            ],
            "linhas": app_lines,
        })
    args.app_output.parent.mkdir(parents=True, exist_ok=True)
    args.app_output.write_text(json.dumps({"versao": 1, "hinos": app_entries}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Itens estruturados: {len(entries)}")
    print(f"Itens com pendencias: {manifest['pendencias']}")
    print(f"Recortes encontrados: {sum(len(item['imagens_fonte']) for item in entries)}")
    print(f"Linhas cifradas sem destino editorial: {len(PDF_UNASSIGNED)}")


if __name__ == "__main__":
    main()
