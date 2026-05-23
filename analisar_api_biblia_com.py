#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para analisar o site biblia.com e encontrar a API ou método de acesso
"""

import requests
from bs4 import BeautifulSoup
import re
import json

def analisar_api():
    """Analisa o site para encontrar como acessar os dados"""
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    base_url = 'https://biblia.com/books/bb-sbb-ra/'
    
    print("=" * 80)
    print("ANALISANDO API DO SITE BIBLIA.COM")
    print("=" * 80)
    
    response = requests.get(base_url, headers=headers, timeout=10)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Procurar por scripts que possam conter URLs de API
    print("\n1. Analisando scripts...")
    scripts = soup.find_all('script')
    
    api_urls = []
    for script in scripts:
        if script.string:
            # Procurar por URLs de API
            urls_api = re.findall(r'https?://[^"\')\s]+api[^"\')\s]*', script.string, re.I)
            urls_biblia = re.findall(r'https?://[^"\')\s]*biblia[^"\')\s]*', script.string, re.I)
            
            if urls_api:
                api_urls.extend(urls_api)
            if urls_biblia:
                api_urls.extend(urls_biblia)
            
            # Procurar por padrões de endpoint
            endpoints = re.findall(r'["\'](/api/[^"\']+)["\']', script.string)
            if endpoints:
                for endpoint in endpoints:
                    full_url = f'https://biblia.com{endpoint}'
                    api_urls.append(full_url)
    
    # Remover duplicatas
    api_urls = list(set(api_urls))
    
    if api_urls:
        print(f"  ✅ {len(api_urls)} possíveis URLs de API encontradas:")
        for url in api_urls[:10]:
            print(f"    - {url}")
    else:
        print("  ⚠️ Nenhuma URL de API encontrada nos scripts")
    
    # Procurar por dados inline no HTML
    print("\n2. Procurando dados inline no HTML...")
    data_scripts = soup.find_all('script', type=re.compile(r'json|data', re.I))
    for script in data_scripts:
        if script.string:
            try:
                data = json.loads(script.string)
                print(f"  ✅ Dados JSON encontrados!")
                print(f"     Chaves: {list(data.keys())}")
            except:
                pass
    
    # Procurar por atributos data-* que possam conter URLs
    print("\n3. Procurando atributos data-*...")
    data_attrs = soup.find_all(attrs=re.compile(r'data-'))
    for elem in data_attrs[:10]:
        for attr in elem.attrs:
            if 'data-' in attr and elem.attrs[attr]:
                value = str(elem.attrs[attr])
                if 'http' in value.lower() or 'api' in value.lower():
                    print(f"  - {attr}: {value[:80]}")
    
    # Tentar acessar a página diretamente no navegador e ver o que acontece
    print("\n4. Verificando se há um endpoint de busca ou navegação...")
    
    # Testar alguns endpoints comuns
    endpoints_teste = [
        '/api/books',
        '/api/bb-sbb-ra',
        '/api/chapters',
        '/books/bb-sbb-ra/api/chapters',
    ]
    
    for endpoint in endpoints_teste:
        url = f'https://biblia.com{endpoint}'
        try:
            resp = requests.get(url, headers=headers, timeout=5)
            if resp.status_code == 200:
                print(f"  ✅ {url} - Status: {resp.status_code}")
                try:
                    data = resp.json()
                    print(f"     Resposta JSON válida!")
                    if isinstance(data, dict):
                        print(f"     Chaves: {list(data.keys())[:10]}")
                except:
                    print(f"     Resposta não é JSON (tamanho: {len(resp.content)} bytes)")
        except:
            pass
    
    print("\n" + "=" * 80)
    print("ANÁLISE CONCLUÍDA")
    print("=" * 80)
    print("\n💡 SUGESTÃO: O site provavelmente usa JavaScript para carregar conteúdo.")
    print("   Pode ser necessário usar Selenium ou Playwright para renderizar o JavaScript")
    print("   e então extrair os dados, ou encontrar a API real que o site utiliza.")

if __name__ == '__main__':
    analisar_api()

