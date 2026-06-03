import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_strong_pron_mp3 import preparar_fala_grego

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

db = sqlite3.connect(Path(__file__).resolve().parents[1] / "public" / "nt_prova.sqlite")
for code in ("G2316", "G2424", "G5547", "G40"):
    r = db.execute(
        "SELECT greek_unicode, greek_translit, pronunciation FROM strong_greek WHERE strong=?",
        (code,),
    ).fetchone()
    if r:
        speak, voice = preparar_fala_grego(r[0], r[1] or "", r[2] or "")
        print(f"{code}: unicode={r[0]!r}")
        print(f"     translit={r[1]!r} pron={r[2]!r}")
        print(f"     TTS={speak!r} voice={voice}\n")
