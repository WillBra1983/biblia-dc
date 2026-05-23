#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Divide um PDF em N partes (por padrão 10), balanceando o número de páginas.

Dependência:
  pip install pypdf

Uso:
  python scripts/split_pdf_into_parts.py entrada.pdf
  python scripts/split_pdf_into_parts.py entrada.pdf --parts 10 --out-dir saida/
"""

from __future__ import annotations

import argparse
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser(description="Divide um PDF em várias partes.")
    ap.add_argument("pdf", type=Path, help="Caminho do PDF de entrada")
    ap.add_argument(
        "--parts",
        type=int,
        default=10,
        metavar="N",
        help="Número de partes (padrão: 10)",
    )
    ap.add_argument(
        "--out-dir",
        type=Path,
        default=None,
        help="Pasta de saída (padrão: mesma pasta do PDF, subpasta nome_arquivo_parts)",
    )
    ap.add_argument(
        "--prefix",
        type=str,
        default=None,
        help="Prefixo dos arquivos gerados (padrão: nome base do PDF)",
    )
    args = ap.parse_args()

    src = args.pdf.resolve()
    if not src.exists():
        print(f"Arquivo não encontrado: {src}")
        return 1

    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError:
        print("Instale: pip install pypdf")
        return 1

    parts = max(1, int(args.parts))
    reader = PdfReader(str(src))
    total = len(reader.pages)
    if total == 0:
        print("PDF sem páginas.")
        return 1

    out_dir = args.out_dir
    if out_dir is None:
        out_dir = src.parent / f"{src.stem}_parts"
    out_dir = Path(out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    prefix = args.prefix or src.stem

    # Distribui páginas: as primeiras partes podem ter 1 página a mais
    base = total // parts
    extra = total % parts

    # Gera um writer por intervalo contíguo de páginas
    page_idx = 0
    part_num = 0
    for i in range(parts):
        size = base + (1 if i < extra else 0)
        if size <= 0:
            continue
        part_num += 1
        writer = PdfWriter()
        for _ in range(size):
            writer.add_page(reader.pages[page_idx])
            page_idx += 1
        out_path = out_dir / f"{prefix}_parte{part_num:02d}_de_{parts:02d}.pdf"
        with open(out_path, "wb") as f:
            writer.write(f)
        print(f"{out_path.name}: páginas {page_idx - size + 1}-{page_idx} ({size} pág.)")

    print(f"\nTotal: {total} páginas em {part_num} arquivo(s) -> {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
