#!/usr/bin/env python3
"""
Alinha áudio hebraico OT (WordProject) com versículos via Whisper.

Respeita introdução antes do v.1: só marca início do v.1 quando
as primeiras palavras do texto batem na transcrição.

Uso:
  pip install openai-whisper mutagen requests
  python scripts/build_ot_hebrew_verse_audio_whisper.py --book 1 --chapter 1
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

from difflib import SequenceMatcher

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUT_DIR = PUBLIC / "data" / "ot-hebrew-audio"
DB_PATH = PUBLIC / "ot_strong.sqlite"
TMP_DIR = ROOT / "scripts" / "_audio_tmp"

AUDIO_LANG = 44
AUDIO_BASE = f"https://www.wordproaudio.net/bibles/app/audio/{AUDIO_LANG}"

# Palavras iniciais do v.1 para ancorar após a introdução
ANCHOR_WORDS_VERSE1 = 3


def strip_marks(text: str) -> str:
    nfd = unicodedata.normalize("NFD", str(text or ""))
    return "".join(ch for ch in nfd if unicodedata.category(ch) != "Mn")


def palavras_he(texto: str) -> list[str]:
    out: list[str] = []
    for parte in str(texto or "").split():
        w = strip_marks(parte.replace("/", "").replace("׃", ""))
        w = re.sub(r"[^\u0590-\u05FF]", "", w)
        if w:
            out.append(w)
    return out


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


def load_audio_16k(path: Path):
    """Carrega MP3 mono 16 kHz sem ffmpeg no PATH (usa imageio-ffmpeg)."""
    import imageio_ffmpeg
    import numpy as np
    import subprocess
    import tempfile

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = tmp.name
    try:
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-i",
                str(path),
                "-ar",
                "16000",
                "-ac",
                "1",
                "-f",
                "wav",
                wav_path,
            ],
            check=True,
            capture_output=True,
        )
        import wave

        with wave.open(wav_path, "rb") as wf:
            frames = wf.readframes(wf.getnframes())
            audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        return audio
    finally:
        Path(wav_path).unlink(missing_ok=True)


# Variantes comuns: MorphHB (bíblico) vs leitor WordProject (hebraico moderno)
GRUPOS_ALIAS = [
    {"אלהים", "אלוהים", "אלוקים"},
    {"השמים", "שמים", "השמיים"},
    {"ברא", "ברה"},
    {"ויאמר", "ויומר", "ויאמר"},
    {"תהו", "תוהו"},
    {"ובהו", "ובוהו"},
    {"וחשך", "וחושך"},
    {"ירא", "ויאר"},
    {"אור", "אור"},
]

_ALIAS_LOOKUP: dict[str, set[str]] = {}
for grupo in GRUPOS_ALIAS:
    uniao = set(grupo)
    for w in grupo:
        _ALIAS_LOOKUP.setdefault(w, set()).update(uniao)


def variantes_palavra(w: str) -> set[str]:
    base = strip_marks(w)
    opts = {base}
    if base in _ALIAS_LOOKUP:
        opts.update(_ALIAS_LOOKUP[base])
    if base.startswith("ו") and len(base) > 1:
        opts.add(base[1:])
    return {x for x in opts if x}


def palavras_fuzzy(a: str, b: str) -> bool:
    if a == b:
        return True
    va = variantes_palavra(a)
    vb = variantes_palavra(b)
    if va.intersection(vb):
        return True
    for aa in va:
        for bb in vb:
            if SequenceMatcher(None, aa, bb).ratio() >= 0.78:
                return True
    return False


def detectar_inicio_versiculo1(
    whisper_words: list[dict],
) -> tuple[int, float, float] | tuple[None, None, None]:
    """
    WordProject: intro «חומשי תורה ספר בראשית» e depois a leitura do v.1.
    Retorna (índice da 1ª palavra do v.1, início v.1 em s, fim da intro em s).
    """
    intro_end = 0.0
    intro_idx_end = -1

    for i, w in enumerate(whisper_words):
        if w["word"] != "חומשי" or i + 3 >= len(whisper_words):
            continue
        seq = [whisper_words[i + j]["word"] for j in range(4)]
        if seq == ["חומשי", "תורה", "ספר", "בראשית"]:
            intro_idx_end = i + 3
            intro_end = float(whisper_words[intro_idx_end]["end"])
            break

    if intro_idx_end >= 0:
        search_from = intro_idx_end + 1
        for i in range(search_from, min(search_from + 10, len(whisper_words))):
            w = whisper_words[i]
            if palavras_fuzzy(w["word"], "ברא"):
                t = float(w["start"])
                print(f"  Intro: 0 – {intro_end:.2f}s | leitura v.1 @ {t:.2f}s ({w['word']})")
                return i, t, intro_end
        if search_from < len(whisper_words):
            w = whisper_words[search_from]
            t = float(w["start"])
            print(f"  Intro: 0 – {intro_end:.2f}s | v.1 @ {t:.2f}s (fallback pós-intro)")
            return search_from, t, intro_end

    # Fallback genérico (capítulos sem intro WordProject)
    for i, w in enumerate(whisper_words):
        if w["word"] != "בראשית":
            continue
        if i > 0 and whisper_words[i - 1]["word"] in ("ספר", "תורה", "חומשי"):
            continue
        if i + 1 < len(whisper_words) and whisper_words[i + 1]["word"] == "בראשית":
            continue
        janela = whisper_words[i : i + 18]
        tem_bara = any(palavras_fuzzy(x["word"], "ברא") for x in janela)
        tem_elohim = any(palavras_fuzzy(x["word"], "אלהים") for x in janela)
        if tem_bara and tem_elohim:
            t = float(w["start"])
            print(f"  Intro detectada: ~0 – {t:.2f}s (antes do v.1)")
            return i, t, t
    return None, None, None


def cache_whisper_path(book_id: int, chapter: int, model_name: str) -> Path:
    return TMP_DIR / f"whisper_{book_id}_{chapter}_{model_name}.json"


def transcrever_whisper(mp3: Path, model_name: str, book_id: int, chapter: int) -> list[dict]:
    cache = cache_whisper_path(book_id, chapter, model_name)
    if cache.exists():
        print(f"Whisper cache: {cache.name}")
        data = json.loads(cache.read_text(encoding="utf-8"))
        words = data.get("words") or []
        print(f"  palavras transcritas: {len(words)}")
        return words

    import whisper

    print(f"Whisper ({model_name})…")
    model = whisper.load_model(model_name)
    audio = load_audio_16k(mp3)
    result = model.transcribe(
        audio,
        language="he",
        word_timestamps=True,
        verbose=False,
    )
    words: list[dict] = []
    for seg in result.get("segments") or []:
        for w in seg.get("words") or []:
            token = strip_marks(str(w.get("word") or ""))
            token = re.sub(r"[^\u0590-\u05FF]", "", token)
            if not token:
                continue
            words.append(
                {
                    "word": token,
                    "start": float(w.get("start") or 0),
                    "end": float(w.get("end") or 0),
                }
            )
    print(f"  palavras transcritas: {len(words)}")
    if words:
        print(f"  1ª palavra @ {words[0]['start']:.2f}s | última @ {words[-1]['end']:.2f}s")
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps({"words": words}, ensure_ascii=False), encoding="utf-8")
    return words


def alinhar_versiculo_sequencial(
    ref_words: list[str],
    whisper_words: list[dict],
    cursor: int,
    min_acertos: int,
) -> dict | None:
    if not ref_words:
        return None
    wi = cursor
    matched: list[int] = []
    for rw in ref_words:
        found = None
        for j in range(wi, min(wi + 14, len(whisper_words))):
            if palavras_fuzzy(rw, whisper_words[j]["word"]):
                found = j
                break
        if found is None:
            continue
        matched.append(found)
        wi = found + 1
    need = min(min_acertos, max(2, len(ref_words) // 2))
    if len(matched) < need:
        return None
    return {
        "start_idx": matched[0],
        "end_idx": matched[-1],
        "hits": len(matched),
        "total_ref": len(ref_words),
        "next_cursor": matched[-1] + 1,
    }


def alinhar_versos(versos: list[dict], whisper_words: list[dict], duracao: float) -> list[dict]:
    raw: list[dict] = []
    cursor = 0
    intro_end = 0.0

    v1_idx, v1_start, intro_end = detectar_inicio_versiculo1(whisper_words)
    if v1_idx is None:
        v1_start = None
        intro_end = 0.0
    else:
        cursor = v1_idx

    for idx, ver in enumerate(versos):
        ref = palavras_he(ver["text"])
        if idx == 0:
            min_acertos = max(3, len(ref) // 2)
        else:
            min_acertos = max(2, len(ref) // 3)

        hit = alinhar_versiculo_sequencial(ref, whisper_words, cursor, min_acertos)
        if hit is None:
            print(f"  AVISO: v.{ver['verse']} sem match ({len(ref)} ref, cursor={cursor})")
            raw.append({"verse": ver["verse"], "text": ver["text"], "hit": None})
            continue

        raw.append({"verse": ver["verse"], "text": ver["text"], "hit": hit})
        cursor = hit["next_cursor"]

    out: list[dict] = []
    for i, row in enumerate(raw):
        ver = row["verse"]
        hit = row["hit"]
        if hit is None:
            if out:
                start = out[-1]["end_sec"]
            else:
                start = intro_end or 0.0
            ref = palavras_he(row["text"])
            frac = len(ref) / max(sum(len(palavras_he(v["text"])) for v in versos), 1)
            end = min(duracao, start + duracao * frac)
            out.append(
                {
                    "verse": ver,
                    "start_sec": round(start, 3),
                    "end_sec": round(end, 3),
                    "text_preview": row["text"][:80],
                    "match": "fallback",
                }
            )
            continue

        start_sec = whisper_words[hit["start_idx"]]["start"]
        end_sec = duracao
        prox = next((r for r in raw[i + 1 :] if r["hit"] is not None), None)
        if prox:
            end_sec = whisper_words[prox["hit"]["start_idx"]]["start"]
        else:
            end_sec = whisper_words[hit["end_idx"]]["end"] + 0.35

        qualidade = "whisper" if hit["hits"] >= max(2, hit["total_ref"] // 3) else "whisper_partial"
        out.append(
            {
                "verse": ver,
                "start_sec": round(start_sec, 3),
                "end_sec": round(max(end_sec, start_sec + 0.25), 3),
                "text_preview": row["text"][:80],
                "match": qualidade,
                "words_matched": hit["hits"],
            }
        )

    if intro_end > 0 and out:
        out[0]["intro_sec"] = round(intro_end, 3)

    return refinar_timestamps_proporcional(out, versos, duracao, intro_end, v1_start_hint=v1_start)


SEC_POR_PALAVRA_MIN = 0.32
SEC_POR_PALAVRA_MAX = 1.2


def _contagem_palavras(versos: list[dict]) -> dict[int, int]:
    return {int(v["verse"]): len(palavras_he(v["text"])) for v in versos}


def _ancora_confiavel(row: dict, wc: int) -> bool:
    match = str(row.get("match") or "")
    if match == "fallback":
        return False
    hits = int(row.get("words_matched") or 0)
    dur = float(row["end_sec"]) - float(row["start_sec"])
    if hits >= max(3, int(wc * 0.45)):
        if dur >= wc * SEC_POR_PALAVRA_MIN * 0.55:
            return True
    return False


def refinar_timestamps_proporcional(
    raw: list[dict], versos: list[dict], duracao: float, intro_end: float, v1_start_hint: float | None = None
) -> list[dict]:
    """
    Redistribui intervalos entre âncoras confiáveis (inícios Whisper bons)
    proporcionalmente ao número de palavras — corrige versos esmagados/esticados.
    """
    if not raw:
        return raw

    wc_map = _contagem_palavras(versos)
    n = len(raw)

    anchors: list[tuple[int, float]] = []
    for i, row in enumerate(raw):
        wc = wc_map.get(int(row["verse"]), 1)
        if _ancora_confiavel(row, wc):
            anchors.append((i, float(row["start_sec"])))

    t0 = float(v1_start_hint) if v1_start_hint and v1_start_hint > 0 else (
        intro_end if intro_end > 0 else float(raw[0]["start_sec"])
    )
    if raw and t0 > float(raw[0]["start_sec"]) + 0.05:
        raw[0] = dict(raw[0])
        raw[0]["start_sec"] = round(t0, 3)
        raw[0]["start_ms"] = int(round(t0 * 1000))
    if not anchors or anchors[0][0] != 0:
        anchors.insert(0, (0, t0))
    else:
        anchors[0] = (0, t0)

    # Remove âncoras fora de ordem ou coladas demais
    limpas: list[tuple[int, float]] = []
    for idx, t in anchors:
        if limpas and t <= limpas[-1][1] + 0.15:
            continue
        limpas.append((idx, t))
    anchors = limpas

    # Garante âncora final (último verso começa antes do fim do áudio)
    if anchors[-1][0] != n - 1:
        last_start = float(raw[-1]["start_sec"])
        if last_start > anchors[-1][1] + 1.0:
            anchors.append((n - 1, last_start))

    result: list[dict | None] = [None] * n

    for seg_i in range(len(anchors)):
        i_start, t_start = anchors[seg_i]
        if seg_i + 1 < len(anchors):
            i_end, t_end = anchors[seg_i + 1]
        else:
            i_end, t_end = n, duracao

        indices = list(range(i_start, i_end))
        if not indices:
            continue

        total_w = sum(wc_map.get(int(raw[j]["verse"]), 1) for j in indices)
        seg_dur = max(0.5, t_end - t_start)
        cursor = t_start

        for j, vi in enumerate(indices):
            row = dict(raw[vi])
            wc = wc_map.get(int(row["verse"]), 1)
            if vi == indices[-1]:
                end_t = t_end
            else:
                share = seg_dur * (wc / total_w) if total_w else seg_dur / len(indices)
                share = max(share, wc * SEC_POR_PALAVRA_MIN)
                end_t = min(t_end, cursor + share)
            row["start_sec"] = round(cursor, 3)
            row["end_sec"] = round(end_t, 3)
            row["start_ms"] = int(round(cursor * 1000))
            row["end_ms"] = int(round(end_t * 1000))
            if row.get("match") != "fallback":
                row["match"] = f"{row.get('match', 'whisper')}_refined"
            result[vi] = row
            cursor = end_t

    for i in range(n):
        if result[i] is None:
            row = dict(raw[i])
            row["start_ms"] = int(round(float(row["start_sec"]) * 1000))
            row["end_ms"] = int(round(float(row["end_sec"]) * 1000))
            result[i] = row

    # Continuidade e limites
    for i in range(1, n):
        prev = result[i - 1]
        cur = result[i]
        if cur["start_sec"] < prev["end_sec"]:
            cur["start_sec"] = prev["end_sec"]
            cur["start_ms"] = int(round(cur["start_sec"] * 1000))
        wc = wc_map.get(int(cur["verse"]), 1)
        min_dur = wc * SEC_POR_PALAVRA_MIN
        max_dur = wc * SEC_POR_PALAVRA_MAX
        dur = cur["end_sec"] - cur["start_sec"]
        if dur < min_dur:
            cur["end_sec"] = round(cur["start_sec"] + min_dur, 3)
            cur["end_ms"] = int(round(cur["end_sec"] * 1000))
        elif dur > max_dur and i < n - 1:
            cur["end_sec"] = round(cur["start_sec"] + max_dur, 3)
            cur["end_ms"] = int(round(cur["end_sec"] * 1000))

    result[-1]["end_sec"] = round(duracao, 3)
    result[-1]["end_ms"] = int(round(duracao * 1000))

    # Linha contínua: cada verso termina onde o próximo começa (sem lacunas na UI/corte)
    for i in range(n - 1):
        nstart = float(result[i + 1]["start_sec"])
        if nstart > float(result[i]["start_sec"]):
            result[i]["end_sec"] = round(nstart, 3)
            result[i]["end_ms"] = int(round(nstart * 1000))

    return result  # type: ignore[return-value]


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    ap = argparse.ArgumentParser()
    ap.add_argument("--book", type=int, default=1)
    ap.add_argument("--chapter", type=int, default=1)
    ap.add_argument("--model", default="small", help="Whisper: tiny, base, small, medium")
    args = ap.parse_args()

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

    whisper_words = transcrever_whisper(mp3, args.model, args.book, args.chapter)
    if not whisper_words:
        print("Whisper não retornou palavras.")
        return 1

    print("Alinhando versículos…")
    timestamps = alinhar_versos(versos, whisper_words, duracao)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cap_key = f"{args.book}:{args.chapter}"
    chapters_path = OUT_DIR / "chapters.json"
    chapters_doc: dict = {"version": 1, "audio_lang": AUDIO_LANG, "chapters": {}}
    if chapters_path.exists():
        try:
            chapters_doc = json.loads(chapters_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass

    intro = timestamps[0].get("intro_sec") if timestamps else None
    matched = sum(1 for t in timestamps if str(t.get("match", "")).startswith("whisper"))
    chapters_doc.setdefault("chapters", {})[cap_key] = {
        "book_id": args.book,
        "chapter": args.chapter,
        "url": url,
        "duration_sec": round(duracao, 3),
        "verse_count": len(versos),
        "method": "whisper_v2_fuzzy",
        "whisper_model": args.model,
        "intro_before_verse1_sec": intro,
        "verses_matched_whisper": matched,
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
                "method": "whisper_v2_fuzzy",
                "intro_before_verse1_sec": intro,
                "verses": timestamps,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"\nGravado: {verses_path} ({matched}/{len(timestamps)} versos com whisper)")
    for v in [1, 2, 3, 26, 31]:
        row = next((x for x in timestamps if x["verse"] == v), None)
        if row:
            print(
                f"  v.{v}: {row['start_sec']:.2f}s – {row['end_sec']:.2f}s "
                f"({row.get('match', '?')})"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
