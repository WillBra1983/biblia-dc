#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prova tecnica NT (SBLGNT + MorphGNT + TAGNT + Strong grego CC0)

Gera um SQLite de prova em:
  - public/nt_prova.sqlite

Fontes:
  - MorphGNT SBLGNT (tokens morfologicos):
    https://github.com/morphgnt/sblgnt
  - Strongs Greek Dictionary XML (CC0):
    https://github.com/morphgnt/strongs-dictionary-xml
  - STEPBible TAGNT (CC BY 4.0), vinculo Strong por palavra/ocorrencia:
    https://github.com/STEPBible/STEPBible-Data
"""

from __future__ import annotations

import argparse
from difflib import SequenceMatcher
import re
import sqlite3
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

import requests


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


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
TAGNT_REVISION = "ae39711d7843b2902d54993e432de9c12d6a4b9a"
TAGNT_FILENAMES = (
    "TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
    "TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
)
TAGNT_RAW_BASE = (
    "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/"
    f"{TAGNT_REVISION}/Translators%20Amalgamated%20OT%2BNT"
)
TAGNT_BOOK_NUM = {
    "Mat": 1, "Mrk": 2, "Luk": 3, "Jhn": 4, "Act": 5, "Rom": 6,
    "1Co": 7, "2Co": 8, "Gal": 9, "Eph": 10, "Php": 11, "Col": 12,
    "1Th": 13, "2Th": 14, "1Ti": 15, "2Ti": 16, "Tit": 17, "Phm": 18,
    "Heb": 19, "Jas": 20, "1Pe": 21, "2Pe": 22, "1Jn": 23, "2Jn": 24,
    "3Jn": 25, "Jud": 26, "Rev": 27,
}
TAGNT_REF_RE = re.compile(r"^([A-Za-z0-9]+)\.(\d+)\.(\d+).*?#(\d+)")
TAGNT_STRONG_RE = re.compile(r"G0*(\d+)")
TAGNT_TRANSLIT_RE = re.compile(r"\s*\([^()]*\)\s*$")
TAGNT_VARIANT_RE = re.compile(
    r"^\s*([^()]*)\s*\([^)]*\).*?-\s*(G0*\d+)[^|]*?\bin:\s*(.+)$"
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
          strong_code TEXT,
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
        CREATE INDEX idx_nt_tokens_strong ON nt_tokens(strong_code);
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


def load_tagnt_texts(tagnt_dir: Path | None = None) -> list[str]:
    texts = []
    for filename in TAGNT_FILENAMES:
        if tagnt_dir is not None:
            path = tagnt_dir / filename
            print(f"Lendo {path}...")
            texts.append(path.read_text(encoding="utf-8-sig"))
        else:
            from urllib.parse import quote

            print(f"Baixando {filename}...")
            texts.append(fetch_text(f"{TAGNT_RAW_BASE}/{quote(filename)}"))
    return texts


def norm_token_surface(text: str) -> str:
    """Normaliza uma palavra, ignorando acentos, pontuacao e marcas do aparato."""
    return "".join(ch for ch in norm_greek(text) if ch.isalpha())


def norm_token_surface_accented(text: str) -> str:
    nfd = unicodedata.normalize("NFD", str(text or "").lower())
    kept = "".join(
        ch
        for ch in nfd
        if ch.isalpha()
        or (unicodedata.category(ch) == "Mn" and ch not in {"\u0300", "\u0301", "\u0342"})
    )
    return unicodedata.normalize("NFC", kept)


def parse_tagnt_strong_rows(
    texts: list[str], edition: str | None = "SBL"
) -> dict[tuple[int, int, int], list[tuple[str, str]]]:
    """Extrai o Strong de cada palavra que pertence especificamente ao texto SBL."""
    verses: dict[tuple[int, int, int], dict[int, tuple[str, str]]] = {}
    for text in texts:
        for line in text.splitlines():
            cols = line.split("\t")
            if len(cols) < 12:
                continue
            ref = TAGNT_REF_RE.match(cols[0])
            if ref is None:
                continue
            editions = {item.strip() for item in cols[5].split("+")}
            book_num = TAGNT_BOOK_NUM.get(ref.group(1))
            if book_num is None:
                continue
            # sStrong+Instance (coluna 12) e mais estavel que o dStrong composto.
            strong_numbers = TAGNT_STRONG_RE.findall(cols[11]) or TAGNT_STRONG_RE.findall(cols[3])
            if not strong_numbers:
                continue
            verse_key = (book_num, int(ref.group(2)), int(ref.group(3)))
            position = int(ref.group(4))
            surface = TAGNT_TRANSLIT_RE.sub("", cols[1]).strip()
            selected_strong = "|".join(
                dict.fromkeys(f"G{int(number)}" for number in strong_numbers)
            )
            primary_has_edition = edition is None or any(
                item.startswith(edition) for item in editions
            )
            if not primary_has_edition and edition is not None:
                variant = None
                for segment in cols[6].split("¦"):
                    match = TAGNT_VARIANT_RE.match(segment)
                    if match is None:
                        continue
                    variant_editions = {item.strip() for item in match.group(3).split("+")}
                    if any(item.startswith(edition) for item in variant_editions):
                        variant = match
                        break
                if variant is None:
                    continue
                surface = variant.group(1).strip()
                variant_strongs = TAGNT_STRONG_RE.findall(variant.group(2))
                if not variant_strongs:
                    continue
                selected_strong = "|".join(
                    dict.fromkeys(f"G{int(number)}" for number in variant_strongs)
                )
            verses.setdefault(verse_key, {}).setdefault(
                position, (surface, selected_strong)
            )
    return {
        ref: [
            (surface_part, strong)
            for position in sorted(positions)
            for surface_part in positions[position][0].split()
            for strong in [positions[position][1]]
        ]
        for ref, positions in verses.items()
    }


def import_tagnt_strong_codes(conn: sqlite3.Connection, texts: list[str]) -> tuple[int, int]:
    """Grava o Strong por ocorrencia, sem inferir pela grafia do lema."""
    mapping = parse_tagnt_strong_rows(texts)
    cur = conn.cursor()
    rows = []
    for (book_num, chapter, verse), tagnt_tokens in mapping.items():
        morph_tokens = cur.execute(
            """
            SELECT id, text FROM nt_tokens
            WHERE book_num = ? AND chapter = ? AND verse = ?
            ORDER BY token_idx
            """,
            (book_num, chapter, verse),
        ).fetchall()
        morph_norm = [norm_token_surface(item[1]) for item in morph_tokens]
        tagnt_norm = [norm_token_surface(item[0]) for item in tagnt_tokens]
        matcher = SequenceMatcher(None, morph_norm, tagnt_norm, autojunk=False)
        for operation, i1, i2, j1, j2 in matcher.get_opcodes():
            if operation == "equal" or (operation == "replace" and i2 - i1 == j2 - j1):
                for morph_item, tagnt_item in zip(
                    morph_tokens[i1:i2], tagnt_tokens[j1:j2]
                ):
                    rows.append((tagnt_item[1], morph_item[0]))
            elif operation == "replace" and i2 - i1 == 1 and j2 - j1 > 1:
                # O MorphGNT por vezes une particulas que o TAGNT separa (ex.: μηγε).
                if morph_norm[i1] == "".join(tagnt_norm[j1:j2]):
                    codes = list(
                        dict.fromkeys(
                            code
                            for item in tagnt_tokens[j1:j2]
                            for code in item[1].split("|")
                        )
                    )
                    rows.append(("|".join(codes), morph_tokens[i1][0]))
    cur.executemany(
        """
        UPDATE nt_tokens
        SET strong_code = ?
        WHERE id = ?
        """,
        rows,
    )
    # Alguns trechos entre colchetes do SBLGNT (como Mc 16.9-20) nao sao
    # rotulados como SBL no TAGNT. Para eles, reutiliza apenas relacoes lema->Strong
    # inequivocas, aprendidas das ocorrencias que acabaram de ser alinhadas.
    cur.execute(
        """
        WITH inferred AS (
          SELECT lemma_norm, MIN(strong_code) AS strong_code
          FROM nt_tokens
          WHERE strong_code IS NOT NULL AND strong_code != ''
          GROUP BY lemma_norm
          HAVING COUNT(DISTINCT strong_code) = 1
        )
        UPDATE nt_tokens
        SET strong_code = (
          SELECT inferred.strong_code FROM inferred
          WHERE inferred.lemma_norm = nt_tokens.lemma_norm
        )
        WHERE strong_code IS NULL
          AND lemma_norm IN (SELECT lemma_norm FROM inferred)
        """
    )
    # Ultimo fallback automatico: lema unico no proprio dicionario Strong.
    cur.execute(
        """
        WITH unique_lemma AS (
          SELECT lemma_norm, MIN(strong) AS strong_code
          FROM strong_greek_lemma_index
          GROUP BY lemma_norm
          HAVING COUNT(DISTINCT strong) = 1
        )
        UPDATE nt_tokens
        SET strong_code = (
          SELECT unique_lemma.strong_code FROM unique_lemma
          WHERE unique_lemma.lemma_norm = nt_tokens.lemma_norm
        )
        WHERE strong_code IS NULL
          AND lemma_norm IN (SELECT lemma_norm FROM unique_lemma)
        """
    )
    # Os colchetes editoriais do MorphGNT incluem alguns trechos que o TAGNT nao
    # rotula como SBL (especialmente Mc 16.9-20). Nesses casos, aproveita uma
    # correspondencia exata e inequivoca da forma acentuada entre todas as edicoes.
    all_editions = parse_tagnt_strong_rows(texts, edition=None)
    global_candidates: dict[str, set[str]] = {}
    for candidates_in_verse in all_editions.values():
        for candidate_surface, candidate_strong in candidates_in_verse:
            global_candidates.setdefault(
                norm_token_surface_accented(candidate_surface), set()
            ).add(candidate_strong)
    remaining = cur.execute(
        """
        SELECT id, book_num, chapter, verse, text
        FROM nt_tokens WHERE strong_code IS NULL
        """
    ).fetchall()
    exact_rows = []
    for token_id, book_num, chapter, verse, surface in remaining:
        candidates: dict[str, set[str]] = {}
        for candidate_surface, candidate_strong in all_editions.get(
            (book_num, chapter, verse), []
        ):
            candidates.setdefault(
                norm_token_surface_accented(candidate_surface), set()
            ).add(candidate_strong)
        strongs = candidates.get(norm_token_surface_accented(surface), set())
        if len(strongs) != 1:
            strongs = global_candidates.get(norm_token_surface_accented(surface), set())
        if len(strongs) == 1:
            exact_rows.append((next(iter(strongs)), token_id))
    cur.executemany(
        "UPDATE nt_tokens SET strong_code = ? WHERE id = ?",
        exact_rows,
    )
    conn.commit()
    linked = cur.execute(
        "SELECT COUNT(*) FROM nt_tokens WHERE strong_code IS NOT NULL AND strong_code != ''"
    ).fetchone()[0]
    total = cur.execute("SELECT COUNT(*) FROM nt_tokens").fetchone()[0]
    return linked, total - linked


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
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--tagnt-dir",
        type=Path,
        help="Diretorio local contendo os dois arquivos TAGNT; se omitido, baixa a revisao fixada.",
    )
    args = parser.parse_args()
    project_root = Path(__file__).resolve().parents[1]
    output_db = project_root / "public" / "nt_prova.sqlite"
    temp_db = output_db.with_name(f"{output_db.name}.tmp")
    output_db.parent.mkdir(parents=True, exist_ok=True)
    if temp_db.exists():
        temp_db.unlink()

    print(f"Gerando banco de prova em: {output_db}")
    conn = sqlite3.connect(temp_db)
    completed = False
    try:
        init_schema(conn)
        import_books(conn)
        token_count = import_morphgnt_tokens(conn)
        verse_count = build_nt_verses(conn)
        strong_count = import_strongs_greek(conn)
        linked_count, unlinked_count = import_tagnt_strong_codes(
            conn, load_tagnt_texts(args.tagnt_dir)
        )
        run_smoke_queries(conn)
        print(
            "\nConcluido:\n"
            f"  Tokens NT: {token_count}\n"
            f"  Versos NT: {verse_count}\n"
            f"  Entradas Strong grego: {strong_count}\n"
            f"  Tokens ligados diretamente ao Strong: {linked_count}\n"
            f"  Tokens sem Strong no TAGNT: {unlinked_count}\n"
            f"  Arquivo: {output_db}"
        )
        completed = True
    finally:
        conn.close()
    if completed:
        temp_db.replace(output_db)
    return 0


if __name__ == "__main__":
    sys.exit(main())
