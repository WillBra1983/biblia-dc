#!/usr/bin/env python3
"""
Gera MP3 de pronúncia Strong.

Transliteração acentuada + pt-BR quando seguro (Christós, thélêma).
Casos problemáticos no pt-BR (theós→"teóis", Iesous→/z/) usam en-US sem acentos.
No pt-BR, s intervocálico vira ss.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sqlite3
import sys
import time
import unicodedata
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUT_DIR = PUBLIC / "sounds" / "strong-pron"
MANIFEST_PATH = OUT_DIR / "manifest.json"

MAX_CHARS = 120

VOZ_PT = "pt-BR-FranciscaNeural"
VOZ_EN = "en-US-AndrewNeural"
VOZ_GREGO = "el-GR-NestorasNeural"

MACRON_PARA_FALA = {
    "ā": "á",
    "ē": "ê",
    "ī": "í",
    "ō": "ó",
    "ū": "ú",
    "ă": "ă",
    "ĕ": "é",
    "ŏ": "ó",
    "ŭ": "u",
}


def transliteracao_para_fala(translit: str) -> str:
    """Mantém Christós, thélēma — não remove acentos (ó, ê)."""
    s = str(translit or "").replace("'", "").replace("ʼ", "").replace("`", "").replace("´", "")
    s = re.sub(r"[–—]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    if not s:
        return ""
    s = "".join(MACRON_PARA_FALA.get(ch, ch) for ch in s)
    return unicodedata.normalize("NFC", s)[:MAX_CHARS]


def precisa_voz_en_us(texto: str) -> bool:
    t = str(texto or "")
    if re.match(r"^th.+ós$", t, re.I):
        return True
    if re.search(r"[aeiouáéíóúâêôãõàèìòùêîûô]s[aeiouáéíóúâêôãõàèìòùêîûô]", t, re.I):
        return True
    if re.search(r"sous$", t, re.I):
        return True
    return False


def ajustar_intervocalic_s_pt_br(texto: str) -> str:
    return re.sub(
        r"(?<=[aeiouáéíóúâêôãõàèìòùêîûôAEIOU])s(?=[aeiouáéíóúâêôãõàèìòùêîûôAEIOU])",
        "ss",
        str(texto or ""),
    )


def latin_para_en_us(texto: str) -> str:
    nfd = unicodedata.normalize("NFD", str(texto or ""))
    s = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return unicodedata.normalize("NFC", s).strip()[:MAX_CHARS]


def escolher_voz(translit: str, eh_grego: bool) -> str:
    if precisa_voz_en_us(translit):
        return VOZ_EN
    if re.search(r"[óáéíúâêôãõàèìòùăēīōū]", translit, re.I) or eh_grego:
        return VOZ_PT
    return VOZ_EN


def preparar_texto_e_voz(translit: str, eh_grego: bool) -> tuple[str, str]:
    base = transliteracao_para_fala(translit)
    if not latina_utilizavel(base):
        return "", VOZ_EN
    voice = escolher_voz(base, eh_grego)
    if voice == VOZ_EN:
        return latin_para_en_us(base), VOZ_EN
    return ajustar_intervocalic_s_pt_br(base), VOZ_PT


def preparar_fala_grego(unicode: str, translit: str, pronunciation: str) -> tuple[str, str]:
    speak, voice = preparar_texto_e_voz(translit, True)
    if speak:
        return speak, voice
    guia = guia_fonetica_para_fala(pronunciation)
    if guia:
        return guia, VOZ_EN
    mono = grego_monotonic(limpar_pontuacao(unicode))
    if len(mono) >= 2:
        return mono, VOZ_GREGO
    return speak or guia or mono, VOZ_EN


def preparar_fala_hebraico(headword: str, pron: str, xlit: str) -> tuple[str, str]:
    speak, voice = preparar_texto_e_voz(xlit, False)
    if speak:
        return speak, voice
    guia = guia_fonetica_para_fala(pron)
    if guia:
        return guia, VOZ_EN
    mono = grego_monotonic(limpar_pontuacao(headword))
    return mono or guia, VOZ_EN


def grego_monotonic(texto: str) -> str:
    nfd = unicodedata.normalize("NFD", str(texto or ""))
    stripped = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return unicodedata.normalize("NFC", stripped).strip()


def latina_utilizavel(texto: str) -> bool:
    t = str(texto or "").strip()
    return len(t) >= 2 and any(c.isalpha() for c in t)


def guia_fonetica_para_fala(pronuncia: str) -> str:
    raw = str(pronuncia or "").strip()
    if not raw:
        return ""
    s = raw.replace("'", "").replace("ʼ", "").replace("`", "")
    s = re.sub(r"[–—]", " ", s)
    s = s.replace("-", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s[:MAX_CHARS]


def limpar_pontuacao(texto: str) -> str:
    s = str(texto or "").strip()
    s = re.sub(
        r"^[\u2018\u2019\u05F3'`\"\u00AB\u1FBF\u1FFE\u0313]+|[\u2018\u2019\u05F3'`\"\u00BB\u1FBF\u1FFE]+",
        "",
        s,
    )
    s = re.sub(r"[.,;:!?…]+$", "", s)
    return s.strip()


@dataclass
class Entrada:
    strong: str
    speak: str
    voice: str
    origem: str


def carregar_entradas(only: str | None) -> list[Entrada]:
    out: list[Entrada] = []

    nt_path = PUBLIC / "nt_prova.sqlite"
    if nt_path.exists() and only in (None, "G"):
        c = sqlite3.connect(nt_path)
        rows = c.execute(
            """
            SELECT strong, greek_unicode, greek_translit, pronunciation
            FROM strong_greek
            WHERE greek_unicode IS NOT NULL AND trim(greek_unicode) != ''
            ORDER BY strong
            """
        ).fetchall()
        c.close()
        for strong, uni, translit, pron in rows:
            speak, voice = preparar_fala_grego(uni, translit or "", pron or "")
            if speak:
                origem = "transliteracao_acentuada" if voice == VOZ_PT else (
                    "guia_fonetica" if voice == VOZ_EN else "grego_monotonic"
                )
                out.append(Entrada(str(strong).upper(), speak, voice, origem))

    ot_path = PUBLIC / "ot_strong.sqlite"
    if ot_path.exists() and only in (None, "H"):
        c = sqlite3.connect(ot_path)
        rows = c.execute(
            """
            SELECT strong_code, headword, xlit, pron
            FROM strong_hebrew
            WHERE headword IS NOT NULL AND trim(headword) != ''
            ORDER BY strong_code
            """
        ).fetchall()
        c.close()
        for strong, headword, xlit, pron in rows:
            speak, voice = preparar_fala_hebraico(headword, pron or "", xlit or "")
            if speak:
                out.append(Entrada(str(strong).upper(), speak, voice, "transliteracao"))

    return out


async def gerar_um(entrada: Entrada, out_path: Path, sem: asyncio.Semaphore) -> tuple[str, str | None]:
    async with sem:
        try:
            import edge_tts

            communicate = edge_tts.Communicate(entrada.speak, entrada.voice)
            await communicate.save(str(out_path))
            if not out_path.exists() or out_path.stat().st_size < 200:
                return entrada.strong, "arquivo vazio ou muito pequeno"
            return entrada.strong, None
        except Exception as e:
            return entrada.strong, str(e)


async def rodar_lote(
    entradas: list[Entrada],
    *,
    force: bool,
    workers: int,
    limit: int | None,
) -> dict:
    import edge_tts  # noqa: F401

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if limit:
        entradas = entradas[:limit]

    pendentes: list[Entrada] = []
    for e in entradas:
        dest = OUT_DIR / f"{e.strong}.mp3"
        if force or not dest.exists():
            pendentes.append(e)

    total = len(entradas)
    skip = total - len(pendentes)
    print(f"Total lémas: {total} | já existentes: {skip} | a gerar: {len(pendentes)}")

    if not pendentes:
        return {"ok": total, "skip": skip, "fail": 0, "errors": []}

    sem = asyncio.Semaphore(max(1, workers))
    erros: list[dict] = []
    ok = 0
    t0 = time.time()
    batch_size = workers * 4

    for i in range(0, len(pendentes), batch_size):
        chunk = pendentes[i : i + batch_size]
        tasks = [gerar_um(e, OUT_DIR / f"{e.strong}.mp3", sem) for e in chunk]
        results = await asyncio.gather(*tasks)
        for strong, err in results:
            if err:
                erros.append({"strong": strong, "error": err})
            else:
                ok += 1

        done = min(i + batch_size, len(pendentes))
        elapsed = time.time() - t0
        rate = done / elapsed if elapsed > 0 else 0
        eta = (len(pendentes) - done) / rate if rate > 0 else 0
        print(
            f"  [{done}/{len(pendentes)}] ok={ok} falhas={len(erros)} "
            f"({rate:.1f}/s, ETA {eta/60:.0f} min)",
            flush=True,
        )

    manifest = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "mode": "transliteracao_acentuada_pt_br",
        "voices": {"grego_translit": VOZ_PT, "phonetic_en": VOZ_EN, "grego_mono": VOZ_GREGO},
        "total_entries": total,
        "skipped_existing": skip,
        "generated_ok": ok,
        "failed": len(erros),
        "errors": erros[:500],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"ok": ok + skip, "skip": skip, "fail": len(erros), "errors": erros}


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="Gera MP3 Strong (monotônico / guia fonética).")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--only", choices=["G", "H"], default=None)
    parser.add_argument("--strongs", nargs="+", default=None)
    args = parser.parse_args()

    try:
        import edge_tts  # noqa: F401
    except ImportError:
        print("Instale: pip install edge-tts")
        return 1

    entradas = carregar_entradas(args.only)
    if args.strongs:
        want = {s.strip().upper() for s in args.strongs}
        entradas = [e for e in entradas if e.strong in want]

    if not entradas:
        print("Nenhuma entrada encontrada.")
        return 1

    print(f"Transliteração acentuada (Christós, thélêma) + {VOZ_PT}")
    print(f"Saída: {OUT_DIR}")

    stats = asyncio.run(
        rodar_lote(entradas, force=args.force, workers=args.workers, limit=args.limit)
    )
    print(f"\nConcluído: {stats['ok']} ok, {stats['fail']} falhas.")
    return 0 if stats["fail"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
