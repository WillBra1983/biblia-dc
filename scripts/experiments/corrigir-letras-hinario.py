#!/usr/bin/env python3
"""Aplica correcoes editoriais confirmadas no banco de letras do hinario."""

from __future__ import annotations

import sqlite3
from pathlib import Path


UPDATES = {
    27: [("No fragoso alcantil,12", "No fragoso alcantil,")],
    32: [("fiel assim.17", "fiel assim.")],
    143: [
        (
            "Às pastagens verdejantes ele vem me conduzir\n\n\nEstrofe 2:",
            "Às pastagens verdejantes ele vem me conduzir\n"
            "E nas relvas abundantes\n"
            "Vou descanso então fruir.\n\nEstrofe 2:",
        ),
        (
            "Por veredas da justiça, prazeroso me conduz\n\n\nEstrofe 3:",
            "Por veredas da justiça, prazeroso me conduz\n"
            "E depois da dura liça\n"
            "Vou gozar a eterna luz.\n\nEstrofe 3:",
        ),
    ],
    162: [
        (
            "Nesta vida tormentosa,85 qual fragor86 do vasto mar.",
            "Nesta vida tormentosa, qual fragor do vasto mar.",
        ),
    ],
    172: [("manda-nos,pois, ó Senhor.", "manda-nos, pois, ó Senhor.")],
    226: [
        (
            "Dá-me o viver na certeza de que foi mesmo por mim,\n",
            "Dá-me o viver na certeza de que foi mesmo por mim,\n"
            "Que seu amor inefável\n"
            "Não tem mudança nem fim.\n",
        ),
    ],
    255: [
        (
            "Nos montes há perigos mil,\n\n\nEstrofe 3:",
            "Nos montes há perigos mil,\n"
            "De novo a quero em meu redil”. (bis)\n\nEstrofe 3:",
        ),
    ],
    254: [("encapelado134 mar", "encapelado mar")],
    275: [("grilhões1 da eterna morte", "grilhões da eterna morte")],
    300: [("grilhões168 partires", "grilhões partires")],
    323: [("divisa193 do nosso estandarte194", "divisa do nosso estandarte")],
    326: [("copiosa a espargir,1", "copiosa a espargir,")],
    271: [
        (
            "À tumba foram de manhã\n\nMas Cristo vive",
            "À tumba foram de manhã\nMulheres com piedoso afã!\nMas Cristo vive",
        ),
    ],
    350: [
        ("Vida eterna, vida eterna .", "Vida eterna, vida eterna nos vieste conceder."),
        ("Ilumina, ilumina .", "Ilumina, ilumina nossas almas, grande Deus."),
        ("Exultamos, exultamos .", "Exultamos, exultamos entoando o teu louvor."),
        ("Desfrutamos, desfrutamos .", "Desfrutamos, desfrutamos alegria, vida e luz."),
    ],
    339: [
        (
            "Oh! Feliz, bem feliz o dia em que me converti!201",
            "Oh! Feliz, bem feliz o dia em que me converti!",
        ),
    ],
}


def main() -> None:
    database = Path(__file__).resolve().parents[2] / "public" / "hinario.db"
    with sqlite3.connect(database) as connection:
        for number, replacements in UPDATES.items():
            row = connection.execute(
                "select rowid, conteudo from hinos where cast(numero as integer) = ?",
                (number,),
            ).fetchone()
            if row is None:
                raise RuntimeError(f"Hino {number} nao encontrado")
            row_id, content = row
            for old, new in replacements:
                occurrences = content.count(old)
                if occurrences == 1:
                    content = content.replace(old, new)
                    continue
                if new in content:
                    continue
                if occurrences != 1:
                    raise RuntimeError(
                        f"Hino {number}: trecho esperado encontrado {occurrences} vezes"
                    )
            connection.execute(
                "update hinos set conteudo = ? where rowid = ?",
                (content, row_id),
            )
    print("Correcoes aplicadas aos hinos:", ", ".join(map(str, UPDATES)))


if __name__ == "__main__":
    main()
