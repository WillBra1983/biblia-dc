# Licencas de Fontes Biblicas (Strong e Interlinear)

Este documento define criterio de aprovacao de fontes biblicas e lexicais para uso no app, com foco em evitar obrigacao de abrir o codigo-fonte do aplicativo principal.

## Objetivo

- Permitir recursos de Strong (busca por H/G e clique em palavra) sem contaminar o app com licencas copyleft fortes.
- Padronizar decisao: `Aprovado`, `Revisar`, `Bloqueado`.
- Registrar atribuicoes obrigatorias para distribuicao.

## Matriz de decisao (atual)

| Bloco | Fonte candidata | Licenca/estado | Status | Acao recomendada |
|---|---|---|---|---|
| AT texto + tokens | `openscriptures/morphhb` | CC BY 4.0 (atribuicao obrigatoria) | Aprovado | Integrar com creditos e atribuicao no app |
| AT texto (referencia UXLC) | [tanach.us](https://tanach.us/License.html) | Texto biblico hebraico sem restricao (citacao apreciada) | Aprovado | Opcional; app usa MorphHB vocalizado (WLC) |
| Fonte UI hebraico | Google Fonts Noto Serif Hebrew | SIL OFL | Aprovado | Carregada em index.html para niqqud/ta'amim |
| AT lexico HebrewLexicon (Strong + LexicalIndex + BDB XML do repositorio) | `openscriptures/HebrewLexicon` | CC BY 4.0 (conforme pagina do projeto) | Aprovado | Pode embutir no app proprietario com atribuicao obrigatoria |
| AT lexico Strong | Base nao-GPL com licenca explicita | Variavel | Revisar | Aprovar somente com licenca permissiva/PD |
| NT texto grego (TR) | Edicao especifica de Textus Receptus | Depende da edicao | Revisar | Validar arquivo/edicao e termos de redistribuicao |
| NT mapeamento palavra->Strong | Dataset de alinhamento | Variavel | Revisar | Aprovar somente com licenca permissiva/PD |
| Dicionario Strong (Open Scriptures `strongs`) | `strongs-dictionary.xhtml` | Cabecalho informa GPL 3.0 | Bloqueado para embed | Nao empacotar no APK/IPA |
| SQLite unico AT+NT no app | Somente insumos aprovados | Viavel | Aprovado condicional | Apenas apos auditoria de todas as fontes |

## Criterios de aprovacao

Uma fonte so pode ser marcada como `Aprovado` se atender **todos** os pontos abaixo:

1. Licenca explicita no repositorio **e** no arquivo/dataset usado.
2. Licenca compativel com app proprietario (ex.: CC BY, MIT, BSD, dominio publico).
3. Sem clausulas copyleft forte exigindo abertura do app como um todo.
4. Atribuicao exigida documentada em `THIRD_PARTY_NOTICES.md`.
5. Versao congelada (URL + commit/tag + data de coleta).

Se faltar evidencia de qualquer ponto, status = `Revisar`.
Se for GPL para conteudo embarcado no app distribuido, status = `Bloqueado`.

## Regras de integracao para reduzir risco

- Nao incluir no app dados com licenca GPL sem validacao juridica formal.
- Nao converter dataset GPL e redistribuir como SQLite interno do app.
- Nao misturar dados de origem/licenca duvidosa em base unica de producao.
- Manter trilha de auditoria de cada arquivo importado.

## Atribuicao obrigatoria (modelo)

Para fontes CC BY, incluir na tela "Sobre" e no arquivo de notices:

- Nome da obra
- URL da fonte
- Licenca
- Texto de atribuicao exigido pelo mantenedor

Exemplo para MorphHB (conforme LICENSE.md):

> Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb

## Plano tecnico recomendado

### Fase 1 (segura, MVP)

- Integrar AT com `morphhb`.
- Criar estrutura de lookup Strong (`strong_entry`) apenas com fonte aprovada.
- Botao "Strong" com modal de detalhes.

### Fase 2 (NT)

- Selecionar edicao TR com licenca aprovada.
- Selecionar mapeamento NT palavra->Strong com licenca aprovada.
- Integrar ao mesmo fluxo de UI.

## Registro de fontes analisadas

- Open Scriptures (organizacao): https://github.com/openscriptures
- MorphHB: https://github.com/openscriptures/morphhb
- Licenca MorphHB: https://raw.githubusercontent.com/openscriptures/morphhb/master/LICENSE.md
- Strongs (repositorio): https://github.com/openscriptures/strongs
- Strongs dictionary (cabecalho com GPL): https://raw.githubusercontent.com/openscriptures/strongs/master/strongs-dictionary.xhtml
- HebrewLexicon (Open Scriptures): https://github.com/openscriptures/HebrewLexicon
- Pagina do HebrewLexicon (licenca CC BY 4.0): https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/index.html

## Nota especifica sobre BDB e TWOT

- `BDB` no app (neste momento) e usado como referencia/indice lexical e, quando clicavel, abre busca externa.
- O dataset `openscriptures/HebrewLexicon` informa licenca CC BY 4.0 para o trabalho distribuido no repositorio.
- `TWOT` e tratado como identificador de referencia; nao estamos embutindo texto proprietario de TWOT.

## Observacao juridica

Este documento serve para triagem tecnica e compliance basico de engenharia.
Nao substitui parecer juridico formal.
