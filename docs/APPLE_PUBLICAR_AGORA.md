# Apple — o que falta publicar (foco iOS)

**Código no GitHub:** commit `456d0b3` (workflow iOS, Apple Sign In, privacidade, chat).  
**Regras Firebase:** `deploy:rules` já publicado.  
**Site:** privacidade e AASA em `foundcine.com` (deploy foundcine feito).

---

## Já pronto no projeto (não refazer)

| Item | Onde |
|------|------|
| Bundle ID `com.bibliadc.app` | `capacitor.config.json`, Xcode |
| Versão **1.5** (build **6**) | `ios/.../project.pbxproj` |
| Team ID **BDAN6452VU** | `.env`, AASA |
| Sign in with Apple (código) | `FirebaseAuthContext`, `Chat.jsx`, entitlements |
| Universal Links | `App.entitlements`, AASA `/biblia` |
| Política de privacidade | `/biblia/privacidade` |
| Denunciar mensagem (chat) | `chatService`, `Chat.jsx` |
| Workflow TestFlight | `.github/workflows/ios-appstore-release.yml` |
| Google OAuth iOS | `capacitor.config.json` → `iosClientId` |
| URL scheme Google | `Info.plist` (REVERSED_CLIENT_ID) |

Verifique localmente: `npm run ios:appstore-status`

---

## Você precisa fazer (ordem)

### A. Firebase Console (15 min)

1. [Firebase](https://console.firebase.google.com/project/biblia-dc/overview) → **Adicionar app** → **iOS** (se ainda não existir) → bundle `com.bibliadc.app`.
2. Baixar **`GoogleService-Info.plist`** → salvar em `ios/App/App/GoogleService-Info.plist` (não vai pro Git).
3. Rodar no PC:
   ```powershell
   cd C:\Salvation
   npm run ios:inject-google-scheme
   npm run ios:github-secrets
   ```
   (O script mostra o base64 do plist para o secret `GOOGLE_SERVICE_INFO_PLIST_BASE64`.)
4. **Authentication** → **Sign-in method** → **Apple** → **Ativar** (siga `docs/FIREBASE_APPLE_SIGNIN.md`).
5. **Project settings** → **Cloud Messaging** → chave **APNs** (.p8) — necessário para push no iPhone (pode ser depois do primeiro TestFlight).

### B. Apple Developer (30–60 min, sem Mac)

1. [developer.apple.com](https://developer.apple.com/account) — conta paga ativa.
2. **Identifiers** → `com.bibliadc.app` → capabilities:
   - Sign In with Apple  
   - Push Notifications  
   - Associated Domains  
3. **Certificates** → **Apple Distribution** (.p12).
4. **Profiles** → **App Store** → app `com.bibliadc.app` + certificado acima → baixar `.mobileprovision`.

Detalhes: `docs/GITHUB_IOS_APP_STORE.md`

### C. GitHub Secrets (repo `biblia-dc`)

Settings → Secrets and variables → Actions → **New repository secret**

| Secret | Valor |
|--------|--------|
| `APPLE_TEAM_ID` | `BDAN6452VU` |
| `APPLE_CERTIFICATE_BASE64` | .p12 em base64 |
| `APPLE_CERTIFICATE_PASSWORD` | senha do .p12 |
| `APPLE_PROVISION_PROFILE_BASE64` | .mobileprovision em base64 |
| `KEYCHAIN_PASSWORD` | qualquer senha forte (só no CI) |
| `GOOGLE_SERVICE_INFO_PLIST_BASE64` | plist em base64 |
| `VITE_FIREBASE_*` | copiar do seu `.env` |
| `APPSTORE_ISSUER_ID` | App Store Connect → Integrações |
| `APPSTORE_API_KEY_ID` | id da chave API |
| `APPSTORE_API_PRIVATE_KEY` | conteúdo do `.p8` |

Lista completa: `.github/APPLE_SECRETS_CHECKLIST.md`

### D. Primeiro build

1. GitHub → **Actions** → **iOS App Store** → **Run workflow** (TestFlight ligado).
2. Se falhar: abrir o log do job (signing, pods, secrets).
3. TestFlight no iPhone → testar Google, Apple, e-mail, Bíblia, chat.

### E. App Store Connect (metadados)

Textos prontos para colar: **`docs/APP_STORE_CONNECT_TEXTO.md`**

- Screenshots iPhone (6,7" obrigatório; outros tamanhos conforme a Apple pedir).
- **App Privacy** (questionário) — alinhar à política em `/biblia/privacidade`.
- URL privacidade: `https://foundcine.com/biblia/privacidade`
- Enviar build do TestFlight para **revisão da App Store**.

---

## Comandos úteis no Windows

```powershell
cd C:\Salvation
npm run ios:appstore-status      # diagnóstico
npm run ios:github-secrets       # base64 para GitHub
npm run gemini:config            # confere chaves Gemini
```

---

*Não é possível daqui: criar certificado Apple, chave API App Store Connect nem aprovar revisão — só você no portal Apple / GitHub.*
