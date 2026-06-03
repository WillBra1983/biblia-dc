#!/usr/bin/env python3
"""
Piloto: índice de áudio hebraico OT (WordProject) por capítulo + timestamps por versículo.

Fonte MP3: https://www.wordproaudio.net/bibles/app/audio/44/{livro}/{cap}.mp3

Uso:
  pip install mutagen requests
  python scripts/build_ot_hebrew_verse_audio_pilot.py
  python scripts/build_ot_hebrew_verse_audio_pilot.py --book 1 --chapter 1
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUT_DIR = PUBLIC / "data" / "ot-hebrew-audio"
DB_PATH = PUBLIC / "ot_strong.sqlite"

AUDIO_LANG = 44
AUDIO_BASE = f"https://www.wordproaudio.net/bibles/app/audio/{AUDIO_LANG}"


def strip_hebrew_marks(text: str) -> str:
    nfd = unicodedata.normalize("NFD", str(text or ""))
    return "".join(ch for ch in nfd if unicodedata.category(ch) != "Mn")


def peso_versiculo(texto: str) -> float:
    t = strip_hebrew_marks(texto)
    t = re.sub(r"[\s\u0591-\u05C7\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u2018-\u201F\"'«».,;:!?…׃]+", "", t)
    return max(float(len(t)), 1.0)


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
    out = []
    for verse, texto in rows:
        out.append({"verse": int(verse), "text": (texto or "").strip()})
    return out


def duracao_mp3_url(url: str) -> float:
    try:
        import requests
        from mutagen.mp3 import MP3
    except ImportError as e:
        raise SystemExit("Instale: pip install mutagen requests") from e

    r = requests.get(url, timeout=60, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    tmp = ROOT / "scripts" / "_tmp_chapter.mp3"
    tmp.write_bytes(r.content)
    try:
        return float(MP3(tmp).info.length)
    finally:
        tmp.unlink(missing_ok=True)


def alinhar_proporcional(versos: list[dict], duracao_total: float) -> list[dict]:
    pesos = [peso_versiculo(v["text"]) for v in versos]
    soma = sum(pesos)
    t = 0.0
    out = []
    for i, v in enumerate(versos):
        frac = pesos[i] / soma if soma else 1.0 / max(len(versos), 1)
        start = t
        end = duracao_total if i == len(versos) - 1 else min(duracao_total, t + duracao_total * frac)
        t = end
        out.append(
            {
                "verse": v["verse"],
                "start_sec": round(start, 3),
                "end_sec": round(end, 3),
                "text_preview": v["text"][:80],
            }
        )
    return out


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    ap = argparse.ArgumentParser()
    ap.add_argument("--book", type=int, default=1)
    ap.add_argument("--chapter", type=int, default=1)
    args = ap.parse_args()

    if not DB_PATH.exists():
        print(f"Falta {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH)
    versos = buscar_versos(conn, args.book, args.chapter)
    conn.close()
    if not versos:
        print("Nenhum versículo encontrado.")
        return 1

    url = url_capitulo(args.book, args.chapter)
    print(f"Baixando {url} …")
    duracao = duracao_mp3_url(url)
    print(f"Duração: {duracao:.1f}s | Versos: {len(versos)}")

    timestamps = alinhar_proporcional(versos, duracao)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cap_key = f"{args.book}:{args.chapter}"
    chapters_path = OUT_DIR / "chapters.json"
    chapters_doc = {"version": 1, "audio_lang": AUDIO_LANG, "chapters": {}}
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
        "method": "proportional_v1",
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
                "verses": timestamps,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Gravado: {chapters_path}")
    print(f"Gravado: {verses_path}")
    print("Amostra v1:", timestamps[0])
    print("Amostra v26:", next((x for x in timestamps if x["verse"] == 26), None))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
