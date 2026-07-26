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


def load_lyrics_reference(path: Path) -> dict[str, list[dict]]:
    result: dict[str, list[dict]] = {}
    with sqlite3.connect(path) as connection:
        rows = connection.execute("select numero, conteudo from hinos").fetchall()
    for number, content in rows:
        hymn_id = str(number).lstrip("0") or "0"
        candidates = []
        for line in content.splitlines():
            line = re.sub(r"(?i)^\s*(estrofe\s+\d+|coro|estribilho)\s*:\s*", "", line).strip()
            compact = comparable_text(line)
            if len(compact) >= 4:
                candidates.append({"texto": line, "comparavel": compact})
        result[hymn_id] = candidates
    return result


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

    original = "\n".join(chordpro).strip()
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
    global LYRICS_REFERENCE
    LYRICS_REFERENCE = load_lyrics_reference(args.lyrics_db)
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
            "linhas": app_lines,
        })
    args.app_output.parent.mkdir(parents=True, exist_ok=True)
    args.app_output.write_text(json.dumps({"versao": 1, "hinos": app_entries}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Itens estruturados: {len(entries)}")
    print(f"Itens com pendencias: {manifest['pendencias']}")
    print(f"Recortes encontrados: {sum(len(item['imagens_fonte']) for item in entries)}")


if __name__ == "__main__":
    main()
