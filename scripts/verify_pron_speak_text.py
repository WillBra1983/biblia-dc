#!/usr/bin/env python3
"""Mostra o texto que vai para o TTS (amostras)."""
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_strong_pron_mp3 import preparar_fala_grego  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

db = sqlite3.connect(Path(__file__).resolve().parents[1] / "public" / "nt_prova.sqlite")
for code in ("G5547", "G2307"):
    row = db.execute(
        "SELECT greek_unicode, greek_translit, pronunciation FROM strong_greek WHERE strong=?",
        (code,),
    ).fetchone()
    if row:
        speak, voice = preparar_fala_grego(row[0], row[1] or "", row[2] or "")
        print(f"{code}: unicode={row[0]!r}")
        print(f"      translit DB={row[1]!r}")
        print(f"      TTS text={speak!r} voice={voice}")
        print()
