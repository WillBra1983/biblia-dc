#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para comparar perícopes do JSON com o banco SQLite
"""

import sqlite3
import json

# Conectar ao banco
conn = sqlite3.connect('ara.sqlite')
cursor = conn.cursor()

# Carregar JSON
with open('pericopes_ara.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=" * 80)
print("COMPARAÇÃO JSON vs BANCO SQLITE - GÊNESIS 18")
print("=" * 80)

# Buscar no banco
cursor.execute('''
    SELECT versiculo, titulo 
    FROM pericopes 
    WHERE livro_id = 1 AND capitulo = 18 
    ORDER BY versiculo
''')
db_results = cursor.fetchall()

# Buscar no JSON
gen18_json = data.get('GEN', {}).get('18', [])

print("\n📊 RESULTADO DA COMPARAÇÃO:")
print("-" * 80)

todas_iguais = True
for vers_db, titulo_db in db_results:
    # Buscar correspondente no JSON
    pericope_json = [p for p in gen18_json if int(p.get('versiculo', 0)) == vers_db]
    
    if pericope_json:
        titulo_json = pericope_json[0]['pericope']
        iguais = titulo_db == titulo_json
        status = '✅' if iguais else '❌'
        
        print(f"\n{status} Versículo {vers_db}:")
        print(f"  Banco: {repr(titulo_db)}")
        print(f"  JSON:  {repr(titulo_json)}")
        
        if not iguais:
            todas_iguais = False
            print(f"  ⚠️ DIFERENTE!")
            print(f"     Banco tem {len(titulo_db)} caracteres")
            print(f"     JSON tem {len(titulo_json)} caracteres")
    else:
        print(f"\n⚠️ Versículo {vers_db}: Encontrado no banco mas não no JSON")
        todas_iguais = False

print("\n" + "=" * 80)
if todas_iguais:
    print("✅ TODAS AS PERÍCOPES ESTÃO IDÊNTICAS NO JSON E NO BANCO!")
else:
    print("❌ HÁ DIFERENÇAS ENTRE O JSON E O BANCO!")
print("=" * 80)

conn.close()

