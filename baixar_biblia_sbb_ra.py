#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para baixar a Bíblia ARA (Almeida Revista e Atualizada) do site biblia.com
e extrair perícopes do Antigo Testamento
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re
from pathlib import Path

# Mapeamento de livros do AT (ID, Nome completo, Abreviação)
LIVROS_AT = [
    (1, 'Gênesis', 'GEN'),
    (2, 'Êxodo', 'EXO'),
    (3, 'Levítico', 'LEV'),
    (4, 'Números', 'NUM'),
    (5, 'Deuteronômio', 'DEU'),
    (6, 'Josué', 'JOS'),
    (7, 'Juízes', 'JDG'),
    (8, 'Rute', 'RUT'),
    (9, '1 Samuel', '1SA'),
    (10, '2 Samuel', '2SA'),
    (11, '1 Reis', '1KI'),
    (12, '2 Reis', '2KI'),
    (13, '1 Crônicas', '1CH'),
    (14, '2 Crônicas', '2CH'),
    (15, 'Esdras', 'EZR'),
    (16, 'Neemias', 'NEH'),
    (17, 'Ester', 'EST'),
    (18, 'Jó', 'JOB'),
    (19, 'Salmos', 'PSA'),
    (20, 'Provérbios', 'PRO'),
    (21, 'Eclesiastes', 'ECC'),
    (22, 'Cantares', 'SNG'),
    (23, 'Isaías', 'ISA'),
    (24, 'Jeremias', 'JER'),
    (25, 'Lamentações', 'LAM'),
    (26, 'Ezequiel', 'EZK'),
    (27, 'Daniel', 'DAN'),
    (28, 'Oséias', 'HOS'),
    (29, 'Joel', 'JOL'),
    (30, 'Amós', 'AMO'),
    (31, 'Obadias', 'OBA'),
    (32, 'Jonas', 'JON'),
    (33, 'Miquéias', 'MIC'),
    (34, 'Naum', 'NAM'),
    (35, 'Habacuque', 'HAB'),
    (36, 'Sofonias', 'ZEP'),
    (37, 'Ageu', 'HAG'),
    (38, 'Zacarias', 'ZEC'),
    (39, 'Malaquias', 'MAL')
]

BASE_URL = "https://biblia.com/books/bb-sbb-ra/"

def get_chapter_url(livro_id, livro_nome, capitulo):
    """
    Constrói a URL para acessar um capítulo específico.
    A URL geralmente segue o padrão: /books/bb-sbb-ra/[livro]/[capitulo]
    """
    # Normalizar nome do livro para URL (sem espaços, com hífens)
    livro_url = livro_nome.lower().replace(' ', '-').replace('é', 'e').replace('ê', 'e')
    livro_url = livro_url.replace('í', 'i').replace('ó', 'o').replace('ú', 'u')
    livro_url = livro_url.replace('á', 'a').replace('ç', 'c')
    
    # Remover prefixos numéricos para URLs
    livro_url = re.sub(r'^\d+-', '', livro_url)
    
    url = f"{BASE_URL}{livro_url}/{capitulo}"
    return url

def extract_pericopes_from_page(soup, livro_id, capitulo):
    """
    Extrai perícopes de uma página HTML.
    Retorna lista de dicionários: [{'pericope': 'título', 'versiculo': '1'}, ...]
    """
    pericopes = []
    
    # Procurar por elementos que possam conter perícopes
    # Geralmente são elementos como <h4>, <h3>, ou elementos com classes específicas
    
    # Padrão 1: Procurar por headings (h3, h4) que podem ser perícopes
    headings = soup.find_all(['h3', 'h4', 'h5'])
    for heading in headings:
        text = heading.get_text(strip=True)
        # Verificar se parece uma perícope (não é número, não é muito curto, etc)
        if (len(text) > 10 and len(text) < 200 and 
            not text.startswith(tuple('0123456789')) and
            not re.match(r'^\d+:\d+', text)):
            
            # Tentar encontrar o próximo versículo após este heading
            # Procurar por elementos com números de versículos próximos
            next_verse = heading.find_next(['span', 'div', 'p'], class_=re.compile(r'verse|versiculo|v-'))
            if next_verse:
                verse_text = next_verse.get_text(strip=True)
                verse_match = re.match(r'^(\d+)', verse_text)
                if verse_match:
                    versiculo = verse_match.group(1)
                    pericopes.append({
                        'pericope': text,
                        'versiculo': versiculo
                    })
            else:
                # Se não encontrou versículo próximo, assumir versículo 1 ou próximo
                # Isso será refinado depois
                pericopes.append({
                    'pericope': text,
                    'versiculo': '1'  # Placeholder
                })
    
    # Padrão 2: Procurar por elementos com classes específicas que indicam perícopes
    pericope_classes = ['pericope', 'section-title', 'title', 'heading', 'h4']
    for class_name in pericope_classes:
        elements = soup.find_all(class_=re.compile(class_name, re.I))
        for elem in elements:
            text = elem.get_text(strip=True)
            if (len(text) > 10 and len(text) < 200 and 
                not text.startswith(tuple('0123456789'))):
                
                # Tentar encontrar versículo associado
                next_verse = elem.find_next(['span', 'div'], class_=re.compile(r'verse|versiculo', re.I))
                if next_verse:
                    verse_text = next_verse.get_text(strip=True)
                    verse_match = re.match(r'^(\d+)', verse_text)
                    if verse_match:
                        versiculo = verse_match.group(1)
                        pericopes.append({
                            'pericope': text,
                            'versiculo': versiculo
                        })
    
    return pericopes

def fetch_chapter(livro_id, livro_nome, livro_abrev, capitulo, max_capitulos):
    """
    Baixa um capítulo específico e extrai suas perícopes.
    """
    url = get_chapter_url(livro_id, livro_nome, capitulo)
    
    print(f"  Capítulo {capitulo}...", end="", flush=True)
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 404:
            print(" ❌ Não encontrado")
            return None
        
        if response.status_code != 200:
            print(f" ❌ Erro HTTP {response.status_code}")
            return None
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extrair perícopes
        pericopes = extract_pericopes_from_page(soup, livro_id, capitulo)
        
        if pericopes:
            print(f" ✅ {len(pericopes)} perícopes encontradas")
        else:
            print(" ⚠️ Nenhuma perícope encontrada")
        
        return pericopes
        
    except requests.exceptions.Timeout:
        print(" ❌ Timeout")
        return None
    except Exception as e:
        print(f" ❌ Erro: {e}")
        return None

def download_biblia_ara():
    """
    Função principal para baixar a Bíblia ARA e extrair perícopes do AT.
    """
    print("=" * 80)
    print("DOWNLOAD DA BÍBLIA ARA DO SITE BIBLIA.COM")
    print("Extração de Perícopes do Antigo Testamento")
    print("=" * 80)
    
    pericopes_at = {}
    
    # Limites de capítulos por livro (AT)
    max_capitulos_at = {
        'GEN': 50, 'EXO': 40, 'LEV': 27, 'NUM': 36, 'DEU': 34,
        'JOS': 24, 'JDG': 21, 'RUT': 4, '1SA': 31, '2SA': 24,
        '1KI': 22, '2KI': 25, '1CH': 29, '2CH': 36, 'EZR': 10,
        'NEH': 13, 'EST': 10, 'JOB': 42, 'PSA': 150, 'PRO': 31,
        'ECC': 12, 'SNG': 8, 'ISA': 66, 'JER': 52, 'LAM': 5,
        'EZK': 48, 'DAN': 12, 'HOS': 14, 'JOL': 3, 'AMO': 9,
        'OBA': 1, 'JON': 4, 'MIC': 7, 'NAM': 3, 'HAB': 3,
        'ZEP': 3, 'HAG': 2, 'ZEC': 14, 'MAL': 4
    }
    
    # Processar cada livro do AT
    for livro_id, livro_nome, livro_abrev in LIVROS_AT:
        print(f"\n📖 Processando {livro_nome} ({livro_abrev})...")
        
        max_caps = max_capitulos_at.get(livro_abrev, 50)
        pericopes_at[livro_abrev] = {}
        
        # Tentar cada capítulo até encontrar um 404 ou esgotar os capítulos
        for capitulo in range(1, max_caps + 1):
            pericopes_cap = fetch_chapter(livro_id, livro_nome, livro_abrev, capitulo, max_caps)
            
            if pericopes_cap is None:
                # Se retornou None e é o primeiro capítulo, o livro pode não existir
                if capitulo == 1:
                    print(f"    ⚠️ Livro {livro_nome} não encontrado no site")
                    break
                # Se não é o primeiro, provavelmente chegamos ao fim dos capítulos
                break
            
            if pericopes_cap:
                pericopes_at[livro_abrev][str(capitulo)] = pericopes_cap
            
            # Pausa para não sobrecarregar o servidor
            time.sleep(0.5)
        
        # Se não encontrou nenhum capítulo, remover o livro
        if not pericopes_at[livro_abrev]:
            del pericopes_at[livro_abrev]
            print(f"    ⚠️ Nenhum capítulo encontrado para {livro_nome}")
    
    # Estatísticas
    total_pericopes = sum(
        len(pericopes_at[livro][cap]) 
        for livro in pericopes_at 
        for cap in pericopes_at[livro]
    )
    total_livros = len(pericopes_at)
    total_capitulos = sum(len(pericopes_at[livro]) for livro in pericopes_at)
    
    print("\n" + "=" * 80)
    print("DOWNLOAD CONCLUÍDO")
    print("=" * 80)
    print(f"\nTotal de livros processados: {total_livros}")
    print(f"Total de capítulos: {total_capitulos}")
    print(f"Total de perícopes extraídas: {total_pericopes}")
    
    # Carregar perícopes existentes (para preservar Novo Testamento)
    pericopes_completas = {}
    arquivo_existente = Path('pericopes_ara.json')
    if arquivo_existente.exists():
        with open(arquivo_existente, 'r', encoding='utf-8') as f:
            pericopes_existentes = json.load(f)
        
        # Adicionar NT ao resultado final
        livros_at_set = set(abrev for _, _, abrev in LIVROS_AT)
        for livro_nt in pericopes_existentes:
            if livro_nt not in livros_at_set:
                pericopes_completas[livro_nt] = pericopes_existentes[livro_nt]
        
        print(f"\nPerícopes do Novo Testamento preservadas: {len([l for l in pericopes_existentes if l not in livros_at_set])} livros")
    
    # Adicionar perícopes do AT
    pericopes_completas.update(pericopes_at)
    
    # Salvar resultado
    arquivo_saida = 'pericopes_ara_atualizado.json'
    with open(arquivo_saida, 'w', encoding='utf-8') as f:
        json.dump(pericopes_completas, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Perícopes salvas em: {arquivo_saida}")
    print("=" * 80)
    
    # Também salvar backup do AT apenas
    arquivo_at = 'pericopes_ara_at.json'
    with open(arquivo_at, 'w', encoding='utf-8') as f:
        json.dump(pericopes_at, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Backup do AT salvo em: {arquivo_at}")
    
    return pericopes_at

if __name__ == '__main__':
    try:
        # Verificar se as bibliotecas necessárias estão instaladas
        try:
            import requests
            from bs4 import BeautifulSoup
        except ImportError as e:
            print(f"❌ Erro: Biblioteca não instalada: {e}")
            print("Execute: pip install requests beautifulsoup4")
            exit(1)
        
        download_biblia_ara()
    except KeyboardInterrupt:
        print("\n\n⚠️ Download interrompido pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro durante o download: {e}")
        import traceback
        traceback.print_exc()

