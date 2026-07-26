#!/usr/bin/env python3
"""Experimento isolado para extrair cifras do hinario sem alterar o aplicativo.

O script processa somente as paginas solicitadas, separa as duas colunas e gera
arquivos de auditoria. Nenhum banco ou arquivo usado pelo hinario e modificado.
"""

from __future__ import annotations

import argparse
import difflib
import html
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pdfplumber
from PIL import Image


CHORD_RE = re.compile(
    r"^[A-G](?:#|b)?(?:m|-)?(?:maj|min|sus|dim|aug|add)?(?:\d+)?"
    r"(?:\+|°)?(?:\([^)]*\))?(?:/[A-G](?:#|b)?)?$",
    re.IGNORECASE,
)
METER_RE = re.compile(r"^\d+/\d+$")
NUMBER_RE = re.compile(r"^(\d+)(?:-([A-Z]))?$", re.IGNORECASE)
NOTE_VALUES = {"C": 0, "C#": 1, "DB": 1, "D": 2, "D#": 3, "EB": 3, "E": 4, "F": 5,
               "F#": 6, "GB": 6, "G": 7, "G#": 8, "AB": 8, "A": 9, "A#": 10, "BB": 10, "B": 11}
SHARP_NOTES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")


@dataclass
class Row:
    top: float
    words: list[dict]

    @property
    def text(self) -> str:
        return " ".join(word["text"] for word in self.words).strip()


def group_rows(words: Iterable[dict], tolerance: float = 2.2) -> list[Row]:
    rows: list[Row] = []
    for word in sorted(words, key=lambda item: (item["top"], item["x0"])):
        row = next((item for item in reversed(rows) if abs(item.top - word["top"]) <= tolerance), None)
        if row is None:
            rows.append(Row(top=word["top"], words=[word]))
        else:
            row.words.append(word)
            row.top = sum(item["top"] for item in row.words) / len(row.words)
    for row in rows:
        row.words.sort(key=lambda item: item["x0"])
    return rows


def repair_pdf_text(value: str) -> str:
    """Corrige mojibake recorrente e dois acentos legados desta fonte PDF."""
    if any(marker in value for marker in ("Ã", "Â", "â")):
        try:
            value = value.encode("cp1252").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
    value = value.replace("`A", "À").replace("`a", "à")
    return "À" if value == "Á" else value


def split_joined_chords(token: str) -> list[str] | None:
    """Separa cifras que o PDF encostou, como DAD -> D, A, D."""
    token = token.strip().replace("–", "-")
    parts: list[str] = []
    position = 0
    while position < len(token):
        start = position
        if token[position].upper() not in "ABCDEFG":
            return None
        position += 1
        if position < len(token) and token[position] in "#b":
            position += 1
        if position < len(token) and token[position] in "m-":
            position += 1
        while position < len(token) and (token[position].isdigit() or token[position] in "+°"):
            position += 1
        if position < len(token) and token[position] == "/":
            position += 1
            if position >= len(token) or token[position].upper() not in "ABCDEFG":
                return None
            position += 1
            if position < len(token) and token[position] in "#b":
                position += 1
        part = token[start:position].replace("-", "m")
        if not CHORD_RE.fullmatch(part):
            return None
        parts.append(part)
    return parts or None


def normalize_chord_tokens(words: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    for word in words:
        raw_tokens = re.sub(r"[(),;.]", " ", word["text"].strip()).split()
        width = max(word["x1"] - word["x0"], 1.0)
        raw_total = max(sum(len(item) for item in raw_tokens), 1)
        raw_consumed = 0
        for token in raw_tokens:
            token_x0 = word["x0"] + width * raw_consumed / raw_total
            raw_consumed += len(token)
            token_x1 = word["x0"] + width * raw_consumed / raw_total
            if token in {"/", "(", ")"}:
                continue
            if token in {"O", "o", "º", "°"} and normalized and CHORD_RE.fullmatch(normalized[-1]["text"]):
                normalized[-1] = {**normalized[-1], "text": normalized[-1]["text"] + "dim", "x1": token_x1}
                continue
            if re.fullmatch(r"-\d+", token) and normalized and re.fullmatch(r"[A-G](?:#|b)?", normalized[-1]["text"], re.I):
                normalized[-1] = {**normalized[-1], "text": normalized[-1]["text"] + "m" + token[1:], "x1": token_x1}
                continue
            if re.fullmatch(r"-[A-G].*", token, re.I) and normalized and re.fullmatch(r"[A-G](?:#|b)?", normalized[-1]["text"], re.I):
                normalized[-1] = {**normalized[-1], "text": normalized[-1]["text"] + "m", "x1": token_x0}
                token = token[1:]
            if token == "-" and normalized and re.match(r"^[A-G](?:#|b)?$", normalized[-1]["text"], re.I):
                normalized[-1] = {**normalized[-1], "text": normalized[-1]["text"] + "m", "x1": token_x1}
                continue
            parts = split_joined_chords(token)
            if not parts:
                normalized.append({**word, "text": token, "x0": token_x0, "x1": token_x1})
                continue
            token_width = max(token_x1 - token_x0, 1.0)
            consumed = 0
            total = sum(len(part) for part in parts)
            for part in parts:
                x0 = token_x0 + token_width * consumed / total
                consumed += len(part)
                x1 = token_x0 + token_width * consumed / total
                normalized.append({**word, "text": part, "x0": x0, "x1": x1})
    return normalized


def is_chord_row(row: Row) -> bool:
    tokens = normalize_chord_tokens(row.words)
    if not tokens or len(tokens) > 30:
        return False
    chords = [item for item in tokens if is_chord_text(item["text"])]
    annotations = [item["text"].strip("() .").lower() for item in tokens if not is_chord_text(item["text"])]
    allowed_annotations = {"a", "vez", "v", "bis", "coro", "x"}
    return bool(chords) and all(item in allowed_annotations or re.fullmatch(r"\d+(?:a|ª)?", item) for item in annotations)


def chord_tokens(row: Row) -> list[dict]:
    return [item for item in normalize_chord_tokens(row.words) if is_chord_text(item["text"])]


def is_chord_text(value: str) -> bool:
    return bool(value) and value[0] in "ABCDEFG" and bool(CHORD_RE.fullmatch(value))


def parse_heading(row: Row) -> dict | None:
    tokens = [item["text"].strip() for item in row.words]
    if len(tokens) < 4:
        return None
    number_match = NUMBER_RE.fullmatch(tokens[0])
    if not number_match or not METER_RE.fullmatch(tokens[-1]):
        return None
    key = tokens[-2]
    if not CHORD_RE.fullmatch(key):
        return None
    return {
        "numero": int(number_match.group(1)),
        "sufixo": number_match.group(2),
        "titulo": " ".join(tokens[1:-2]).strip(),
        "tom_original": key.replace("-", "m"),
        "compasso": tokens[-1],
    }


def character_offset(lyric_words: list[dict], chord_x: float) -> int:
    if not lyric_words:
        return 0
    text_length = 0
    candidates: list[tuple[float, int]] = []
    for index, word in enumerate(lyric_words):
        if index:
            text_length += 1
        token = word["text"]
        width = max(word["x1"] - word["x0"], 1.0)
        for char_index in range(max(len(token), 1)):
            x = word["x0"] + width * char_index / max(len(token), 1)
            candidates.append((abs(x - chord_x), text_length + char_index))
        text_length += len(token)
    return min(candidates, key=lambda item: item[0])[1]


def chordpro_line(chord_words: list[dict], lyric_words: list[dict]) -> str:
    chord_row = Row(top=chord_words[0]["top"] if chord_words else 0, words=chord_words)
    return chordpro_line_with_tokens(chord_tokens(chord_row), lyric_words)


def remap_character_offset(source: str, target: str, source_position: int) -> int:
    if source == target:
        return source_position
    matcher = difflib.SequenceMatcher(None, source.casefold(), target.casefold())
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if i1 <= source_position <= i2:
            if i2 == i1:
                return j1
            ratio = (source_position - i1) / (i2 - i1)
            return round(j1 + ratio * (j2 - j1))
    return len(target)


def chordpro_line_with_tokens(chords: list[dict], lyric_words: list[dict], target_text: str | None = None) -> str:
    source_lyric = " ".join(item["text"] for item in lyric_words).strip()
    lyric = target_text if target_text is not None else source_lyric
    inserts: list[tuple[int, str]] = []
    for chord in chords:
        source_position = character_offset(lyric_words, chord["x0"])
        inserts.append((remap_character_offset(source_lyric, lyric, source_position), chord["text"]))
    for position, chord in sorted(inserts, reverse=True):
        lyric = lyric[:position] + f"[{chord}]" + lyric[position:]
    return lyric


def transpose_chord(chord: str, semitones: int) -> str:
    match = re.fullmatch(r"([A-G](?:#|b)?)(.*?)(?:/([A-G](?:#|b)?))?", chord, re.I)
    if not match:
        return chord
    root, suffix, bass = match.groups()
    root_value = NOTE_VALUES.get(root.upper())
    if root_value is None:
        return chord
    result = SHARP_NOTES[(root_value + semitones) % 12] + suffix
    if bass:
        bass_value = NOTE_VALUES.get(bass.upper())
        if bass_value is not None:
            result += "/" + SHARP_NOTES[(bass_value + semitones) % 12]
    return result


def transpose_chordpro(value: str, semitones: int) -> str:
    return re.sub(r"\[([^\]]+)\]", lambda match: f"[{transpose_chord(match.group(1), semitones)}]", value)


def extract_hymn(rows: list[Row], page_number: int, column: str) -> dict:
    warnings: list[str] = []
    heading_index = next((index for index, row in enumerate(rows[:8]) if parse_heading(row)), None)
    if heading_index is None:
        return {
            "numero": None,
            "titulo": "Cabecalho nao reconhecido",
            "pagina_pdf": page_number,
            "coluna": column,
            "avisos": ["Cabecalho nao reconhecido; exige revisao manual."],
            "linhas": [],
            "chordpro": "",
        }

    heading = parse_heading(rows[heading_index])
    assert heading is not None
    content = rows[heading_index + 1 :]
    structured: list[dict] = []
    chordpro: list[str] = []
    pending_chords: Row | None = None

    for row in content:
        if is_chord_row(row):
            if pending_chords is not None:
                warnings.append(f"Linha de cifras sem letra proxima de y={pending_chords.top:.1f}.")
                chordpro.append(" ".join(item["text"] for item in normalize_chord_tokens(pending_chords.words)))
            pending_chords = row
            continue

        if pending_chords is not None:
            structured.append(
                {
                    "tipo": "cifra_letra",
                    "cifras": [item["text"] for item in normalize_chord_tokens(pending_chords.words)],
                    "letra": row.text,
                    "y_cifra": round(pending_chords.top, 1),
                    "y_letra": round(row.top, 1),
                }
            )
            chordpro.append(chordpro_line(pending_chords.words, row.words))
            pending_chords = None
        else:
            structured.append({"tipo": "texto", "letra": row.text, "y": round(row.top, 1)})
            chordpro.append(row.text)

    if pending_chords is not None:
        warnings.append(f"Ultima linha de cifras sem letra proxima de y={pending_chords.top:.1f}.")

    chord_rows = sum(1 for item in structured if item["tipo"] == "cifra_letra")
    if chord_rows == 0:
        warnings.append("Nenhuma linha de cifras foi reconhecida.")

    return {
        **heading,
        "pagina_pdf": page_number,
        "coluna": column,
        "confianca_inicial": "alta" if not warnings else "revisar",
        "avisos": warnings,
        "linhas": structured,
        "chordpro": "\n".join(chordpro).strip(),
    }


def crop_reference(rendered_dir: Path, output_dir: Path, page_number: int, column: str, hymn_number: int) -> str | None:
    source = rendered_dir / f"pagina-{page_number:03d}.jpg"
    if not source.exists():
        return None
    target_dir = output_dir / "fontes"
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"hino-{hymn_number:03d}.jpg"
    with Image.open(source) as image:
        midpoint = image.width // 2
        box = (0, 0, midpoint, image.height) if column == "esquerda" else (midpoint, 0, image.width, image.height)
        image.crop(box).save(target, "JPEG", quality=88, optimize=True)
    return target.relative_to(output_dir).as_posix()


def comparison_html(hymns: list[dict]) -> str:
    cards: list[str] = []
    for hymn in hymns:
        warning = "Sem alertas automaticos" if not hymn["avisos"] else " | ".join(hymn["avisos"])
        source = hymn.get("imagem_fonte")
        image = f'<img src="{html.escape(source)}" alt="Recorte do hino {hymn["numero"]}">' if source else "<p>Recorte indisponivel.</p>"
        cards.append(
            f"""
            <article>
              <header><h2>{hymn['numero']}. {html.escape(hymn['titulo'])}</h2><span>Tom {html.escape(hymn['tom_original'])} · {html.escape(hymn['compasso'])}</span></header>
              <div class="comparison"><section>{image}</section><section><h3>Extração no tom original</h3><pre>{html.escape(hymn['chordpro'])}</pre><h3>Teste: +2 semitons</h3><pre>{html.escape(hymn['chordpro_teste_mais_2'])}</pre></section></div>
              <p class="status"><strong>{html.escape(hymn['confianca_inicial'])}</strong> · {html.escape(warning)}</p>
            </article>
            """
        )
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Experimento de extracao do hinario</title>
<style>
body{{font-family:Arial,sans-serif;margin:0;background:#f3f5f4;color:#17211c}}main{{max-width:1400px;margin:auto;padding:24px}}
h1{{font-size:28px}}.notice{{background:#fff4cc;border-left:5px solid #b37a00;padding:14px;margin:16px 0 24px}}
article{{background:white;border:1px solid #ccd4cf;border-radius:6px;margin:0 0 24px;overflow:hidden}}header{{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 18px;border-bottom:1px solid #dde3df}}h2{{font-size:20px;margin:0}}
.comparison{{display:grid;grid-template-columns:minmax(280px,42%) 1fr;gap:20px;padding:18px}}section{{min-width:0}}img{{display:block;width:100%;height:auto;border:1px solid #ddd}}pre{{font:16px/1.55 Consolas,monospace;white-space:pre-wrap;margin:0}}.status{{margin:0;padding:12px 18px;border-top:1px solid #dde3df;background:#f8faf9}}
@media(max-width:760px){{.comparison{{grid-template-columns:1fr}}header{{align-items:flex-start;flex-direction:column}}}}
</style></head><body><main><h1>Extracao experimental: hinos 1 a 10</h1>
<div class="notice"><strong>Somente auditoria.</strong> Estes dados nao estao ligados ao aplicativo nem substituem o PDF atual.</div>
{''.join(cards)}</main></body></html>"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=Path, default=Path("public/hinario-com-cifras.pdf"))
    parser.add_argument("--output", type=Path, default=Path("output/hinario-cifras-experimento"))
    parser.add_argument("--rendered-pages", type=Path, default=Path("tmp/pdfs/hinario-experimento"))
    parser.add_argument("--pages", default="3-7", help="Intervalo inclusivo, por exemplo 3-7")
    args = parser.parse_args()

    start_page, end_page = (int(value) for value in args.pages.split("-", 1))
    args.output.mkdir(parents=True, exist_ok=True)
    hymns: list[dict] = []

    with pdfplumber.open(args.pdf) as pdf:
        for page_number in range(start_page, end_page + 1):
            page = pdf.pages[page_number - 1]
            midpoint = page.width / 2
            columns = (
                ("esquerda", (0, 0, midpoint, page.height)),
                ("direita", (midpoint, 0, page.width, page.height)),
            )
            for column_name, bbox in columns:
                crop = page.crop(bbox)
                words = crop.extract_words(x_tolerance=1, y_tolerance=2, use_text_flow=False)
                words = [{**word, "text": repair_pdf_text(word["text"])} for word in words]
                rows = [row for row in group_rows(words) if row.top < page.height - 48]
                hymn = extract_hymn(rows, page_number, column_name)
                if hymn["numero"] is not None:
                    hymn["chordpro_teste_mais_2"] = transpose_chordpro(hymn["chordpro"], 2)
                    hymn["tom_teste_mais_2"] = transpose_chord(hymn["tom_original"], 2)
                    hymn["imagem_fonte"] = crop_reference(
                        args.rendered_pages, args.output, page_number, column_name, hymn["numero"]
                    )
                    hymns.append(hymn)

    manifest = {
        "experimental": True,
        "fonte": str(args.pdf),
        "paginas": [start_page, end_page],
        "quantidade": len(hymns),
        "hinos": hymns,
    }
    (args.output / "hinos-001-010.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (args.output / "comparacao.html").write_text(comparison_html(hymns), encoding="utf-8")
    print(f"Gerados {len(hymns)} hinos experimentais em {args.output}")


if __name__ == "__main__":
    main()
