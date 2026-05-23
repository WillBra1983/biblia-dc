import re

def limpar_ntlh_grupo(entrada, saida):
    with open(entrada, "r", encoding="utf-8") as f:
        linhas = f.readlines()

    resultado = []
    versiculo_atual = None

    for linha in linhas:
        linha = linha.strip()

        # Capítulo ou perícope
        if linha.startswith("###") or (linha.startswith("[") and linha.endswith("]")):
            versiculo_atual = None
            resultado.append(linha)
            continue

        # Linha com número de versículo no início
        match = re.match(r"^(\d+)[\s\.]*([\S\s]*)", linha)
        if match:
            numero = match.group(1)
            texto = match.group(2).strip()

            if versiculo_atual != numero:
                versiculo_atual = numero
                nova_linha = f"{numero} {texto}" if texto else None
            else:
                nova_linha = texto if texto else None
        else:
            nova_linha = linha if linha else None

        if nova_linha:
            resultado.append(nova_linha)

    # Escrever resultado final
    with open(saida, "w", encoding="utf-8") as f:
        for linha in resultado:
            f.write(linha.strip() + "\n")

    print(f"✅ Arquivo limpo salvo como: {saida}")

# Executar
limpar_ntlh_grupo("ntlh_bruta.txt", "ntlh_teste_limpo2.txt")
