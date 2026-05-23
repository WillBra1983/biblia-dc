# Bíblia DC — publicação na App Store (iOS)

Este projeto usa **Capacitor 6** (mesmo código React do Android). O build iOS exige **Mac com Xcode** para instalar no iPhone e enviar à loja; no Windows você prepara tudo e pode validar a compilação **de graça** via GitHub Actions — veja **`docs/IOS_GRATIS.md`**.

## Pré-requisitos

| Item | Detalhe |
|------|---------|
| Mac | Xcode recente (versão exigida pela Apple no ano do envio) |
| Conta Apple | Apple Developer Program (US$ 99/ano) — pague quando o app abrir no iPhone |
| CocoaPods | `sudo gem install cocoapods` (no Mac, após clonar o repo) |
| Firebase | App iOS `com.bibliadc.app` no mesmo projeto do Android |
| Domínio | Universal Links em `foundcine.com` (arquivo AASA no servidor) |

## Comandos (desenvolvimento)

```powershell
# Windows ou Mac — gera dist/ e copia para ios/
npm run ios:sync

# Só no Mac — abre o Xcode
npm run ios:open
```

No Mac, na primeira vez na pasta `ios/App`:

```bash
pod install
```

Depois: Xcode → **Product → Archive** → **Distribute App** → App Store Connect / TestFlight.

## Configuração obrigatória (uma vez)

### 1. Firebase iOS

1. [Firebase Console](https://console.firebase.google.com) → adicionar app **iOS** → bundle `com.bibliadc.app`.
2. Baixar `GoogleService-Info.plist` → colocar em `ios/App/App/GoogleService-Info.plist`.
3. Referência: `ios/App/App/GoogleService-Info.plist.example`.

### 2. Login Google no iOS

1. Google Cloud → credencial OAuth **iOS** (bundle `com.bibliadc.app`).
2. Em `capacitor.config.json`, em `plugins.GoogleAuth`, adicionar:

```json
"iosClientId": "XXXX.apps.googleusercontent.com"
```

3. No Xcode: **Info → URL Types** → adicionar o **REVERSED_CLIENT_ID** do `GoogleService-Info.plist` (além do scheme `com.bibliadc.app` já no `Info.plist`).

### 3. Push (APNs + FCM)

1. Apple Developer → **Keys** → Apple Push Notifications (`.p8`).
2. Firebase → Project Settings → Cloud Messaging → upload da chave APNs.
3. Xcode → target App → **Signing & Capabilities** → **Push Notifications** (o entitlement `aps-environment` já está em `App.entitlements`; troque para `production` antes do envio à loja).
4. Testar em **iPhone físico** (simulador não recebe push remoto).

### 4. Universal Links (links https abrem o app)

1. Substitua `SUBSTITUA_TEAM_ID` em `public/.well-known/apple-app-site-association` pelo **Team ID** da Apple (10 caracteres).
2. Publique em:

   - `https://foundcine.com/.well-known/apple-app-site-association`
   - `https://www.foundcine.com/.well-known/apple-app-site-association`

   Sem extensão `.json`, `Content-Type: application/json`.

3. `App.entitlements` já inclui `applinks:foundcine.com` e `applinks:www.foundcine.com`.

### 5. Xcode — assinatura

1. Abra `ios/App/App.xcworkspace` (não o `.xcodeproj` após `pod install`).
2. Target **App** → **Signing & Capabilities** → Team + Bundle ID `com.bibliadc.app`.
3. Versão alinhada ao Android: **1.5** (build **6**) — já definido no projeto.

## App Store Connect (metadados)

- Política de privacidade (URL pública obrigatória).
- Screenshots (tamanhos exigidos para iPhone).
- **App Privacy** (questionário de dados: e-mail, mensagens, Firebase).
- Conta de suporte.

## Sign in with Apple (revisão da Apple)

O app oferece **Continuar com Google** e e-mail. A diretriz **4.8** costuma exigir **Entrar com a Apple** quando há login social de terceiros. Sem isso, há risco de **reprovação** (não impede compilar).

Planeje: capability no App ID, provedor Apple no Firebase, botão na tela de login.

## Checklist completo

Ver `docs/CHECKLIST_APPLE_IOS.md` (fases Firebase, push, chat, TestFlight).

## O que já está no repositório

- `@capacitor/ios` e pasta `ios/` gerada pelo Capacitor
- Deep links nativos (`com.bibliadc.app://open/...`) — Android e iOS
- HTTPS Universal Links (com AASA no servidor)
- Notificações locais sem `channelId` no iOS
- Push unificado em `notificacoesPushService.js` (plataforma `ios`)
- Scripts `ios:sync` e `ios:open`

## Problemas comuns

| Problema | Solução |
|----------|---------|
| `pod install` falha | Instalar CocoaPods no Mac; abrir `.xcworkspace` |
| Login Google falha no iOS | `iosClientId`, `GoogleService-Info.plist`, URL scheme REVERSED_CLIENT_ID |
| Link https não abre o app | Team ID no AASA + deploy do `.well-known` + Associated Domains |
| Push não chega | Chave APNs no Firebase; testar em dispositivo real; `aps-environment` production no release |

*Bundle ID: `com.bibliadc.app` — Bíblia DC.*
