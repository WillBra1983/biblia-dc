import json
import re
import os

def processar_pergunta_resposta(texto):
    """Processa o texto para extrair pergunta, resposta e referências"""
    linhas = texto.strip().split('\n')
    
    # Encontra a pergunta
    pergunta_match = re.search(r'PERGUNTA \d+\.\s+(.*?)$', linhas[0], re.IGNORECASE)
    if not pergunta_match:
        return None
        
    numero = int(re.search(r'PERGUNTA (\d+)', linhas[0], re.IGNORECASE).group(1))
    pergunta = pergunta_match.group(1).strip()
    
    # Encontra a resposta
    resposta = ""
    referencias = []
    
    for linha in linhas:
        if linha.strip().startswith('RESPOSTA.'):
            resposta = linha.replace('RESPOSTA.', '').strip()
        elif linha.strip().startswith('REFERÊNCIAS'):
            refs = linha.replace('REFERÊNCIAS.', '').replace('REFERÊNCIAS:', '').strip()
            referencias = [ref.strip() for ref in refs.split(';')]
            
    return {
        'numero': numero,
        'pergunta': pergunta,
        'resposta': resposta,
        'referencias': referencias
    }

def gerar_arquivo_js(texto_completo):
    # Garante que o diretório existe
    os.makedirs('src/data', exist_ok=True)
    
    # Divide o texto em perguntas individuais
    perguntas_texto = re.split(r'\n\nPERGUNTA \d+\.', texto_completo)[1:]
    perguntas = []
    
    for i, texto_pergunta in enumerate(perguntas_texto, 1):
        texto_completo = f"PERGUNTA {i}. {texto_pergunta}"
        dados = processar_pergunta_resposta(texto_completo)
        if dados:
            perguntas.append(dados)
    
    # Gera o arquivo JavaScript
    with open('src/data/breveCatecismo.js', 'w', encoding='utf-8') as f:
        f.write('export const breveCatecismo = ')
        json.dump(perguntas, f, ensure_ascii=False, indent=2)
        f.write('\n')

if __name__ == '__main__':
    with open('breve_catecismo.txt', 'r', encoding='utf-8') as f:
        texto_completo = f.read()
    gerar_arquivo_js(texto_completo)
    print("Arquivo JavaScript gerado com sucesso!")