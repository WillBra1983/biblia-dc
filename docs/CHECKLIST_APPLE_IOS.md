# Checklist — Bíblia DC na App Store (iOS)

Documento de referência para a **cópia do projeto** dedicada à Apple (ex.: `Salvation-iOS` ou `Salvation-apple`).  
**Não altere a pasta `Salvation` de produção/Android** até a versão iOS estar estável.

---

## Estratégia de trabalho (recomendado)

| Pasta | Uso |
|-------|-----|
| `Salvation` (original) | Android, web, Play Store — **fonte da verdade** |
| `Salvation-iOS` (cópia) | Capacitor iOS, Xcode, TestFlight, App Store |

- Copie a pasta inteira (incluindo `.env` local, se existir).
- Use **outro branch Git** ou repositório, se preferir (`git worktree` também serve).
- Commits iOS só na cópia/branch iOS; faça **merge seletivo** de correções de app (JS/React) de volta ao Android quando fizer sentido.
- **Nunca** substitua `android/` nem `google-services.json` do Android por arquivos iOS por engano.

---

## Pré-requisitos (antes dos US$ 99)

- [ ] **Mac** com Xcode instalado (versão recente; alinhar ao que a Apple exige hoje).
- [ ] Conta **Apple ID** (pessoal ou da igreja/ministério).
- [ ] iPhone físico para testes (simulador não cobre push, câmera, alguns gestos).
- [ ] Tempo estimado: **primeira versão iOS = várias sessões de trabalho** (não é só “build e enviar”).

**Só pague os US$ 99/ano** quando o app **abrir no simulador/dispositivo** com Bíblia + login básico funcionando.

---

## Fase 0 — Inventário do projeto atual (Android)

Referência do que já existe:

| Item | Valor atual |
|------|-------------|
| Bundle ID / App ID | `com.bibliadc.app` |
| Nome exibido | Bíblia DC |
| Capacitor | v6 |
| Plugins nativos | Push, Local Notifications, Google Auth, Badge, Share, Browser, App |
| Firebase Android | `android/app/google-services.json` |
| Google OAuth (Capacitor) | `capacitor.config.json` → `plugins.GoogleAuth` (`serverClientId` / `androidClientId`) |
| Deep links | Android App Links → `foundcine.com` / `www.foundcine.com` (`/biblia`) |
| Versão Android (referência) | `versionCode` 6, `versionName` 1.5 |

**iOS no repo:** `@capacitor/ios` e pasta `ios/` já foram adicionados (maio/2026). Falta configurar no Mac: `GoogleService-Info.plist`, `iosClientId`, APNs, Team ID no AASA, Sign in with Apple (recomendado).

---

## Fase 1 — Base Capacitor iOS (na cópia)

```bash
npm install @capacitor/ios@^6
npx cap add ios
npm run build:android   # ou script de build sem VITE_BASE_URL=/biblia/ — igual ao APK
npx cap sync ios
npx cap open ios
```

- [x] Instalar `@capacitor/ios@^6` (mesma major do `@capacitor/android`).
- [x] `npx cap add ios` — pasta `ios/` gerada.
- [ ] Ícones e splash: `npx capacitor-assets generate` (ou `@capacitor/assets`) para **iOS**.
- [ ] Em Xcode: **Signing & Capabilities** → Team + Bundle Identifier `com.bibliadc.app`.
- [x] `Info.plist`: permissão de notificações em **pt-BR**, URL scheme `com.bibliadc.app`, background `remote-notification`.
- [x] `App.entitlements`: Associated Domains + `aps-environment` (ajustar para `production` no release).
- [x] Scripts `ios:sync` / `ios:open` e guia `GERAR_IOS.md`.
- [ ] Build e run no simulador → tela inicial / Bíblia carrega.
- [ ] Confirmar que SQLite / assets offline abrem no WKWebView (testar capítulo, discipulado, quiz).

**Scripts úteis a criar na cópia** (opcional):

```json
"ios:sync": "npm run build:android && npx cap sync ios",
"ios:open": "npx cap open ios"
```

---

## Fase 2 — Firebase (projeto `biblia-dc`)

No [Firebase Console](https://console.firebase.google.com):

- [ ] Adicionar app **iOS** com bundle ID `com.bibliadc.app`.
- [ ] Baixar `GoogleService-Info.plist` → colocar em `ios/App/App/` (caminho exato conforme template Capacitor 6).
- [ ] **Não** apagar nem trocar o app Android existente.
- [ ] Authentication: habilitar os mesmos provedores (E-mail, Google).
- [ ] Realtime Database / Storage / Functions: mesmas regras (já server-side; cliente iOS usa o mesmo SDK).

Arquivo local esperado:

```
ios/App/App/GoogleService-Info.plist
```

---

## Fase 3 — Login (Google + e-mail + Apple)

### 3.1 Google Sign-In no iOS

- [ ] Google Cloud Console → OAuth: criar cliente **iOS** (bundle `com.bibliadc.app`).
- [ ] Firebase → Authentication → Google → conferir configuração.
- [ ] `capacitor.config.json` na cópia iOS — adicionar **`iosClientId`** (não confundir com `androidClientId`):

```json
"GoogleAuth": {
  "scopes": ["profile", "email"],
  "androidClientId": "...",
  "iosClientId": "SEU_CLIENT_ID_IOS.apps.googleusercontent.com",
  "serverClientId": "... (cliente Web / Firebase)"
}
```

- [ ] Código: `src/contexts/FirebaseAuthContext.jsx` — `ensureNativeGoogleAuthInitialized()` / `GoogleAuth.signIn()` já tratam nativo; testar no iPhone.
- [ ] URL scheme no Xcode (REVERSED_CLIENT_ID do `GoogleService-Info.plist`) — plugin `@codetrix-studio/capacitor-google-auth` documenta o passo.

### 3.2 Sign in with Apple (forte recomendação / revisão)

O app oferece **“Continuar com Google”** + e-mail/senha. A diretriz **4.8** da Apple costuma exigir **“Entrar com a Apple”** em apps com login social de terceiros.

- [ ] Apple Developer → Identifiers → App ID → capability **Sign In with Apple**.
- [ ] Firebase Authentication → provedor **Apple**.
- [ ] Implementar botão na tela de login (`Chat` / fluxo Conectar) e handler (pacote Firebase ou `@capacitor-community/apple-sign-in` + `OAuthProvider`).
- [ ] Testar conta nova e conta existente (mesmo e-mail que Google, se aplicável).

**Risco se pular:** reprovação na revisão, não bloqueio técnico de compilar.

### 3.3 E-mail/senha e link mágico

- [ ] Domínios autorizados no Firebase Auth incluem URL de redirect usada no iOS.
- [ ] `buildCadastroEmailLinkContinueUrl` — conferir se abre o app iOS (Universal Links) ou só web; pode exigir **Associated Domains** (`applinks:foundcine.com`).

---

## Fase 4 — Push notifications (APNs + FCM)

O serviço `src/services/notificacoesPushService.js` já prevê plataforma `'ios'`.

- [ ] Apple Developer → **Keys** → APNs (Apple Push Notifications service).
- [ ] Firebase → Project Settings → Cloud Messaging → upload da chave **APNs** (.p8).
- [ ] Xcode → Push Notifications capability.
- [ ] Testar em **dispositivo real** (simulador não recebe push remoto).
- [ ] Configurações do app → ativar push → token em `users/{uid}/fcmTokens/...` com `plataforma: ios`.

Lembretes locais (`src/utils/notifications.js`): no iOS não usa `channelId` Android — código já condiciona `android`; validar agendamento de devocional/plano.

---

## Fase 5 — Ajustes de código (copiar com cuidado para o Android depois)

Arquivos que hoje assumem **só Android** ou web:

| Arquivo | O que revisar no iOS |
|---------|----------------------|
| `src/services/bibliaEstudosService.js` | Deep links / share `intent://` — criar equivalente iOS ou usar HTTPS universal |
| `android/...` App Links | iOS: **Universal Links** + `apple-app-site-association` no servidor `foundcine.com` |
| `src/utils/notifications.js` | OK sem channel no iOS; testar permissões |
| `src/utils/firebaseAuthErrors.js` | Mensagens citam SHA Android — opcional ramo `ios` |
| `capacitor.config.json` | `server.androidScheme` — iOS usa esquema padrão https |
| `src/main.jsx` / PWA | Service Worker: irrelevante no nativo iOS |

Padrão seguro em código compartilhado:

```javascript
import { Capacitor } from '@capacitor/core'
const platform = Capacitor.getPlatform() // 'ios' | 'android' | 'web'
```

- [ ] Buscar no projeto: `=== 'android'`, `getPlatform() === 'android'`, `Capacitor.getPlatform?.() === 'android'`.
- [ ] Para cada ocorrência: decidir comportamento iOS (paridade, no-op ou implementação nova).

---

## Fase 6 — Conteúdo, chat e diretrizes Apple

### Chat (conteúdo gerado por usuários)

- [ ] Mecanismo de **denunciar/bloquear** mensagens ou usuários (se ainda não existir na UI).
- [ ] Texto de conduta / contato para moderação (e-mail ou WhatsApp já no `Sobre.jsx`).
- [ ] Política de privacidade **URL pública** (obrigatória na App Store Connect).

### Privacidade e metadados

- [ ] Publicar página de privacidade (ex. `https://foundcine.com/biblia/privacidade` ou similar).
- [ ] App Store Connect → **App Privacy** (questionário de dados: e-mail, foto, mensagens, analytics Firebase).
- [ ] Screenshots iPhone (vários tamanhos exigidos pela Apple).
- [ ] Descrição, categoria (Referência / Estilo de vida / Educação), classificação etária.
- [ ] Conta de suporte e URL de marketing.

### Outros pontos de revisão comuns

- [ ] App não depende só de login para conteúdo **100% offline** já embutido (Bíblia local) — alinhado à política atual.
- [ ] Sem compras in-app não declaradas (app gratuito = OK).
- [ ] Atualizar versão em `Sobre.jsx` (ainda mostra 0.0.1) antes da loja.

---

## Fase 7 — TestFlight → App Store

Ordem sugerida:

1. [ ] Conta **Apple Developer Program** (US$ 99/ano).
2. [ ] App Store Connect → novo app → bundle `com.bibliadc.app`.
3. [ ] Archive no Xcode → **Upload** → build no TestFlight.
4. [ ] Teste interno (você + 1–2 pessoas): login Google/Apple/e-mail, Bíblia offline, chat, push, troca de conta em Configurações.
5. [ ] Enviar para **revisão da App Store** (não há “14 dias de testadores” como no Play; há fila de revisão 1–7 dias úteis, podendo reprovar).

---

## Fase 8 — O que **não** misturar entre Android e iOS

| Só Android | Só iOS |
|------------|--------|
| `android/` | `ios/` |
| `google-services.json` | `GoogleService-Info.plist` |
| SHA-1/SHA-256 no Firebase (Play) | APNs key no Firebase |
| `gradlew bundleRelease` | Xcode Archive |
| App Links (`intent://`, host manifest) | Universal Links + Associated Domains |

O **código React** (`src/`) pode ser **compartilhado** entre as duas pastas via merge/Git, desde que branches de plataforma não sobrescrevam pastas nativas erradas.

---

## Critérios de “pronto para pagar os US$ 99”

Marque todos antes de assinar o programa Apple:

- [ ] `npx cap open ios` abre o projeto sem erro de signing.
- [ ] App instala no iPhone e abre a Bíblia com conteúdo local.
- [ ] Login e-mail **ou** Google funciona no dispositivo.
- [ ] Decisão tomada sobre **Sign in with Apple** (implementado ou aceitar risco de reprovação).
- [ ] URL de política de privacidade no ar.
- [ ] Plano para testar push no iPhone real.

---

## Critérios de “pronto para enviar à App Store”

- [ ] TestFlight validado por você (e opcionalmente 2–3 beta testers).
- [ ] Push iOS registrando token no RTDB.
- [ ] Chat testado com moderação/denúncia (se exigido na revisão).
- [ ] Screenshots e textos da loja preenchidos.
- [ ] Versão e build number coerentes com Android (não precisam ser iguais, mas documente).

---

## Referência rápida de comandos (cópia iOS)

```bash
# Desenvolvimento
npm install
npm run build:android    # build web embutido no app nativo (sem /biblia/)
npx cap sync ios
npx cap open ios

# Após mudanças em plugins nativos
npx cap sync ios
```

---

## Suporte / dúvidas na implementação

Quando a cópia `Salvation-iOS` estiver criada, use este checklist item a item no chat — podemos implementar Fase 1–3 primeiro (Capacitor + Firebase + login) sem tocar na pasta Android de produção.

*Última atualização: maio/2026 — projeto Bíblia DC (`com.bibliadc.app`).*
