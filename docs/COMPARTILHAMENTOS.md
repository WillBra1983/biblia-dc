# Compartilhamentos do aplicativo

O destino externo comum é a função pública `baixarBiblia` do projeto `biblia-dc`. Cliques de Android seguem para Google Play; iPhone/iPad seguem para App Store. Robôs de mensageiros recebem HTML com Open Graph e Twitter Cards. Computadores recebem as duas opções de loja. A exibição e o cache da prévia dependem do mensageiro.

| Conteúdo | Identificação | Prévia |
| --- | --- | --- |
| Aplicativo | `app`, convite opcional | Logo original, nome e descrição |
| Opção do menu, incluindo Livraria | `secao`, ID da seção | Arte original do card, nome e descrição |
| Livro e trecho de livro | `livro`, ID, versão dos metadados | Capa, título, autor e apresentação pública |
| Bíblia | `biblia`, livro, capítulo, versículos e tradução | Referência e tradução |
| Strong | `strong`, código, registro público opcional | Código e identificação do estudo |
| Discipulado | `discipulado`, tema, lição e parte | Identificação da lição/questão/devocional |
| Versículo do dia/mural | `dia` ou `versiculo`, ID | Referência e texto do mural público |
| Hinário, salmos e cânticos | `cantico`, ID e grupo | Número e título; letras completas não são publicadas pela prévia |
| Westminster | `doutrina`, documento, capítulo/pergunta | Documento e seção |
| Estudos e explicações | `estudo` ou `explicacao`, ID/referência | Tipo de estudo e referência disponível |
| Teologia e avaliação | `teologia` ou `avaliacao`, ID | Identificação do recurso, sem resultado privado |
| Devocional | `devocional`, ID histórico | Título e dia editorial correto |
| Mensagem do carrossel | `destaque`, ID | Título e resumo da mensagem ativa; livro associado usa a capa |

`MenuOpcoesCompartilhar` e `nativeShare` normalizam os links externos, incluindo copiar, WhatsApp, Telegram, e-mail e SMS. Os anexos de imagens continuam com seus bytes originais; seus links/QR são identificados. Links internos de conversa permanecem apropriados para navegação interna.

Páginas cuja seleção não está na URL registram o conteúdo atual por `useCompartilhamentoPagina`: Bíblia, hinário, cânticos, devocional e livros. O botão flutuante de compartilhar do carrossel abre sempre o convite do aplicativo completo, independentemente de mostrar versículo, livraria, mensagem ou livro. Compartilhamentos específicos continuam nos botões próprios de cada conteúdo. Os critérios internos da exceção iOS não aparecem na janela de informações da campanha; ela apresenta somente a meta e as condições de leitura.

## Fontes e tamanho

`node scripts/sync-compartilhamento-meta.mjs` atualiza apenas metadados públicos a partir do catálogo, bancos do hinário, salmodia e devocional já existentes. O build executa essa sincronização em processo separado. Não há geração de novo texto bíblico nem cópia integral da Bíblia para a abertura.

As artes e capas em PNG são preparadas para o servidor em `functions/src/assets`; não são importadas no aplicativo. Capas remotas aceitam somente armazenamento público permitido, tamanho limitado e imagem raster válida. Livros despublicados/excluídos e falhas de consulta não revelam metadados privados. Imagens locais preservam proporções e não são ampliadas.

## Campanha

A meta é 10 indicações aceitas para um acesso de sete dias a um livro elegível do catálogo. No Android são novas contas com e-mail confirmado; conta própria, conta preexistente e repetições de conta/e-mail/aparelho não contam. Por decisão do mantenedor, no iPhone/iPad um clique válido no convite para a App Store já é aceito para a recompensa. Os dois critérios somam no mesmo contador e no resgate. Abrir a folha de compartilhamento, copiar ou buscar uma prévia não concede crédito. A interface não exige digitação de código e não libera créditos calculados por um servidor antigo com meta 5.

No Android, `InstallReferralPlugin` consulta a biblioteca oficial Play Install Referrer 2.2 com prazo de quatro segundos e encerramento da conexão. A captura roda em paralelo à abertura da Bíblia. `conviteInstalacaoService` mantém apenas o código validado em armazenamento local até registrar a visita; erros de rede podem ser retomados na próxima abertura ou ao recuperar conexão. Uma origem já processada não é contabilizada novamente. Não há leitura da área de transferência nem digitação de código. Abrir a loja ou instalar não concede crédito por si só: a confirmação continua no servidor após criar uma conta elegível com e-mail confirmado.

### Exceção de clique no iOS

`baixarBiblia` aplica a exceção somente a GETs com convite válido em navegador de iPhone/iPad/iPod ou no fluxo JavaScript que detecta iPadOS em modo Macintosh. Não credita HEAD, pré-carregamento/pré-renderização indicado pelos cabeçalhos, imagens, Android, computadores comuns ou agentes de prévia reconhecidos. O navegador recebe um identificador aleatório em cookie HTTPS HttpOnly; o retorno HTTP automático confirma que aceitou esse cookie antes de registrar. Se bloquear cookies, segue à loja sem crédito e sem ciclo de redirecionamentos. Não há página de cadastro, código manual ou serviço externo de atribuição.

`projetoCliqueIos` reserva o hash desse identificador globalmente para o primeiro remetente e acrescenta uma entrada idempotente em `contas/{uid}/cliquesIos`. As entradas têm `tipo: clique_ios`, não um registro de instalação. O contador retorna separadamente `contasConfirmadas` e `cliquesIos`; o total e o crédito de resgate incluem ambos. As gravações usam transações e podem concluir uma tentativa interrompida sem duplicar. O registro tem espera máxima de 2,5 segundos antes de seguir à loja; indisponibilidade não impede baixar.

Essa regra aceita o clique como critério promocional e não comprova download. A repetição é controlada pelo identificador do navegador, não pela identidade da pessoa: outro navegador, modo privado, remoção do cookie e acessos automatizados que imitam navegadores podem contornar esse controle. Não há leitura da área de transferência, impressão digital do aparelho ou armazenamento de IP para essa exceção.

**Limitação ainda pendente:** a compilação nativa Android foi tentada, mas o wrapper não conseguiu baixar o Gradle por bloqueio de rede. É necessário compilar com as dependências disponíveis e testar uma instalação real pela Play Store antes de validar essa integração de ponta a ponta. No iOS não haverá comprovação da instalação; a campanha usa a exceção de clique acima.

## Validação e publicação

Para publicar o conjunto de compartilhamento e liberação da leitura, executar `npm run deploy:compartilhamento` na raiz do projeto. O comando sincroniza as prévias e define `FUNCTIONS_DISCOVERY_TIMEOUT=120` antes do deploy restrito das seis funções. Esse limite é medido em segundos e se aplica à descoberta das funções pelo CLI; não aumenta o tempo de execução das requisições do aplicativo. Usar esse comando se a análise do código falhar com `Cannot determine backend specification. Timeout after 10000`.

Testes locais usam rede, contas, bancos e destinos externos simulados:

```powershell
node scripts/test-convite-lojas.cjs
node scripts/test-compartilhamento-conteudo.cjs
node scripts/test-compartilhamento-imagens.cjs
node scripts/test-projeto-compartilhar.cjs
node scripts/test-projeto-indicacoes.cjs
node scripts/test-convite-instalacao.cjs
node scripts/test-compartilhar-menu-ui.cjs
```

Executar o teste de interface e o build em sequência em computadores com pouca memória. O build válido escreve `dist/build-validado.json`. Não sincronizar um build web com base `/biblia/` para Android/iOS: usar `build:native` antes do Capacitor.

Publicar somente as funções desta alteração:

```powershell
node node_modules/firebase-tools/lib/bin/firebase.js deploy --only functions:baixarBiblia,functions:obterCampanhaProjeto,functions:registrarVisitaConviteProjeto,functions:confirmarIndicacaoProjeto,functions:resgatarLeituraProjeto --project biblia-dc --non-interactive
```

Publicar também o frontend pelo fluxo existente do projeto. Publicação nas lojas exige build e envio próprios de Android/iOS. Os testes locais não comprovam login Google real, publicação das funções, indexação de prévias por mensageiros nem atribuição após instalação.

O resgate depende também da versão de `obterArquivoLivroBiblioteca` que consulta `projetoIndicacoes/contas/{uid}/beneficios/{livroId}/acessoAte` e respeita o prazo sem liberar download. Há outras alterações locais na biblioteca; revisar esse conjunto antes de publicar essa função separadamente. O comando restrito acima não publica alterações de pagamento ou biblioteca.

### Estado da execução em 21/11/2026

O build web com base `/biblia/` terminou e passou no validador de publicação, sem copiar arquivos para o servidor. A tentativa restrita de deploy das cinco funções acima falhou antes da autenticação: `EPERM` ao abrir o arquivo de credenciais `firebase-tools.json` no perfil local. Nenhuma função foi publicada nessa tentativa. Retomar o comando em ambiente com acesso autorizado às credenciais e à rede; não apagar credenciais nem substituir o projeto Firebase para contornar o erro.
