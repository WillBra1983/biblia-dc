# Prova Tecnica Strong (AT + NT)

Este documento descreve a prova tecnica de dados Strong para AT e NT.

## O que foi implementado

- Scripts de build de dados:
  - `scripts/build_ot_strong.py`
  - `scripts/prova_nt_morphgnt_build.py`
- Bancos gerados em:
  - `public/ot_strong.sqlite`
  - `public/nt_prova.sqlite`
- Servico de leitura no app:
  - `src/services/ntStrongProvaService.js`
  - `src/services/otStrongService.js`

## Fontes usadas na prova

- Tokens/morfologia NT: MorphGNT SBLGNT (`morphgnt/sblgnt`)
- Dicionario Strong grego (CC0): `morphgnt/strongs-dictionary-xml`
- Tokens/lemmas AT: MorphHB (`openscriptures/morphhb`)

## Como executar

No raiz do projeto:

```bash
npm run prova:nt
```

Para gerar AT e NT em sequencia:

```bash
npm run build:strong:all
```

Ao final, os scripts imprimem:

- total de tokens AT importados;
- total de tokens NT importados;
- total de versos agregados;
- total de entradas Strong grego;
- consultas de smoke test.

## Estrutura principal do banco de prova

- `nt_books`
- `nt_tokens`
- `nt_verses`
- `strong_greek`
- `strong_greek_lemma_index`

## APIs de leitura (servico)

- `verificarBancoNtProva()`
- `buscarTokensNt(bookNum, chapter, verse)`
- `buscarStrongGrego(strongCode)`
- `buscarStrongGregoPorLemma(lemma, limit)`

## Limite atual da prova

Para o NT, o mapeamento token->Strong segue correspondencia por lemma normalizado
na base de prova e pode exigir refinamento para casos ambiguos.

Proximo passo para producao completa:

- definir e integrar dataset NT com vinculacao explicita token->Strong (licenca aprovada).
