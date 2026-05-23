#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para verificar perícopes no banco SQLite
"""

import sqlite3

conn = sqlite3.connect('ara.sqlite')
cursor = conn.cursor()

print("=" * 80)
print("VERIFICAÇÃO DAS PERÍCOPES NO BANCO SQLITE (ara.sqlite)")
print("=" * 80)

# Verificar Gênesis 18
print("\n📖 GÊNESIS 18 - Todas as perícopes:")
print("-" * 80)

cursor.execute('''
    SELECT versiculo, titulo 
    FROM pericopes 
    WHERE livro_id = 1 AND capitulo = 18 
    ORDER BY versiculo
''')
results = cursor.fetchall()

for versiculo, titulo in results:
    print(f"\nVersículo {versiculo}:")
    print(f"  Título: {repr(titulo)}")
    print(f"  Tamanho: {len(titulo)} caracteres")
    print(f"  Texto: {titulo}")

# Verificar perícope específica de Gênesis 18:1
print("\n" + "=" * 80)
print("PERÍCOPE ESPECÍFICA - Gênesis 18:1:")
print("=" * 80)

cursor.execute('''
    SELECT livro_id, capitulo, versiculo, titulo 
    FROM pericopes 
    WHERE livro_id = 1 AND capitulo = 18 AND versiculo = 1
''')
result = cursor.fetchone()

if result:
    livro_id, cap, vers, titulo = result
    print(f"\nLivro ID: {livro_id}")
    print(f"Capítulo: {cap}")
    print(f"Versículo: {vers}")
    print(f"\nTítulo completo (repr): {repr(titulo)}")
    print(f"Tamanho: {len(titulo)} caracteres")
    print(f"\nTexto visível:")
    print(f"'{titulo}'")
    
    # Verificar se há caracteres especiais ou espaços no final
    print(f"\nVerificações:")
    print(f"  - Começa com: {repr(titulo[:10])}...")
    print(f"  - Termina com: ...{repr(titulo[-10:])}")
    print(f"  - Tem espaços extras no início: {titulo != titulo.lstrip()}")
    print(f"  - Tem espaços extras no final: {titulo != titulo.rstrip()}")
    print(f"  - Tem caracteres não imprimíveis: {not titulo.isprintable()}")
else:
    print("\n❌ Perícope não encontrada!")

# Verificar outras perícopes para comparação
print("\n" + "=" * 80)
print("ESTATÍSTICAS:")
print("=" * 80)

cursor.execute('SELECT COUNT(*) FROM pericopes WHERE livro_id = 1 AND capitulo = 18')
count = cursor.fetchone()[0]
print(f"Total de perícopes em Gênesis 18: {count}")

cursor.execute('SELECT MIN(versiculo), MAX(versiculo) FROM pericopes WHERE livro_id = 1 AND capitulo = 18')
min_max = cursor.fetchone()
print(f"Versículos com perícopes: {min_max[0]} a {min_max[1]}")

# Verificar se há caracteres truncados ou problemas
print("\n" + "=" * 80)
print("VERIFICAÇÃO DE PROBLEMAS:")
print("=" * 80)

cursor.execute('''
    SELECT versiculo, titulo, LENGTH(titulo) as tamanho
    FROM pericopes 
    WHERE livro_id = 1 AND capitulo = 18
    ORDER BY versiculo
''')
all_results = cursor.fetchall()

for vers, tit, tamanho in all_results:
    # Verificar se o texto termina com "..." (possível truncamento)
    if tit.endswith('...'):
        print(f"⚠️ Versículo {vers}: Termina com '...' (possível truncamento)")
    # Verificar se há caracteres não ASCII problemáticos
    if any(ord(c) > 127 and ord(c) < 160 for c in tit):
        print(f"⚠️ Versículo {vers}: Contém caracteres não ASCII problemáticos")

conn.close()
print("\n✅ Verificação concluída!")

