#!/usr/bin/env python3
"""
Compacta bases SQLite do projeto (VACUUM). Reduz tamanho em disco.
Uso: python scripts/sqlite-vacuum.py
Para servir com gzip/brotli no nginx/Apache, veja docs/qualidade-sqlite-deploy.md
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANDIDATES = [
    ROOT / "public" / "ara.sqlite",
    ROOT / "public" / "nt_prova.sqlite",
    ROOT / "public" / "ot_strong.sqlite",
    ROOT / "public" / "hinario.db",
    ROOT / "public" / "hinario_cifrado.db",
]


def main() -> None:
    for p in CANDIDATES:
        if not p.is_file():
            print(f"[skip] {p.relative_to(ROOT)}")
            continue
        try:
            con = sqlite3.connect(str(p))
            con.execute("VACUUM")
            con.close()
            print(f"[ok]   {p.relative_to(ROOT)}")
        except Exception as e:
            print(f"[erro] {p.relative_to(ROOT)}: {e}")


if __name__ == "__main__":
    main()
