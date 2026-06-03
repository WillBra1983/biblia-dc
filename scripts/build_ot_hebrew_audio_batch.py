#!/usr/bin/env python3
"""Gera índices de áudio hebraico OT em lote (Whisper + refinamento proporcional)."""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WHISPER = ROOT / "scripts" / "build_ot_hebrew_verse_audio_whisper.py"
AENEAS = ROOT / "scripts" / "build_ot_hebrew_verse_audio_aeneas.py"

# Livro 1 = Gênesis (capítulos piloto)
GENESIS_CAPS = list(range(1, 51))


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    ap = argparse.ArgumentParser()
    ap.add_argument("--book", type=int, default=1)
    ap.add_argument("--from-chapter", type=int, default=1)
    ap.add_argument("--to-chapter", type=int, default=5)
    ap.add_argument("--model", default="small")
    ap.add_argument("--method", choices=("whisper", "aeneas"), default="whisper")
    args = ap.parse_args()

    script = AENEAS if args.method == "aeneas" else WHISPER
    caps = [c for c in GENESIS_CAPS if args.from_chapter <= c <= args.to_chapter]

    for cap in caps:
        print(f"\n=== Livro {args.book} cap. {cap} ===")
        cmd = [sys.executable, str(script), "--book", str(args.book), "--chapter", str(cap)]
        if args.method == "whisper":
            cmd.extend(["--model", args.model])
        rc = subprocess.call(cmd)
        if rc != 0:
            print(f"Falha no capítulo {cap} (código {rc})")
            return rc

    print("\nLote concluído.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
