# Requisitos: requests, beautifulsoup4
# pip install requests beautifulsoup4

import requests
from bs4 import BeautifulSoup
import sqlite3
from pathlib import Path
import re
import time # Para adicionar um pequeno atraso entre as requisições
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

# --- Configurações ---
DATABASE_NAME = 'naa.sqlite'
BASE_URL = "https://www.sbb.org.br/biblia/NAA/"

# Mapeamento de abreviações do site SBB para abreviações internas/do banco (mantido conforme pedido do usuário)
# As chaves são as abreviações usadas na URL do site da SBB, os valores são as abreviações internas.
mapeamento_site_para_banco = {
    "GEN": "GEN", "EXO": "EXO", "LEV": "LEV", "NUM": "NUM", "DEU": "DEU",
    "JOS": "JOS", "JDG": "JZ", "RUT": "RT", "1SA": "1SM", "2SA": "2SM",
    "1KI": "1RS", "2KI": "2RS", "1CH": "1CR", "2CH": "2CR", "EZR": "ESD",
    "NEH": "NE", "EST": "ET", "JOB": "JÓ", "PSA": "SL", "PRO": "PV",
    "ECC": "EC", "SNG": "CT", "ISA": "IS", "JER": "JR", "LAM": "LM",
    "EZK": "EZ", "DAN": "DN", "HOS": "OS", "JOL": "JL", "AMO": "AM",
    "OBA": "OB", "JON": "JN", "MIC": "MQ", "NAM": "NA", "HAB": "HC",
    "ZEP": "SF", "HAG": "AG", "ZEC": "ZC", "MAL": "ML", "MAT": "MT",
    "MRK": "MC", "LUK": "LC", "JHN": "JO", "ACT": "AT", "ROM": "RM",
    "1CO": "1CO", "2CO": "2CO", "GAL": "GL", "EPH": "EF", "PHP": "FP",
    "COL": "CL", "1TH": "1TS", "2TH": "2TS", "1TI": "1TM", "2TI": "2TM",
    "TIT": "TT", "PHM": "FM", "HEB": "HB", "JAS": "TG", "1PE": "1PE",
    "2PE": "2PE", "1JN": "1JO", "2JN": "2JO", "3JN": "3JO", "JUD": "JD",
    "REV": "AP"
}

# Mapeamento de abreviação interna para ID de livro no banco (mantido conforme pedido do usuário)
# Importante: Estas IDs devem ser as mesmas que serão inseridas na tabela 'book'
mapear_abreviacao_para_id = {
    "GEN": 1, "EXO": 2, "LEV": 3, "NUM": 4, "DEU": 5,
    "JOS": 6, "JZ": 7, "RT": 8, "1SM": 9, "2SM": 10,
    "1RS": 11, "2RS": 12, "1CR": 13, "2CR": 14, "ESD": 15,
    "NE": 16, "ET": 17, "JÓ": 18, "SL": 19, "PV": 20,
    "EC": 21, "CT": 22, "IS": 23, "JR": 24, "LM": 25,
    "EZ": 26, "DN": 27, "OS": 28, "JL": 29, "AM": 30,
    "OB": 31, "JN": 32, "MQ": 33, "NA": 34, "HC": 35,
    "SF": 36, "AG": 37, "ZC": 38, "ML": 39, "MT": 40,
    "MC": 41, "LC": 42, "JO": 43, "AT": 44, "RM": 45,
    "1CO": 46, "2CO": 47, "GL": 48, "EF": 49, "FP": 50,
    "CL": 51, "1TS": 52, "2TS": 53, "1TM": 54, "2TM": 55,
    "TIT": 56, "PHM": 57, "HB": 58, "TG": 59, "1PE": 60,
    "2PE": 61, "1JO": 62, "2JO": 63, "3JO": 64, "JD": 65,
    "AP": 66
}

# Informações detalhadas dos livros da Bíblia (abreviação do site, nome completo, testamento ID e número de capítulos)
# Testament IDs: 1 para Antigo Testamento, 2 para Novo Testamento
book_info_sbb = {
    "GEN": {"name": "Gênesis", "testament_id": 1, "chapters": 50},
    "EXO": {"name": "Êxodo", "testament_id": 1, "chapters": 40},
    "LEV": {"name": "Levítico", "testament_id": 1, "chapters": 27},
    "NUM": {"name": "Números", "testament_id": 1, "chapters": 36},
    "DEU": {"name": "Deuteronômio", "testament_id": 1, "chapters": 34},
    "JOS": {"name": "Josué", "testament_id": 1, "chapters": 24},
    "JDG": {"name": "Juízes", "testament_id": 1, "chapters": 21},
    "RUT": {"name": "Rute", "testament_id": 1, "chapters": 4},
    "1SA": {"name": "1 Samuel", "testament_id": 1, "chapters": 31},
    "2SA": {"name": "2 Samuel", "testament_id": 1, "chapters": 24},
    "1KI": {"name": "1 Reis", "testament_id": 1, "chapters": 22},
    "2KI": {"name": "2 Reis", "testament_id": 1, "chapters": 25},
    "1CH": {"name": "1 Crônicas", "testament_id": 1, "chapters": 29},
    "2CH": {"name": "2 Crônicas", "testament_id": 1, "chapters": 36},
    "EZR": {"name": "Esdras", "testament_id": 1, "chapters": 10},
    "NEH": {"name": "Neemias", "testament_id": 1, "chapters": 13},
    "EST": {"name": "Ester", "testament_id": 1, "chapters": 10},
    "JOB": {"name": "Jó", "testament_id": 1, "chapters": 42},
    "PSA": {"name": "Salmos", "testament_id": 1, "chapters": 150},
    "PRO": {"name": "Provérbios", "testament_id": 1, "chapters": 31},
    "ECC": {"name": "Eclesiastes", "testament_id": 1, "chapters": 12},
    "SNG": {"name": "Cântico dos Cânticos", "testament_id": 1, "chapters": 8},
    "ISA": {"name": "Isaías", "testament_id": 1, "chapters": 66},
    "JER": {"name": "Jeremias", "testament_id": 1, "chapters": 52},
    "LAM": {"name": "Lamentações", "testament_id": 1, "chapters": 5},
    "EZK": {"name": "Ezequiel", "testament_id": 1, "chapters": 48},
    "DAN": {"name": "Daniel", "testament_id": 1, "chapters": 12},
    "HOS": {"name": "Oséias", "testament_id": 1, "chapters": 14},
    "JOL": {"name": "Joel", "testament_id": 1, "chapters": 3},
    "AMO": {"name": "Amós", "testament_id": 1, "chapters": 9},
    "OBA": {"name": "Obadias", "testament_id": 1, "chapters": 1},
    "JON": {"name": "Jonas", "testament_id": 1, "chapters": 4},
    "MIC": {"name": "Miquéias", "testament_id": 1, "chapters": 7},
    "NAM": {"name": "Naum", "testament_id": 1, "chapters": 3},
    "HAB": {"name": "Habacuque", "testament_id": 1, "chapters": 3},
    "ZEP": {"name": "Sofonias", "testament_id": 1, "chapters": 3},
    "HAG": {"name": "Ageu", "testament_id": 1, "chapters": 2},
    "ZEC": {"name": "Zacarias", "testament_id": 1, "chapters": 14},
    "MAL": {"name": "Malaquias", "testament_id": 1, "chapters": 4},
    "MAT": {"name": "Mateus", "testament_id": 2, "chapters": 28},
    "MRK": {"name": "Marcos", "testament_id": 2, "chapters": 16},
    "LUK": {"name": "Lucas", "testament_id": 2, "chapters": 24},
    "JHN": {"name": "João", "testament_id": 2, "chapters": 21},
    "ACT": {"name": "Atos", "testament_id": 2, "chapters": 28},
    "ROM": {"name": "Romanos", "testament_id": 2, "chapters": 16},
    "1CO": {"name": "1 Coríntios", "testament_id": 2, "chapters": 16},
    "2CO": {"name": "2 Coríntios", "testament_id": 2, "chapters": 13},
    "GAL": {"name": "Gálatas", "testament_id": 2, "chapters": 6},
    "EPH": {"name": "Efésios", "testament_id": 2, "chapters": 6},
    "PHP": {"name": "Filipenses", "testament_id": 2, "chapters": 4},
    "COL": {"name": "Colossenses", "testament_id": 2, "chapters": 4},
    "1TH": {"name": "1 Tessalonicenses", "testament_id": 2, "chapters": 5},
    "2TH": {"name": "2 Tessalonicenses", "testament_id": 2, "chapters": 3},
    "1TI": {"name": "1 Timóteo", "testament_id": 2, "chapters": 6},
    "2TI": {"name": "2 Timóteo", "testament_id": 2, "chapters": 4},
    "TIT": {"name": "Tito", "testament_id": 2, "chapters": 3},
    "PHM": {"name": "Filemom", "testament_id": 2, "chapters": 1},
    "HEB": {"name": "Hebreus", "testament_id": 2, "chapters": 13},
    "JAS": {"name": "Tiago", "testament_id": 2, "chapters": 5},
    "1PE": {"name": "1 Pedro", "testament_id": 2, "chapters": 5},
    "2PE": {"name": "2 Pedro", "testament_id": 2, "chapters": 3},
    "1JN": {"name": "1 João", "testament_id": 2, "chapters": 5},
    "2JN": {"name": "2 João", "testament_id": 2, "chapters": 1},
    "3JN": {"name": "3 João", "testament_id": 2, "chapters": 1},
    "JUD": {"name": "Judas", "testament_id": 2, "chapters": 1},
    "REV": {"name": "Apocalipse", "testament_id": 2, "chapters": 22},
}

# Configuração do retry para requests
def create_session():
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[500, 502, 503, 504]
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session

def create_tables(cursor):
    """Cria as tabelas necessárias no banco de dados."""
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS testament (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS book (
        id INTEGER PRIMARY KEY,
        book_reference_id INTEGER,
        testament_reference_id INTEGER NOT NULL,
        name TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS verse (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        chapter INTEGER NOT NULL,
        verse_number INTEGER NOT NULL,
        text TEXT NOT NULL,
        pericope_title TEXT,
        FOREIGN KEY (book_id) REFERENCES book(id)
    )
    ''')

def populate_initial_data(cursor):
    """Popula as tabelas testament e book se estiverem vazias."""
    cursor.execute("SELECT COUNT(*) FROM testament")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO testament (id, name) VALUES (?, ?)", (1, 'Antigo Testamento'))
        cursor.execute("INSERT INTO testament (id, name) VALUES (?, ?)", (2, 'Novo Testamento'))

    cursor.execute("SELECT COUNT(*) FROM book")
    if cursor.fetchone()[0] == 0:
        for sbb_abbr, info in book_info_sbb.items():
            internal_abbr = mapeamento_site_para_banco.get(sbb_abbr)
            book_id = mapear_abreviacao_para_id.get(internal_abbr)
            if book_id:
                cursor.execute(
                    "INSERT INTO book (id, book_reference_id, testament_reference_id, name) VALUES (?, ?, ?, ?)",
                    (book_id, book_id, info['testament_id'], info['name'])
                )

def get_chapter_content(livro, capitulo):
    """Obtém o conteúdo de um capítulo específico."""
    url = f"{BASE_URL}{livro}.{capitulo}"
    try:
        session = create_session()
        response = session.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        main_div = soup.find("div", style="direction: ltr;")
        if not main_div:
            return []
            
        verses = []
        current_pericope = None
        
        # Itera sobre os descendentes diretos de main_div para processar h6 e span.verse
        for elem in main_div.find_all(["h6", "span"], recursive=True):
            if elem.name == "h6":
                span = elem.find("span", class_="text-grayMedium")
                if span:
                    current_pericope = span.get_text(strip=True)
            elif elem.name == "span" and "verse" in elem.get("class", []):
                verse_id = elem.get("id", "")
                if verse_id:
                    try:
                        verse_num = int(verse_id.split(".")[-1])
                        verse_text = elem.get_text(strip=True)
                        verses.append({
                            "verse_number": verse_num,
                            "text": verse_text,
                            "pericope": current_pericope
                        })
                        current_pericope = None # Reseta a perícope após associar ao primeiro versículo
                    except ValueError:
                        print(f"Aviso: Não foi possível extrair número do versículo do ID: {verse_id}")
                    
        return verses
        
    except requests.exceptions.RequestException as e:
        print(f"Erro ao acessar {url}: {e}")
        return []

def scrape_and_store_bible():
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()

    try:
        create_tables(cursor)
        populate_initial_data(cursor)
        conn.commit()

        # Limpar a tabela de versículos antes de cada raspagem completa
        cursor.execute("DELETE FROM verse")
        conn.commit()
        print("Tabela 'verse' limpa antes da nova raspagem.")

        for sbb_abbr, book_data in book_info_sbb.items():
            book_name = book_data['name']
            num_chapters = book_data['chapters']
            
            internal_abbr = mapeamento_site_para_banco.get(sbb_abbr)
            book_id = mapear_abreviacao_para_id.get(internal_abbr)

            if not book_id:
                print(f"Erro: ID do livro não encontrado para abreviação interna: {internal_abbr} (site: {sbb_abbr})")
                continue

            print(f"\nProcessando {book_name} ({sbb_abbr})...")

            for chapter_num in range(1, num_chapters + 1):
                print(f"  Capítulo {chapter_num}...", end="", flush=True)
                
                # Buffer para acumular partes do versículo
                current_chapter_verses = {}
                current_pericope_for_verse = None

                verses_data = get_chapter_content(sbb_abbr, chapter_num)
                    
                if verses_data:
                    for item in verses_data:
                        if "pericope" in item and item["pericope"] is not None:
                            current_pericope_for_verse = item["pericope"]
                        
                        if "verse_number" in item:
                            verse_num = item["verse_number"]
                            verse_text = item["text"]

                            if verse_num not in current_chapter_verses:
                                current_chapter_verses[verse_num] = {
                                    "text": [],
                                    "pericope": current_pericope_for_verse
                                }
                            current_chapter_verses[verse_num]["text"].append(verse_text)
                            current_pericope_for_verse = None # Reset after first verse association
                    
                    # Inserir os versículos consolidados no banco de dados
                    for verse_num, data in current_chapter_verses.items():
                        full_text = " ".join(data["text"])
                                cursor.execute(
                                    "INSERT INTO verse (book_id, chapter, verse_number, text, pericope_title) VALUES (?, ?, ?, ?, ?)",
                            (book_id, chapter_num, verse_num, full_text, data["pericope"])
                                    )
                    print(f" {len(current_chapter_verses)} versículos processados")
                            else:
                    print(" nenhum versículo encontrado")
                    
                    conn.commit()
                time.sleep(1)  # Pausa entre requisições

    except Exception as e:
        print(f"Erro geral durante a raspagem e armazenamento: {e}")
        conn.rollback()
    finally:
        conn.close()
        print(f"\nProcesso de raspagem e armazenamento concluído. Dados salvos em {DATABASE_NAME}")

def analyze_page_structure(url):
    """Analisa a estrutura HTML de uma página específica."""
    print("DEBUG: Executando analyze_page_structure na versão mais recente.")
    session = create_session()
    try:
        response = session.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        print("\n=== ANÁLISE DA ESTRUTURA HTML ===")
        
        main_div = soup.find("div", style="direction: ltr;")
        if not main_div:
            print("AVISO: Não encontrou div com style='direction: ltr;'")
            return
            
        print("\nElementos encontrados:")
        
        # Analisar cada elemento dentro do conteúdo, focando apenas em h6 (perícopes) e span (versículos)
        for elem in main_div.find_all(["h6", "span"], recursive=True):
            if elem.name == "h6":
                span = elem.find("span", class_="text-grayMedium")
                if span:
                    print(f"\nPERÍCOPE (h6): {span.get_text(strip=True)}")
            elif elem.name == "span" and "verse" in elem.get("class", []):
                verse_id = elem.get("id", "")
                verse_text = elem.get_text(strip=True)
                print(f"  - VERSÍCULO (span.verse) ID: {verse_id}, Texto: {verse_text[:100]}...")
            
        print("\n=== FIM DA ANÁLISE ===\n")

    except Exception as e:
        print(f"Erro ao acessar {url}: {e}")

if __name__ == "__main__":
    # analyze_page_structure("https://www.sbb.org.br/biblia/NAA/GEN.1")
    scrape_and_store_bible()
