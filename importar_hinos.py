import requests
from bs4 import BeautifulSoup
import time
import sqlite3

def baixar_hino(numero):
    url = f"https://novocantico.com.br/hino/{numero}/{numero}.xml"
    response = requests.get(url)
    if response.status_code != 200:
        return None
    soup = BeautifulSoup(response.content, "xml")
    titulo = soup.find("titulo").text if soup.find("titulo") else "Sem título"
    estrofes = []
    for idx, estrofe in enumerate(soup.find_all("estrofe"), 1):
        bloco = [f"Estrofe {idx}:"]
        for elem in estrofe.children:
            if elem.name == "verso":
                bloco.append(elem.text.strip())
            elif elem.name == "coro":
                bloco.append("")
                bloco.append("Coro:")
                for verso in elem.find_all("verso"):
                    bloco.append(verso.text.strip())
        estrofes.append("\n".join(bloco))
    return {
        "numero": numero,
        "titulo": titulo,
        "texto": "\n\n".join(estrofes)
    }

def configurar_banco():
    conn = sqlite3.connect('hinos.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hinos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT NOT NULL,
            titulo TEXT NOT NULL,
            texto TEXT NOT NULL
        )
    ''')
    conn.commit()
    return conn

inicio = 1
fim = 400
sufixos = ["", "-A"]  # Adapte se necessário

conn = configurar_banco()
cursor = conn.cursor()

for n in range(inicio, fim + 1):
    for sufixo in sufixos:
        numero = f"{n:03}{sufixo}"
        hino = baixar_hino(numero)
        if hino:
            print(f"{hino['numero']} - {hino['titulo']}")
            cursor.execute("INSERT INTO hinos (numero, titulo, texto) VALUES (?, ?, ?)",
                           (hino['numero'], hino['titulo'], hino['texto']))
            conn.commit()
        time.sleep(0.2)

conn.close()

print("\nImportação concluída. Hinos salvos em hinos.db")

# Salvar em TXT (um arquivo por hino)
for hino in hinos:
    with open(f"hinos/{hino['numero']} - {hino['titulo']}.txt", "w", encoding="utf-8") as f:
        f.write(f"{hino['numero']} - {hino['titulo']}\n\n{hino['texto']}\n")

# Ou salvar tudo em um JSON
# import json
# with open("todos_os_hinos.json", "w", encoding="utf-8") as f:
#     json.dump(hinos, f, ensure_ascii=False, indent=2)
