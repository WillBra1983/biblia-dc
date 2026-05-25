# Apple — passo a passo simples (sem programação)

O aplicativo **já está preparado no computador e no GitHub**. Falta só **contas Apple** e **colar senhas no site do GitHub**.

---

## Parte 1 — Arquivo na sua Área de Trabalho (já gerado pelo assistente)

1. Procure na **Área de Trabalho** o arquivo:  
   **`BibliaDC-secrets-GitHub-NAO-COMPARTILHAR.txt`**
2. Abra com o Bloco de Notas.
3. Abra no navegador:  
   https://github.com/WillBra1983/biblia-dc/settings/secrets/actions
4. Para cada linha do arquivo que diz **NOME = valor**:
   - Clique **New repository secret**
   - **Name:** o nome (ex.: `APPLE_TEAM_ID`)
   - **Secret:** só o valor (depois do `=`)
   - **Add secret**
5. Quando terminar, **apague** o arquivo da Área de Trabalho.

Os itens **APPLE_CERTIFICATE** e **perfil** só depois da Parte 2.

---

## Parte 2 — Site da Apple (certificado)

Você precisa entrar em https://developer.apple.com com a conta que pagou os US$ 99.

Peça ajuda a alguém **uma vez** para:

1. Criar certificado **Apple Distribution**
2. Baixar o perfil **App Store** para o app **Bíblia DC** (`com.bibliadc.app`)

Depois rode no PowerShell (o assistente pode rodar de novo):

```text
cd C:\Salvation
npm run ios:gerar-secrets-desktop
```

E cole no GitHub os dois base64 grandes (certificado e perfil) que o script pedir — ou use o guia com fotos: `docs/GITHUB_IOS_APP_STORE.md`.

---

## Parte 3 — Firebase (ligar “Entrar com Apple”)

1. Abra https://console.firebase.google.com → projeto **biblia-dc**
2. Menu **Authentication** → **Sign-in method**
3. Clique em **Apple** → **Ativar** → Salvar

Mais detalhes: `docs/FIREBASE_APPLE_SIGNIN.md`

---

## Parte 4 — Criar o app na App Store Connect (uma vez, antes do 1º envio)

1. Abra https://appstoreconnect.apple.com → **Apps** → **+** → **Novo app**
2. iOS · nome **Bíblia DC** · idioma **Português (Brasil)**
3. **ID do pacote:** `com.bibliadc.app` (deve aparecer na lista)
4. **SKU:** `bibliadc-ios-2026` (ou outro nome único) → **Criar**

Sem este passo, o GitHub compila o IPA mas o upload ao TestFlight falha.

---

## Parte 5 — Gerar o app para iPhone (TestFlight)

1. https://github.com/WillBra1983/biblia-dc/actions
2. Clique **iOS App Store** → **Run workflow** → marque TestFlight → **Run**
3. Espere ~30–40 minutos (barra verde = ok)
4. No iPhone, instale o app **TestFlight** da App Store e aceite o convite quando aparecer no App Store Connect

---

## Parte 6 — Loja (textos e fotos)

Abra `docs/APP_STORE_CONNECT_TEXTO.md` — está tudo em português para **copiar e colar** na App Store Connect.

Tire **prints do celular** (menu, Bíblia, etc.) e envie onde o site pedir “Screenshots”.

---

## Se algo der erro

Mande **print da tela vermelha** do GitHub Actions ou da Apple — não precisa entender o texto técnico.

---

*O Pastor não precisa aprender programação; só seguir estas partes na ordem.*
