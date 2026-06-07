# Sincronizar versão da loja com o Firebase

O aviso de atualização no app lê `appConfig/lojaVersao` no Realtime Database. A Google Play **não escreve lá sozinha** — é preciso ligar os dois lados.

## Android — opção A (rápida, ao publicar)

Depois de alterar `versionCode` / `versionName` em `android/app/build.gradle`:

```bash
npm run sync:android-version
```

Copia a versão do Gradle para o Firebase (requer `firebase login`).

Fluxo sugerido:

```bash
npm run android:build
npm run sync:android-version
# depois faça upload do AAB na Play Console
```

## Android — opção B (automática, Play Store → Firebase)

Cloud Functions consultam a **Google Play Developer API** e atualizam o RTDB:

- **Manual (admin):** botão «Sincronizar Android com Google Play» em Admin → Enviar aviso
- **Automático:** cron a cada 12 horas

### Configurar acesso à Play Console (uma vez)

1. [Google Play Console](https://play.google.com/console) → **Configurações** → **Acesso à API**
2. Vincule o projeto Google Cloud **biblia-dc**
3. Conceda permissão à conta de serviço do Firebase, por exemplo:
   - `firebase-adminsdk-XXXX@biblia-dc.iam.gserviceaccount.com`
   - ou a conta padrão do Cloud Functions do projeto
4. Permissão mínima: **Ver informações de apps e descarregar relatórios em massa** (e releases, se disponível)
5. Publique as functions (se ainda não fez):

```bash
firebase deploy --only functions:sincronizarVersaoPlayStoreAdmin,functions:sincronizarVersaoPlayStoreCron
```

**Opcional:** se preferir JSON dedicado em vez da conta padrão:

```bash
firebase functions:secrets:set PLAY_STORE_SERVICE_ACCOUNT
```

(cole o JSON; depois adicione `secrets: ['PLAY_STORE_SERVICE_ACCOUNT']` nas functions e redeploy)

### Nome da versão na Play Console

Use o mesmo **nome da versão** do Gradle (ex.: `1.2.0`) ao criar o release na Play — a API lê esse campo.

## iOS

Após publicar no TestFlight/App Store, preencha a secção iOS manualmente em Admin → Enviar aviso.

## Resumo

| Momento | O que fazer |
|--------|-------------|
| Sobe versão no Gradle | `npm run sync:android-version` |
| Play API + conta vinculada | Botão admin ou cron a cada 12 h |
| iOS | Manual no admin |
