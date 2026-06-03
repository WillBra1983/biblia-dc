#!/usr/bin/env bash
# Roda build Aeneas via venv (WSL/Linux).
# Uso: bash scripts/build_ot_hebrew_audio_wsl.sh --book 1 --chapter 1
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
VENV="$ROOT/.venv-aeneas"

if [[ ! -x "$VENV/bin/python" ]]; then
  echo "Venv não encontrado. Rode primeiro:"
  echo "  bash scripts/install_aeneas_wsl.sh"
  exit 1
fi

exec "$VENV/bin/python" "$ROOT/scripts/build_ot_hebrew_verse_audio_aeneas.py" "$@"
