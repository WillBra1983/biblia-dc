#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera uma base PT-BR local para Strong (AT/NT), reduzindo dependencia de traducao em tempo real.

Saida:
  public/lexicon_ptbr.sqlite
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import time
import urllib.parse
import urllib.request
from pathlib import Path


def load_cache(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_cache(path: Path, cache: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def post_replace_pt(text: str) -> str:
    out = text
    fixes = {
        "i.e.": "isto é",
        "e.g.": "por exemplo",
        "Partícula": "Particula",
        "partícula": "particula",
    }
    for a, b in fixes.items():
        out = out.replace(a, b)
    return out.strip()


def translate_ptbr(text: str, cache: dict[str, str], sleep_ms: int = 0) -> str:
    src = str(text or "").strip()
    if not src:
        return ""
    key = f"en|pt-BR|{src}"
    if key in cache:
        return cache[key]
    url = (
        "https://api.mymemory.translated.net/get?"
        + urllib.parse.urlencode({"q": src[:450], "langpair": "en|pt-BR"})
    )
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            translated = str(data.get("responseData", {}).get("translatedText", "")).strip() or src
    except Exception:
        translated = src
        translated = post_replace_pt(translated)
    cache[key] = translated
    if sleep_ms > 0:
        time.sleep(sleep_ms / 1000)
    return translated


def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        PRAGMA journal_mode = WAL;
        DROP TABLE IF EXISTS lexicon_ptbr;

        CREATE TABLE lexicon_ptbr (
          strong_code TEXT PRIMARY KEY,
          palavra TEXT,
          transliteracao TEXT,
          idioma TEXT,
          definicoes_json TEXT,
          definicao_expandida TEXT,
          categoria TEXT,
          raiz TEXT,
          fonte TEXT
        );
        """
    )
    conn.commit()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max", type=int, default=0, help="Limitar quantidade de entradas (0 = todas)")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    ot_db = root / "public" / "ot_strong.sqlite"
    nt_db = root / "public" / "nt_prova.sqlite"
    out_db = root / "public" / f"lexicon_ptbr_{int(time.time())}.sqlite"
    pointer_file = root / "public" / "lexicon_ptbr_current.txt"
    cache_file = root / "scripts" / ".cache" / "lexicon_ptbr_translate_cache.json"

    if not ot_db.exists():
        raise RuntimeError(f"Banco ausente: {ot_db}")
    if not nt_db.exists():
        raise RuntimeError(f"Banco ausente: {nt_db}")
    if out_db.exists():
        out_db.unlink()

    cache = load_cache(cache_file)
    out = sqlite3.connect(out_db)
    init_schema(out)

    rows = []
    processed = 0
    flush_every = 200
    ot = sqlite3.connect(ot_db)
    nt = sqlite3.connect(nt_db)
    try:
        c_ot = ot.cursor()
        c_nt = nt.cursor()
        for strong, head, xlit, pos, source, meaning, usage in c_ot.execute(
            "SELECT strong_code, headword, xlit, pos, source, meaning, usage FROM strong_hebrew ORDER BY strong_code"
        ):
            definicao_expandida_en = (meaning or usage or source or "").strip()
            if source and meaning and source.rstrip().endswith(("i.e.", "e.g.", "i.e", "e.g")):
                definicao_expandida_en = f"{source.strip()} {meaning.strip()}".strip()
            definicao_pt = translate_ptbr(definicao_expandida_en, cache, sleep_ms=25)
            rows.append(
                (
                    strong,
                    head or "",
                    xlit or "",
                    "hebraico",
                    json.dumps([definicao_pt[:180]], ensure_ascii=False),
                    definicao_pt,
                    pos or "",
                    "",
                    "ot_strong",
                )
            )
            processed += 1
            if processed % flush_every == 0:
                out.executemany(
                    """
                    INSERT OR REPLACE INTO lexicon_ptbr (
                      strong_code, palavra, transliteracao, idioma, definicoes_json, definicao_expandida, categoria, raiz, fonte
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    rows,
                )
                out.commit()
                rows = []
                save_cache(cache_file, cache)
                print(f"Progresso: {processed} entradas", flush=True)
            if args.max and processed >= args.max:
                break

        if not args.max or processed < args.max:
            for strong, uni, trans, definition in c_nt.execute(
                "SELECT strong, greek_unicode, greek_translit, definition FROM strong_greek ORDER BY strong"
            ):
                definicao_en = (definition or "").strip()
                definicao_pt = translate_ptbr(definicao_en, cache, sleep_ms=25)
                rows.append(
                    (
                        strong,
                        uni or "",
                        trans or "",
                        "grego",
                        json.dumps([definicao_pt[:180]], ensure_ascii=False),
                        definicao_pt,
                        "",
                        "",
                        "nt_prova",
                    )
                )
                processed += 1
                if processed % flush_every == 0:
                    out.executemany(
                        """
                        INSERT OR REPLACE INTO lexicon_ptbr (
                          strong_code, palavra, transliteracao, idioma, definicoes_json, definicao_expandida, categoria, raiz, fonte
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        rows,
                    )
                    out.commit()
                    rows = []
                    save_cache(cache_file, cache)
                    print(f"Progresso: {processed} entradas", flush=True)
                if args.max and processed >= args.max:
                    break
    finally:
        ot.close()
        nt.close()

    if rows:
        out.executemany(
            """
            INSERT OR REPLACE INTO lexicon_ptbr (
              strong_code, palavra, transliteracao, idioma, definicoes_json, definicao_expandida, categoria, raiz, fonte
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        out.commit()
    out.close()
    save_cache(cache_file, cache)
    pointer_file.write_text(out_db.name, encoding="utf-8")
    with sqlite3.connect(out_db) as check_db:
        total_rows = check_db.execute("SELECT COUNT(*) FROM lexicon_ptbr").fetchone()[0]
    print(f"Concluido: {total_rows} entradas PT-BR em {out_db}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
