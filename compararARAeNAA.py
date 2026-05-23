import sqlite3

# Conversão de sobrescritos para dígitos
sobrescritos = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
}

def extrair_numero_sobrescrito(texto):
    numero = ''
    for char in texto:
        if char in sobrescritos:
            numero += sobrescritos[char]
        else:
            break
    return int(numero) if numero else None

def comparar_chapter_com_sobrescrito(naa_db_path, ara_db_path):
    # Conectar aos bancos
    conn_naa = sqlite3.connect(naa_db_path)
    conn_ara = sqlite3.connect(ara_db_path)
    cur_naa = conn_naa.cursor()
    cur_ara = conn_ara.cursor()

    # Selecionar linhas na mesma ordem
    cur_naa.execute("SELECT chapter FROM verse ORDER BY id")
    cur_ara.execute("SELECT text FROM verse ORDER BY id")

    naa_chapters = cur_naa.fetchall()
    ara_textos = cur_ara.fetchall()

    conn_naa.close()
    conn_ara.close()

    max_linhas = min(len(naa_chapters), len(ara_textos))
    print(f"\n🔍 Comparando capítulo (NAA) com sobrescrito (ARA):\n")

    for i in range(max_linhas):
        linha = i + 1
        naa_ch = naa_chapters[i][0]
        ara_txt = ara_textos[i][0]
        ara_vers = extrair_numero_sobrescrito(ara_txt)

        status = "✔️"
        if naa_ch != ara_vers:
            status = "❌ DIVERGÊNCIA"
        
        print(f"Linha {linha:>4}: NAA chapter = {naa_ch:<2} | ARA versículo = {ara_vers:<2} {status}")

        if status != "✔️":
            break  # Parar na primeira divergência

if __name__ == "__main__":
    comparar_chapter_com_sobrescrito("naa.sqlite", "ara.sqlite")
