#!/usr/bin/env bash
# Instala Aeneas num venv (evita PEP 668 no Ubuntu/WSL).
# Python 3.12+: usa py3-aeneas ou build sem isolamento + numpy<2.
# Uso: bash scripts/install_aeneas_wsl.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
VENV="$ROOT/.venv-aeneas"

echo "==> Projeto: $ROOT"
PYVER="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
echo "==> Python do sistema: $PYVER"

if ! command -v python3 >/dev/null; then
  echo "python3 não encontrado."
  exit 1
fi

echo "==> Dependências do sistema (espeak-ng com he, ffmpeg)…"
sudo apt-get update -qq
sudo apt-get install -y espeak-ng espeak-ng-data libespeak-dev ffmpeg \
  python3-venv python3-dev build-essential

if [[ -d "$VENV" ]] && ! "$VENV/bin/python" -c "import aeneas" 2>/dev/null; then
  echo "==> Removendo venv incompleto (.venv-aeneas)…"
  rm -rf "$VENV"
fi

if [[ ! -d "$VENV" ]]; then
  echo "==> Criando venv em .venv-aeneas …"
  python3 -m venv "$VENV"
fi

# shellcheck disable=SC1091
source "$VENV/bin/activate"

pip install --upgrade pip setuptools wheel

instalar_aeneas() {
  python -c "import aeneas" 2>/dev/null
}

patch_wavfile_numpy() {
  python -c "
import pathlib
import aeneas
root = pathlib.Path(aeneas.__file__).resolve().parent
path = root / 'audiofile' / 'wavfile.py'
if path.exists():
    text = path.read_text(encoding='utf-8')
    if 'numpy.fromstring' in text:
        path.write_text(text.replace('numpy.fromstring', 'numpy.frombuffer'), encoding='utf-8')
        print('Patch wavfile:', path)
"
}

echo "==> Instalando dependências Python…"

# numpy<2 antes de qualquer pacote aeneas (evita numpy 2.x e erro de build)
pip install "numpy>=1.26,<2"

# 1) Fork para Python 3 moderno (sem puxar numpy 2 de novo)
if pip install "py3-aeneas>=1.1.0" --no-deps \
  && pip install "BeautifulSoup4>=4.5.1" "lxml>=3.6.0" \
  && instalar_aeneas; then
  echo "==> Instalado via py3-aeneas"
else
  echo "==> py3-aeneas falhou; tentando aeneas clássico…"
  pip uninstall -y aeneas py3-aeneas 2>/dev/null || true
  pip install "numpy>=1.26,<2"
  if pip install --no-build-isolation "aeneas==1.7.3.0"; then
    echo "==> Instalado via aeneas (no-build-isolation)"
  else
    echo ""
    echo "FALHA: aeneas não compila neste Python ($PYVER)."
    echo "Opções:"
    echo "  1) Python 3.11: sudo apt install python3.11 python3.11-venv"
    echo "     python3.11 -m venv .venv-aeneas && bash scripts/install_aeneas_wsl.sh"
    echo "  2) Continuar só com Whisper (já funciona em Gn 1)."
    exit 1
  fi
fi

patch_wavfile_numpy || true

echo "==> Dependências dos scripts de áudio (requests, mutagen)…"
pip install requests mutagen

echo ""
echo "==> Verificando instalação…"
python -c "import aeneas; from aeneas.executetask import ExecuteTask; print('aeneas OK')"
python "$ROOT/scripts/build_ot_hebrew_verse_audio_aeneas.py" --help >/dev/null 2>&1 || true

echo ""
echo "==> Voz hebraica no eSpeak-ng:"
if espeak-ng --voices 2>/dev/null | grep -q "sem/he"; then
  echo "  OK — voz he (Hebrew) encontrada"
else
  echo "  AVISO — voz he não listada; Aeneas pode falhar. Instale espeak-ng-data."
fi

echo ""
echo "OK. Para gerar alinhamento:"
echo "  bash scripts/build_ot_hebrew_audio_wsl.sh --book 1 --chapter 1"
