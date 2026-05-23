#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build de dados lexicais STEPBible (TBESH/TBESG/TFLSJ).

Saida:
  public/stepbible_lexicon.sqlite
"""

from __future__ import annotations

import html
import io
import json
import re
import sqlite3
import sys
import tarfile
import urllib.request
from pathlib import Path

PACKAGE_TGZ_URL = (
    "https://registry.npmjs.org/@metaxia/scriptures-source-stepbible-lexicon/"
    "-/scriptures-source-stepbible-lexicon-2.0.0.tgz"
)

DATASETS = {
    "stepbible-tbesh": "package/data/stepbible-tbesh.json",
    "stepbible-tbesg": "package/data/stepbible-tbesg.json",
    "stepbible-tflsj": "package/data/stepbible-tflsj.json",
}


def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        PRAGMA journal_mode = WAL;
        DROP TABLE IF EXISTS stepbible_lexicon;

        CREATE TABLE stepbible_lexicon (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source TEXT NOT NULL,
          lang TEXT,
          strongs_extended TEXT,
          strongs_disambiguated TEXT,
          strongs_unified TEXT,
          lemma TEXT,
          transliteration TEXT,
          morphology TEXT,
          gloss TEXT,
          definition TEXT,
          gloss_clean TEXT,
          definition_clean TEXT
        );

        CREATE INDEX idx_stepbible_unified ON stepbible_lexicon(strongs_unified);
        CREATE INDEX idx_stepbible_extended ON stepbible_lexicon(strongs_extended);
        """
    )
    conn.commit()


def infer_lang(strong_code: str) -> str:
    code = (strong_code or "").upper()
    if code.startswith("H"):
        return "he"
    if code.startswith("G"):
        return "gr"
    return ""


def clean_markup(text: str) -> str:
    s = str(text or "")
    s = html.unescape(s)
    s = re.sub(r"<br\s*/?>", " ", s, flags=re.IGNORECASE)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def parse_entries(payload: object, source: str) -> list[tuple]:
    if isinstance(payload, dict):
        iterable = payload.values()
    elif isinstance(payload, list):
        iterable = payload
    else:
        raise RuntimeError(f"Formato inesperado no dataset {source}")
    rows: list[tuple] = []
    for item in iterable:
        if not isinstance(item, dict):
            continue
        unified = str(item.get("strongsUnified") or "").strip().upper()
        extended = str(item.get("strongsExtended") or "").strip().upper()
        disamb = str(item.get("strongsDisambiguated") or "").strip().upper()
        gloss = str(item.get("gloss") or "").strip()
        definition = str(item.get("definition") or "").strip()
        rows.append(
            (
                source,
                infer_lang(unified or extended or disamb),
                extended,
                disamb,
                unified,
                str(item.get("lemma") or "").strip(),
                str(item.get("transliteration") or "").strip(),
                str(item.get("morphology") or "").strip(),
                gloss,
                definition,
                clean_markup(gloss),
                clean_markup(definition),
            )
        )
    return rows


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    out_db = root / "public" / "stepbible_lexicon.sqlite"
    out_db.parent.mkdir(parents=True, exist_ok=True)
    if out_db.exists():
        out_db.unlink()

    print(f"Gerando: {out_db}")
    blob = urllib.request.urlopen(PACKAGE_TGZ_URL, timeout=90).read()
    tgz = tarfile.open(fileobj=io.BytesIO(blob), mode="r:gz")

    conn = sqlite3.connect(out_db)
    try:
        init_schema(conn)
        total = 0
        for source, tar_path in DATASETS.items():
            member = tgz.getmember(tar_path)
            with tgz.extractfile(member) as f:
                if f is None:
                    raise RuntimeError(f"Falha ao ler {tar_path}")
                payload = json.loads(f.read().decode("utf-8"))
            rows = parse_entries(payload, source)
            conn.executemany(
                """
                INSERT INTO stepbible_lexicon (
                  source, lang, strongs_extended, strongs_disambiguated, strongs_unified,
                  lemma, transliteration, morphology, gloss, definition, gloss_clean, definition_clean
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                rows,
            )
            conn.commit()
            total += len(rows)
            print(f"{source}: {len(rows)} entradas")
        print(f"\nConcluido: {total} entradas STEPBible")
        print(f"Arquivo: {out_db}")
    finally:
        conn.close()
        tgz.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
