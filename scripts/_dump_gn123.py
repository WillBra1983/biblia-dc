import sqlite3
import json

db = sqlite3.connect("public/ot_strong.sqlite")
rows = db.execute(
    """SELECT verse, token_idx, text, morph, lemma_raw, strong_code
       FROM ot_tokens WHERE book_id=1 AND chapter=1 AND verse IN (1,2,3)
       ORDER BY verse, token_idx"""
).fetchall()
out = []
for r in rows:
    out.append({
        "verse": r[0], "idx": r[1], "text": r[2], "morph": r[3],
        "lemma_raw": r[4], "strong": r[5],
    })
open("scripts/_gn123_tokens.json", "w", encoding="utf-8").write(json.dumps(out, ensure_ascii=False, indent=2))
print("written", len(out), "tokens")
