#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import sqlite3
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    db_path = root / "public" / "ot_strong.sqlite"
    txt_path = root / "src" / "data" / "bdb_content_text_ptbr_clean.txt"
    report_path = root / "src" / "data" / "bdb_content_text_ptbr_import_report.txt"

    if not db_path.exists():
        raise RuntimeError(f"Banco nao encontrado: {db_path}")
    if not txt_path.exists():
        raise RuntimeError(f"Arquivo nao encontrado: {txt_path}")

    lines = [line.strip() for line in txt_path.read_text(encoding="utf-8").splitlines()]
    lines = [line for line in lines if line]

    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(bdb_entries)")
        cols = {r[1] for r in cur.fetchall()}
        if "content_text_pt" not in cols:
            cur.execute("ALTER TABLE bdb_entries ADD COLUMN content_text_pt TEXT")
            conn.commit()

        entries = cur.execute("SELECT entry_id FROM bdb_entries ORDER BY rowid").fetchall()
        entry_ids = [r[0] for r in entries]

        use_count = min(len(lines), len(entry_ids))
        updated = 0
        for i in range(use_count):
            entry_id = entry_ids[i]
            content_pt = lines[i]
            cur.execute(
                "UPDATE bdb_entries SET content_text_pt = ? WHERE entry_id = ?",
                (content_pt, entry_id),
            )
            updated += 1

        conn.commit()

        sample = cur.execute(
            "SELECT entry_id, substr(content_text_pt,1,160) FROM bdb_entries WHERE content_text_pt IS NOT NULL LIMIT 5"
        ).fetchall()

        report_lines = [
            f"DB: {db_path}",
            f"TXT: {txt_path}",
            f"Linhas PT limpas: {len(lines)}",
            f"Entradas BDB no banco: {len(entry_ids)}",
            f"Atualizadas: {updated}",
            f"Sobras no TXT: {max(0, len(lines) - len(entry_ids))}",
            f"Entradas sem PT (se banco maior): {max(0, len(entry_ids) - len(lines))}",
            "",
            "Amostra:",
        ]
        for e, t in sample:
            report_lines.append(f"{e}: {t}")
        report_path.write_text("\n".join(report_lines), encoding="utf-8")
        print(f"OK: {updated} entradas BDB com PT-BR")
        print(f"REPORT: {report_path}")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

