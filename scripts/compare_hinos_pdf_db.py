"""
Compara títulos do hinário (hinario.db) com o cabeçalho extraído do PDF de cifras.
Executar: python scripts/compare_hinos_pdf_db.py
Requer: PyPDF2, sqlite3
"""
import re
import sqlite3
import unicodedata
from pathlib import Path

from PyPDF2 import PdfReader

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "public" / "hinario.db"
PDF = ROOT / "public" / "hinario-com-cifras.pdf"


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("ñ", "n").replace("Ñ", "n")
    return re.sub(r"\s+", " ", s.lower().strip())


def main() -> None:
    db = sqlite3.connect(DB)
    rows = {}
    for num_str, tit in db.execute("SELECT numero, titulo FROM hinos"):
        m = re.match(r"^(\d+)", str(num_str).strip())
        if m:
            rows[int(m.group(1))] = tit
    db.close()

    r = PdfReader(str(PDF))
    pat = re.compile(
        r"Petrolina\s*-\s*\d+\s+(\d{1,3})\s+([A-ZÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇÑa-z\s\,\;\:\-]+?)\s*\.\s+[A-G]",
        re.IGNORECASE,
    )

    missing = []
    mismatches = []
    for pi in range(len(r.pages)):
        t = r.pages[pi].extract_text() or ""
        m = pat.search(t)
        if not m:
            missing.append(pi + 1)
            continue
        n = int(m.group(1))
        pdf_title = re.sub(r"\s+", " ", m.group(2).strip())
        if n not in rows:
            continue
        db_t = rows[n]
        if norm(db_t) != norm(pdf_title):
            mismatches.append((pi + 1, n, db_t, pdf_title))

    print("Páginas sem cabeçalho no padrão (Petrolina - ... N titulo.):", len(missing))
    print("Divergências título DB vs PDF (mesmo número do hino):", len(mismatches))
    print()
    for pag, n, db_t, pdf_t in mismatches:
        print(f"Página {pag} | Hino {n}")
        print(f"  DB : {db_t}")
        print(f"  PDF: {pdf_t}")
        print(f"  norm(DB): {norm(db_t)}")
        print(f"  norm(PDF): {norm(pdf_t)}")
        print()


if __name__ == "__main__":
    main()
