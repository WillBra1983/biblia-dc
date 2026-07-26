#!/usr/bin/env python3
"""Executa invariantes bloqueantes sobre a conversao completa do hinario."""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sqlite3
import unicodedata
from collections import Counter
from pathlib import Path


VARIANTS = {"110-A", "237-A", "281-A", "325-A", "354-A", "400-A", "amem-triplice"}
NOTE_VALUES = {"C": 0, "C#": 1, "DB": 1, "D": 2, "D#": 3, "EB": 3, "E": 4, "F": 5,
               "F#": 6, "GB": 6, "G": 7, "G#": 8, "AB": 8, "A": 9, "A#": 10, "BB": 10, "B": 11}


def add(blockers: list[dict], code: str, hymn_id: str, detail: str) -> None:
    blockers.append({"codigo": code, "hino": hymn_id, "detalhe": detail})


def comparable_text(value: str) -> str:
    value = re.sub(r"(?i)^\s*(estrofe\s+\d+|coro|estribilho)\s*:\s*", "", value)
    value = re.sub(r"(?i)\(\s*bis\s*\)|\b\d+\s*[ªa]?\s*vez\b", "", value)
    value = unicodedata.normalize("NFKD", value.casefold())
    value = "".join(char for char in value if not unicodedata.combining(char))
    return "".join(char for char in value if char.isalnum())


def meaningful_lines(value: str) -> list[str]:
    ignored = {"louvor", "declaracao", "oracao", "coro", "estribilho"}
    result = []
    for line in value.splitlines():
        compact = comparable_text(line)
        if len(compact) >= 4 and compact not in ignored:
            result.append(compact)
    return result


def chord_root(value: str) -> tuple[int | None, int | None, str]:
    match = re.fullmatch(r"([A-G](?:#|b)?)(.*?)(?:/([A-G](?:#|b)?))?", value, re.I)
    if not match:
        return None, None, ""
    root, suffix, bass = match.groups()
    return NOTE_VALUES.get(root.upper()), NOTE_VALUES.get(bass.upper()) if bass else None, suffix


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("output/hinario-cifras-experimento/hinos-completos.json"))
    parser.add_argument("--output", type=Path, default=Path("output/hinario-cifras-experimento/auditoria-completa.json"))
    parser.add_argument("--lyrics-db", type=Path, default=Path("public/hinario.db"))
    args = parser.parse_args()
    data = json.loads(args.input.read_text(encoding="utf-8"))
    hymns = data["hinos"]
    blockers: list[dict] = []
    corrections = []
    reference_differences = []

    expected = {str(number) for number in range(1, 401)} | VARIANTS
    ids = [item["id"] for item in hymns]
    by_id = {item["id"]: item for item in hymns}
    for missing in sorted(expected - set(ids)):
        add(blockers, "id_ausente", missing, "Item esperado nao encontrado.")
    for extra in sorted(set(ids) - expected):
        add(blockers, "id_inesperado", extra, "Item nao previsto no mapa editorial.")
    for hymn_id, count in Counter(ids).items():
        if count != 1:
            add(blockers, "id_duplicado", hymn_id, f"Encontrado {count} vezes.")

    for hymn in hymns:
        hymn_id = hymn["id"]
        for warning in hymn["avisos"]:
            add(blockers, "aviso_extracao", hymn_id, warning)
        if hymn["linhas_fonte_total"] != hymn["linhas_estruturadas_total"]:
            add(blockers, "cobertura_linhas", hymn_id, f"Fonte={hymn['linhas_fonte_total']}; estruturadas={hymn['linhas_estruturadas_total']}.")
        if len(hymn["fontes"]) != len(hymn.get("imagens_fonte", [])):
            add(blockers, "recorte_ausente", hymn_id, f"Colunas={len(hymn['fontes'])}; recortes={len(hymn.get('imagens_fonte', []))}.")
        for image_path in hymn.get("imagens_fonte", []):
            absolute_image = args.input.parent / image_path
            if not absolute_image.exists() or absolute_image.stat().st_size < 1000:
                add(blockers, "arquivo_de_recorte_invalido", hymn_id, image_path)
        if not hymn["tom_original"]:
            add(blockers, "tom_ausente", hymn_id, "Tom original nao definido.")
        original_chords = re.findall(r"\[([^\]]+)\]", hymn["chordpro"])
        transposed_chords = re.findall(r"\[([^\]]+)\]", hymn["chordpro_teste_mais_2"])
        if len(original_chords) != len(transposed_chords):
            add(blockers, "transposicao_perdeu_cifras", hymn_id, f"Original={len(original_chords)}; transposto={len(transposed_chords)}.")
        for original, transposed in zip(original_chords, transposed_chords):
            original_root, original_bass, original_suffix = chord_root(original)
            transposed_root, transposed_bass, transposed_suffix = chord_root(transposed)
            if original_root is None or transposed_root is None:
                add(blockers, "cifra_invalida", hymn_id, f"{original} -> {transposed}")
                continue
            if transposed_root != (original_root + 2) % 12 or transposed_suffix != original_suffix:
                add(blockers, "transposicao_incorreta", hymn_id, f"{original} -> {transposed}")
            if original_bass is not None and transposed_bass != (original_bass + 2) % 12:
                add(blockers, "baixo_transposto_incorretamente", hymn_id, f"{original} -> {transposed}")

        chordpro_without_markup = re.sub(r"\{comment:[^}]*\}|\[[^\]]+\]", "", hymn["chordpro"])
        chordpro_compact = comparable_text(chordpro_without_markup)

        for line in hymn["linhas"]:
            if line.get("cifras") is not None:
                details = line.get("cifras_detalhadas", [])
                if len(details) != len(line["cifras"]):
                    add(blockers, "detalhes_de_cifras", hymn_id, f"Cifras={len(line['cifras'])}; detalhes={len(details)} em p{line['pagina']}.")
                if any(item["x"] < 0 for item in details):
                    add(blockers, "coordenada_de_cifra", hymn_id, f"Coordenada negativa em p{line['pagina']}.")
                source_chords = line.get("cifras_fonte", "")
                if re.search(r"(?i)vez|bis|\bv\.", source_chords) and not line.get("anotacao"):
                    add(blockers, "repeticao_sem_anotacao", hymn_id, source_chords)
                if "(" in source_chords and ")" in source_chords and not any(item["alternativa"] for item in details):
                    add(blockers, "alternativa_nao_mapeada", hymn_id, source_chords)
            lyric = line.get("letra")
            source = line.get("letra_fonte")
            if lyric is None:
                continue
            if source != lyric:
                corrections.append({"hino": hymn_id, "pagina": line["pagina"], "fonte": source, "limpo": lyric})
            editorial = line.get("correcao_editorial")
            if editorial and editorial.get("similaridade", 0) < 0.90:
                add(blockers, "correcao_editorial_insegura", hymn_id, str(editorial))
            if comparable_text(lyric) not in chordpro_compact:
                add(blockers, "verso_ausente_no_chordpro", hymn_id, lyric)
            if re.search(r"(?i)(?:^|\s)(?:[^\W\d_]\s+){3,}[^\W\d_](?:\s|$)", lyric):
                add(blockers, "letras_separadas", hymn_id, lyric)
            if re.search(r"(?<!\w)[B-DF-NP-Z](?!\w)\s+[^\W\d_]{2,}", lyric):
                add(blockers, "palavra_fragmentada", hymn_id, lyric)
            if re.search(r"-{2,}", lyric):
                add(blockers, "hifens_de_alinhamento", hymn_id, lyric)
            if re.search(r"\s+[,;:!?\.]", lyric):
                add(blockers, "espaco_pontuacao", hymn_id, lyric)
            if re.search(r"[,;:!?]{2,}|[,;:!?](?=\S)", lyric):
                add(blockers, "pontuacao_sem_espaco", hymn_id, lyric)
            compact = re.sub(r"[A-Ga-g#b0-9m+°/()\-\s]", "", lyric)
            if line["tipo"] == "texto" and len(re.findall(r"[A-G](?:#|b)?", lyric)) >= 2 and len(compact) <= 1:
                add(blockers, "cifra_como_texto", hymn_id, lyric)

    with sqlite3.connect(args.lyrics_db) as connection:
        db_rows = connection.execute("select numero, titulo, conteudo from hinos").fetchall()
    for number, db_title, db_content in db_rows:
        hymn_id = str(number).lstrip("0") or "0"
        hymn = by_id.get(hymn_id)
        if hymn is None:
            add(blockers, "hino_do_banco_ausente", hymn_id, db_title)
            continue
        if comparable_text(db_title) != comparable_text(hymn["titulo"]):
            reference_differences.append({"tipo": "titulo", "hino": hymn_id, "pdf": hymn["titulo"], "banco": db_title})
        pdf_lines = [line["letra"] for line in hymn["linhas"] if line.get("letra")]
        pdf_reference_lines = meaningful_lines("\n".join(pdf_lines))
        db_reference_lines = meaningful_lines(db_content)
        db_compact = "".join(db_reference_lines)
        for line in pdf_reference_lines:
            if line in db_compact:
                continue
            candidates = [(difflib.SequenceMatcher(None, line, candidate).ratio(), candidate) for candidate in db_reference_lines]
            best, nearest = max(candidates, default=(0, ""))
            reference_differences.append({"tipo": "linha", "hino": hymn_id, "pdf": line, "banco_mais_proximo": nearest, "similaridade": round(best, 3)})

    report = {
        "aprovado": not blockers,
        "quantidade_hinos": len(hymns),
        "quantidade_bloqueios": len(blockers),
        "correcoes_tipograficas": corrections,
        "auditorias_manuais": [
            {"hino": item["id"], "decisoes": item.get("auditoria_manual", [])}
            for item in hymns if item.get("auditoria_manual")
        ],
        "divergencias_com_banco_de_letras": reference_differences,
        "bloqueios": blockers,
    }
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Hinos auditados: {len(hymns)}")
    print(f"Correcoes tipograficas registradas: {len(corrections)}")
    print(f"Bloqueios: {len(blockers)}")
    if blockers:
        for code, count in Counter(item["codigo"] for item in blockers).most_common():
            print(f"- {code}: {count}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
