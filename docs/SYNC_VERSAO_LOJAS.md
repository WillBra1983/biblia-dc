# Sincronizar versão da loja com o Firebase

O aviso de atualização no app lê `appConfig/lojaVersao` no Realtime Database. A Google Play **não escreve lá sozinha** — é preciso ligar os dois lados.

**Importante:** o aviso é **sempre opcional** (botão «Depois»). O app **nunca bloqueia** o uso por causa de versão.

## Android — ao gerar o build (pode rodar junto com android:build)

Depois de alterar `versionCode` / `versionName` em `android/app/build.gradle`:

```bash
npm run sync:android-version
```

Isso grava só metadados do build (`versaoBuild`, `versionCodeBuild`) — **não altera** `versaoAtual` que o app usa para avisar usuários. Assim você pode sincronizar **antes** de publicar na Play sem bloquear quem acabou de baixar o app.

Fluxo sugerido (tudo junto):

```bash
npm run android:build
npm run sync:android-version
# depois faça upload do AAB na Play Console
```

## Android — após publicar na Play (versaoAtual para usuários)

Quando o release estiver **ativo na loja**, atualize `versaoAtual`:

- **Botão admin:** «Sincronizar Android com Google Play» em Admin → Enviar aviso
- **Automático:** cron a cada 12 horas (Cloud Functions + Play API)

### Configurar acesso à Play Console (uma vez)

1. [Google Play Console](https://play.google.com/console) → **Configurações** → **Acesso à API**
2. Vincule o projeto Google Cloud **biblia-dc**
3. Conceda permissão à conta de serviço do Firebase
4. Permissão mínima: **Ver informações de apps**
5. Publique as functions:

```bash
firebase deploy --only functions:sincronizarVersaoPlayStoreAdmin,functions:sincronizarVersaoPlayStoreCron
```

**Opcional:** secret `PLAY_STORE_SERVICE_ACCOUNT` com JSON da conta de serviço.

### Nome da versão na Play Console

Use o mesmo **nome da versão** do Gradle (ex.: `1.0.1`) ao criar o release na Play — a API lê esse campo.

## iOS

Após publicar no TestFlight/App Store, preencha a secção iOS manualmente em Admin → Enviar aviso.

## Resumo

| Momento | O que fazer |
|--------|-------------|
| Sobe versão no Gradle + gera AAB | `npm run sync:android-version` (só registra build) |
| Release **ativo** na Play | Botão admin ou cron Play API |
| iOS | Manual no admin |
