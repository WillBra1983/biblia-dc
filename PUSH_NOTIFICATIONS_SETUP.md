# Push Notifications — Guia de Configuração

Este guia descreve os passos **manuais** (Firebase Console + projeto local)
necessários para colocar push notifications no ar para web, Android e iOS.
O código do lado do cliente e Cloud Functions já estão prontos.

## Visão geral do que foi adicionado

- `functions/` — Cloud Functions Node 20:
  - `pushChatMensagem` — RTDB trigger em `/chats/{chatId}/messages/{msgId}`
    que envia push aos outros participantes (respeitando preferência).
  - `enviarAvisoAdmin` — callable que admin usa para anunciar novidades
    (toca o topic `novidades`).
  - `lembretesDiarios` — cron a cada 15 min entre 05:00 e 09:00 (fuso
    `America/Sao_Paulo`), envia lembrete de devocional e plano para
    usuários que marcaram o horário e ativaram cada switch.
- `src/services/notificacoesPushService.js` — detecta plataforma, pede
  permissão (só com gesto do usuário) e registra token em
  `/users/{uid}/fcmTokens/{key}`.
- `src/services/preferenciasNotificacaoService.js` — lê/escreve
  `/users/{uid}/notif/preferencias`.
- `src/components/PushNotificationsBootstrap.jsx` — ativa push
  automaticamente **no app nativo** após login; escuta tap em
  notificação e navega para a URL do payload.
- `src/pages/ConfiguracoesNotificacoes.jsx` — tela acessível em
  `/configuracoes/notificacoes`, com switches e horário do lembrete.
- `public/firebase-messaging-sw.js` — Service Worker para Web Push.
- Regras do RTDB atualizadas para `fcmTokens`, `notif` e `admin`.

---

## 1. Habilitar Cloud Messaging no Firebase Console

> Projeto: **biblia-dc**

1. Acesse <https://console.firebase.google.com/project/biblia-dc/settings/cloudmessaging>.
2. Confirme que **Firebase Cloud Messaging API (V1)** está habilitada
   (se aparecer botão "Enable", clique).
3. Na seção **Web configuration**, clique em **Generate key pair** para
   criar a **VAPID public key**. Copie o valor.

## 2. Atualizar o `.env` do projeto

Acrescente (ou confirme) as variáveis abaixo no `.env` (local) e nos
ambientes onde o app é buildado (Vercel, hospedagem etc.):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=biblia-dc.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://biblia-dc-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=biblia-dc
VITE_FIREBASE_STORAGE_BUCKET=biblia-dc.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...          # <-- veja em Project settings → General
VITE_FIREBASE_APP_ID=...                       # <-- idem
VITE_FIREBASE_VAPID_KEY=BNxx...                # <-- a chave gerada no passo 1
```

> Importante: **sem** `VITE_FIREBASE_VAPID_KEY` e
> `VITE_FIREBASE_MESSAGING_SENDER_ID`, a Web Push não funciona — a tela de
> Configurações vai mostrar o aviso "configuração ainda não está pronta".

## 3. Android (Capacitor)

1. Confirme que `android/app/google-services.json` é o atualizado do
   projeto `biblia-dc` (download em **Project settings → General → Your
   apps → Android app**).
2. Sincronize:
   ```bash
   npm run android:sync
   ```
3. (Opcional) Customize o canal de notificação no Capacitor —
   `capacitor.config.json` já tem o bloco de `LocalNotifications`; o
   push usa um canal padrão `principal` definido pelo helper das
   Functions. Para Android 8+ você pode criar canais customizados.

## 4. iOS (se for distribuir para iPhone)

1. No Apple Developer:
   - Crie um **APNs Authentication Key (.p8)** em Certificates → Keys.
   - Anote a **Key ID** e o **Team ID**.
2. No Firebase Console:
   - **Project settings → Cloud Messaging → Apple app configuration**.
   - Faça upload do `.p8` e preencha Key ID e Team ID.
3. No Xcode (após `npx cap sync ios`):
   - Em Signing & Capabilities, adicione **Push Notifications**.
   - Adicione também **Background Modes → Remote notifications**.

## 5. Deploy das Cloud Functions

> Pré-requisito: plano **Blaze** ativo (já está, segundo confirmado).

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Saída esperada: 3 funções criadas/atualizadas:
- `pushChatMensagem` (RTDB trigger)
- `enviarAvisoAdmin` (HTTPS callable)
- `lembretesDiarios` (scheduled)

## 6. Deploy das regras do RTDB

```bash
firebase deploy --only database
```

## 7. Marcar você como administrador

Para usar `enviarAvisoAdmin` (anúncios de novidades), grave a flag de
admin diretamente no RTDB (regras impedem escrita pelo cliente):

1. <https://console.firebase.google.com/project/biblia-dc/database>
2. Caminho: `users/{seu-uid}/admin`
3. Valor (boolean): `true`

## 8. (Opcional, recomendado) Subscription ao topic `novidades`

Para que `enviarAvisoAdmin` chegue em todos os usuários, eles precisam
estar inscritos no topic `novidades`. Há duas opções:

- **Recomendado**: criar uma Cloud Function adicional que, quando um
  token é gravado em `/users/{uid}/fcmTokens/{key}`, inscreve o token
  no topic `novidades` automaticamente. Posso adicionar essa função se
  quiser — basta pedir.
- **Manual**: ignorar topics e adaptar `enviarAvisoAdmin` para iterar
  sobre todos os usuários (mais caro em apps grandes; OK até alguns
  milhares de usuários).

## 9. Como testar

### Web (mais rápido)

1. Entre no app autenticado.
2. Vá em **Menu → Notificações** (`/configuracoes/notificacoes`).
3. Clique em **Ativar** — o navegador pede permissão; aceite.
4. Em outra aba/dispositivo, envie uma mensagem no chat para você
   mesmo. Em segundos a notificação aparece no SO.

### Android (APK instalado)

1. Build:
   ```bash
   npm run android:sync
   cd android && gradlew assembleDebug
   ```
2. Instale o APK no celular, logue.
3. Aceite o popup de permissão (Android 13+).
4. Peça para outra conta te mandar mensagem.

### Cron de lembretes

- Para forçar o disparo agora (sem esperar 7h da manhã), use o Firebase
  Console → Functions → `lembretesDiarios` → **Run now**.

## 10. O que não precisa ser feito

- **Não** precisa registrar topics manualmente no console — eles são
  criados na primeira mensagem enviada.
- **Não** precisa mexer no `firebase.json` — já adicionei o bloco
  `functions`.
- **Não** precisa instalar nada além de `npm install` dentro de
  `functions/` (já fizemos `npm install @capacitor/push-notifications`
  na raiz do projeto).

---

## Resumo do que **você precisa fazer agora**

- [ ] **Gerar VAPID public key** no Firebase Console (passo 1.3)
- [ ] **Atualizar `.env`** com `VITE_FIREBASE_MESSAGING_SENDER_ID`,
      `VITE_FIREBASE_APP_ID` e `VITE_FIREBASE_VAPID_KEY` (passo 2)
- [ ] **`cd functions && npm install`** (passo 5)
- [ ] **`firebase deploy --only functions,database`** (passos 5 e 6)
- [ ] **Marcar seu UID como admin** no RTDB se quiser usar
      `enviarAvisoAdmin` (passo 7)
- [ ] (Se for distribuir iOS) Subir certificado APNs (passo 4)

Depois disso, em qualquer aparelho onde o usuário entrar e tocar em
"Ativar" nas Configurações, ele receberá push de chat, novidades e
lembretes (conforme os switches que tiver marcado).
