# Firebase — ativar Sign in with Apple (iOS)

O código do app já chama `OAuthProvider('apple.com')` e o plugin nativo no iPhone. Falta **ligar no Firebase** e conferir o **App ID** na Apple.

---

## 1. Apple Developer

1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
2. Identificador **App IDs** → `com.bibliadc.app`
3. Marque **Sign In with Apple** → **Save**
4. Se o Firebase pedir **Services ID** (só para login web/PWA avançado), crie em **Identifiers** → **Services IDs**; para **só app iOS nativo**, o bundle `com.bibliadc.app` costuma bastar.

---

## 2. Firebase Console

1. [Authentication](https://console.firebase.google.com/project/biblia-dc/authentication/providers) → **Sign-in method**
2. **Apple** → **Enable**
3. Preencha conforme o assistente:
   - **Team ID:** `BDAN6452VU`
   - **Key ID / private key (.p8):** só se o Firebase pedir (chave **Sign in with Apple** no Apple Developer → Keys; é **diferente** da chave APNs de push)
4. **Save**

---

## 3. Testar

- iPhone com build **TestFlight** ou desenvolvimento.
- Chat → **Continuar com Apple** (botão aparece no iOS).
- Conta nova e conta que já usa o mesmo e-mail no Google (comportamento “link account” do Firebase).

---

## Erros comuns

| Sintoma | Causa provável |
|---------|----------------|
| `auth/operation-not-allowed` | Provedor Apple desligado no Firebase |
| `invalid-credential` | Team ID errado ou capability não ativa no App ID |
| Botão não aparece no Android | Normal — Apple só no iOS (`mostrarLoginApple.js`) |

---

*Team ID: BDAN6452VU · Bundle: com.bibliadc.app*
