#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Formata textos léxicos em português (conservador).

- BDB: uma linha por entrada; glossas curtas deduplicadas; parágrafos longos só maiúscula.
- STEPBible: quebras em numeração + «Também significa» + maiúsculas.
- Léxico Strong (docx merge): maiúsculas nas definições expandidas.

Uso:
  python scripts/format_lexical_ptbr.py --dry-run
  python scripts/format_lexical_ptbr.py
"""
from __future__ import annotations

import argparse
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BDB_TXT = ROOT / "src" / "data" / "bdb_content_text_ptbr_clean.txt"
OT_DB = ROOT / "public" / "ot_strong.sqlite"
SB_DB = ROOT / "public" / "stepbible_lexicon.sqlite"
LEX_CURRENT = ROOT / "public" / "lexicon_ptbr_current.txt"

HEBREW_RE = re.compile(r"[\u0590-\u05FF]")
POS_BDB_RE = re.compile(
    r"^\s*((?:\[[^\]]+\]|[\u0590-\u05FF][\u0590-\u05FF\s־\[\]]*))\s*"
    r"(?:(\b(?:nf|nm|nmf|nmpl|adj|adv|prep|conj|part|int|pron)\b\.?)\s+)?(.+)$",
    re.UNICODE,
)
ADJ_DUP_RE = re.compile(r"\b([\wà-úÀ-Ú]+)(\s+)\1\b", re.IGNORECASE)
STEP_NUM_RE = re.compile(r"(?<!\n)(\s+)(?=(\d+[a-z]?\)))", re.IGNORECASE)
STEP_TAMBEM_RE = re.compile(r"\s*(Também significa:)", re.IGNORECASE)
STEP_LEAD_COLON_RE = re.compile(r"^:\s*", re.IGNORECASE)
TOKEN_RE = re.compile(r"[\wà-úÀ-Ú]+", re.UNICODE)


def capitalizar_frases_ptbr(texto: str) -> str:
    s = re.sub(r"\s+", " ", str(texto or "")).strip()
    if not s:
        return ""

    def up_after_punct(m: re.Match) -> str:
        return m.group(1) + m.group(2).upper()

    s = re.sub(r"^([a-zà-ú])", lambda m: m.group(1).upper(), s, count=1, flags=re.IGNORECASE)
    s = re.sub(r"([.!?…]+)\s+([a-zà-ú])", up_after_punct, s, flags=re.IGNORECASE)
    s = re.sub(r";\s*([a-zà-ú])", lambda m: f"; {m.group(1).upper()}", s, flags=re.IGNORECASE)
    s = re.sub(r":\s*([a-zà-ú])", lambda m: f": {m.group(1).upper()}", s, flags=re.IGNORECASE)
    s = re.sub(
        r"\n([a-zà-ú])",
        lambda m: f"\n{m.group(1).upper()}",
        s,
        flags=re.IGNORECASE,
    )
    return s


def dedupe_adjacent_tokens(pt: str) -> str:
    s = pt
    for _ in range(12):
        n = ADJ_DUP_RE.sub(r"\1\2", s)
        if n == s:
            break
        s = n
    return s


def glossa_bdb_curta(pt: str) -> str:
    """Só para glossas lexicográficas curtas (sem frases longas)."""
    tokens = TOKEN_RE.findall(pt)
    if len(tokens) > 12 or len(pt) > 100 or "." in pt:
        return capitalizar_frases_ptbr(dedupe_adjacent_tokens(pt))
    vistos: set[str] = set()
    out: list[str] = []
    for t in tokens:
        k = t.lower()
        if k in vistos:
            continue
        vistos.add(k)
        out.append(t[:1].upper() + t[1:] if t else t)
    return ", ".join(out)


def formatar_linha_bdb(linha: str) -> str:
    """Mantém UMA linha por entrada (alinhamento rowid no import)."""
    raw = str(linha or "").strip()
    if not raw:
        return ""

    # Linha já reformatada ou corrompida com quebra — normalizar para uma linha.
    raw = raw.replace("\n", " ").strip()
    raw = re.sub(r"\s+", " ", raw)

    m = POS_BDB_RE.match(raw)
    if not m:
        if len(raw) <= 160 and not HEBREW_RE.search(raw):
            return capitalizar_frases_ptbr(raw)
        return raw

    heb = m.group(1).strip()
    pos = (m.group(2) or "").strip().rstrip(".")
    pt = (m.group(3) or "").strip()

    # Só reformata glossas lexicográficas curtas com etiqueta POS (nf, adj…).
    if not pos or HEBREW_RE.search(pt[:40]):
        return raw

    pt = glossa_bdb_curta(pt)

    if pos:
        return f"{heb} {pos} · {pt}" if pt else f"{heb} {pos}"
    return f"{heb} · {pt}" if pt else heb


def formatar_stepbible(texto: str) -> str:
    s = str(texto or "").strip()
    if not s:
        return ""
    s = STEP_LEAD_COLON_RE.sub("", s)
    s = STEP_TAMBEM_RE.sub(r"\n\n\1 ", s)
    s = STEP_NUM_RE.sub(r"\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return capitalizar_frases_ptbr(s)


def formatar_texto_curto(texto: str) -> str:
    return capitalizar_frases_ptbr(str(texto or "").strip())


def processar_bdb_txt(dry_run: bool) -> tuple[int, int]:
    if not BDB_TXT.exists():
        raise FileNotFoundError(BDB_TXT)
    linhas = BDB_TXT.read_text(encoding="utf-8").splitlines()
    novas: list[str] = []
    alteradas = 0
    for linha in linhas:
        if not linha.strip():
            novas.append(linha)
            continue
        fmt = formatar_linha_bdb(linha)
        if fmt != linha:
            alteradas += 1
        novas.append(fmt)
    if not dry_run:
        BDB_TXT.write_text("\n".join(novas) + ("\n" if novas else ""), encoding="utf-8")
    return len(linhas), alteradas


def colunas_existentes(conn: sqlite3.Connection, tabela: str) -> set[str]:
    return {r[1] for r in conn.execute(f"PRAGMA table_info({tabela})").fetchall()}


def atualizar_coluna_texto(
    conn: sqlite3.Connection,
    tabela: str,
    coluna: str,
    formatter,
    where_sql: str = "1=1",
    dry_run: bool = False,
) -> int:
    cols = colunas_existentes(conn, tabela)
    if coluna not in cols:
        return 0
    cur = conn.cursor()
    rows = cur.execute(
        f"SELECT rowid, {coluna} FROM {tabela} WHERE {where_sql} AND {coluna} IS NOT NULL AND TRIM({coluna}) <> ''"
    ).fetchall()
    alteradas = 0
    for rowid, valor in rows:
        novo = formatter(str(valor))
        if novo != valor:
            alteradas += 1
            if not dry_run:
                cur.execute(f"UPDATE {tabela} SET {coluna} = ? WHERE rowid = ?", (novo, rowid))
    if not dry_run:
        conn.commit()
    return alteradas


def resolver_lexicon_db() -> Path | None:
    if not LEX_CURRENT.exists():
        for p in sorted((ROOT / "public").glob("lexicon_ptbr_docxmerge_*.sqlite")):
            return p
        return None
    nome = LEX_CURRENT.read_text(encoding="utf-8").strip()
    p = ROOT / "public" / nome
    return p if p.exists() else None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    total_txt, alt_txt = processar_bdb_txt(args.dry_run)
    print(f"BDB txt: {total_txt} linhas, {alt_txt} alteradas -> {BDB_TXT}")

    if OT_DB.exists():
        conn = sqlite3.connect(OT_DB)
        try:
            n_short = atualizar_coluna_texto(
                conn, "lexical_index", "short_def", formatar_texto_curto, dry_run=args.dry_run
            )
            print(f"ot_strong.sqlite: short_def={n_short} (content_text_pt via reimport)")
        finally:
            conn.close()

    if SB_DB.exists():
        conn = sqlite3.connect(SB_DB)
        try:
            cols = colunas_existentes(conn, "stepbible_lexicon")
            total_sb = 0
            for col in (
                "definition_pt",
                "definition_clean_pt",
                "definition_original",
                "gloss_pt",
                "gloss_original",
            ):
                if col not in cols:
                    continue
                fmt = formatar_stepbible if "definition" in col else formatar_texto_curto
                n = atualizar_coluna_texto(
                    conn, "stepbible_lexicon", col, fmt, dry_run=args.dry_run
                )
                total_sb += n
                print(f"  stepbible.{col}: {n}")
            print(f"stepbible_lexicon.sqlite: {total_sb} células alteradas")
        finally:
            conn.close()

    lex_db = resolver_lexicon_db()
    if lex_db:
        conn = sqlite3.connect(lex_db)
        try:
            n_lex = atualizar_coluna_texto(
                conn, "lexicon_ptbr", "definicao_expandida", formatar_texto_curto, dry_run=args.dry_run
            )
            print(f"{lex_db.name}: definicao_expandida={n_lex}")
        finally:
            conn.close()

    if not args.dry_run and OT_DB.exists() and BDB_TXT.exists():
        print("\nReimportando BDB txt -> ot_strong...")
        import importlib.util

        spec = importlib.util.spec_from_file_location(
            "import_bdb", ROOT / "scripts" / "import_bdb_pt_clean_into_ot_strong.py"
        )
        mod = importlib.util.module_from_spec(spec)
        assert spec.loader
        spec.loader.exec_module(mod)
        mod.main()

    if args.dry_run:
        print("\n(dry-run: nenhum arquivo gravado)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
