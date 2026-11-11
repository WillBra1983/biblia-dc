# Áudio da ARA

A leitura normal em `src/pages/Biblia.jsx` apresenta o `AraAudioPlayer`. Ao entrar no Strong, esse componente é desmontado e permanece apenas o player de áudio original. Não há reprodução automática. Durante a narração ARA, as marcações reais da gravação destacam o versículo e fazem a rolagem da leitura; avanço e retrocesso no áudio atualizam a posição. É possível desativar o acompanhamento. Introduções e intervalos sem versículo não recebem destaque.

## Arquivos salvos e reprodução offline

O controle principal mostra apenas **Ouvir**, com o fone. Dentro das opções do player, **Selecionar arquivo já baixado** abre o seletor do sistema para associar um arquivo em Downloads ou outra pasta ao capítulo atual. O player usa uma URL local, sem upload ou consulta ao Firebase. O arquivo é também guardado no armazenamento do aplicativo, preservando o original. **Ouvir offline** aparece somente quando há uma cópia efetivamente salva para a versão e capítulo selecionados. Para arquivos de provedores de nuvem, o próprio sistema pode exigir o download inicial.

O nome do arquivo aparece no player. O conteúdo escolhido manualmente não é identificado automaticamente como uma tradução ou capítulo específico. O navegador/aparelho precisa oferecer suporte ao formato selecionado. Ao fechar o player, trocar de capítulo ou entrar no Strong, o áudio para e a URL temporária é liberada. A cópia em IndexedDB pode ser reaberta sem selecionar o arquivo novamente. O aplicativo não examina pastas automaticamente nem guarda permissão de acesso a elas entre sessões.

As marcações consultadas online ficam salvas no armazenamento local do aplicativo, vinculadas ao capítulo e à gravação 549. Para acompanhar um arquivo offline, abra previamente o áudio online desse capítulo para guardar as marcações. Ao selecionar o arquivo salvo, o acompanhamento começa desativado; o usuário deve confirmar que é a mesma gravação ARA do mesmo capítulo baixada do bible.com. O aplicativo não identifica a gravação pelo conteúdo do arquivo. Um arquivo diferente, editado ou recortado pode não corresponder aos tempos salvos. Limpar os dados do aplicativo/navegador também remove as marcações. Sem marcações, o arquivo continua reproduzindo normalmente.

A abertura de arquivos locais não faz requisições de rede. A sincronização online usa a função atualizada, que precisa ser republicada, além da atualização da interface web ou nativa.

## Fonte e resolução dos capítulos

O MP3 é transmitido diretamente do CDN indicado pelo player público da YouVersion para a ARA da Sociedade Bíblica do Brasil (versão 1608, gravação 549). O aplicativo mantém o crédito da gravação e um link para a página do capítulo.

A função Firebase `obterAudioAra` consulta os metadados públicos em `https://audio-bible.youversionapi.com/3.1/chapter.json?reference=JHN.1&version_id=1608`, selecionando a gravação 549 e suas marcações `timing` por versículo. Recebe somente o número do livro e do capítulo; valida a referência, a gravação, o domínio e a tradução antes de retornar a URL e os intervalos. Marcações inválidas não são utilizadas. Se essa consulta falhar, tenta o `AudioObject` JSON-LD da página pública para manter a reprodução, sem inventar marcações. Armazena metadados em memória por 24 horas, reúne consultas simultâneas e permite uma nova consulta pelo botão de tentativa. Não baixa nem armazena os arquivos de áudio e não exige chave de API de terceiros. O limite de execução é de 30 segundos para comportar as duas consultas, cada uma com limite de 10 segundos.

Todos os capítulos agora usam a função publicada, inclusive Gênesis 1. Os 1.189 capítulos têm referências mapeadas; isso não significa que todos os arquivos remotos foram reproduzidos ou que sua disponibilidade esteja garantida. Se a estrutura da fonte mudar, o resolvedor pode precisar de atualização. Acesso público ao arquivo não altera os direitos da gravação.

## Ativação

Republicar a função atualizada no projeto Firebase já configurado:

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "60"
npx firebase-tools deploy --only functions:obterAudioAra --project biblia-dc
```

O limite de descoberta é informado em segundos. A configuração acima concede 60 segundos para o CLI carregar os módulos do projeto durante a análise; não altera o tempo de execução da função. Se o carregamento ainda falhar, investigar a inicialização global antes de aumentar o limite novamente.

Depois, publicar a versão web ou gerar a versão nativa pelo fluxo habitual do projeto. Essas publicações ainda não foram executadas nesta implementação.

## Verificação

```powershell
node scripts/test-ara-audio.mjs
node scripts/test-ara-player.mjs
# Opcional, com acesso à internet:
node scripts/check-ara-audio-live.mjs
```

O primeiro comando verifica referências, extração, rejeição de URLs incompatíveis, cache, marcações, erros, persistência offline e sintaxe dos arquivos de interface. O segundo executa o componente em um host simulado de hooks e mídia, cobrindo abertura, falhas, respostas atrasadas, troca de capítulo, desmontagem e atualização do versículo pelo tempo de reprodução. O terceiro consulta a fonte real em sete capítulos: Gênesis 1, Salmos 23 e 119, Mateus 1, João 1 e 3 e Apocalipse 22. A consulta confirmou 346 intervalos desses sete capítulos, incluindo os 176 versículos de Salmos 119. Esses testes não substituem a reprodução real no navegador ou dispositivo.

A reprodução de Gênesis 1 foi confirmada anteriormente no player da fonte. O teste visual da integração local não pôde ser concluído porque a ferramenta de navegador encerrou inesperadamente. Após publicar, conferir a reprodução em capítulos de ambos os Testamentos, a troca de capítulo, a entrada no Strong e uma falha de rede em web e dispositivo.
