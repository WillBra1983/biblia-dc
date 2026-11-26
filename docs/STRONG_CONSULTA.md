# Consulta Strong e reaproveitamento

## Armazenamento existente

- Lemma: significado geral, por código Strong. `localStorage` em `strongResumoLemma_v1:CODE`, com leitura do legado `strongResumoLocal_v1:CODE`. No Firebase: `bibliaEstudos/strongResumo_CODE`, `kind: strongResumo`.
- Token: explicação da forma em uma passagem. A chave inclui código, forma normalizada, livro/capítulo/versículo e morfologia. `localStorage` em `strongResumoToken_v1:CHAVE`. No Firebase: `bibliaEstudos/strongResumoToken_CODE_HASH`, `kind: strongResumoToken`, conservando `cacheKey` e `refPassagem`.
- A sessão conserva a combinação Lemma/Token para reabertura rápida. O contexto da palavra selecionada na Bíblia é outro registro de sessão; não é o texto gerado.
- Notas pessoais ficam separadas, em `users/UID/strongNotes/CODE`.

`resolverResumoLexicalInline` tenta sessão, cópia persistente local e conteúdo compartilhado antes de gerar. O Lemma é reaproveitado em outras passagens do mesmo código. O Token só é reaproveitado para a mesma chave contextual. A regeneração explícita (`forcar`) ignora o reaproveitamento. A consulta compartilhada exige autenticação pelas regras atuais. A publicação automática é uma tentativa opcional: uma falha de gravação pode deixar o texto disponível apenas no aparelho. O primeiro autor mantém a edição do registro canônico; outros usuários leem esse registro.

Falhas de leitura do Firebase passaram a impedir a geração automática do texto correspondente. Uma falha de rede ou permissão não demonstra que o texto está ausente. Essas mudanças não acrescentam bloqueio distribuído para duas primeiras gerações simultâneas.

## Acesso pelo menu

`Strong`, em **Estudo e formação**, abre `/estudo-strong`. Pesquisa no `lexicon_ptbr` que já acompanha o aplicativo, sem novo arquivo de conteúdo, serviço pago ou chamada de geração. Aceita palavras, nomes, transliterações, original grego/hebraico, códigos H/G e números sem prefixo. Ignora acentos e marcas combinantes na busca; um número sem prefixo procura ambos os idiomas, salvo filtro selecionado. Até 40 resultados por pesquisa; é possível refinar o termo.

Os estudos disponíveis são reunidos das cópias locais e dos registros canônicos compartilhados. A nuvem é consultada por prefixo de chave, em páginas de 40; não se baixa todo `bibliaEstudos`. A filtragem textual dessa lista considera somente as páginas já carregadas; a pesquisa do dicionário abrange a base lexical e permite consultar diretamente o resumo canônico do código encontrado.

Ao selecionar um resultado, uma janela consulta exclusivamente textos existentes: Lemma por código e Tokens por prefixo exato do código. Os Tokens da nuvem abertos nessa janela são guardados no aparelho. Até 40 contextos são exibidos; os demais continuam acessíveis ao selecionar a palavra na passagem bíblica. Não são misturados Tokens de passagens diferentes como se fossem uma definição geral.

**Abrir estudo completo** mantém o fluxo já existente: reutiliza o que está salvo e pode gerar uma explicação ausente. A janela avisa sobre essa possibilidade quando não possui um Lemma. O retorno à consulta preserva os parâmetros da pesquisa. Não há mudança nas regras nem em Cloud Functions; a interface precisa entrar no próximo build/deploy do aplicativo.

## Verificação

- `node scripts/test-strong-consulta.cjs`: busca no SQLite real, códigos, nomes, português, transliteração, original, caracteres especiais e caches separados.
- `node scripts/test-strong-reaproveitamento.cjs`: Lemma/Token compartilhados e locais, rede falhando sem gerar, primeira geração e reutilização por passagem, sem chamadas reais à IA ou Firebase.
- `node scripts/test-strong-consulta-ui.cjs`: componente real no Chrome em 320, 430 e 1024 px, busca, janela, fechamento, abertura de estudo completo, sem transbordamento horizontal; rede e conta simuladas.
- Regressões existentes: `test-strong-alternativas.cjs` e `test-strong-pesquisa.cjs`.

Não foi validado contra os dados da conta em produção nem em aparelho físico.
