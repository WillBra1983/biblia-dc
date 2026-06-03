#!/usr/bin/env python3
"""Inventário de campos fonéticos (Strong, StepBible, MorphGNT)."""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

# Evita UnicodeEncodeError no console Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


def main() -> None:
    # --- NT Strong (MorphGNT dictionary) ---
    nt_path = PUBLIC / "nt_prova.sqlite"
    if nt_path.exists():
        c = sqlite3.connect(nt_path)
        total = c.execute("SELECT COUNT(*) FROM strong_greek").fetchone()[0]
        with_pron = c.execute(
            "SELECT COUNT(*) FROM strong_greek WHERE pronunciation IS NOT NULL AND trim(pronunciation) != ''"
        ).fetchone()[0]
        with_xlit = c.execute(
            "SELECT COUNT(*) FROM strong_greek WHERE greek_translit IS NOT NULL AND trim(greek_translit) != ''"
        ).fetchone()[0]
        print("=== strong_greek (nt_prova.sqlite) ===")
        print(f"  entradas: {total}")
        print(f"  com pronunciation: {with_pron} ({100 * with_pron / total:.1f}%)")
        print(f"  com greek_translit: {with_xlit}")
        for row in c.execute(
            "SELECT strong, greek_unicode, greek_translit, pronunciation FROM strong_greek WHERE strong IN ('G40','G5547','G2316')"
        ):
            u, t, p = row[1], row[2], row[3]
            print(f"  amostra {row[0]}: pron={p!r} translit={t!r}")

        tok_total = c.execute("SELECT COUNT(*) FROM nt_tokens").fetchone()[0]
        print(f"\n=== nt_tokens (formas na passagem) ===")
        print(f"  tokens: {tok_total}")
        print("  colunas: text, word, lemma, parsing — SEM translit/pronunciation por token")
        uniq_forms = c.execute("SELECT COUNT(DISTINCT text) FROM nt_tokens").fetchone()[0]
        print(f"  formas gregas distintas (text): {uniq_forms}")

    # --- OT Strong ---
    for name in ("ot_strong.sqlite", "ot_prova.sqlite"):
        ot_path = PUBLIC / name
        if not ot_path.exists():
            continue
        c = sqlite3.connect(ot_path)
        tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")]
        if "strong_hebrew" not in tables:
            print(f"\n=== {name}: sem tabela strong_hebrew ===")
            continue
        total = c.execute("SELECT COUNT(*) FROM strong_hebrew").fetchone()[0]
        with_pron = c.execute(
            "SELECT COUNT(*) FROM strong_hebrew WHERE pron IS NOT NULL AND trim(pron) != ''"
        ).fetchone()[0]
        with_xlit = c.execute(
            "SELECT COUNT(*) FROM strong_hebrew WHERE xlit IS NOT NULL AND trim(xlit) != ''"
        ).fetchone()[0]
        print(f"\n=== strong_hebrew ({name}) ===")
        print(f"  entradas: {total}")
        print(f"  com pron: {with_pron} ({100 * with_pron / total:.1f}%)")
        print(f"  com xlit: {with_xlit}")
        for row in c.execute(
            "SELECT strong_code, headword, xlit, pron FROM strong_hebrew WHERE strong_code IN ('H430','H3068')"
        ):
            print(f"  amostra {row[0]}: xlit={row[2]!r} pron={row[3]!r}")

    # --- StepBible ---
    sb_path = PUBLIC / "stepbible_lexicon.sqlite"
    if sb_path.exists():
        c = sqlite3.connect(sb_path)
        cols = [r[1] for r in c.execute("pragma table_info(stepbible_lexicon)")]
        total = c.execute("SELECT COUNT(*) FROM stepbible_lexicon").fetchone()[0]
        with_tr = c.execute(
            "SELECT COUNT(*) FROM stepbible_lexicon WHERE transliteration IS NOT NULL AND trim(transliteration) != ''"
        ).fetchone()[0]
        print(f"\n=== stepbible_lexicon ===")
        print(f"  colunas: {', '.join(cols)}")
        print(f"  linhas: {total}")
        print(f"  com transliteration: {with_tr} ({100 * with_tr / total:.1f}%)")
        phon_cols = [c for c in cols if any(x in c.lower() for x in ("pron", "ipa", "phon"))]
        if phon_cols:
            for col in phon_cols:
                n = c.execute(
                    f"SELECT COUNT(*) FROM stepbible_lexicon WHERE {col} IS NOT NULL AND trim({col}) != ''"
                ).fetchone()[0]
                print(f"  com {col}: {n}")
        else:
            print("  NÃO há coluna pronunciation/IPA — só transliteration + morphology (POS)")

        # morphology = POS tag, not phonetic
        sample = c.execute(
            "SELECT lemma, transliteration, morphology, strongs_extended FROM stepbible_lexicon "
            "WHERE strongs_extended = 'G5547' OR strongs_unified LIKE '%5547%' LIMIT 3"
        ).fetchall()
        print("  amostras G5547:")
        for row in sample:
            print(f"    translit={row[1]!r} morph={row[2]!r} ext={row[3]!r}")

    # --- MP3 já gerados ---
    mp3_dir = ROOT / "public" / "sounds" / "strong-pron"
    if mp3_dir.exists():
        mp3s = list(mp3_dir.glob("*.mp3"))
        print(f"\n=== public/sounds/strong-pron ===")
        print(f"  arquivos MP3: {len(mp3s)}")
    else:
        print("\n=== public/sounds/strong-pron ===")
        print("  pasta inexistente (app já suporta G####.mp3 / H####.mp3 via HEAD)")


if __name__ == "__main__":
    main()
