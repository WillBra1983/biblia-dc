# Screenshots para a App Store — sem iPhone

O **Bíblia DC** usa a mesma interface na web e no app (Capacitor). A Apple aceita capturas que mostrem o app de forma fiel — você pode gerá-las no **Windows** com o Chrome.

Tamanho pedido para **iPhone 6,5"** (retrato): **1284 × 2778** pixels (ou 1242 × 2688).

---

## Opção A — Chrome no PC (recomendada)

1. Abra o app publicado:  
   **https://foundcine.com/biblia/**  
   (ou rode `npm run dev` e abra `http://localhost:5173` se estiver testando local)

2. Pressione **F12** → ícone de **celular/tablet** (modo dispositivo).

3. No topo, escolha **iPhone 14 Pro Max** (ou **Responsive** e defina largura **428**, altura **926**, zoom **100%**, DPR **3** se aparecer).

4. Navegue até cada tela e tire print:
   - **1** — Menu / início  
   - **2** — Bíblia em um capítulo  
   - **3** — Discipulado, devocional ou hinário  

5. **Captura em tamanho certo:**
   - No painel do DevTools, menu **⋮** (três pontos) → **Capture screenshot** / **Capturar captura de tela**  
   - Ou: **Ctrl+Shift+P** → digite `screenshot` → **Capture full size screenshot** (página inteira) ou captura da área visível.

6. Se a imagem sair um pouco menor ou maior, redimensione para **1284 × 2778**:
   ```powershell
   cd C:\Salvation
   npm run screenshots:resize -- "C:\caminho\print1.png" "docs\store-screenshots\01-menu.png"
   ```
   (repita para cada arquivo; a pasta `docs/store-screenshots` é só exemplo)

7. No App Store Connect → **iPhone 6,5"** → envie as **3** imagens.

**Dica:** use modo **claro** no app (tema escuro às vezes escurece demais na revisão).

---

## Opção B — Prints do Android + redimensionar

Se você já tem prints do **celular Android**:

1. Abra o app em tela cheia (sem barra do navegador).  
2. Tire 3 prints (menu, Bíblia, discipulado).  
3. No PC, redimensione para 1284×2778 com o script acima.

**Atenção:** se aparecer barra de navegação Android ou botões Material muito diferentes do app no iOS, a Apple pode pedir novas imagens. Por isso a **Opção A** costuma ser mais segura.

---

## Opção C — Alguém com iPhone (melhor para TestFlight)

Para **testar** o app e ver o **ícone** na tela inicial:

1. App Store Connect → **TestFlight** → **Testadores internos** → adicione o e-mail Apple de um familiar ou irmão da igreja.  
2. A pessoa instala **TestFlight** e **Bíblia DC**.  
3. Ela envia as 3 fotos da tela (WhatsApp) para você subir no site.

Você **não precisa** ter iPhone para publicar; só precisa de imagens no tamanho certo.

---

## Ícone do app no iPhone

O ícone novo só aparece depois de instalar um **build novo** pelo TestFlight (workflow **iOS App Store** no GitHub, build **7+**). Quem tiver iPhone pode confirmar; na loja o ícone vem do que você enviou no build, não do print.

---

## Checklist App Store

| Item | Sem iPhone |
|------|------------|
| 3 screenshots 1284×2778 | Opção A ou B |
| Textos / URLs | `docs/APP_STORE_CONNECT_TEXTO.md` |
| Build no TestFlight | GitHub Actions (você já fez) |
| Conta de teste para revisão | Criar no Firebase/app |

---

*Dúvida: mande print da tela do Chrome (modo celular) que orientamos o próximo clique.*
