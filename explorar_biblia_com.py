#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para explorar a estrutura do site biblia.com e encontrar perícopes
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time

def explorar_site():
    """Explora o site para entender como acessar os capítulos e perícopes"""
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    base_url = 'https://biblia.com/books/bb-sbb-ra/'
    
    print("=" * 80)
    print("EXPLORANDO SITE BIBLIA.COM")
    print("=" * 80)
    
    # Testar URL base
    print(f"\n1. Acessando URL base: {base_url}")
    response = requests.get(base_url, headers=headers, timeout=10)
    
    if response.status_code != 200:
        print(f"❌ Erro ao acessar URL base: {response.status_code}")
        return
    
    soup = BeautifulSoup(response.content, 'html.parser')
    print(f"✅ Página carregada ({len(response.content)} bytes)")
    
    # Procurar por links para livros ou capítulos
    print("\n2. Procurando links para livros/capítulos...")
    links = soup.find_all('a', href=True)
    
    livros_encontrados = []
    for link in links:
        href = link.get('href', '')
        text = link.get_text(strip=True)
        
        # Procurar links que podem levar a livros/capítulos
        if any(livro.lower() in href.lower() or livro.lower() in text.lower() 
               for livro in ['genesis', 'gênesis', 'exodo', 'êxodo', 'levitico', 'levítico']):
            livros_encontrados.append((text, href))
            print(f"  - {text[:40]:40} -> {href[:60]}")
    
    # Procurar por scripts que possam conter dados JSON
    print("\n3. Procurando scripts com dados JSON...")
    scripts = soup.find_all('script')
    for script in scripts:
        if script.string and ('genesis' in script.string.lower() or 'chapter' in script.string.lower()):
            # Procurar por JSON no script
            json_match = re.search(r'\{.*\}', script.string, re.DOTALL)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                    print(f"  ✅ JSON encontrado no script!")
                    print(f"     Chaves: {list(data.keys())[:10]}")
                except:
                    pass
    
    # Procurar por elementos de navegação
    print("\n4. Procurando elementos de navegação...")
    nav_elements = soup.find_all(['nav', 'div'], class_=re.compile(r'nav|menu|book|chapter', re.I))
    for nav in nav_elements[:5]:
        texto = nav.get_text(strip=True)
        if texto:
            print(f"  - {texto[:100]}")
    
    # Tentar acessar um capítulo diretamente usando diferentes formatos
    print("\n5. Testando diferentes formatos de URL para Gênesis 1...")
    urls_teste = [
        'https://biblia.com/books/bb-sbb-ra/genesis/1',
        'https://biblia.com/books/bb-sbb-ra/gen/1',
        'https://biblia.com/books/bb-sbb-ra/gn/1',
        'https://biblia.com/books/bb-sbb-ra/1/1',
        'https://biblia.com/books/bb-sbb-ra/book/1/chapter/1',
    ]
    
    for url in urls_teste:
        print(f"\n  Testando: {url}")
        try:
            resp = requests.get(url, headers=headers, timeout=5)
            if resp.status_code == 200:
                soup_test = BeautifulSoup(resp.content, 'html.parser')
                title = soup_test.title.string if soup_test.title else 'N/A'
                
                # Procurar perícopes
                h4_tags = soup_test.find_all('h4')
                pericopes = [h.get_text(strip=True) for h in h4_tags if len(h.get_text(strip=True)) > 10]
                
                # Procurar versículos
                verse_elements = soup_test.find_all(class_=re.compile(r'verse|versiculo|v-', re.I))
                
                print(f"    ✅ Status: {resp.status_code}")
                print(f"    Título: {title[:60]}")
                print(f"    H4 encontrados: {len(h4_tags)}")
                if pericopes:
                    print(f"    Perícopes encontradas: {len(pericopes)}")
                    for p in pericopes[:3]:
                        print(f"      - {p[:60]}")
                print(f"    Elementos de versículos: {len(verse_elements)}")
                
                if resp.status_code == 200 and len(resp.content) > 10000:
                    print(f"    ✅ URL FUNCIONA! Tamanho: {len(resp.content)} bytes")
                    break
            else:
                print(f"    ❌ Status: {resp.status_code}")
        except Exception as e:
            print(f"    ❌ Erro: {e}")

if __name__ == '__main__':
    explorar_site()

