import requests
from bs4 import BeautifulSoup
import time

livros = {
    "gn": 50, "ex": 40, "lv": 27, "nm": 36, "dt": 34,
    "js": 24, "jz": 21, "rt": 4, "1sm": 31, "2sm": 24,
    "1rs": 22, "2rs": 25, "1cr": 29, "2cr": 36, "ed": 10,
    "ne": 13, "et": 10, "jó": 42, "sl": 150, "pv": 31,
    "ec": 12, "ct": 8, "is": 66, "jr": 52, "lm": 5,
    "ez": 48, "dn": 12, "os": 14, "jl": 3, "am": 9,
    "ob": 1, "jn": 4, "mq": 7, "na": 3, "hc": 3,
    "sf": 3, "ag": 2, "zc": 14, "ml": 4, "mt": 28,
    "mc": 16, "lc": 24, "jo": 21, "at": 28, "rm": 16,
    "1co": 16, "2co": 13, "gl": 6, "ef": 6, "fp": 4,
    "cl": 4, "1ts": 5, "2ts": 3, "1tm": 6, "2tm": 4,
    "tt": 3, "fm": 1, "hb": 13, "tg": 5, "1pe": 5,
    "2pe": 3, "1jo": 5, "2jo": 1, "3jo": 1, "jd": 1,
    "ap": 22
}

def baixar_capitulo(sigla, capitulo):
    url = f"https://www.bibliaonline.com.br/naa/{sigla}/{capitulo}"
    try:
        resp = requests.get(url)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.content, "html.parser")

        corpo = soup.find("div", class_="chapter-fragment-grid")
        if not corpo:
            return [f"[⚠️ Estrutura não encontrada em {sigla.upper()} {capitulo}]"]

        resultado = []
        versiculo_atual = 0

        for p in corpo.find_all("p"):
            texto = p.get_text(strip=True)
            if not texto:
                continue

            numero = p.find("span", class_="v")
            if numero:
                try:
                    versiculo_atual = int(numero.text.strip())
                except ValueError:
                    pass

            if texto[0].isdigit():
                resultado.append(texto)
            else:
                versiculo_atual += 1
                resultado.append(f"{versiculo_atual} {texto}")

        return resultado
    except Exception as e:
        return [f"[Erro: {e}]"]

with open("naa_biblia.txt", "w", encoding="utf-8") as f:
    for livro, total in livros.items():
        for cap in range(1, total + 1):
            print(f"Baixando {livro.upper()} {cap}...")
            f.write(f"### {livro.upper()} {cap} ###\n")
            linhas = baixar_capitulo(livro, cap)
            f.write("\n".join(linhas) + "\n\n")
            time.sleep(1.5)
