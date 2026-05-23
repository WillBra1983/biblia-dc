import re

def corrigir_termos_quebrados(caminho_entrada, caminho_saida):
    with open(caminho_entrada, "r", encoding="utf-8") as f:
        linhas = f.readlines()

    saida = []
    buffer = []
    for linha in linhas:
        linha = linha.rstrip()

        # Se é uma linha de cabeçalho ou perícope, salva direto
        if linha.startswith("###") or (linha.startswith("[") and linha.endswith("]")):
            if buffer:
                saida.append(" ".join(buffer))
                buffer = []
            saida.append(linha)
            continue

        # Se é início de versículo
        if re.match(r"^\d+\s", linha):
            if buffer:
                saida.append(" ".join(buffer))
            buffer = [linha]
        elif linha.strip() == "":
            continue
        else:
            # Junta termos quebrados
            buffer.append(linha.strip())

    # Finaliza último buffer
    if buffer:
        saida.append(" ".join(buffer))

    # Correções de quebras artificiais específicas
    resultado_final = []
    for linha in saida:
        # Corrige quebras mais comuns
        linha = re.sub(r"\bO\s+Senhor\b", "O Senhor", linha)
        linha = re.sub(r"\bo\s+Senhor\b", "o Senhor", linha)
        linha = re.sub(r"\bdo\s+Senhor\b", "do Senhor", linha)
        linha = re.sub(r"\bSenhor\s+Deus\b", "Senhor Deus", linha)
        linha = re.sub(r"\bO\s+Senhor\s+Deus\b", "O Senhor Deus", linha)
        linha = re.sub(r"\b,\s+Senhor\b", ", Senhor", linha)
        resultado_final.append(linha.strip())

    with open(caminho_saida, "w", encoding="utf-8") as f:
        for linha in resultado_final:
            f.write(linha + "\n")

    print(f"✅ Arquivo corrigido salvo como: {caminho_saida}")

# Execução
corrigir_termos_quebrados("ntlh_teste_limpo.txt", "ntlh_teste_final.txt")
