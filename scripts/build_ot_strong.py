#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build de dados Strong para AT usando MorphHB.

Saida:
  public/ot_strong.sqlite
"""

from __future__ import annotations

import re
import sqlite3
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

WLC_BASE_URL = "https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc"
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

BOOK_NAME_TO_WLC = {
    "Genesis": "Gen.xml",
    "Exodus": "Exod.xml",
    "Leviticus": "Lev.xml",
    "Numbers": "Num.xml",
    "Deuteronomy": "Deut.xml",
    "Joshua": "Josh.xml",
    "Judges": "Judg.xml",
    "Ruth": "Ruth.xml",
    "I Samuel": "1Sam.xml",
    "II Samuel": "2Sam.xml",
    "I Kings": "1Kgs.xml",
    "II Kings": "2Kgs.xml",
    "I Chronicles": "1Chr.xml",
    "II Chronicles": "2Chr.xml",
    "Ezra": "Ezra.xml",
    "Nehemiah": "Neh.xml",
    "Esther": "Esth.xml",
    "Job": "Job.xml",
    "Psalms": "Ps.xml",
    "Proverbs": "Prov.xml",
    "Ecclesiastes": "Eccl.xml",
    "Song of Solomon": "Song.xml",
    "Isaiah": "Isa.xml",
    "Jeremiah": "Jer.xml",
    "Lamentations": "Lam.xml",
    "Ezekiel": "Ezek.xml",
    "Daniel": "Dan.xml",
    "Hosea": "Hos.xml",
    "Joel": "Joel.xml",
    "Amos": "Amos.xml",
    "Obadiah": "Obad.xml",
    "Jonah": "Jonah.xml",
    "Micah": "Mic.xml",
    "Nahum": "Nah.xml",
    "Habakkuk": "Hab.xml",
    "Zephaniah": "Zeph.xml",
    "Haggai": "Hag.xml",
    "Zechariah": "Zech.xml",
    "Malachi": "Mal.xml",
}


def first_hebrew_strong(lemma_raw: str) -> str:
    if not lemma_raw:
        return ""
    m = re.search(r"H(\d+)", str(lemma_raw), re.I)
    if m:
        return f"H{int(m.group(1))}"
    m = re.search(r"(?:^|[/\s])(\d+)", str(lemma_raw))
    if m:
        return f"H{int(m.group(1))}"
    return ""


def strip_xml_ns(root: ET.Element) -> None:
    for el in root.iter():
        if "}" in el.tag:
            el.tag = el.tag.split("}", 1)[1]


def parse_osis_ref(osis_id: str) -> tuple[int, int] | None:
    parts = str(osis_id or "").strip().split(".")
    if len(parts) < 3:
        return None
    try:
        return int(parts[1]), int(parts[2])
    except ValueError:
        return None


def baixar_wlc(nome_arquivo: str, cache_dir: Path) -> str:
    cache_dir.mkdir(parents=True, exist_ok=True)
    dest = cache_dir / nome_arquivo
    if dest.exists() and dest.stat().st_size > 1000:
        return dest.read_text(encoding="utf-8")
    url = f"{WLC_BASE_URL}/{nome_arquivo}"
    r = requests.get(url, timeout=180, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    dest.write_text(r.text, encoding="utf-8")
    return r.text


def importar_tokens_wlc(book_id: int, xml_text: str) -> list[tuple]:
    root = ET.fromstring(xml_text)
    strip_xml_ns(root)
    rows: list[tuple] = []
    for verse_el in root.iter("verse"):
        osis = verse_el.attrib.get("osisID") or ""
        ref = parse_osis_ref(osis)
        if not ref:
            continue
        chapter, verse = ref
        token_idx = 0
        for w_el in verse_el.findall("w"):
            token_idx += 1
            text = "".join(w_el.itertext()).strip()
            if not text:
                continue
            lemma = (w_el.attrib.get("lemma") or "").strip()
            morph = (w_el.attrib.get("morph") or "").strip()
            strong = first_hebrew_strong(lemma)
            rows.append((book_id, chapter, verse, token_idx, text, lemma, morph, strong))
    return rows


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
    cache_wlc = root / "scripts" / ".cache" / "morphhb-wlc"

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
        for book_name, book_id in sorted(BOOK_NAME_TO_ID.items(), key=lambda x: x[1]):
            wlc_file = BOOK_NAME_TO_WLC.get(book_name)
            if not wlc_file:
                print(f"[WARN] WLC ausente para: {book_name}")
                continue
            print(f"WLC {wlc_file} …")
            xml_text = baixar_wlc(wlc_file, cache_wlc)
            rows = importar_tokens_wlc(book_id, xml_text)
            for row in rows:
                strong = row[7]
                if strong:
                    strong_count[strong] = strong_count.get(strong, 0) + 1
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
            print(f"{book_id:02d} {book_name}: {len(rows)} tokens (WLC vocalizado)")

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
