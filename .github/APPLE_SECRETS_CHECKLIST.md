# GitHub Actions — secrets para iOS App Store

Repo: **WillBra1983/biblia-dc** → Settings → Secrets and variables → Actions

Marque cada um após criar:

## Assinatura Apple

- [ ] `APPLE_TEAM_ID` = `BDAN6452VU`
- [ ] `APPLE_CERTIFICATE_BASE64`
- [ ] `APPLE_CERTIFICATE_PASSWORD`
- [ ] `APPLE_PROVISION_PROFILE_BASE64`
- [ ] `KEYCHAIN_PASSWORD` (invente uma senha; só o runner usa)

## Firebase / build Vite

- [ ] `GOOGLE_SERVICE_INFO_PLIST_BASE64`
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_DATABASE_URL`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID` (app **Web** do Firebase — o workflow usa no bundle JS)
- [ ] `VITE_FIREBASE_VAPID_KEY` (recomendado)
- [ ] `VITE_GEMINI_API_KEY_WEB`
- [ ] `VITE_GEMINI_API_KEY_ANDROID`
- [ ] `VITE_GEMINI_API_KEY_IOS`

Valores `VITE_*`: copie do `.env` local (não commitar `.env`).

Plist: `npm run ios:github-secrets` no Windows.

## App Store Connect (upload TestFlight)

- [ ] `APPSTORE_ISSUER_ID`
- [ ] `APPSTORE_API_KEY_ID`
- [ ] `APPSTORE_API_PRIVATE_KEY` (arquivo `.p8` inteiro)

Guia passo a passo: `docs/GITHUB_IOS_APP_STORE.md`
