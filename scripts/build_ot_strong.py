#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build de dados Strong para AT usando MorphHB.

Saida:
  public/ot_strong.sqlite
"""

from __future__ import annotations

import json
import re
import sqlite3
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

MORPHHB_INDEX_URL = "https://raw.githubusercontent.com/openscriptures/morphhb/master/index.js"
HEBREW_STRONG_XML_URL = "https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/HebrewStrong.xml"
LEXICAL_INDEX_XML_URL = "https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/LexicalIndex.xml"
BDB_XML_URL = "https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/BrownDriverBriggs.xml"

BOOK_NAME_TO_ID = {
    "Genesis": 1,
    "Exodus": 2,
    "Leviticus": 3,
    "Numbers": 4,
    "Deuteronomy": 5,
    "Joshua": 6,
    "Judges": 7,
    "Ruth": 8,
    "I Samuel": 9,
    "II Samuel": 10,
    "I Kings": 11,
    "II Kings": 12,
    "I Chronicles": 13,
    "II Chronicles": 14,
    "Ezra": 15,
    "Nehemiah": 16,
    "Esther": 17,
    "Job": 18,
    "Psalms": 19,
    "Proverbs": 20,
    "Ecclesiastes": 21,
    "Song of Solomon": 22,
    "Isaiah": 23,
    "Jeremiah": 24,
    "Lamentations": 25,
    "Ezekiel": 26,
    "Daniel": 27,
    "Hosea": 28,
    "Joel": 29,
    "Amos": 30,
    "Obadiah": 31,
    "Jonah": 32,
    "Micah": 33,
    "Nahum": 34,
    "Habakkuk": 35,
    "Zephaniah": 36,
    "Haggai": 37,
    "Zechariah": 38,
    "Malachi": 39,
}


def first_hebrew_strong(lemma_raw: str) -> str:
    if not lemma_raw:
        return ""
    m = re.search(r"H(\d+)", lemma_raw)
    if not m:
        return ""
    return f"H{int(m.group(1))}"


def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        PRAGMA journal_mode = WAL;
        DROP TABLE IF EXISTS ot_tokens;
        DROP TABLE IF EXISTS ot_books;
        DROP TABLE IF EXISTS strong_hebrew_index;
        DROP TABLE IF EXISTS strong_hebrew;
        DROP TABLE IF EXISTS lexical_index;
        DROP TABLE IF EXISTS bdb_entries;

        CREATE TABLE ot_books (
          book_id INTEGER PRIMARY KEY,
          name_en TEXT NOT NULL
        );

        CREATE TABLE ot_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          chapter INTEGER NOT NULL,
          verse INTEGER NOT NULL,
          token_idx INTEGER NOT NULL,
          text TEXT,
          lemma_raw TEXT,
          morph TEXT,
          strong_code TEXT,
          FOREIGN KEY (book_id) REFERENCES ot_books(book_id)
        );

        CREATE TABLE strong_hebrew_index (
          strong_code TEXT PRIMARY KEY,
          occurrences INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE strong_hebrew (
          strong_code TEXT PRIMARY KEY,
          headword TEXT,
          xlit TEXT,
          pron TEXT,
          pos TEXT,
          source TEXT,
          meaning TEXT,
          usage TEXT
        );

        CREATE TABLE lexical_index (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          strong_code TEXT,
          entry_id TEXT NOT NULL,
          headword TEXT,
          xlit TEXT,
          pos TEXT,
          short_def TEXT,
          bdb TEXT,
          twot TEXT,
          etym_type TEXT,
          etym_value TEXT,
          etym_root TEXT
        );

        CREATE TABLE bdb_entries (
          entry_id TEXT PRIMARY KEY,
          headword TEXT,
          content_text TEXT
        );

        CREATE INDEX idx_ot_tokens_ref ON ot_tokens(book_id, chapter, verse, token_idx);
        CREATE INDEX idx_ot_tokens_strong ON ot_tokens(strong_code);
        CREATE INDEX idx_lexical_strong_code ON lexical_index(strong_code);
        """
    )
    conn.commit()


def import_hebrew_lexicon(conn: sqlite3.Connection) -> int:
    xml_text = requests.get(HEBREW_STRONG_XML_URL, timeout=90).text
    root = ET.fromstring(xml_text)
    ns = {"h": "http://openscriptures.github.com/morphhb/namespace"}
    rows = []
    for entry in root.findall("h:entry", ns):
        strong = (entry.attrib.get("id") or "").strip()
        if not strong.startswith("H"):
            continue
        w = entry.find("h:w", ns)
        source = entry.find("h:source", ns)
        meaning = entry.find("h:meaning", ns)
        usage = entry.find("h:usage", ns)
        headword = "".join(w.itertext()).strip() if w is not None else ""
        xlit = (w.attrib.get("xlit") or "").strip() if w is not None else ""
        pron = (w.attrib.get("pron") or "").strip() if w is not None else ""
        pos = (w.attrib.get("pos") or "").strip() if w is not None else ""
        rows.append(
            (
                strong,
                headword,
                xlit,
                pron,
                pos,
                "".join(source.itertext()).strip() if source is not None else "",
                "".join(meaning.itertext()).strip() if meaning is not None else "",
                "".join(usage.itertext()).strip() if usage is not None else "",
            )
        )
    conn.executemany(
        """
        INSERT INTO strong_hebrew (
          strong_code, headword, xlit, pron, pos, source, meaning, usage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    conn.commit()
    return len(rows)


def import_lexical_index(conn: sqlite3.Connection) -> int:
    xml_text = requests.get(LEXICAL_INDEX_XML_URL, timeout=90).text
    root = ET.fromstring(xml_text)
    ns = {"h": "http://openscriptures.github.com/morphhb/namespace"}
    rows = []
    for part in root.findall("h:part", ns):
        for entry in part.findall("h:entry", ns):
            entry_id = (entry.attrib.get("id") or "").strip()
            if not entry_id:
                continue
            w = entry.find("h:w", ns)
            xref = entry.find("h:xref", ns)
            etym = entry.find("h:etym", ns)
            strong_attr = (xref.attrib.get("strong") or "").strip() if xref is not None else ""
            strong_code = f"H{int(strong_attr)}" if strong_attr.isdigit() else ""
            pos_node = entry.find("h:pos", ns)
            def_node = entry.find("h:def", ns)
            rows.append(
                (
                    strong_code or None,
                    entry_id,
                    "".join(w.itertext()).strip() if w is not None else "",
                    (w.attrib.get("xlit") or "").strip() if w is not None else "",
                    "".join(pos_node.itertext()).strip() if pos_node is not None else "",
                    "".join(def_node.itertext()).strip() if def_node is not None else "",
                    (xref.attrib.get("bdb") or "").strip() if xref is not None else "",
                    (xref.attrib.get("twot") or "").strip() if xref is not None else "",
                    (etym.attrib.get("type") or "").strip() if etym is not None else "",
                    "".join(etym.itertext()).strip() if etym is not None else "",
                    (etym.attrib.get("root") or "").strip() if etym is not None else "",
                )
            )
    conn.executemany(
        """
        INSERT INTO lexical_index (
          strong_code, entry_id, headword, xlit, pos, short_def, bdb, twot, etym_type, etym_value, etym_root
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    conn.commit()
    return len(rows)


def import_bdb(conn: sqlite3.Connection) -> int:
    xml_text = requests.get(BDB_XML_URL, timeout=120).text
    root = ET.fromstring(xml_text)
    ns = {"h": "http://openscriptures.github.com/morphhb/namespace"}
    rows = []
    for part in root.findall("h:part", ns):
        for section in part.findall("h:section", ns):
            for entry in section.findall("h:entry", ns):
                entry_id = (entry.attrib.get("id") or "").strip()
                if not entry_id:
                    continue
                w = entry.find("h:w", ns)
                raw_text = "".join(entry.itertext())
                content_text = re.sub(r"\s+", " ", raw_text).strip()
                rows.append(
                    (
                        entry_id,
                        "".join(w.itertext()).strip() if w is not None else "",
                        content_text,
                    )
                )
    conn.executemany(
        """
        INSERT INTO bdb_entries (entry_id, headword, content_text)
        VALUES (?, ?, ?)
        """,
        rows,
    )
    conn.commit()
    return len(rows)


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    out_db = root / "public" / "ot_strong.sqlite"
    out_db.parent.mkdir(parents=True, exist_ok=True)
    if out_db.exists():
        out_db.unlink()

    print(f"Gerando: {out_db}")
    js = requests.get(MORPHHB_INDEX_URL, timeout=120)
    js.raise_for_status()
    text = js.text
    prefix = "var morphhb="
    suffix = ";module.exports=morphhb;"
    if not (text.startswith(prefix) and text.endswith(suffix)):
        raise RuntimeError("Formato inesperado em morphhb/index.js")
    payload = text[len(prefix) : -len(suffix)]
    data = json.loads(payload)

    conn = sqlite3.connect(out_db)
    try:
        init_schema(conn)
        cur = conn.cursor()
        cur.executemany(
            "INSERT INTO ot_books (book_id, name_en) VALUES (?, ?)",
            [(bid, name) for name, bid in BOOK_NAME_TO_ID.items()],
        )
        conn.commit()

        total = 0
        strong_count = {}
        for book_name, chapters in data.items():
            book_id = BOOK_NAME_TO_ID.get(book_name)
            if not book_id:
                print(f"[WARN] Livro nao mapeado: {book_name}")
                continue
            rows = []
            for ch_idx, verses in enumerate(chapters, start=1):
                for v_idx, words in enumerate(verses, start=1):
                    for token_idx, triple in enumerate(words, start=1):
                        if not isinstance(triple, list) or len(triple) < 3:
                            continue
                        word, lemma_raw, morph = triple[0], triple[1], triple[2]
                        strong = first_hebrew_strong(str(lemma_raw))
                        if strong:
                            strong_count[strong] = strong_count.get(strong, 0) + 1
                        rows.append(
                            (
                                book_id,
                                ch_idx,
                                v_idx,
                                token_idx,
                                str(word),
                                str(lemma_raw),
                                str(morph),
                                strong,
                            )
                        )
            cur.executemany(
                """
                INSERT INTO ot_tokens (
                  book_id, chapter, verse, token_idx, text, lemma_raw, morph, strong_code
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                rows,
            )
            conn.commit()
            total += len(rows)
            print(f"{book_id:02d} {book_name}: {len(rows)} tokens")

        cur.executemany(
            "INSERT INTO strong_hebrew_index (strong_code, occurrences) VALUES (?, ?)",
            sorted(strong_count.items()),
        )
        conn.commit()
        lex_count = import_hebrew_lexicon(conn)
        li_count = import_lexical_index(conn)
        bdb_count = import_bdb(conn)
        print(
            f"\nConcluido: {total} tokens AT, {len(strong_count)} codigos H, "
            f"{lex_count} entradas HebrewStrong, {li_count} entradas LexicalIndex, "
            f"{bdb_count} entradas BDB"
        )
        print(f"Arquivo: {out_db}")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
