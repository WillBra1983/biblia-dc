#!/usr/bin/env python3
import sqlite3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out = root / "scripts" / "_verify_h7225_out.txt"
lines = []

c = sqlite3.connect(root / "public" / "ot_strong.sqlite")
for row in c.execute(
    "SELECT entry_id, content_text_pt FROM bdb_entries WHERE content_text_pt LIKE '%רֵאשִׁית%'"
):
    lines.append(f"BDB {row[0]}: {row[1]}")
r = c.execute("SELECT short_def FROM lexical_index WHERE strong_code='H7225'").fetchone()
lines.append(f"short_def: {r[0] if r else None}")
c.close()

c2 = sqlite3.connect(root / "public" / "stepbible_lexicon.sqlite")
r2 = c2.execute(
    "SELECT gloss_original, definition_original FROM stepbible_lexicon WHERE strongs_extended='H7225' LIMIT 1"
).fetchone()
if r2:
    lines.append(f"gloss: {r2[0]}")
    lines.append(f"def: {r2[1]}")
c2.close()

c3 = sqlite3.connect(root / "public" / "lexicon_ptbr_docxmerge_1777376003.sqlite")
r3 = c3.execute(
    "SELECT definicao_expandida FROM lexicon_ptbr WHERE strong_code='H7225'"
).fetchone()
lines.append(f"lex: {r3[0] if r3 else None}")

txt = root / "src" / "data" / "bdb_content_text_ptbr_clean.txt"
for i, line in enumerate(txt.read_text(encoding="utf-8").splitlines(), 1):
    if "רֵאשִׁית" in line and "nf" in line:
        lines.append(f"txt L{i}: {line}")

out.write_text("\n".join(lines), encoding="utf-8")
