# Quiz Bíblico integrado à Bíblia

## Resultado da integração — 22/11/2026

O menu existente `/quiz-retiro` passa a abrir a versão importada de `C:\Quiz Retiro\www`, isolada em uma página local para não misturar estilos e IDs com a Bíblia. São 799 perguntas em 16 fases (15 fases com 50 e uma com 49), trilhas, desafio diário, conquistas, rankings e competições. A cópia original em `C:\Quiz Retiro` não foi alterada.

Os arquivos importados ocupam aproximadamente 1,07 MiB antes da compressão. Não foi acrescentado SDK de anúncio, serviço pago ou novo banco. Os scripts do jogo são executados ao abrir a seção. O cache offline da Bíblia pode guardar esses arquivos durante a atualização normal.

## O que foi retirado e corrigido

- Banners, espaços de anúncio, telas e contagens de espera, anúncios simulados e condicionamento de dicas a anúncio. A dica é gratuita e continua indisponível em competição.
- Configuração de anúncios e explicações sobre monetização.
- Segundo fluxo de autenticação, bibliotecas Firebase compat carregadas da internet, manifesto e service worker do aplicativo independente. O service worker antigo poderia excluir caches usados pela Bíblia.
- Erros de chaves e declarações soltas no CSS de origem.
- Bloqueio da tela de resultado pela confirmação de saída de uma rodada concluída.
- Gravações de melhor pontuação por leitura seguida de escrita, substituídas por transações que preservam uma pontuação superior e os campos de perfil existentes.
- Permissões amplas em competições: configuração e controles administrativos passam a exigir o criador registrado em `config/criadoPorUid`; participante não pode aprovar a própria reentrada ou remover outros participantes.
- Enunciado sobre os 33 capítulos de Westminster especifica a redação original de 1647. O identificador anterior foi preservado para compatibilidade de progresso. Referência: https://www.wts.edu/wcf e https://opc.org/documents/WCF_orig.html.

## Conta, progresso e pontuação

O jogo reutiliza a sessão Firebase já aberta na Bíblia. O botão de conta abre o perfil do aplicativo. Não há cópia de tokens ou credenciais para o jogo.

| Informação | Destino |
| --- | --- |
| Melhor pontuação geral | `quizBiblicoRanking/{uid}` — mesmo ranking existente, respeitando a opção de participação |
| Quadros por trilha | `quizRetiroBoards/{quadro}/{uid}` |
| Competições | `quizRetiroTorneios/{codigo}` |
| Progresso da versão integrada | `users/{uid}/quizRetiro/novoQuiz` |
| Progresso anterior da Bíblia | Mantido em `users/{uid}/quizRetiro` e nas chaves locais anteriores |

As novas chaves locais usam `quizBibliaV2_`, com cópias separadas por conta no mesmo aparelho. As chaves antigas não são removidas. Melhores resultados e desbloqueios locais anteriores são aproveitados na primeira inicialização. Partidas antigas com identificadores numéricos não são convertidas arbitrariamente para perguntas diferentes. Progresso na nuvem do aplicativo independente só é migrado quando contém os identificadores textuais compatíveis com o acervo novo. Os dados originais permanecem preservados.

O sincronismo novo inclui o descarte/conclusão: uma partida apagada localmente não deve reaparecer por continuar gravada na nuvem. Uma partida ativa não é substituída por uma atualização remota durante o jogo.

Resultados são compartilhados com o link identificado do Quiz na Bíblia. Convites de competição incluem nome do aplicativo, código e link de instalação da Bíblia, em vez de orientar a instalar o aplicativo independente. Após instalar, o participante pode informar o código na seção Competição. A integração não promete recuperar automaticamente o torneio depois de uma instalação nova.

## Validação e limites

`node scripts/test-quiz-integrado.cjs` verifica JavaScript, ausência dos mecanismos de publicidade, sessão reaproveitada, larguras 320/390/768, dica, avanço, gravação em caminho separado, retomada, conclusão de rodada, pontuação, transações de ranking, opção de privacidade, compartilhamento e troca de conta. Usa Chrome com conta e banco simulados; não grava pontos em contas reais.

`node scripts/test-quiz-regras.cjs` avalia localmente 27 cenários das expressões alteradas nas regras. Não substitui um teste no emulador ou a validação feita pelo Firebase durante a publicação.

A auditoria estrutural verificou as 799 perguntas, a existência de enunciados e alternativas, os limites do índice de resposta e alternativas exatamente repetidas. Não constitui cotejo bíblico e doutrinário integral de todas as perguntas. O relatório antigo do aplicativo independente não corresponde integralmente aos IDs e enunciados atuais.

As pontuações continuam calculadas pelo cliente, como antes: esta alteração não cria um sistema de classificação certificado contra fraude. Testes físicos em Android/iOS e validação com os serviços publicados continuam necessários antes de distribuir a atualização.

## Interface e pontuação simplificadas

A tela inicial reúne Explorar trilhas, Desafio do dia, Competição em grupo, Ranking e Minhas conquistas, com cartões e ícones, tipografia maior e disposição adaptada ao celular. A partida salva continua com seu atalho de retomada. As instruções extensas ficam em Como jogar.

Todos os modos agora usam **10 pontos por acerto**, sem multiplicação por sequência, desconto por erro ou bônus de velocidade. Uma rodada de 50 perguntas tem máximo de 500 pontos. As sequências de dias e conquistas continuam como indicadores de progresso, separados dos pontos da rodada.

Resultados antigos são comparados pelo número de acertos multiplicado por dez. O ranking não compara uma pontuação cumulativa antiga diretamente com a pontuação fixa nova. As melhores marcas por trilha e os requisitos para avançar também usam essa escala. Partidas retomadas recalculam os pontos pelas respostas já registradas. O histórico não é apagado.

O adaptador `scripts/adaptar-quiz-interface.mjs` é aplicado automaticamente ao reimportar o Quiz, para preservar a interface e as regras atuais. O cálculo próprio `js/quiz-scoring.js` não é substituído pela versão do aplicativo independente.

Validação da atualização: 27 verificações da interface no Chrome e 8 da escala do ranking, incluindo conversão de registros antigos e concorrência de gravações. Conta e banco foram simulados. As capturas de inspeção foram feitas nas larguras de 390 e 960 pixels; os testes também verificam 320 e 768 pixels.

## Publicação

As regras alteradas precisam ser publicadas no projeto correto, pelo PowerShell na pasta Salvation:

```powershell
npx firebase-tools deploy --only database --project biblia-dc
```

Depois, gere e distribua a nova versão pelos procedimentos existentes do projeto. Esta integração não exige publicar novas Cloud Functions. O comando `npm run deploy:compartilhamento` continua destinado às funções de compartilhamento e não publica regras nem atualiza o aplicativo.

Para reimportar uma versão futura do código independente, o comando é `node scripts/importar-quiz-retiro.mjs`. Ele reaplica as remoções e adaptações, preservando os adaptadores próprios `integracao-biblia.js` e `firebase-cloud-sync.js`. Não é necessário executar a importação para cada build.
