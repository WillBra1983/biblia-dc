#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def read_docx_rows(docx_path: Path) -> list[str]:
    root = ET.fromstring(zipfile.ZipFile(docx_path).read("word/document.xml"))
    rows: list[str] = []
    for tr in root.findall(".//w:tr", NS):
        cells = []
        for tc in tr.findall(".//w:tc", NS):
            txt = "".join((t.text or "") for t in tc.findall(".//w:t", NS))
            txt = normalize_ws(txt)
            if txt:
                cells.append(txt)
        if cells:
            rows.append(normalize_ws(" | ".join(cells)))
    return rows


TRAILING_TAGS = re.compile(
    r"(?:\s*[\-–—,;:]?\s*(feito|concluído|concluido|referência|referencia|ref|base|done)\.?\s*)+$",
    re.IGNORECASE,
)


def clean_line(text: str) -> tuple[str, bool]:
    src = normalize_ws(text).replace("\u200b", "")
    had_tag = bool(TRAILING_TAGS.search(src))
    s = TRAILING_TAGS.sub("", src)
    # Remove espaço antes de pontuação.
    s = re.sub(r"\s+([,.;:!?])", r"\1", s)
    # Normaliza após abre parênteses e antes de fechar.
    s = re.sub(r"\(\s+", "(", s)
    s = re.sub(r"\s+\)", ")", s)
    s = normalize_ws(s)
    return s, had_tag


def english_marker_hits(lines: list[str]) -> int:
    pat = re.compile(
        r"\b(the|and|of|to|with|from|properly|primitive|figuratively|implication|root|usage|"
        r"city|place|king|prophet|father|son|house|word)\b",
        re.IGNORECASE,
    )
    return sum(len(pat.findall(line)) for line in lines)


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    src_doc = root / "public" / "bdb_content_text_translate.docx"
    out_txt = root / "src" / "data" / "bdb_content_text_ptbr_clean.txt"
    out_report = root / "src" / "data" / "bdb_content_text_ptbr_clean_report.txt"

    if not src_doc.exists():
        raise RuntimeError(f"Arquivo nao encontrado: {src_doc}")

    rows = read_docx_rows(src_doc)
    cleaned = []
    removed_tag_count = 0
    for line in rows:
        c, had_tag = clean_line(line)
        if had_tag:
            removed_tag_count += 1
        cleaned.append(c)

    out_txt.write_text("\n".join(cleaned), encoding="utf-8")

    report_lines = [
        f"Arquivo fonte: {src_doc}",
        f"Linhas lidas: {len(rows)}",
        f"Linhas com sufixo de status removido: {removed_tag_count}",
        f"Marcadores de ingles (antes): {english_marker_hits(rows)}",
        f"Marcadores de ingles (depois): {english_marker_hits(cleaned)}",
        f"Arquivo limpo: {out_txt}",
        "",
        "Amostra (primeiras 5 linhas):",
    ]
    for i, line in enumerate(cleaned[:5], start=1):
        report_lines.append(f"{i}. {line}")

    out_report.write_text("\n".join(report_lines), encoding="utf-8")
    print(f"OK: {out_txt}")
    print(f"REPORT: {out_report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

