#!/usr/bin/env python3
"""
Preenche lexical_index.short_def_original a partir da coluna A do Excel (inglês).
Linha N do Excel = id N em lexical_index.

Copia ot_strong.sqlite para um temp, atualiza, depois os.replace no original.

Uso:
  python scripts/import_short_def_original_from_excel.py
  python scripts/import_short_def_original_from_excel.py --xlsx "..." --db "..."
"""
from __future__ import annotations

import argparse
import os
import shutil
import sqlite3
import sys
from pathlib import Path

import pandas as pd


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--xlsx",
        type=Path,
        default=Path(r"C:\Users\Pr Wilson Lucas\Downloads\OT_Strong.xlsx"),
        help="Excel: coluna A = inglês original; linha N = id N.",
    )
    ap.add_argument(
        "--db",
        type=Path,
        default=root / "public" / "ot_strong.sqlite",
        help="Caminho para ot_strong.sqlite",
    )
    ap.add_argument("--sheet", type=str, default=0, help="Índice ou nome da folha (default: 0)")
    args = ap.parse_args()

    if not args.xlsx.is_file():
        print(f"Ficheiro Excel inexistente: {args.xlsx}", file=sys.stderr)
        return 1
    if not args.db.is_file():
        print(f"SQLite inexistente: {args.db}", file=sys.stderr)
        return 1

    work = args.db.with_name(args.db.name + ".__import_tmp__")
    shutil.copy2(args.db, work)

    conn = sqlite3.connect(str(work))
    conn.execute("PRAGMA busy_timeout = 60000")
    try:
        try:
            conn.execute("ALTER TABLE lexical_index ADD COLUMN short_def_original TEXT")
            conn.commit()
        except sqlite3.OperationalError as e:
            if "duplicate column" not in str(e).lower():
                raise
            conn.rollback()

        df = pd.read_excel(args.xlsx, sheet_name=args.sheet, header=None, usecols=[0], dtype=object)
        col = df.iloc[:, 0]

        max_id = conn.execute("SELECT MAX(id) FROM lexical_index").fetchone()[0] or 0
        n_ok = 0
        n_null = 0

        cur = conn.cursor()
        conn.execute("BEGIN")
        for id_ in range(1, max_id + 1):
            idx = id_ - 1
            if idx >= len(col):
                cur.execute(
                    "UPDATE lexical_index SET short_def_original = NULL WHERE id = ?",
                    (id_,),
                )
                n_null += 1
                continue
            raw = col.iloc[idx]
            if pd.isna(raw) or (isinstance(raw, str) and not str(raw).strip()):
                cur.execute(
                    "UPDATE lexical_index SET short_def_original = NULL WHERE id = ?",
                    (id_,),
                )
                n_null += 1
            else:
                s = str(raw).strip()
                cur.execute(
                    "UPDATE lexical_index SET short_def_original = ? WHERE id = ?",
                    (s, id_),
                )
                n_ok += 1
        conn.commit()
    except Exception:
        conn.rollback()
        conn.close()
        work.unlink(missing_ok=True)
        raise
    conn.close()

    try:
        os.replace(work, args.db)
    except OSError as e:
        try:
            shutil.copy2(work, args.db)
            work.unlink(missing_ok=True)
        except OSError:
            print(
                f"Gravado em {work}. Substituição falhou ({e}). "
                f"Feche programas que usem {args.db} e volte a correr ou copie o temp sobre o destino.",
                file=sys.stderr,
            )
            return 2

    print(f"OK: {n_ok} linhas com texto, {n_null} com NULL. max_id={max_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
