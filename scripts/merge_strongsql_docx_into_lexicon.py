#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mescla definicoes de DOCX na base lexicon_ptbr:
- Linhas 1..999: usar StrongSQL.docx
- Linhas 1000..fim: usar StrongSQL_translate.docx
- Mapeamento por codigo vindo de Strong_Abas.docx (evita desalinhamento H/G)
"""

from __future__ import annotations

import re
import shutil
import sqlite3
import time
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def extract_tc_text(tc: ET.Element) -> str:
    # Preserva separacao entre paragrafos dentro da mesma celula do DOCX.
    paras = []
    for p in tc.findall(".//w:p", NS):
        t = "".join((x.text or "") for x in p.findall(".//w:t", NS))
        t = normalize_ws(t)
        if t:
            paras.append(t)
    if paras:
        return normalize_ws(" ".join(paras))
    # Fallback para estruturas sem <w:p>.
    t = "".join((x.text or "") for x in tc.findall(".//w:t", NS))
    return normalize_ws(t)


def read_docx_rows(docx_path: Path) -> list[str]:
    xml_bytes = zipfile.ZipFile(docx_path).read("word/document.xml")
    root = ET.fromstring(xml_bytes)
    rows: list[str] = []
    for tr in root.findall(".//w:tr", NS):
        cells = []
        for tc in tr.findall(".//w:tc", NS):
            text = extract_tc_text(tc)
            if text:
                cells.append(text)
        if not cells:
            continue
        row_text = normalize_ws(" | ".join(cells))
        if row_text:
            rows.append(row_text)
    return rows


def read_strong_abas_codes_with_nonempty_defs(docx_path: Path) -> list[str]:
    xml_bytes = zipfile.ZipFile(docx_path).read("word/document.xml")
    root = ET.fromstring(xml_bytes)
    out: list[str] = []
    for tr in root.findall(".//w:tr", NS):
        cells = []
        for tc in tr.findall(".//w:tc", NS):
            text = extract_tc_text(tc)
            if text:
                cells.append(text)
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


def short_def(definicao: str) -> str:
    d = normalize_ws(definicao)
    if len(d) <= 180:
        return d
    cut = d[:180]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    public_dir = root / "public"
    pointer = public_dir / "lexicon_ptbr_current.txt"
    current_name = pointer.read_text(encoding="utf-8").strip()
    src_db = public_dir / current_name
    if not src_db.exists():
        raise RuntimeError(f"Banco atual nao encontrado: {src_db}")

    strongsql_doc = Path(r"C:\Users\Pr Wilson Lucas\Desktop\StrongSQL.docx")
    translate_doc = Path(r"C:\Users\Pr Wilson Lucas\Downloads\StrongSQL_translate.docx")
    strong_abas_doc = Path(r"C:\Users\Pr Wilson Lucas\Desktop\Strong_Abas.docx")
    if not strongsql_doc.exists() or not translate_doc.exists() or not strong_abas_doc.exists():
        raise RuntimeError("DOCX de entrada nao encontrados.")

    strong_rows = read_docx_rows(strongsql_doc)
    trans_rows = read_docx_rows(translate_doc)
    mapped_codes = read_strong_abas_codes_with_nonempty_defs(strong_abas_doc)
    if len(strong_rows) != len(trans_rows):
        raise RuntimeError(
            f"Quantidade de linhas difere: StrongSQL={len(strong_rows)} x Translate={len(trans_rows)}"
        )
    if len(mapped_codes) != len(strong_rows):
        raise RuntimeError(
            "Quantidade de codigos mapeados difere da quantidade de linhas de definicao: "
            f"codes={len(mapped_codes)} strongsql={len(strong_rows)}"
        )

    out_name = f"lexicon_ptbr_docxmerge_{int(time.time())}.sqlite"
    out_db = public_dir / out_name
    shutil.copy2(src_db, out_db)

    conn = sqlite3.connect(out_db)
    try:
        cur = conn.cursor()
        old_defs = dict(cur.execute("SELECT strong_code, definicao_expandida FROM lexicon_ptbr").fetchall())
        use_count = len(strong_rows)
        switched_to_translate = 0
        kept_strongsql = 0
        unchanged = 0
        split_line = 999  # 1-based

        for i in range(use_count):
            strong_code = mapped_codes[i]
            old_def = old_defs.get(strong_code, "")
            base = normalize_ws(strong_rows[i].replace(" | ", " "))
            tr = normalize_ws(trans_rows[i].replace(" | ", " "))
            if i < split_line:
                chosen = base or tr
                kept_strongsql += 1
            else:
                chosen = tr or base
                switched_to_translate += 1

            if normalize_ws(old_def) == chosen:
                unchanged += 1
            cur.execute(
                """
                UPDATE lexicon_ptbr
                SET definicao_expandida = ?, definicoes_json = ?
                WHERE strong_code = ?
                """,
                (chosen, f'["{short_def(chosen).replace("\"", "\\\"")}"]', strong_code),
            )

        conn.commit()

        report = root / "src" / "data" / "StrongSQL_docx_merge_report.txt"
        report.write_text(
            "\n".join(
                [
                    f"Base antiga: {src_db.name}",
                    f"Base nova: {out_db.name}",
                    f"Rows StrongSQL: {len(strong_rows)}",
                    f"Rows Translate: {len(trans_rows)}",
                    f"Rows usadas no merge: {use_count}",
                    f"Codigos mapeados (Strong_Abas): {len(mapped_codes)}",
                    f"Regra aplicada: 1..{split_line} = StrongSQL; {split_line+1}..fim = Translate",
                    f"Usou StrongSQL (linhas iniciais): {kept_strongsql}",
                    f"Usou Translate (demais linhas): {switched_to_translate}",
                    f"Linhas sem alteracao vs base antiga: {unchanged}",
                    "Rows nao cobertas: 0 (merge por codigo)",
                ]
            ),
            encoding="utf-8",
        )
    finally:
        conn.close()

    pointer.write_text(out_name, encoding="utf-8")
    print(f"OK: {out_name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

