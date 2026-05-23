#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prova tecnica NT (SBLGNT + MorphGNT + Strong grego CC0)

Gera um SQLite de prova em:
  - public/nt_prova.sqlite

Fontes:
  - MorphGNT SBLGNT (tokens morfologicos):
    https://github.com/morphgnt/sblgnt
  - Strongs Greek Dictionary XML (CC0):
    https://github.com/morphgnt/strongs-dictionary-xml
"""

from __future__ import annotations

import re
import sqlite3
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

import requests


BOOKS_NT = [
    (1, "Mt", "Mateus"),
    (2, "Mk", "Marcos"),
    (3, "Lk", "Lucas"),
    (4, "Jn", "Joao"),
    (5, "Ac", "Atos"),
    (6, "Ro", "Romanos"),
    (7, "1Co", "1 Corintios"),
    (8, "2Co", "2 Corintios"),
    (9, "Ga", "Galatas"),
    (10, "Eph", "Efesios"),
    (11, "Php", "Filipenses"),
    (12, "Col", "Colossenses"),
    (13, "1Th", "1 Tessalonicenses"),
    (14, "2Th", "2 Tessalonicenses"),
    (15, "1Ti", "1 Timoteo"),
    (16, "2Ti", "2 Timoteo"),
    (17, "Tit", "Tito"),
    (18, "Phm", "Filemom"),
    (19, "Heb", "Hebreus"),
    (20, "Jas", "Tiago"),
    (21, "1Pe", "1 Pedro"),
    (22, "2Pe", "2 Pedro"),
    (23, "1Jn", "1 Joao"),
    (24, "2Jn", "2 Joao"),
    (25, "3Jn", "3 Joao"),
    (26, "Jud", "Judas"),
    (27, "Re", "Apocalipse"),
]

MORPHGNT_RAW_BASE = "https://raw.githubusercontent.com/morphgnt/sblgnt/master"
STRONG_GREEK_XML_URL = (
    "https://raw.githubusercontent.com/morphgnt/strongs-dictionary-xml/master/strongsgreek.xml"
)


def norm_greek(text: str) -> str:
    """Normaliza grego para busca aproximada (remove diacriticos e poe lower)."""
    if not text:
        return ""
    nfd = unicodedata.normalize("NFD", text)
    stripped = "".join(ch for ch in nfd if unicodedata.category(ch) != "Mn")
    return unicodedata.normalize("NFC", stripped).lower().strip()


def fetch_text(url: str) -> str:
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    resp.encoding = "utf-8"
    return resp.text


def init_schema(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.executescript(
        """
        PRAGMA journal_mode = WAL;

        DROP TABLE IF EXISTS nt_books;
        DROP TABLE IF EXISTS nt_tokens;
        DROP TABLE IF EXISTS nt_verses;
        DROP TABLE IF EXISTS strong_greek;
        DROP TABLE IF EXISTS strong_greek_lemma_index;

        CREATE TABLE nt_books (
          book_num INTEGER PRIMARY KEY,
          code TEXT NOT NULL,
          nome_pt TEXT NOT NULL
        );

        CREATE TABLE nt_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_num INTEGER NOT NULL,
          chapter INTEGER NOT NULL,
          verse INTEGER NOT NULL,
          token_idx INTEGER NOT NULL,
          pos TEXT,
          parsing TEXT,
          text TEXT,
          word TEXT,
          normalized_word TEXT,
          lemma TEXT,
          lemma_norm TEXT,
          FOREIGN KEY (book_num) REFERENCES nt_books(book_num)
        );

        CREATE TABLE nt_verses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_num INTEGER NOT NULL,
          chapter INTEGER NOT NULL,
          verse INTEGER NOT NULL,
          text_greek TEXT NOT NULL,
          token_count INTEGER NOT NULL DEFAULT 0,
          UNIQUE (book_num, chapter, verse),
          FOREIGN KEY (book_num) REFERENCES nt_books(book_num)
        );

        CREATE TABLE strong_greek (
          strong TEXT PRIMARY KEY,
          greek_unicode TEXT,
          greek_translit TEXT,
          pronunciation TEXT,
          derivation TEXT,
          definition TEXT,
          kjv_def TEXT
        );

        CREATE TABLE strong_greek_lemma_index (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          strong TEXT NOT NULL,
          lemma_norm TEXT NOT NULL,
          lemma_raw TEXT,
          FOREIGN KEY (strong) REFERENCES strong_greek(strong)
        );

        CREATE INDEX idx_nt_tokens_ref ON nt_tokens(book_num, chapter, verse, token_idx);
        CREATE INDEX idx_nt_tokens_lemma_norm ON nt_tokens(lemma_norm);
        CREATE INDEX idx_strong_lemma_norm ON strong_greek_lemma_index(lemma_norm);
        """
    )
    conn.commit()


def import_books(conn: sqlite3.Connection) -> None:
    conn.executemany(
        "INSERT INTO nt_books (book_num, code, nome_pt) VALUES (?, ?, ?)",
        BOOKS_NT,
    )
    conn.commit()


def parse_morphgnt_line(line: str) -> dict | None:
    line = line.strip()
    if not line:
        return None
    # Ex.: 010101 N- ----NSF- Βίβλος Βίβλος βίβλος βίβλος
    parts = line.split(" ")
    if len(parts) < 7:
        return None
    ref = parts[0]
    pos = parts[1]
    parsing = parts[2]
    text = parts[3]
    word = parts[4]
    normalized_word = parts[5]
    lemma = parts[6]

    if not re.fullmatch(r"\d{6}", ref):
        return None
    book_num = int(ref[0:2])
    chapter = int(ref[2:4])
    verse = int(ref[4:6])
    return {
        "book_num": book_num,
        "chapter": chapter,
        "verse": verse,
        "pos": pos,
        "parsing": parsing,
        "text": text,
        "word": word,
        "normalized_word": normalized_word,
        "lemma": lemma,
        "lemma_norm": norm_greek(lemma),
    }


def import_morphgnt_tokens(conn: sqlite3.Connection) -> int:
    cur = conn.cursor()
    total = 0

    for book_num, code, _ in BOOKS_NT:
        filename = f"{60 + book_num:02d}-{code}-morphgnt.txt"
        url = f"{MORPHGNT_RAW_BASE}/{filename}"
        print(f"Baixando {filename}...")
        text = fetch_text(url)

        token_idx_by_ref: dict[tuple[int, int, int], int] = {}
        rows = []
        for line in text.splitlines():
            parsed = parse_morphgnt_line(line)
            if not parsed:
                continue
            key = (parsed["book_num"], parsed["chapter"], parsed["verse"])
            token_idx = token_idx_by_ref.get(key, 0) + 1
            token_idx_by_ref[key] = token_idx
            rows.append(
                (
                    parsed["book_num"],
                    parsed["chapter"],
                    parsed["verse"],
                    token_idx,
                    parsed["pos"],
                    parsed["parsing"],
                    parsed["text"],
                    parsed["word"],
                    parsed["normalized_word"],
                    parsed["lemma"],
                    parsed["lemma_norm"],
                )
            )
        cur.executemany(
            """
            INSERT INTO nt_tokens (
              book_num, chapter, verse, token_idx,
              pos, parsing, text, word, normalized_word, lemma, lemma_norm
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        total += len(rows)
        conn.commit()
        print(f"  -> {len(rows)} tokens importados")

    return total


def build_nt_verses(conn: sqlite3.Connection) -> int:
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO nt_verses (book_num, chapter, verse, text_greek, token_count)
        SELECT
          book_num,
          chapter,
          verse,
          GROUP_CONCAT(text, ' ') AS text_greek,
          COUNT(*) AS token_count
        FROM nt_tokens
        GROUP BY book_num, chapter, verse
        ORDER BY book_num, chapter, verse
        """
    )
    conn.commit()
    return cur.rowcount if cur.rowcount is not None else 0


def first_text(node: ET.Element, tag_name: str) -> str:
    child = node.find(tag_name)
    if child is None:
        return ""
    return "".join(child.itertext()).strip()


def import_strongs_greek(conn: sqlite3.Connection) -> int:
    print("Baixando strongsgreek.xml...")
    xml_text = fetch_text(STRONG_GREEK_XML_URL)
    root = ET.fromstring(xml_text)
    entries = root.find("entries")
    if entries is None:
        raise RuntimeError("Arquivo strongsgreek.xml sem <entries>.")

    rows = []
    idx_rows = []
    for entry in entries.findall("entry"):
        strong_raw = entry.attrib.get("strongs", "").strip()
        if not strong_raw:
            continue
        strong = f"G{int(strong_raw)}"
        greek_node = entry.find("greek")
        greek_unicode = greek_node.attrib.get("unicode", "").strip() if greek_node is not None else ""
        greek_translit = greek_node.attrib.get("translit", "").strip() if greek_node is not None else ""
        pronunciation_node = entry.find("pronunciation")
        pronunciation = (
            pronunciation_node.attrib.get("strongs", "").strip() if pronunciation_node is not None else ""
        )

        derivation = first_text(entry, "strongs_derivation")
        definition = first_text(entry, "strongs_def")
        kjv_def = first_text(entry, "kjv_def")

        rows.append((strong, greek_unicode, greek_translit, pronunciation, derivation, definition, kjv_def))
        if greek_unicode:
            idx_rows.append((strong, norm_greek(greek_unicode), greek_unicode))

    conn.executemany(
        """
        INSERT INTO strong_greek (
          strong, greek_unicode, greek_translit, pronunciation, derivation, definition, kjv_def
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    conn.executemany(
        """
        INSERT INTO strong_greek_lemma_index (strong, lemma_norm, lemma_raw)
        VALUES (?, ?, ?)
        """,
        idx_rows,
    )
    conn.commit()
    return len(rows)


def run_smoke_queries(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    q1 = """
      SELECT b.nome_pt, v.chapter, v.verse, v.text_greek
      FROM nt_verses v
      JOIN nt_books b ON b.book_num = v.book_num
      WHERE v.book_num = 1 AND v.chapter = 1 AND v.verse = 1
      LIMIT 1
    """
    row = cur.execute(q1).fetchone()
    print("Smoke #1 (Mt 1:1):", row if row else "N/A")

    q2 = """
      SELECT strong, greek_unicode, greek_translit
      FROM strong_greek
      WHERE strong = 'G3056'
      LIMIT 1
    """
    row2 = cur.execute(q2).fetchone()
    print("Smoke #2 (G3056):", row2 if row2 else "N/A")


def main() -> int:
    project_root = Path(__file__).resolve().parents[1]
    output_db = project_root / "public" / "nt_prova.sqlite"
    output_db.parent.mkdir(parents=True, exist_ok=True)
    if output_db.exists():
        output_db.unlink()

    print(f"Gerando banco de prova em: {output_db}")
    conn = sqlite3.connect(output_db)
    try:
        init_schema(conn)
        import_books(conn)
        token_count = import_morphgnt_tokens(conn)
        verse_count = build_nt_verses(conn)
        strong_count = import_strongs_greek(conn)
        run_smoke_queries(conn)
        print(
            "\nConcluido:\n"
            f"  Tokens NT: {token_count}\n"
            f"  Versos NT: {verse_count}\n"
            f"  Entradas Strong grego: {strong_count}\n"
            f"  Arquivo: {output_db}"
        )
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
