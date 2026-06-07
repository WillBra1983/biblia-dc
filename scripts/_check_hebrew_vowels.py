import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
db = ROOT / "public" / "ot_strong.sqlite"
c = sqlite3.connect(db)

def has_niqqud(s):
    if not s:
        return False
    for ch in s:
        o = ord(ch)
        if 0x05B0 <= o <= 0x05C7:
            return True
    return False

r = c.execute("SELECT strong_code, headword FROM strong_hebrew WHERE strong_code='H7225'").fetchone()
out = ROOT / "scripts" / "_hebrew_vowels_out.txt"
lines = []
lines.append(f"H7225 headword repr: {repr(r)}")

rows = c.execute("SELECT strong_code, headword FROM strong_hebrew").fetchall()
with_n = sum(1 for _, h in rows if has_niqqud(h))
lines.append(f"strong_hebrew with niqqud: {with_n}/{len(rows)}")

t = c.execute("SELECT text FROM ot_tokens WHERE strong_code='H7225' LIMIT 3").fetchall()
lines.append(f"tokens repr: {[repr(x[0]) for x in t]}")

try:
    bdb = c.execute(
        "SELECT content_text_pt FROM bdb_entries WHERE entry_id='t.ad.ag' LIMIT 1"
    ).fetchone()
    if bdb:
        txt = bdb[0] or ""
        lines.append(f"BDB t.ad.ag start repr: {repr(txt[:80])}")
        lines.append(f"BDB has niqqud: {has_niqqud(txt)}")
except sqlite3.OperationalError as e:
    lines.append(f"BDB query skip: {e}")

out.write_text("\n".join(lines), encoding="utf-8")
print("written", out)
