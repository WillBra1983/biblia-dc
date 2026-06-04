#!/usr/bin/env python3
import sqlite3
from pathlib import Path

ROOTS = [
    Path(r"C:\Salvation\public"),
    Path(r"C:\Users\Pr Wilson Lucas\Desktop\Salvation\public"),
]

for root in ROOTS:
    print(f"\n=== {root} ===")
    if not root.is_dir():
        print("  (missing)")
        continue
    for p in sorted(root.glob("*.sqlite")):
        print(f"  {p.name} ({p.stat().st_size:,} bytes)")
    cur = root / "lexicon_ptbr_current.txt"
    if cur.exists():
        print(f"  lexicon_ptbr_current.txt -> {cur.read_text(encoding='utf-8').strip()}")
        ref = root / cur.read_text(encoding="utf-8").strip()
        print(f"    exists: {ref.exists()}")

    ot = root / "ot_strong.sqlite"
    if not ot.exists():
        continue
    c = sqlite3.connect(ot)
    for table in ("strong_hebrew", "lexical_index", "bdb_entries"):
        cols = [r[1] for r in c.execute(f"pragma table_info({table})").fetchall()]
        print(f"  {table} cols: {cols}")

    row = c.execute(
        "SELECT meaning, usage FROM strong_hebrew WHERE strong_code='H7225'"
    ).fetchone()
    print(f"  H7225 meaning/usage: {row}")

    row = c.execute(
        "SELECT short_def FROM lexical_index WHERE strong_code='H7225' LIMIT 1"
    ).fetchone()
    print(f"  H7225 lexical short_def: {row}")

    try:
        row = c.execute(
            """
            SELECT substr(content_text,1,80), substr(content_text_pt,1,80)
            FROM bdb_entries WHERE entry_id LIKE '722%' LIMIT 1
            """
        ).fetchone()
        print(f"  bdb sample: {row}")
    except Exception as e:
        print(f"  bdb query err: {e}")
    c.close()

    lp_name = (root / "lexicon_ptbr_current.txt").read_text(encoding="utf-8").strip() if (root / "lexicon_ptbr_current.txt").exists() else ""
    lp = root / lp_name if lp_name else None
    if lp and lp.exists():
        lc = sqlite3.connect(lp)
        for code in ("H7225", "H1", "G26"):
            r = lc.execute(
                "SELECT substr(definicao_expandida,1,90) FROM lexicon_ptbr WHERE strong_code=?",
                (code,),
            ).fetchone()
            print(f"  lexicon_ptbr {code}: {r[0] if r else None}")
        lc.close()

    sb = root / "stepbible_lexicon.sqlite"
    if sb.exists():
        sc = sqlite3.connect(sb)
        sb_cols = [r[1] for r in sc.execute("pragma table_info(stepbible_lexicon)").fetchall()]
        print(f"  stepbible cols pt: definition_pt={'definition_pt' in sb_cols}")
        r = sc.execute(
            """
            SELECT substr(gloss_pt,1,50), substr(gloss_original,1,50),
                   substr(definition_pt,1,50), substr(definition_original,1,50)
            FROM stepbible_lexicon
            WHERE strongs_extended='H7225' OR strongs_unified LIKE 'H7225%'
            LIMIT 1
            """
        ).fetchone()
        print(f"  stepbible H7225: {r}")
        sc.close()
