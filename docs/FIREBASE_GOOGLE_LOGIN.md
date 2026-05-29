# Login com Google — erro "The requested action is invalid"

## O que está acontecendo

Ao tocar em **Continuar com Google** no site `https://foundcine.com/biblia/`, o navegador abre uma janela em:

`https://biblia-dc.firebaseapp.com/__/auth/handler?...&redirectUrl=https://foundcine.com/biblia/chat&providerId=google.com`

Isso é **normal**: o Firebase sempre usa o domínio `authDomain` (`biblia-dc.firebaseapp.com`) para o login web e depois devolve o usuário para `foundcine.com`.

A mensagem **"The requested action is invalid"** aparece **dentro** dessa página do Firebase, **antes** de escolher a conta Google. O link não está “errado” no código — o servidor do Firebase **rejeita** a tentativa.

**Quem já tinha sessão salva** continua entrando (token no navegador). **Contas novas** falham → típico de domínio não autorizado, Google desativado no Firebase, OAuth em modo teste ou chave de API restrita.

## Comparação com `Desktop\Salvation`

O `.env` e o fluxo de login (`FirebaseAuthContext.jsx`, `firebaseRuntime.js`) são os **mesmos** nos dois projetos:

| Item | Valor |
|------|--------|
| `VITE_FIREBASE_AUTH_DOMAIN` | `biblia-dc.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `biblia-dc` |
| `VITE_PUBLIC_APP_URL` | `https://foundcine.com/biblia` |

A diferença não está no código local — está no **Firebase Console**, **Google Cloud** ou no **build publicado** em `foundcine.com` (precisa de `npm run build:web` com `.env` preenchido).

## Checklist (faça nesta ordem)

### 1. Domínios autorizados (Firebase)

1. [Firebase Console](https://console.firebase.google.com/) → projeto **biblia-dc**
2. **Authentication** → aba **Configurações** → **Domínios autorizados**
3. Confirme que existem:
   - `foundcine.com`
   - `www.foundcine.com`
   - `biblia-dc.firebaseapp.com`
   - `localhost` (desenvolvimento)

Se `foundcine.com` faltar, clique **Adicionar domínio**, salve e espere ~1 minuto.

### 2. Provedor Google ativo (Firebase)

1. **Authentication** → **Método de login**
2. **Google** → **Ativado**
3. Anote o **ID do cliente Web** (tipo “Aplicativo da Web”) — deve ser o mesmo do Google Cloud.

### 3. OAuth no Google Cloud

1. [Google Cloud Console](https://console.cloud.google.com/) → projeto ligado ao Firebase (**biblia-dc**)
2. **APIs e serviços** → **Credenciais**
3. Abra o cliente **OAuth 2.0** do tipo **Aplicativo da Web** (criado pelo Firebase)

**Origens JavaScript autorizadas:**

```
https://foundcine.com
https://www.foundcine.com
https://biblia-dc.firebaseapp.com
http://localhost:5173
http://localhost:3000
```

**URIs de redirecionamento autorizados:**

```
https://biblia-dc.firebaseapp.com/__/auth/handler
```

(Opcional, se usar): `https://biblia-dc.web.app/__/auth/handler`

### 4. Chave de API (restrições)

1. Na mesma página **Credenciais**, abra a chave cujo valor é o `VITE_FIREBASE_API_KEY` do `.env`
2. Em **Restrições de aplicativo** → **Referenciadores HTTP**, inclua pelo menos:
   - `https://foundcine.com/*`
   - `https://www.foundcine.com/*`
   - `https://biblia-dc.firebaseapp.com/*`
   - `http://localhost:5173/*` (dev)
   - `capacitor://localhost` e `capacitor://localhost/*` (**obrigatório no app iOS/Android Capacitor** — sem isso, login e-mail/senha falha com `auth/requests-from-referer-capacitor://localhost-are-blocked`)
   - `https://localhost/*` (WebView com `iosScheme`/`androidScheme` https)
3. Para **testar** só: temporariamente **Nenhuma** restrição → se funcionar, o problema era a chave.

### 5. Tela de consentimento OAuth

**APIs e serviços** → **Tela de consentimento OAuth**

- Se o status for **Teste**, só usuários listados como **Testadores** conseguem entrar com Google.
- Para qualquer pessoa: **Publicar app** (ou adicione cada e-mail em Testadores).

### 6. Republicar o site

No PC, na pasta do projeto:

```powershell
npm run build:web
npm run deploy:pwa-apis
```

Reinicie o servidor Flask em `apis` se necessário.

## Android e computador

| Onde abre | Fluxo |
|-----------|--------|
| Chrome em `foundcine.com/biblia` | Login **web** (popup ou redirect) — este guia |
| APK instalado (ícone Bíblia DC) | Login **nativo** (plugin Google) — precisa SHA-1/SHA-256 no Firebase + `google-services.json` |

Se o erro mostra `signInViaPopup` e `redirectUrl=foundcine.com`, você está no **site no navegador**, não no login nativo do APK.

No código, celular no navegador passou a usar **redirect** em vez de popup (mais estável no Chrome Android).

## APK (login nativo)

Se o erro for só no **app instalado** (sem barra `foundcine.com`):

1. Firebase → app Android `com.bibliadc.app`
2. SHA-1 e SHA-256 da keystore de release (e da Play App Signing, se publicar na Play)
3. Baixar de novo `google-services.json` → `android/app/`
4. `npm run android:sync` e reinstalar o APK

## Teste rápido

1. Abra uma aba anônima em `https://foundcine.com/biblia/chat`
2. **Continuar com Google**
3. Deve abrir a conta Google e voltar logado — não a página branca com "invalid"

Se ainda falhar, no Firebase → Authentication → **Usuários**: veja se o provedor Google aparece para contas antigas e não para novas tentativas.
