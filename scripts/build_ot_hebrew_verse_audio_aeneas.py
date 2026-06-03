#!/usr/bin/env python3
"""
Alinha áudio hebraico OT (WordProject) com versículos via Aeneas (forced alignment).

Requer Aeneas + eSpeak-ng com voz hebraica (WSL/Linux):
  pip install aeneas
  sudo apt install espeak-ng espeak-ng-data libespeak-dev ffmpeg

Uso:
  python scripts/build_ot_hebrew_verse_audio_aeneas.py --book 1 --chapter 1
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import tempfile
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUT_DIR = PUBLIC / "data" / "ot-hebrew-audio"
DB_PATH = PUBLIC / "ot_strong.sqlite"
TMP_DIR = ROOT / "scripts" / "_audio_tmp"

AUDIO_LANG = 44
AUDIO_BASE = f"https://www.wordproaudio.net/bibles/app/audio/{AUDIO_LANG}"


def strip_marks(text: str) -> str:
    nfd = unicodedata.normalize("NFD", str(text or ""))
    return "".join(ch for ch in nfd if unicodedata.category(ch) != "Mn")


def texto_aeneas_versiculo(texto: str) -> str:
    """Texto plano para Aeneas: sem niqqud, cantilação nem prefixos MorphHB."""
    partes = []
    for p in str(texto or "").split():
        w = strip_marks(p.replace("/", "").replace("׃", "").replace("־", ""))
        # Só letras hebraicas (eSpeak não lê bem pontos/cantilação massorética)
        w = re.sub(r"[^\u05D0-\u05EA]", "", w)
        if w:
            partes.append(w)
    return " ".join(partes)


def config_task_aeneas() -> str:
    """Parâmetros da tarefa (idioma heb = código Aeneas para hebraico)."""
    return "task_language=heb|is_text_type=plain|os_task_file_format=json"


def runtime_aeneas_hebraico():
    """
    TTS/rconf: ``tts``, ``tts_path`` e ``allow_unlisted_languages`` vão aqui,
    não na config da tarefa (TaskConfiguration ignora essas chaves).
    """
    import shutil

    from aeneas.runtimeconfiguration import RuntimeConfiguration

    tts = "espeak-ng" if shutil.which("espeak-ng") else "espeak"
    tts_path = shutil.which(tts) or tts
    return RuntimeConfiguration(
        f"tts={tts}|tts_path={tts_path}|tts_voice_code=he|allow_unlisted_languages=True"
    )


def verificar_espeak_hebraico() -> tuple[bool, str]:
    import shutil
    import subprocess

    tts = "espeak-ng" if shutil.which("espeak-ng") else None
    if not tts:
        return False, "Instale: sudo apt install espeak-ng espeak-ng-data"
    try:
        proc = subprocess.run(
            [tts, "--voices"],
            capture_output=True,
            text=True,
            timeout=15,
            check=True,
        )
        out = proc.stdout or ""
        if " he " in f" {out} " or "\n he " in out or "sem/he" in out:
            return True, tts
        return False, f"{tts} instalado, mas sem voz hebraica (he). Instale espeak-ng-data."
    except (OSError, subprocess.SubprocessError) as e:
        return False, str(e)


def url_capitulo(book_id: int, chapter: int) -> str:
    return f"{AUDIO_BASE}/{int(book_id)}/{int(chapter)}.mp3"


def buscar_versos(conn: sqlite3.Connection, book_id: int, chapter: int) -> list[dict]:
    rows = conn.execute(
        """
        SELECT verse, GROUP_CONCAT(text, ' ') AS texto
        FROM ot_tokens
        WHERE book_id = ? AND chapter = ?
        GROUP BY verse
        ORDER BY verse
        """,
        (int(book_id), int(chapter)),
    ).fetchall()
    return [{"verse": int(v), "text": (t or "").strip()} for v, t in rows]


def baixar_mp3(url: str, dest: Path) -> Path:
    import requests

    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1000:
        return dest
    r = requests.get(url, timeout=120, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    dest.write_bytes(r.content)
    return dest


def duracao_mp3(path: Path) -> float:
    from mutagen.mp3 import MP3

    return float(MP3(path).info.length)


def alinhar_aeneas(mp3: Path, versos: list[dict], book_id: int, chapter: int) -> list[dict]:
    from aeneas.executetask import ExecuteTask, Task
    from aeneas.textfile import TextFileFormat

    linhas = []
    for v in versos:
        plain = texto_aeneas_versiculo(v["text"])
        if not plain:
            plain = f"v{v['verse']}"
        linhas.append(f"{book_id}:{chapter}:{v['verse']}|{plain}")

    with tempfile.TemporaryDirectory() as tmp:
        txt_path = Path(tmp) / "verses.txt"
        txt_path.write_text("\n".join(linhas) + "\n", encoding="utf-8")
        sync_path = Path(tmp) / "map.json"

        rconf = runtime_aeneas_hebraico()
        task = Task(config_string=config_task_aeneas(), rconf=rconf)
        task.audio_file_path_absolute = str(mp3.resolve())
        task.text_file_path_absolute = str(txt_path.resolve())
        task.text_file_format = TextFileFormat.PLAIN
        task.sync_map_file_path_absolute = str(sync_path.resolve())

        ExecuteTask(task, rconf=rconf).execute()
        task.output_sync_map_file()

        data = json.loads(sync_path.read_text(encoding="utf-8"))
        fragments = data.get("fragments") or []

    out: list[dict] = []
    for i, frag in enumerate(fragments):
        begin = float(frag.get("begin") or 0)
        end = float(frag.get("end") or begin)
        ver = versos[i]["verse"] if i < len(versos) else i + 1
        out.append(
            {
                "verse": ver,
                "start_sec": round(begin, 3),
                "end_sec": round(end, 3),
                "start_ms": int(round(begin * 1000)),
                "end_ms": int(round(end * 1000)),
                "text_preview": versos[i]["text"][:80] if i < len(versos) else "",
                "match": "aeneas",
            }
        )
    return out


def fechar_timeline_continua(verses: list[dict], duracao: float) -> list[dict]:
    """Garante fim[i] = início[i+1] para reprodução contínua no app."""
    if not verses:
        return verses
    out = [dict(v) for v in verses]
    for i in range(len(out) - 1):
        nstart = float(out[i + 1]["start_sec"])
        if nstart > float(out[i]["start_sec"]):
            out[i]["end_sec"] = round(nstart, 3)
            out[i]["end_ms"] = int(round(nstart * 1000))
    out[-1]["end_sec"] = round(duracao, 3)
    out[-1]["end_ms"] = int(round(duracao * 1000))
    return out


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    ap = argparse.ArgumentParser()
    ap.add_argument("--book", type=int, default=1)
    ap.add_argument("--chapter", type=int, default=1)
    args = ap.parse_args()

    try:
        import aeneas  # noqa: F401
    except ImportError:
        print("Aeneas não instalado. Use WSL/Linux: pip install aeneas")
        return 1

    if not DB_PATH.exists():
        print(f"Falta {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH)
    versos = buscar_versos(conn, args.book, args.chapter)
    conn.close()
    if not versos:
        print("Nenhum versículo.")
        return 1

    url = url_capitulo(args.book, args.chapter)
    mp3 = TMP_DIR / f"{args.book}_{args.chapter}.mp3"
    print(f"MP3: {url}")
    baixar_mp3(url, mp3)
    duracao = duracao_mp3(mp3)
    print(f"Duração: {duracao:.1f}s | Versos: {len(versos)}")

    ok_tts, info_tts = verificar_espeak_hebraico()
    if not ok_tts:
        print(f"\nERRO: {info_tts}")
        print("Use Whisper:")
        print(
            f"  python scripts/build_ot_hebrew_verse_audio_whisper.py "
            f"--book {args.book} --chapter {args.chapter} --model small"
        )
        return 1
    print(f"Aeneas (TTS: {info_tts}, idioma heb → voz he)…")
    try:
        timestamps = alinhar_aeneas(mp3, versos, args.book, args.chapter)
    except Exception as exc:
        msg = str(exc)
        if "Language" in msg and "not supported" in msg:
            print(
                "\nERRO: Aeneas não conseguiu usar hebraico.\n"
                "Verifique: espeak-ng instalado, ``espeak-ng --voices | grep he``.\n"
                "Alternativa Whisper:\n"
                f"  python scripts/build_ot_hebrew_verse_audio_whisper.py "
                f"--book {args.book} --chapter {args.chapter} --model small\n"
            )
            return 1
        raise
    timestamps = fechar_timeline_continua(timestamps, duracao)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cap_key = f"{args.book}:{args.chapter}"
    chapters_path = OUT_DIR / "chapters.json"
    chapters_doc: dict = {"version": 1, "audio_lang": AUDIO_LANG, "chapters": {}}
    if chapters_path.exists():
        try:
            chapters_doc = json.loads(chapters_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass

    chapters_doc.setdefault("chapters", {})[cap_key] = {
        "book_id": args.book,
        "chapter": args.chapter,
        "url": url,
        "duration_sec": round(duracao, 3),
        "verse_count": len(versos),
        "method": "aeneas",
        "intro_before_verse1_sec": round(float(timestamps[0].get("intro_sec") or timestamps[0]["start_sec"]), 3)
        if timestamps
        and args.book == 1
        and args.chapter == 1
        else None,
        "verses_matched_whisper": len(timestamps),
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    chapters_doc["source"] = "wordproaudio.net / wordproject.org (hebrew OT)"
    chapters_path.write_text(json.dumps(chapters_doc, ensure_ascii=False, indent=2), encoding="utf-8")

    verses_path = OUT_DIR / f"verses-{args.book}-{args.chapter}.json"
    verses_path.write_text(
        json.dumps(
            {
                "book_id": args.book,
                "chapter": args.chapter,
                "url": url,
                "duration_sec": round(duracao, 3),
                "method": "aeneas",
                "intro_before_verse1_sec": round(float(timestamps[0].get("intro_sec") or timestamps[0]["start_sec"]), 3)
        if timestamps
        and args.book == 1
        and args.chapter == 1
        else None,
                "verses": timestamps,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"\nGravado: {verses_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
