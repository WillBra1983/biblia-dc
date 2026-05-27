# iOS na App Store sem Mac — GitHub Actions

O workflow **iOS App Store** (`.github/workflows/ios-appstore-release.yml`) compila no Mac virtual do GitHub, gera o **IPA** e envia ao **TestFlight**.

Você configura tudo no **Windows** (portal Apple + GitHub Secrets). Não precisa de Xcode no seu PC.

---

## Visão geral

1. Criar certificado **Apple Distribution** + perfil **App Store** (portal Apple + OpenSSL no Windows).
2. Criar **chave de API** no App Store Connect.
3. Colar segredos no GitHub.
4. Dar push no repo → **Actions** → **iOS App Store** → **Run workflow**.

---

## 1. Team ID

Você já tem: **`BDAN6452VU`**

Secret no GitHub: `APPLE_TEAM_ID` = `BDAN6452VU`

---

## 2. Certificado Distribution (.p12) — no Windows

### 2.1 Gerar CSR com OpenSSL

Instale [OpenSSL para Windows](https://slproweb.com/products/Win32OpenSSL.html) ou use Git Bash.

```powershell
cd $env:USERPROFILE\Desktop
openssl genrsa -out apple_distribution.key 2048
openssl req -new -key apple_distribution.key -out CertificateSigningRequest.certSigningRequest -subj "/email=SEU_EMAIL@exemplo.com/CN=Wilson Lucas/C=BR"
```

### 2.2 Portal Apple

1. [developer.apple.com](https://developer.apple.com/account) → **Certificados** → **+**
2. Tipo: **Apple Distribution** (App Store e Ad Hoc)
3. Envie o arquivo `CertificateSigningRequest.certSigningRequest`
4. Baixe o `.cer` (ex.: `distribution.cer`)

### 2.3 Criar .p12

```powershell
openssl x509 -in distribution.cer -inform DER -out distribution.pem -outform PEM
openssl pkcs12 -export -out distribution.p12 -inkey apple_distribution.key -in distribution.pem
```

Defina uma **senha** (anote para o GitHub Secret `APPLE_CERTIFICATE_PASSWORD`).

### 2.4 Base64 para o GitHub

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("distribution.p12")) | Set-Clipboard
```

Secret: **`APPLE_CERTIFICATE_BASE64`** = conteúdo colado (uma linha, **sem quebras** no meio).

Se o workflow falhar em `security` / certificado: rode `npm run apple:cer-para-p12`, atualize o secret no GitHub com o novo `.txt` e confira `APPLE_CERTIFICATE_PASSWORD` = `BibliaDC2026!`.

Ou rode: `powershell -File scripts/ios-prepare-github-secrets.ps1`

---

## 3. Perfil de provisionamento App Store

1. **Identificadores** → `com.bibliadc.app` → capabilities: Push, Sign in with Apple, Associated Domains (se ainda não).
2. **Perfis** → **+** → **App Store Connect** → app `com.bibliadc.app` → certificado Distribution criado acima.
3. Baixe o `.mobileprovision`.

Base64:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("BibliaDC_AppStore.mobileprovision")) | Set-Clipboard
```

Secret: **`APPLE_PROVISION_PROFILE_BASE64`**

---

## 4. Chave de API — App Store Connect

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Utilizadores e acesso** → **Integrações** → **Chaves de API** → **+**
2. Nome: `GitHub Actions Bíblia DC`
3. Acesso: **Administrador do app** (ou Desenvolvedor com permissão de upload)
4. Baixe o `.p8` (só uma vez).

Secrets:

| Secret | Valor |
|--------|--------|
| `APPSTORE_ISSUER_ID` | UUID no topo da página de chaves |
| `APPSTORE_API_KEY_ID` | Key ID da chave |
| `APPSTORE_API_PRIVATE_KEY` | Conteúdo **inteiro** do arquivo `.p8` (com `-----BEGIN PRIVATE KEY-----`) |

---

## 5. Firebase / build (Vite)

O `.env` **não vai** para o GitHub. Copie cada valor para **Repository secrets**:

| Secret | Origem |
|--------|--------|
| `GOOGLE_SERVICE_INFO_PLIST_BASE64` | `ios/App/App/GoogleService-Info.plist` em base64 |
| `VITE_FIREBASE_API_KEY` | `.env` (Browser key) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `.env` |
| `VITE_FIREBASE_DATABASE_URL` | `.env` |
| `VITE_FIREBASE_PROJECT_ID` | `.env` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `.env` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `.env` |
| `VITE_FIREBASE_APP_ID` | `.env` |
| `VITE_FIREBASE_VAPID_KEY` | `.env` (opcional mas recomendado) |
| `VITE_GEMINI_API_KEY_WEB` | `.env` |
| `VITE_GEMINI_API_KEY_ANDROID` | `.env` |
| `VITE_GEMINI_API_KEY_IOS` | `.env` |

Plist em base64:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("c:\Salvation\ios\App\App\GoogleService-Info.plist")) | Set-Clipboard
```

---

## 6. Outros secrets

| Secret | Exemplo |
|--------|---------|
| `KEYCHAIN_PASSWORD` | Senha aleatória qualquer (só no runner) ex. `Ci123456!` |

---

## 7. App Store Connect — criar o app (obrigatório antes do 1º TestFlight)

Se o upload falhar com *“No suitable application records were found”* / bundle `com.bibliadc.app`, o IPA está certo: falta **registrar o app na loja**.

1. Abra [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps** → **+** → **Novo app**.
2. **Plataformas:** iOS.
3. **Nome:** Bíblia DC.
4. **Idioma principal:** Português (Brasil).
5. **ID do pacote (Bundle ID):** escolha **`com.bibliadc.app`** na lista (o mesmo do Apple Developer).
6. **SKU:** ex. `bibliadc-ios-2026` (qualquer código único, só para a Apple).
7. **Acesso:** conforme sua conta (geralmente Acesso total).
8. Salve. Textos e screenshots podem vir depois; o registro do app basta para o TestFlight aceitar o IPA.

Textos prontos: `docs/APP_STORE_CONNECT_TEXTO.md`.

---

## 8. Rodar o workflow

1. Commit e push deste repositório (com pasta `.github/workflows/`).
2. GitHub → repositório **biblia-dc** → **Actions** → **iOS App Store** → **Run workflow**.
3. Marque **upload_testflight** se quiser enviar direto ao TestFlight.
4. Aguarde ~20–40 min (primeira vez pode demorar).
5. Em caso de sucesso: artefato **`bibliadc-ios-ipa`** para download; build no **TestFlight** em ~15–30 min.

### Número de compilação (build) — automático no CI

Você **não precisa** alterar `CURRENT_PROJECT_VERSION` no Xcode antes de cada **Run workflow**.

O workflow define o **CFBundleVersion** assim:

`162 + run_number + run_attempt`

- **run_number** — quantas vezes você já clicou em *Run workflow* neste pipeline (não é “quantas compilações na loja”).
- **run_attempt** — tentativa da mesma execução (*Re-run jobs* soma +1).

Exemplos neste projeto: run **18** → compilação **181** (162+18+1); próximo run **19** → **182**; depois **183**, **184**…

**Por que apareceu 181?** Não foram 181 envios — foi a **18ª execução** do workflow com uma fórmula antiga que multiplicava por 10. A compilação **181** no TestFlight é só um **rótulo interno** da Apple; a versão visível continua **1.5**.

A **versão de marketing** (ex. **1.5** no App Store) continua em `MARKETING_VERSION` no `project.pbxproj` — só mude quando lançar **1.6**, **1.7**, etc.

---

## 9. Metadados da loja (depois do TestFlight)

1. No app **Bíblia DC** em App Store Connect, preencha o que faltar.
2. Preencha metadados, screenshots (iPhone 6,7", etc.).
3. **Política de privacidade:** `https://foundcine.com/biblia/privacidade`
4. **App Privacy** (questionário de dados).

Depois do TestFlight, instale no iPhone pelo app **TestFlight** e teste login, Bíblia, chat.

---

## 10. Problemas comuns

| Erro | Solução |
|------|---------|
| Secret ausente | Confira lista na etapa 5–6 |
| Signing / profile | Perfil App Store + cert Distribution + UUID |
| `GoogleService-Info.plist` | Secret `GOOGLE_SERVICE_INFO_PLIST_BASE64` |
| OOM no build Node | Workflow já usa `NODE_OPTIONS=4096` |
| *No suitable application records* / bundle `com.bibliadc.app` | Crie o app na etapa **7** (App Store Connect), depois rode o workflow de novo |
| *SDK version issue* / iOS 17.5 SDK / exige iOS 26 SDK | Workflow usa `macos-26` + Xcode 26.4.1; rode de novo após push |
| Archive falha após trocar ícone / *alpha* / AppIcon | Rode `npm run icons:native` (remove transparência do PNG 1024); workflow já executa este passo |
| Upload TestFlight (outros) | Chave API com permissão **App Manager** ou **Admin**; Issuer ID e Key ID corretos |
| *bundle version must be higher than previously uploaded* / compilação já usada | O CI incrementa sozinho; **Run workflow** de novo ou *Re-run* (tentativa 2 = número maior). Não reutilize IPA antigo |
| Compilação **181** (ou número “estranho”) no TestFlight | Rótulo do CI (`162 + run_number`), não é quantidade de builds na loja; próximos serão **182**, **183**… após push do workflow corrigido |
| **ITMS-91061** / *Binário inválido* / manifesto de privacidade (`GoogleSignIn`, `GTMAppAuth`, `GTMSessionFetcher`) | O projeto força **GoogleSignIn 7.1+** (`Podfile` + `npm run ios:patch-google-auth` após `npm ci`). Gere nova compilação (ex.: build **10**). Testadores externos só voltam quando a nova build estiver **Pronta para envio** no grupo certo |
| Login Google: *The requested action is invalid* no `firebaseapp.com/__/auth/handler` | Veja **`docs/FIREBASE_GOOGLE_LOGIN.md`** — domínios autorizados (`foundcine.com`), OAuth Google ativo, URIs no Google Cloud, chave de API |

---

## 11. Só compilar (sem TestFlight)

Run workflow com **upload_testflight** desmarcado → baixa o IPA em **Artifacts**.

---

*Team ID: BDAN6452VU · Bundle: com.bibliadc.app*
