#!/usr/bin/env python3
"""Mapeia cabecalhos e colunas de continuacao do hinario cifrado."""

from __future__ import annotations

import argparse
import csv
import importlib.util
import sys
from pathlib import Path

import pdfplumber


def load_extractor(path: Path):
    spec = importlib.util.spec_from_file_location("extrator_hinario", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Nao foi possivel carregar {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=Path, default=Path("public/hinario-com-cifras.pdf"))
    parser.add_argument("--extractor", type=Path, default=Path("scripts/experiments/extrair-cifras-coordenadas.py"))
    parser.add_argument("--output", type=Path, default=Path("output/hinario-cifras-experimento/mapa-colunas.csv"))
    parser.add_argument("--pages", default="3-237")
    args = parser.parse_args()
    extractor = load_extractor(args.extractor)
    start_page, end_page = (int(value) for value in args.pages.split("-", 1))
    records: list[dict] = []

    with pdfplumber.open(args.pdf) as pdf:
        end_page = min(end_page, len(pdf.pages))
        for page_number in range(start_page, end_page + 1):
            page = pdf.pages[page_number - 1]
            midpoint = page.width / 2
            for order, (column_name, bbox) in enumerate((
                ("esquerda", (0, 0, midpoint, page.height)),
                ("direita", (midpoint, 0, page.width, page.height)),
            )):
                crop = page.crop(bbox)
                words = crop.extract_words(x_tolerance=1, y_tolerance=2, use_text_flow=False)
                words = [{**word, "text": extractor.repair_pdf_text(word["text"])} for word in words]
                rows = [row for row in extractor.group_rows(words) if row.top < page.height - 48]
                headings = []
                for row_index, row in enumerate(rows):
                    heading = extractor.parse_heading(row)
                    if heading:
                        headings.append((row_index, row.top, heading))
                records.append({
                    "pagina": page_number,
                    "ordem": order,
                    "coluna": column_name,
                    "linhas": len(rows),
                    "cabecalhos": len(headings),
                    "numeros": "|".join(
                        f"{item[2]['numero']}{'-' + item[2]['sufixo'] if item[2]['sufixo'] else ''}" for item in headings
                    ),
                    "titulos": "|".join(item[2]["titulo"] for item in headings),
                    "posicoes_y": "|".join(f"{item[1]:.1f}" for item in headings),
                    "primeira_linha": rows[0].text if rows else "",
                })

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)

    columns_with_heading = sum(1 for item in records if item["cabecalhos"])
    multiple = [item for item in records if item["cabecalhos"] > 1]
    continuations = [item for item in records if item["linhas"] and not item["cabecalhos"]]
    print(f"Colunas analisadas: {len(records)}")
    print(f"Colunas com cabecalho: {columns_with_heading}")
    print(f"Colunas de continuacao/extra: {len(continuations)}")
    print(f"Colunas com mais de um cabecalho: {len(multiple)}")
    if multiple:
        print("Multiplos: " + ", ".join(f"p{item['pagina']}-{item['coluna']}={item['numeros']}" for item in multiple))


if __name__ == "__main__":
    main()
