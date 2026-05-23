import requests
from bs4 import BeautifulSoup
import time

livros = {
    "GEN": 50, "EXO": 40, "LEV": 27, "NUM": 36, "DEU": 34,
    "JOS": 24, "JDG": 21, "RUT": 4,  "1SA": 31, "2SA": 24,
    "1KI": 22, "2KI": 25, "1CH": 29, "2CH": 36, "EZR": 10,
    "NEH": 13, "EST": 10, "JOB": 42, "PSA": 150, "PRO": 31,
    "ECC": 12, "SNG": 8,  "ISA": 66, "JER": 52,  "LAM": 5,
    "EZK": 48, "DAN": 12, "HOS": 14, "JOL": 3,  "AMO": 9,
    "OBA": 1,  "JON": 4,  "MIC": 7,  "NAM": 3,  "HAB": 3,
    "ZEP": 3,  "HAG": 2,  "ZEC": 14, "MAL": 4, "MAT": 28,
    "MRK": 16, "LUK": 24, "JHN": 21, "ACT": 28, "ROM": 16,
    "1CO": 16, "2CO": 13, "GAL": 6,  "EPH": 6,  "PHP": 4,
    "COL": 4,  "1TH": 5,  "2TH": 3,  "1TI": 6,  "2TI": 4,
    "TIT": 3,  "PHM": 1,  "HEB": 13, "JAS": 5,  "1PE": 5,
    "2PE": 3,  "1JN": 5,  "2JN": 1,  "3JN": 1,  "JUD": 1,
    "REV": 22
}

def baixar_capitulo(livro, capitulo):
    url = f"https://www.sbb.org.br/biblia/NTLH/{livro}.{capitulo}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        div = soup.find("div", style="direction: ltr;")

        resultado = []
        pericope = None

        for elem in div.find_all(["h4", "span"]):
            if elem.name == "h4":
                span = elem.find("span", class_="text-grayMedium")
                if span:
                    pericope = span.get_text(strip=True)
                    resultado.append(f"[{pericope}]")
            elif elem.name == "span" and "verse" in elem.get("class", []):
                versiculo = elem.get("id", "").split(".")[-1]
                texto = elem.get_text(" ", strip=True)
                resultado.append(f"{versiculo} {texto}")
        return resultado
    except Exception as e:
        return [f"[Erro ao acessar: {e}]"]

# Caminho para salvar
with open("ntlh_bruta.txt", "w", encoding="utf-8") as f:
    for livro, total in livros.items():
        for cap in range(1, total + 1):
            print(f"Baixando {livro} {cap}...")
            f.write(f"### {livro} {cap} ###\n")
            linhas = baixar_capitulo(livro, cap)
            f.write("\n".join(linhas) + "\n\n")
            time.sleep(1.5)
