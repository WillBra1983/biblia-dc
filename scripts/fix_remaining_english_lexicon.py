#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import re
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


def normalize_ws(t: str) -> str:
    return re.sub(r"\s+", " ", str(t or "")).strip()


def is_english_heavy(text: str) -> bool:
    t = f" {normalize_ws(text).lower()} "
    if not t.strip():
        return False
    en_markers = [
        " the ", " and ", " properly ", " primitive ", " root ", " by implication ",
        " figuratively ", " from ", " with ", " as ", " to ", " of ", " a ", " an ",
        " king ", " place ", " city ", " prophet ", " father ", " son ", " house ",
    ]
    pt_markers = [
        " de ", " do ", " da ", " dos ", " das ", " para ", " com ", " que ", " não ",
        " uma ", " um ", " isto é ", " por implicação ", " figuradamente ", " palavra ",
        " rei ", " lugar ", " profeta ", " filho ", " casa ",
    ]
    en_score = sum(1 for m in en_markers if m in t)
    pt_score = sum(1 for m in pt_markers if m in t)
    return en_score >= 2 and en_score > pt_score


def translate_long_en_to_pt(text: str, cache: dict[str, str]) -> str:
    src = normalize_ws(text)
    if not src:
        return ""
    key = f"en|pt-BR|{src}"
    if key in cache:
        return cache[key]
    parts = [src[i : i + 420] for i in range(0, len(src), 420)]
    out = []
    for p in parts:
        pkey = f"en|pt-BR|{p}"
        if pkey in cache:
            out.append(cache[pkey])
            continue
        url = "https://api.mymemory.translated.net/get?" + urllib.parse.urlencode(
            {"q": p, "langpair": "en|pt-BR"}
        )
        try:
            with urllib.request.urlopen(url, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                tr = normalize_ws(data.get("responseData", {}).get("translatedText", "")) or p
        except Exception:
            tr = p
        cache[pkey] = tr
        out.append(tr)
        time.sleep(0.08)
    final = normalize_ws(" ".join(out))
    cache[key] = final
    return final


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    public = root / "public"
    ptr = public / "lexicon_ptbr_current.txt"
    db_name = ptr.read_text(encoding="utf-8").strip()
    db_path = public / db_name
    cache_path = root / "scripts" / ".cache" / "fix_remaining_english_cache.json"
    cache = load_cache(cache_path)

    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        rows = cur.execute(
            "SELECT strong_code, definicao_expandida FROM lexicon_ptbr"
        ).fetchall()
        target = [(c, d or "") for c, d in rows if is_english_heavy(d or "")]
        print(f"alvos_para_corrigir: {len(target)}")
        fixed = 0
        for idx, (code, d) in enumerate(target, start=1):
            tr = translate_long_en_to_pt(d, cache)
            if normalize_ws(tr) and normalize_ws(tr) != normalize_ws(d):
                short = normalize_ws(tr)
                if len(short) > 180:
                    short = short[:180].rsplit(" ", 1)[0]
                cur.execute(
                    """
                    UPDATE lexicon_ptbr
                    SET definicao_expandida = ?, definicoes_json = ?
                    WHERE strong_code = ?
                    """,
                    (tr, json.dumps([short], ensure_ascii=False), code),
                )
                fixed += 1
            if idx % 100 == 0:
                conn.commit()
                save_cache(cache_path, cache)
                print(f"progresso: {idx}/{len(target)}")
        conn.commit()
        save_cache(cache_path, cache)
        print(f"corrigidas: {fixed}")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

