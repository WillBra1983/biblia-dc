#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import re
import sqlite3
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def read_docx_rows(docx_path: Path) -> list[str]:
    root = ET.fromstring(zipfile.ZipFile(docx_path).read("word/document.xml"))
    out = []
    for tr in root.findall(".//w:tr", NS):
        cells = []
        for tc in tr.findall(".//w:tc", NS):
            txt = "".join(t.text or "" for t in tc.findall(".//w:t", NS))
            txt = normalize_ws(txt)
            if txt:
                cells.append(txt)
        if cells:
            out.append(normalize_ws(" | ".join(cells)))
    return out


def read_codes_nonempty(strong_abas_doc: Path) -> list[str]:
    root = ET.fromstring(zipfile.ZipFile(strong_abas_doc).read("word/document.xml"))
    out: list[str] = []
    for tr in root.findall(".//w:tr", NS):
        cells = []
        for tc in tr.findall(".//w:tc", NS):
            txt = "".join(t.text or "" for t in tc.findall(".//w:t", NS))
            txt = normalize_ws(txt)
            if txt:
                cells.append(txt)
        if not cells:
            continue
        m = re.search(r"\b[HG]\d+\b", cells[0])
        if not m:
            continue
        code = m.group(0)
        last = cells[-1] if cells else ""
        if last and last not in {"[]", "[ ]", "[\"\"]"}:
            out.append(code)
    return out


def is_english_heavy(text: str) -> bool:
    t = f" {normalize_ws(text).lower()} "
    if not t.strip():
        return False
    en_words = re.findall(
        r"\b(the|and|of|to|with|from|properly|primitive|root|figuratively|"
        r"implication|an|a|israelite|edomite|place|city|prophet|father|son|"
        r"jewess|palace|temple|muttering|thunder|vizier|footstool)\b",
        t,
    )
    pt_words = re.findall(
        r"\b(de|do|da|dos|das|para|com|em|por|que|não|uma|um|"
        r"figurado|propriamente|implicação|lugar|cidade|profeta|filho|pai|"
        r"palácio|templo)\b",
        t,
    )
    return len(en_words) >= 2 and len(en_words) > len(pt_words)


def short_json(text: str) -> str:
    t = normalize_ws(text)
    if len(t) > 180:
        t = t[:180].rsplit(" ", 1)[0]
    return json.dumps([t], ensure_ascii=False)


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    public = root / "public"
    ptr = public / "lexicon_ptbr_current.txt"
    db_name = ptr.read_text(encoding="utf-8").strip()
    db_path = public / db_name

    strong_abas_doc = Path(r"C:\Users\Pr Wilson Lucas\Desktop\Strong_Abas.docx")
    tr_doc = Path(r"C:\Users\Pr Wilson Lucas\Downloads\StrongSQL_translate.docx")

    codes = read_codes_nonempty(strong_abas_doc)
    tr_rows = read_docx_rows(tr_doc)
    if len(codes) != len(tr_rows):
        raise RuntimeError(f"Tamanho diferente: codes={len(codes)} tr_rows={len(tr_rows)}")

    code_to_tr = {codes[i]: normalize_ws(tr_rows[i].replace(" | ", " ")) for i in range(len(codes))}

    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        rows = cur.execute("SELECT strong_code, definicao_expandida FROM lexicon_ptbr").fetchall()
        changed = 0
        checked = 0
        for code, definition in rows:
            d = normalize_ws(definition)
            if not d:
                continue
            checked += 1
            if not is_english_heavy(d):
                continue
            repl = code_to_tr.get(code, "")
            if not repl:
                continue
            if normalize_ws(repl) == d:
                continue
            cur.execute(
                """
                UPDATE lexicon_ptbr
                SET definicao_expandida = ?, definicoes_json = ?
                WHERE strong_code = ?
                """,
                (repl, short_json(repl), code),
            )
            changed += 1
        conn.commit()
        report = root / "src" / "data" / "StrongSQL_translate_fallback_report.txt"
        report.write_text(
            "\n".join(
                [
                    f"DB ativa: {db_name}",
                    f"Rows avaliadas: {checked}",
                    f"Rows atualizadas por fallback translate: {changed}",
                ]
            ),
            encoding="utf-8",
        )
        print(f"updated={changed}")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

