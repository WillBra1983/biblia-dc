#!/usr/bin/env python3
"""Imprime linhas e coordenadas de colunas especificas para auditoria manual."""

from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path

import pdfplumber


def load_extractor(path: Path):
    spec = importlib.util.spec_from_file_location("extrator_hinario_debug", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Nao foi possivel carregar {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pages", help="Paginas separadas por virgula")
    parser.add_argument("--pdf", type=Path, default=Path("public/hinario-com-cifras.pdf"))
    parser.add_argument("--extractor", type=Path, default=Path("scripts/experiments/extrair-cifras-coordenadas.py"))
    args = parser.parse_args()
    extractor = load_extractor(args.extractor)

    with pdfplumber.open(args.pdf) as pdf:
        for page_number in (int(value) for value in args.pages.split(",")):
            page = pdf.pages[page_number - 1]
            midpoint = page.width / 2
            for column_name, bbox in (
                ("esquerda", (0, 0, midpoint, page.height)),
                ("direita", (midpoint, 0, page.width, page.height)),
            ):
                crop = page.crop(bbox)
                words = crop.extract_words(x_tolerance=1, y_tolerance=2, use_text_flow=False)
                words = [{**word, "text": extractor.repair_pdf_text(word["text"])} for word in words]
                rows = [row for row in extractor.group_rows(words) if row.top < page.height - 48]
                print(f"\n===== PAGINA {page_number} / {column_name.upper()} =====")
                for row in rows[:12]:
                    normalized = ",".join(item["text"] for item in extractor.normalize_chord_tokens(row.words))
                    print(f"y={row.top:6.1f} | chord={extractor.is_chord_row(row)!s:5} | {row.text} | [{normalized}]")


if __name__ == "__main__":
    main()
