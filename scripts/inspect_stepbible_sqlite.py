import sqlite3
from pathlib import Path

db = Path(__file__).resolve().parents[1] / "public" / "stepbible_lexicon.sqlite"
conn = sqlite3.connect(str(db))
cur = conn.cursor()
cols = [r[1] for r in cur.execute("pragma table_info(stepbible_lexicon)").fetchall()]
print("Colunas:", cols)
print("Total linhas:", cur.execute("select count(*) from stepbible_lexicon").fetchone()[0])
for col in ("definition_pt", "definition_clean_pt", "gloss_pt"):
    if col in cols:
        n = cur.execute(
            f"select count(*) from stepbible_lexicon where {col} is not null and trim({col}) != ''"
        ).fetchone()[0]
        print(f"Preenchidas {col}:", n)
conn.close()
