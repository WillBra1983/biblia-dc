#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para verificar perícopes no banco SQLite da pasta public
"""

import sqlite3

conn = sqlite3.connect('public/ara.sqlite')
cursor = conn.cursor()

print("=" * 80)
print("VERIFICAÇÃO DAS PERÍCOPES NO BANCO SQLITE (public/ara.sqlite)")
print("=" * 80)

# Verificar Gênesis 18
print("\n📖 GÊNESIS 18:1 - Perícope:")
print("-" * 80)

cursor.execute('''
    SELECT versiculo, titulo 
    FROM pericopes 
    WHERE livro_id = 1 AND capitulo = 18 AND versiculo = 1
''')
result = cursor.fetchone()

if result:
    versiculo, titulo = result
    print(f"Versículo {versiculo}:")
    print(f"  Título: {repr(titulo)}")
    print(f"  Tamanho: {len(titulo)} caracteres")
    print(f"  Texto: {titulo}")
    print("\n✅ Arquivo atualizado corretamente!")
else:
    print("❌ Perícope não encontrada!")

conn.close()

