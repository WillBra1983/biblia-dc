import sqlite3
import unicodedata

db = sqlite3.connect("public/ot_strong.sqlite")
tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("tables:", tables)
for t in tables:
    n = db.execute(f"SELECT COUNT(*) FROM [{t}]").fetchone()[0]
    cols = [c[1] for c in db.execute(f"PRAGMA table_info([{t}])").fetchall()]
    print(f"  {t}: {n} cols={cols[:8]}{'...' if len(cols)>8 else ''}")

def has_n(s):
    for ch in unicodedata.normalize("NFD", s or ""):
        o = ord(ch)
        if 0x05B0 <= o <= 0x05BC or o in (0x05B9, 0x05BB):
            return True
    return False

rows = db.execute(
    "SELECT text, morph, lemma_raw, strong_code FROM ot_tokens WHERE book_id=1 AND chapter=1 AND verse=2"
).fetchall()
print("\nGn 1:2 tokens:")
for r in rows:
    print(" ", r, "niqqud=", has_n(r[0]))

cnt = sum(1 for (h,) in db.execute("SELECT headword FROM strong_hebrew") if has_n(h))
print(f"\nheadwords with niqqud: {cnt}")
