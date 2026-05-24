# iOS sem Mac e sem US$ 99 (por enquanto)

Tudo que dá para fazer **de graça** antes de pagar a Apple Developer Program.

| O que | Onde | Custo |
|-------|------|-------|
| Código + pasta `ios/` | Este PC (Windows) | R$ 0 |
| Build “compila?” no simulador | **GitHub Actions** (Mac na nuvem) | R$ 0* |
| Firebase app iOS, OAuth Google | Navegador | R$ 0 |
| Testar app no dia a dia | PWA / APK Android | R$ 0 |
| Instalar no iPhone / App Store | Conta Apple Developer | US$ 99/ano |

\* Repositório **público** no GitHub: minutos macOS ilimitados. Repositório **privado**: ~2000 min/mês no plano grátis.

---

## Passo 1 — No Windows (agora)

```powershell
npm run ios:sync
npm run ios:free-status
```

O `free-status` lista o que falta (plist, `iosClientId`, Team ID no AASA, etc.).

---

## Passo 2 — Firebase (navegador, grátis)

1. [Firebase Console](https://console.firebase.google.com) → projeto **biblia-dc**.
2. Adicionar app **iOS** → Bundle ID: `com.bibliadc.app`.
3. Baixar **`GoogleService-Info.plist`** → salvar em:
   ```
   ios/App/App/GoogleService-Info.plist
   ```
4. No PC:
   ```powershell
   npm run ios:inject-google-scheme
   ```
   (Coloca o URL scheme do Google no `Info.plist` automaticamente.)

---

## Passo 3 — Google OAuth iOS (navegador, grátis)

1. [Google Cloud Console](https://console.cloud.google.com) → Credenciais.
2. Criar **ID do cliente OAuth** → tipo **iOS** → Bundle `com.bibliadc.app`.
3. Copiar o Client ID e colar em `capacitor.config.json`:

```json
"GoogleAuth": {
  "scopes": ["profile", "email"],
  "androidClientId": "...",
  "iosClientId": "SEU_ID_IOS.apps.googleusercontent.com",
  "serverClientId": "..."
}
```

4. `npm run ios:sync` de novo.

---

## Passo 4 — Team ID sem pagar US$ 99 (só para Universal Links)

Com **Apple ID gratuito** você já vê o **Team ID** (10 letras/números):

1. [developer.apple.com/account](https://developer.apple.com/account) → entrar com Apple ID.
2. **Membership** → anote o **Team ID** (mesmo sem programa pago).
3. Em `public/.well-known/apple-app-site-association`, troque:
   `SUBSTITUA_TEAM_ID` → seu Team ID (ex.: `ABC1234DEF`).
4. Publique no servidor:
   ```powershell
   npm run build:web
   npm run deploy:pwa-apis
   ```
   (O script agora copia também o `apple-app-site-association`.)

**Nota:** Universal Links no iPhone **só funcionam de ponta a ponta** depois do app instalado (com conta paga ou teste no Mac). Mas o arquivo no servidor pode ficar pronto antes.

---

## Passo 5 — Mac grátis no GitHub Actions

1. Suba o projeto para o **GitHub** (commit com pasta `ios/` e `.github/workflows/ios-simulator-free.yml`).
2. A cada push em `main`/`master`, o workflow **iOS simulador (grátis)** roda:
   - `npm ci` → `ios:sync` → `pod install` → `xcodebuild` simulador.
3. Veja o resultado em **Actions** no GitHub (verde = projeto iOS compila).

Isso **não gera IPA** para instalar no celular, mas evita descobrir erro só quando pagar a Apple.

### Ativar manualmente

GitHub → **Actions** → **iOS simulador (grátis)** → **Run workflow**.

---

## Passo 6 — O que continua impossível sem US$ 99

- TestFlight / App Store  
- Push remoto (chave APNs exige conta paga)  
- Instalar o `.ipa` no iPhone de forma “oficial”  

Quando for publicar na App Store **sem Mac**, use **`docs/GITHUB_IOS_APP_STORE.md`** e o workflow **iOS App Store**. Com Mac local, veja `GERAR_IOS.md`.

---

## Comandos úteis

| Comando | Uso |
|---------|-----|
| `npm run ios:sync` | Build web + copia para `ios/` |
| `npm run ios:free-status` | Checklist local |
| `npm run ios:inject-google-scheme` | URL scheme Google no Info.plist |
| `npm run dev` | Testar quase tudo no navegador |

---

## Ordem recomendada

1. Firebase plist + `ios:inject-google-scheme`  
2. `iosClientId` no `capacitor.config.json`  
3. Team ID no AASA + `deploy:pwa-apis`  
4. Push no GitHub → conferir Actions verde  
5. Só então pagar US$ 99 + Mac remoto ou emprestado para Archive/TestFlight  

*Atualizado: maio/2026*
