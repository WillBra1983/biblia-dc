#!/usr/bin/env python3
"""Teste rápido Aeneas + hebraico (3 versos)."""
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_ot_hebrew_verse_audio_aeneas import (  # noqa: E402
    TMP_DIR,
    buscar_versos,
    config_task_aeneas,
    runtime_aeneas_hebraico,
    texto_aeneas_versiculo,
)
from aeneas.executetask import ExecuteTask, Task  # noqa: E402
from aeneas.textfile import TextFileFormat  # noqa: E402
import sqlite3  # noqa: E402

conn = sqlite3.connect(ROOT / "public" / "ot_strong.sqlite")
versos = buscar_versos(conn, 1, 1)[:3]
conn.close()
mp3 = TMP_DIR / "1_1.mp3"
linhas = []
for v in versos:
    plain = texto_aeneas_versiculo(v["text"]) or f"v{v['verse']}"
    linhas.append(f"1:1:{v['verse']}|{plain}")
print("task:", config_task_aeneas())
print("rconf tts:", runtime_aeneas_hebraico().tts)
for ln in linhas:
    print("line:", ln[:100])
with tempfile.TemporaryDirectory() as tmp:
    txt = Path(tmp) / "v.txt"
    sync = Path(tmp) / "m.json"
    txt.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    rconf = runtime_aeneas_hebraico()
    task = Task(config_string=config_task_aeneas(), rconf=rconf)
    task.audio_file_path_absolute = str(mp3.resolve())
    task.text_file_path_absolute = str(txt.resolve())
    task.text_file_format = TextFileFormat.PLAIN
    task.sync_map_file_path_absolute = str(sync.resolve())
    try:
        ExecuteTask(task, rconf=rconf).execute()
        print("OK")
    except Exception as e:
        print("EXC:", type(e).__name__, e)
