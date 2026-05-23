#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Remove marcação HTML/site dos JSON STEPBible para facilitar tradução manual.
Gera arquivos *.editable.json ao lado dos originais (ou sobrescreve se --in-place).
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def clean_definition(text: str) -> str:
    if not isinstance(text, str) or not text:
        return text
    s = text

    # Remove âncoras STEPBible / javascript:void(0) — mantém texto interno visível
    s = re.sub(r"<a\b[^>]*>(.*?)</a>", r"\1", s, flags=re.DOTALL | re.IGNORECASE)

    # Tags <ref='...'>texto</ref> → só o texto interno
    s = re.sub(r"<ref\b[^>]*>", "", s)
    s = re.sub(r"</ref\b>", "", s, flags=re.IGNORECASE)

    # Níveis hierárquicos do LSJ
    s = re.sub(r"</?Level\d+\b[^>]*>", "", s, flags=re.IGNORECASE)

    # Formatação HTML residual
    s = re.sub(r"</?[bi]\b[^>]*>", "", s, flags=re.IGNORECASE)

    # Quebras de linha — texto plano
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.IGNORECASE)

    # Espaços e linhas em excesso
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def process_file(path: Path, inplace: bool) -> Path:
    raw = path.read_text(encoding="utf-8")
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise RuntimeError(f"Esperado objeto JSON na raiz: {path}")

    for _key, entry in data.items():
        if not isinstance(entry, dict):
            continue
        for field in ("definition", "gloss"):
            if field in entry and isinstance(entry[field], str):
                entry[field] = clean_definition(entry[field])

    out_path = path if inplace else path.with_name(path.stem + ".editable" + path.suffix)
    out_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return out_path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "paths",
        nargs="+",
        type=Path,
        help="Arquivos stepbible-*.json ou *.txt com JSON",
    )
    ap.add_argument(
        "--in-place",
        action="store_true",
        help="Sobrescreve o arquivo original (faça backup antes).",
    )
    args = ap.parse_args()

    for p in args.paths:
        if not p.exists():
            print(f"IGNORADO (nao existe): {p}")
            continue
        out = process_file(p, args.in_place)
        print(f"OK: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
