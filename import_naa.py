import re
import sqlite3

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
    """Popula as tabelas testament e book."""
    cursor.execute("SELECT COUNT(*) FROM testament")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO testament (id, name) VALUES (?, ?)", (1, 'Antigo Testamento'))
        cursor.execute("INSERT INTO testament (id, name) VALUES (?, ?)", (2, 'Novo Testamento'))

    cursor.execute("SELECT COUNT(*) FROM book")
    if cursor.fetchone()[0] == 0:
        # Mapeamento de IDs de livros para nomes
        books = {
            1: ("Gênesis", 1),
            2: ("Êxodo", 1),
            3: ("Levítico", 1),
            4: ("Números", 1),
            5: ("Deuteronômio", 1),
            6: ("Josué", 1),
            7: ("Juízes", 1),
            8: ("Rute", 1),
            9: ("1 Samuel", 1),
            10: ("2 Samuel", 1),
            11: ("1 Reis", 1),
            12: ("2 Reis", 1),
            13: ("1 Crônicas", 1),
            14: ("2 Crônicas", 1),
            15: ("Esdras", 1),
            16: ("Neemias", 1),
            17: ("Ester", 1),
            18: ("Jó", 1),
            19: ("Salmos", 1),
            20: ("Provérbios", 1),
            21: ("Eclesiastes", 1),
            22: ("Cântico dos Cânticos", 1),
            23: ("Isaías", 1),
            24: ("Jeremias", 1),
            25: ("Lamentações", 1),
            26: ("Ezequiel", 1),
            27: ("Daniel", 1),
            28: ("Oséias", 1),
            29: ("Joel", 1),
            30: ("Amós", 1),
            31: ("Obadias", 1),
            32: ("Jonas", 1),
            33: ("Miquéias", 1),
            34: ("Naum", 1),
            35: ("Habacuque", 1),
            36: ("Sofonias", 1),
            37: ("Ageu", 1),
            38: ("Zacarias", 1),
            39: ("Malaquias", 1),
            40: ("Mateus", 2),
            41: ("Marcos", 2),
            42: ("Lucas", 2),
            43: ("João", 2),
            44: ("Atos", 2),
            45: ("Romanos", 2),
            46: ("1 Coríntios", 2),
            47: ("2 Coríntios", 2),
            48: ("Gálatas", 2),
            49: ("Efésios", 2),
            50: ("Filipenses", 2),
            51: ("Colossenses", 2),
            52: ("1 Tessalonicenses", 2),
            53: ("2 Tessalonicenses", 2),
            54: ("1 Timóteo", 2),
            55: ("2 Timóteo", 2),
            56: ("Tito", 2),
            57: ("Filemom", 2),
            58: ("Hebreus", 2),
            59: ("Tiago", 2),
            60: ("1 Pedro", 2),
            61: ("2 Pedro", 2),
            62: ("1 João", 2),
            63: ("2 João", 2),
            64: ("3 João", 2),
            65: ("Judas", 2),
            66: ("Apocalipse", 2)
        }
        
        for book_id, (name, testament_id) in books.items():
            cursor.execute(
                "INSERT INTO book (id, book_reference_id, testament_reference_id, name) VALUES (?, ?, ?, ?)",
                (book_id, book_id, testament_id, name)
            )

def process_naa_file():
    conn = sqlite3.connect('naa.sqlite')
    cursor = conn.cursor()
    
    try:
        # Criar tabelas e dados iniciais
        create_tables(cursor)
        populate_initial_data(cursor)
        conn.commit()

        # Limpar a tabela de versículos antes de importar
        cursor.execute("DELETE FROM verse")
        conn.commit()

        # Ler e importar os versículos
        with open('NAA.txt', 'r', encoding='utf-8') as file:
            content = file.read()
            
            # Padrão simplificado: começa com (número e termina com '),
            pattern = r'\((\d+),(\d+),(\d+),(\d+),(\d+),\'(.*?)\'\),'
            verses = re.findall(pattern, content)
            
            total_verses = 0
            for verse in verses:
                # Extrair os campos
                old_id, bible_id, testament_id, book_id, chapter, text = verse
                
                # Inserir o versículo
                cursor.execute(
                    "INSERT INTO verse (book_id, chapter, verse_number, text) VALUES (?, ?, ?, ?)",
                    (int(book_id), int(chapter), int(old_id), text)
                )
                total_verses += 1
                
                if total_verses % 1000 == 0:
                    print(f"Importados {total_verses} versículos...")
                    conn.commit()

        conn.commit()
        print(f"\nImportação concluída! Total de versículos importados: {total_verses}")

    except Exception as e:
        print(f"Erro durante a importação: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    process_naa_file()