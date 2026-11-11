# Versões bíblicas

A sigla no canto superior esquerdo do cabeçalho da leitura, abre a janela **Versão da Bíblia**, com os nomes completos de ARA, NAA e NTLH. Não há seletor grande nem explicação dessa preferência no corpo da leitura. A seleção fica guardada no aparelho. A mudança é confirmada somente depois que a base escolhida carrega; em caso de falha, a versão anterior permanece ativa. A janela fecha ao concluir a troca.

`bibliaService` mantém uma instância de SQLite e caches independentes por versão. Todas as suas consultas (capítulos, intervalos, referências, busca, livros e contagens) seguem a seleção global. A tela é remontada ao trocar a versão, e o cache de leitura é identificado pela tradução, impedindo que textos da escolha anterior reapareçam. As referências abertas por estudos, discipulado, confissões, catecismos e Strong usam esse serviço. O modo de apresentação também usa o texto selecionado.

Versículos marcados e versículo do dia recebem o texto da tradução escolhida na cópia de exibição. Notas, cores e registros persistidos não são reescritos. Conteúdo editorial, comentários e imagens/textos anteriormente publicados ou compartilhados conservam sua redação; abrir uma referência bíblica consulta a versão atual.

## Bases locais

| Versão | Fonte já existente no projeto | Base de leitura |
| --- | --- | --- |
| ARA | `public/ara.sqlite` | preservada |
| NAA | `naa.sqlite` | `public/bibles/naa.sqlite` |
| NTLH | `ntlh.txt` | `public/bibles/ntlh.sqlite` |

As três bases possuem 66 livros e 1.189 capítulos. A conferência executada é estrutural, sem cotejo editorial integral com as publicações. A NAA tem 31.105 versículos. A NTLH tem 31.103 números de versículos, apresentados em 30.310 blocos: a fonte reúne alguns números no mesmo texto. Esses intervalos são preservados por `verse_number` e `verse_end`; uma referência a Gênesis 6:10 retorna o bloco 9–10, sem usar a posição da linha como número de versículo. Slides e citações respeitam os intervalos e evitam repetir o bloco.

As novas bases têm títulos próprios: **3.044 perícopes na NAA** e **2.692 na NTLH**. A NAA foi conferida nos 1.189 capítulos da fonte publicada no bible.com; capítulos sem novo título são aceitos somente após validar o conteúdo e a referência. A NTLH usa os cabeçalhos do arquivo original `ntlh_bruta.txt`; numerações inconsistentes da extração antiga são reposicionadas pela correspondência exata do texto normalizado do capítulo (144 títulos). Títulos dentro de blocos agrupados são associados ao início do bloco. A busca por perícopes e os slides utilizam os mesmos registros da versão escolhida. As bases podem ser usadas offline depois do primeiro carregamento e armazenamento em cache na web; no aplicativo nativo, acompanham os arquivos empacotados.

O script `node scripts/import-naa-pericopes.mjs` consulta e guarda apenas os títulos e referências paralelas da NAA em `data/bible-pericopes/naa.json`, com checkpoints e retomada. O script `python scripts/prepare-bible-versions.py` gera as duas bases adicionais sem alterar os originais; não aceita um catálogo parcial de títulos. Ao modificar/regenerar os arquivos, atualizar suas revisões em `src/data/bibliaVersoes.js`, usando os hashes informados pelo script. O catálogo contém somente versões com texto integrado; as demais opções do catálogo de áudio do bible.com não são acrescentadas automaticamente como traduções de leitura.

## Áudio

O mesmo player e a função callable `obterAudioAra` (nome preservado por compatibilidade) agora recebem `versao`. Os identificadores de texto no bible.com são ARA 1608, NAA 1840 e NTLH 211. A ARA continua na gravação 549. As outras traduções selecionam a gravação padrão sem dramatização quando disponível, validando o identificador da versão e o endereço retornado. Se a fonte não fornecer áudio ou marcações válidas, o aplicativo informa a indisponibilidade; não substitui por uma gravação de outra tradução. O crédito da gravação e **Fonte: bible.com** são mantidos.

O controle principal mostra apenas fone e **Ouvir**. Nas opções do player é possível salvar o capítulo para ouvir offline, selecionar um arquivo já baixado, remover a cópia offline e controlar o acompanhamento. A opção **Ouvir offline** só aparece quando existe um arquivo efetivamente salvo para aquela versão, livro e capítulo no IndexedDB. Arquivos escolhidos manualmente são associados ao capítulo e guardados no armazenamento do aplicativo; o original na pasta do usuário é preservado. Um download feito apenas pelo menu nativo do navegador não informa sua localização ao aplicativo: use a seleção de arquivo nas opções para associá-lo ao capítulo.

O cache de marcações inclui versão, livro e capítulo. Abrir arquivo local não faz consultas à rede. A gravação conhecida, baixada pelo próprio player, permite o acompanhamento direto; um arquivo selecionado manualmente exige confirmação da gravação nas opções. Arquivos e marcações de outra versão não são reutilizados. A disponibilidade offline só é indicada depois de concluir a transação de armazenamento. Se o aparelho não permitir salvar ou faltar espaço, o aplicativo informa a falha sem anunciar o capítulo como disponível offline.

Os catálogos públicos de NAA e NTLH foram conferidos, mas a consulta direta às gravações dessas duas traduções encontrou falhas de rede no ambiente de desenvolvimento. A reprodução real dessas novas fontes precisa ser conferida após publicar; não foi declarada validada pelos testes simulados.

## Validação e publicação

### Comparação de traduções

Os controles de versão e comparação têm moldura com relevo, estados de foco e de toque. O botão com duas Bíblias e “VS” no canto superior direito do cabeçalho abre três painéis empilhados sobre a leitura, começando no livro, capítulo e versículo visível. Cada painel escolhe sua tradução independentemente. Os seletores de livro e capítulo e as setas alteram a passagem nos três painéis. Fechar a comparação preserva a leitura e a tradução global. Cada painel tem um botão para fechar quando há três versões visíveis; os dois restantes passam a ocupar metade do espaço cada. O botão “+” no cabeçalho reabre o terceiro painel, preservando a sua tradução e a posição sincronizada. Não é possível reduzir a comparação a menos de dois painéis.

As consultas explícitas `buscarCapituloNaVersao` e `buscarPericopesNaVersao` reutilizam as bases e os caches de cada tradução sem alterar a preferência global. A rolagem acompanha a posição do versículo, incluindo a fração percorrida dentro dele. Blocos como 9–10 são mapeados para o intervalo correspondente; dentro de um bloco agrupado, a distribuição entre seus números é proporcional. Eventos produzidos pela sincronização não iniciam ciclos de rolagem. Mudanças de tamanho reposicionam os painéis. Falhas de uma tradução são apresentadas no seu próprio painel, com nova tentativa; consultas antigas são descartadas ao mudar de passagem ou fechar.

Executar `node scripts/test-bible-comparison.mjs` para verificar a rolagem, os blocos agrupados e os limites. `node scripts/test-bible-versions.mjs` também verifica as consultas simultâneas e a preservação da preferência global.

```powershell
node scripts/test-bible-versions.mjs
node scripts/test-bible-pericopes.mjs
node scripts/test-ara-audio.mjs
node scripts/test-ara-player.mjs
npm run build
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "60"
npx firebase-tools deploy --only functions:obterAudioAra --project biblia-dc
```

Publicar a interface web ou gerar/sincronizar a versão nativa pelo fluxo habitual somente após um build válido. A integração não publica nem altera configurações do Firebase automaticamente. Conferir em aparelho: trocar versões no mesmo capítulo, reabrir o app, abrir referências no discipulado, versículos marcados, versículo do dia, projeção e reprodução online/offline. Na NTLH, conferir também referências aos números internos de blocos agrupados.

Se o ambiente restringir o empacotamento da configuração do Vite, usar `npm run build:web:lowmem -- --configLoader runner`. Esse comando mantém a validação dos arquivos de entrada e a geração de `build-validado.json`. O modo de pouca memória gera o service worker sem minificação, preservando o cache offline; o build normal continua otimizado para produção.
