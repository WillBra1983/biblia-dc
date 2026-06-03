#!/usr/bin/env python3
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_ot_hebrew_verse_audio_whisper import (
    baixar_mp3,
    buscar_versos,
    palavras_he,
    transcrever_whisper,
    TMP_DIR,
    url_capitulo,
)

mp3 = TMP_DIR / "1_1.mp3"
baixar_mp3(url_capitulo(1, 1), mp3)
words = transcrever_whisper(mp3, "small", 1, 1)
conn = sqlite3.connect(ROOT / "public" / "ot_strong.sqlite")
versos = buscar_versos(conn, 1, 1)
conn.close()

print("WHISPER primeiras 40 palavras -> ver dump json")

print("VERSOS 1-5 -> ver dump json")

# salvar dump
dump = {"words": words[:120], "verses": {str(v["verse"]): palavras_he(v["text"]) for v in versos[:10]}}
Path(ROOT / "scripts" / "_whisper_dump_gn1.json").write_text(
    json.dumps(dump, ensure_ascii=False, indent=2), encoding="utf-8"
)
print("\nDump: scripts/_whisper_dump_gn1.json")
