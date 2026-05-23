#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para testar acesso ao site biblia.com e entender sua estrutura
"""

import requests
from bs4 import BeautifulSoup

def testar_urls():
    """Testa diferentes URLs para entender a estrutura do site"""
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    urls_teste = [
        'https://biblia.com/books/bb-sbb-ra/',
        'https://biblia.com/books/bb-sbb-ra/genesis',
        'https://biblia.com/books/bb-sbb-ra/genesis/1',
        'https://biblia.com/books/bb-sbb-ra/1',
        'https://biblia.com/books/bb-sbb-ra/1/1',
        'https://biblia.com/books/bb-sbb-ra/gn/1',
        'https://biblia.com/books/bb-sbb-ra/gen/1',
    ]
    
    print("=" * 80)
    print("TESTANDO ACESSO AO SITE BIBLIA.COM")
    print("=" * 80)
    
    for url in urls_teste:
        print(f"\n{'='*80}")
        print(f"Testando: {url}")
        print("-" * 80)
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            print(f"Status: {response.status_code}")
            print(f"Tamanho: {len(response.content)} bytes")
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Título da página
                title = soup.title.string if soup.title else 'N/A'
                print(f"Título: {title}")
                
                # Procurar por headings (h1-h6)
                for tag in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                    headings = soup.find_all(tag)
                    if headings:
                        print(f"\n{tag.upper()} encontrados ({len(headings)}):")
                        for h in headings[:5]:
                            texto = h.get_text(strip=True)
                            if texto:
                                print(f"  - {texto[:80]}")
                
                # Procurar por elementos com classes relacionadas a versículos/perícopes
                classes_interessantes = ['verse', 'versiculo', 'pericope', 'title', 'heading', 'chapter']
                for class_name in classes_interessantes:
                    elements = soup.find_all(class_=re.compile(class_name, re.I))
                    if elements:
                        print(f"\nElementos com classe '{class_name}' ({len(elements)}):")
                        for elem in elements[:3]:
                            texto = elem.get_text(strip=True)
                            if texto and len(texto) < 200:
                                print(f"  - {texto[:80]}")
                
                # Procurar por links
                links = soup.find_all('a', href=True)
                if links:
                    print(f"\nLinks encontrados ({len(links)}):")
                    for link in links[:10]:
                        href = link.get('href', '')
                        text = link.get_text(strip=True)
                        if 'genesis' in href.lower() or 'gen' in href.lower() or text:
                            print(f"  - {text[:30]:30} -> {href[:60]}")
                
                print("\n✅ URL VÁLIDA!")
                break  # Se encontrou uma URL válida, parar
                
            elif response.status_code == 404:
                print("❌ Não encontrado (404)")
            else:
                print(f"⚠️ Status não esperado: {response.status_code}")
                
        except requests.exceptions.Timeout:
            print("❌ Timeout")
        except requests.exceptions.RequestException as e:
            print(f"❌ Erro de requisição: {e}")
        except Exception as e:
            print(f"❌ Erro: {e}")
        
        print()

if __name__ == '__main__':
    import re
    testar_urls()

