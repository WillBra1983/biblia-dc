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

Se o workflow falhar em `security` / certificado: rode `npm run apple:cer-para-p12`, atualize o secret no GitHub com o novo `.txt` e confira se `APPLE_CERTIFICATE_PASSWORD` contém a mesma senha digitada durante a geração do `.p12`. A senha não deve ser escrita no repositório.

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
| Revisão beta **Rejeitado** — Guideline **2.1(a)** / *demo account* / build **1.5 (10)** | Veja seção **12** abaixo (conta demo no TestFlight + responder à Apple) |
| Login demo: `auth/requests-from-referer-capacitor://localhost-are-blocked` | Chave de API no Google Cloud: adicione `capacitor://localhost/*` e `https://localhost/*` nos referenciadores HTTP (seção **12.5**) |

---

## 12. Revisão beta rejeitada (2.1a — conta demo)

A Apple testou a build **1.5 (10)** no **TestFlight externo** e não conseguiu entrar no app. Isso **não** reprova o app na loja; só bloqueia **testadores externos** e o **link público** até resolver.

### Passo 1 — Criar conta só para a Apple (Firebase)

**Use um e-mail real** (caixa de entrada que você abre). Exemplos:

- `prwilsonlucas+bibliadc@gmail.com` (chega no seu Gmail normal)
- ou um Gmail novo só para revisão

**Não** use um endereço inventado (`bibliadc.review@gmail.com` sem criar a conta no Google) — o app exige confirmação de e-mail e a nuvem (chat, preferências) só funciona com `emailVerified`.

1. [Firebase Console](https://console.firebase.google.com/) → projeto **biblia-dc** → **Authentication** → **Users**.
2. Se já existir usuário de teste **não verificado**, apague e crie de novo.
3. **Add user** (adicionar usuário manualmente) → e-mail real + senha forte.
4. Usuários criados **só pelo Console** já vêm com e-mail **verificado** (sem link de confirmação).
5. No app, use **Entrar** (não “Criar conta”) com **e-mail + senha** e confira: Bíblia, chat, menu.

**Evite** “Criar conta” / “Enviar link de cadastro” no app — isso é outro fluxo e exige confirmação por e-mail.

Se ainda aparecer “Confirme seu e-mail”: abra o link no Gmail `prwilsonlucas@gmail.com` (o `+bibliadc` chega na mesma caixa) → depois **Já confirmei — atualizar**. O app agora também envia o e-mail automaticamente na primeira vez.

**Importante:** use **e-mail + senha** no TestFlight, não só Google/Apple. A revisão precisa de usuário e senha fixos.

### Passo 2 — Informar no App Store Connect

1. **Bíblia DC** → aba **TestFlight** (não “Distribuição”).
2. Barra lateral → **Informações de teste** / **Test Information** (às vezes em **Geral** do TestFlight).
3. Role até **Informações de revisão do app beta** / **Beta App Review Information**.
4. Marque **Login necessário** / **Sign-in required**.
5. Preencha **Nome de usuário** (e-mail) e **Senha**.
6. Em **Notas**, em português ou inglês, por exemplo:  
   `Use email and password on the login screen. Account has access to Bible, devotionals, chat, and settings.`
7. **Salvar**.

### Passo 3 — Responder à Apple

1. **Distribuição** → **Revisão de apps** (ou a mensagem em **TestFlight** → build → mensagens).
2. Abra a mensagem de hoje → **Responder à equipe de revisão de apps**.
3. Texto sugerido (pode colar em inglês):

   `We added demo credentials in TestFlight → Test Information → Beta App Review Information (Sign-in required). Username: [email]. Password: [password]. Please use email/password login on the first screen. Thank you.`

### Passo 4 — Enviar build nova para revisão beta

A build **10** já foi rejeitada. Use a **181** (ou a próxima do CI, ex. **182**):

1. **TestFlight** → **Testes externos** → grupo **Teste Biblia** → aba **Compilações**.
2. Adicione a compilação **181** (ou mais recente) e envie para **revisão beta** de novo.

Aguarde status sair de **Rejeitado** / **Aguardando revisão** para **Pronta para testar** (horas a ~48 h). Só então o **Iago** e o **link público** funcionam.

**Teste interno** (equipe) não depende dessa revisão beta — pode usar a build **181** no grupo interno enquanto isso.

### 12.5 — Erro `capacitor://localhost` na revisão (login e-mail/senha)

Se a Apple (ou você no TestFlight) vê:

`Firebase: Error (auth/requests-from-referer-capacitor://localhost-are-blocked.)`

**Causa:** a chave `VITE_FIREBASE_API_KEY` usada no build iOS tem **restrição de referenciador HTTP** que não inclui o esquema do app Capacitor. Não é senha errada — a requisição nem chega a validar a conta.

**Correção (Google Cloud, ~5 min):**

1. [Google Cloud Console](https://console.cloud.google.com/) → projeto **biblia-dc** → **APIs e serviços** → **Credenciais**.
2. Abra a chave de API cujo valor é o mesmo do secret GitHub `VITE_FIREBASE_API_KEY` (geralmente “Browser key (auto created by Firebase)”).
3. **Restrições de aplicativo** → **Referenciadores HTTP** → adicione:
   - `capacitor://localhost`
   - `capacitor://localhost/*`
   - `https://localhost/*`
   - (mantenha também `https://foundcine.com/*` e `https://biblia-dc.firebaseapp.com/*`)
4. **Salvar** → aguarde 2–5 minutos.
5. No iPhone: desinstale o app TestFlight, reinstale, teste **Entrar** com a conta demo.
6. Gere **nova build** no GitHub Actions e reenvie para revisão beta.

**Responder à Apple (inglês):**

`The login failure was caused by API key referrer restrictions blocking the native app origin (capacitor://localhost). We updated Google Cloud credentials to allow the Capacitor iOS app. Demo credentials in Test Information remain: [email] / [password]. Please retry email/password login on build [número]. Thank you.`

---

## 13. Rejeição na App Store (2.1a login + 2.3.6 classificação etária)

Build **1.5 (195)** ou similar rejeitada na **revisão da loja** (não só TestFlight).

### 13.1 Guideline 2.1(a) — erro no login (`INTERNAL ASSERTION FAILED`)

**Sintoma:** na tela **Entrar**, e-mail/senha, Google ou Apple mostram  
`INTERNAL ASSERTION FAILED: Expected a class definition` (comum no iPad).

**Causa:** persistência customizada do Firebase Auth no iOS não é aceita pelo SDK 12+ — só classes oficiais (`browserLocalPersistence`, etc.).

**Correção no código:** `src/config/firebaseRuntime.js` usa `browserLocalPersistence` em **todos** os apps nativos (iOS e Android).

**No App Store Connect (obrigatório):**

1. Firebase → **Authentication** → usuário demo **verificado** (ex.: `prwilsonlucas+bibliadc@gmail.com`).
2. **TestFlight** → **Informações de teste** → **Login necessário** + e-mail/senha.
3. Na versão **1.5** → **Informações para a equipe de revisão** → mesma conta e instrução: usar **Entrar** com e-mail/senha (não só Apple/Google).

**Responder à Apple (inglês):**

`We fixed a Firebase Auth initialization bug on iPad that caused "INTERNAL ASSERTION FAILED: Expected a class definition" during sign-in. The app now uses the official browserLocalPersistence on iOS. Demo account for review: [email] / [password] — please use email and password on the login screen. Build [número novo]. Thank you.`

**Depois:** workflow **iOS App Store** → nova build (196+) → na versão 1.5 trocar compilação → **Reenviar para revisão**.

### 13.2 Guideline 2.3.6 — Acesso irrestrito à web

**Sintoma:** revisor abriu YouTube no navegador **dentro** do app e navegou livremente.

**No App Store Connect (obrigatório nesta submissão):**

1. **App Store Connect** → app → **Informações do app** → **Classificação etária** → **Editar**.
2. Em **Acesso irrestrito à web** / **Unrestricted Web Access** → **Sim** / **Yes**.
3. Salvar (a faixa etária pode subir, ex. 17+ — é esperado).

**Correção no código (complementar):** links externos (YouTube, loja) passam a abrir no **Safari** (`App.openUrl`), não no Browser in-app.

**Responder à Apple (inglês, opcional na mesma resposta):**

`We updated the Age Rating to reflect Unrestricted Web Access as requested. External links (YouTube channel, store updates) now open in the system browser (Safari) instead of an in-app browser.`

### 13.3 Checklist antes de reenviar

- [ ] Nova build iOS com o fix de auth instalada no iPad (TestFlight).
- [ ] Login e-mail/senha, Google e Apple testados no iPad.
- [ ] Classificação etária com **Acesso irrestrito à web = Sim**.
- [ ] Conta demo nas notas de revisão + TestFlight.
- [ ] Compilação nova selecionada na versão 1.5.

---

## 11. Só compilar (sem TestFlight)

Run workflow com **upload_testflight** desmarcado → baixa o IPA em **Artifacts**.

---

*Team ID: BDAN6452VU · Bundle: com.bibliadc.app*
