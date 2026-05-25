# App Store Connect — textos prontos (Bíblia DC)

Copie e cole ao criar/editar o app **Bíblia DC** (`com.bibliadc.app`).

---

## Informações básicas

| Campo | Valor |
|-------|--------|
| Nome | Bíblia DC |
| Subtítulo (30 caracteres) | Bíblia e discipulado cristão |
| Bundle ID | com.bibliadc.app |
| SKU (sugestão) | bibliadc-ios-2026 |
| Idioma principal | Português (Brasil) |
| Categoria primária | Referência |
| Categoria secundária | Educação |
| Classificação etária | 4+ (sem conteúdo adulto no app) |
| Preço | Gratuito |

---

## URLs

| Campo | URL |
|-------|-----|
| Política de privacidade | https://foundcine.com/biblia/privacidade |
| URL de suporte | https://foundcine.com/biblia/sobre |
| Marketing (opcional) | https://foundcine.com/biblia/ |

---

## Descrição (até 4000 caracteres)

```
Bíblia DC (Bíblia do Discípulo Cristão) reúne a Palavra de Deus e recursos de apoio à vida cristã em um só aplicativo.

• Bíblia para leitura e estudo (incluindo modo offline)
• Confissão de Fé de Westminster, catecismos breve e maior
• Discipulado, devocionais, hinário e biblioteca de estudos
• Plano de leitura bíblica e ferramentas Strong
• Chat entre usuários (com opção de denunciar mensagens)
• Sincronização na nuvem com conta (e-mail, Google ou Apple)

Desenvolvido por Pastor Wilson Lucas Ferreira, com conteúdos também cedidos por outros pastores.

Contato: WhatsApp (69) 9 9910-4826 — disponível na seção Sobre do app.
```

---

## Texto promocional (170 caracteres, opcional)

```
Bíblia, Westminster, discipulado, hinário e estudos — offline e na nuvem. Gratuito para a igreja e o discípulo.
```

---

## Palavras-chave (100 caracteres, separadas por vírgula, sem espaços após vírgula)

```
bíblia,cristão,discipulado,westminster,catecismo,hinário,estudo bíblico,igreja
```

(Ajuste se a App Store recusar por duplicata com o nome.)

---

## Notas para revisão da Apple (campo “Review Notes”)

```
O app oferece leitura bíblica e conteúdos teológicos offline sem conta. Login (e-mail, Google ou Sign in with Apple) é necessário para chat, sincronização na nuvem e notificações.

Política de privacidade: https://foundcine.com/biblia/privacidade

Conta de teste (se solicitada): [PREENCHA e-mail e senha de uma conta de teste que você criar no Firebase]

Chat: usuários podem denunciar mensagens pelo menu na conversa.
```

**Importante:** crie uma conta de teste só para a Apple e coloque e-mail/senha nas notas de revisão.

---

## App Privacy (questionário — orientação)

Declare de forma coerente com a política de privacidade:

- **Dados de contato:** e-mail (se o usuário cadastrar)
- **Identificadores:** ID de usuário Firebase
- **Conteúdo do usuário:** mensagens de chat, perfil público opcional
- **Uso:** funcionalidade do app, não publicidade
- **Vinculado à identidade:** sim, quando logado
- **Rastreamento entre apps:** não (salvo se você usar analytics de terceiros além do Firebase — ajuste conforme seu uso real)

---

## Export compliance (criptografia)

O app usa HTTPS padrão. No questionário da Apple, em geral:

- **Usa criptografia?** Sim (HTTPS)
- **Isenção?** Sim — apenas criptografia padrão / isento (equivalente a marcar “não usa criptografia não isenta”)

No Xcode já está `ITSAppUsesNonExemptEncryption = false` no `Info.plist`.

---

## Screenshots

Prepare no **iPhone** (TestFlight) ou simulador iOS (modo claro):

1. Tela inicial / menu  
2. Bíblia aberta em um capítulo  
3. Discipulado ou devocional  
4. Chat ou perfil (opcional)  

Tamanhos: siga o que o App Store Connect pedir para **iPhone 6,5" / 6,7"** (obrigatório) — ex. **1284 × 2778** px (retrato).

### Não tenho iPhone

Guia completo: **`docs/SCREENSHOTS_SEM_IPHONE.md`**

Resumo: no **Chrome** abra `https://foundcine.com/biblia/`, modo dispositivo **iPhone 14 Pro Max**, capture 3 telas (menu, Bíblia, discipulado) e envie no App Store Connect. Opcional: peça a alguém da igreja instalar pelo **TestFlight** e mandar as fotos.

Prints só do Android podem servir se redimensionados (`npm run screenshots:resize`), mas o Chrome no PC costuma ser mais seguro para a revisão da Apple.
