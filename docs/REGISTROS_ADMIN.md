# Registros e lista de usuários

## Causa identificada

O cliente guardava a seção visitada na sessão da aba (`salvation:sectionViewsRegistadosEntrada`), sem UID nem data. Depois que uma conta registrava `biblia`, outras contas abertas na mesma aba eram ignoradas. Uma visita do administrador também marcava essa seção, embora o administrador seja excluído da contagem. Portanto, trocar do administrador para um usuário comum podia bloquear o registro deste. O bloqueio de solicitações simultâneas também era apenas por seção.

O número exibido no menu vem de `adminMetrics/sectionViews`, não da lista de contas do Authentication. São acessos registrados de contas autenticadas, não pessoas distintas. A lista por data usa `adminMetrics/userAccess/daily`, enquanto “Mostrar todos” lista contas do Firebase Authentication, em páginas.

## Correções

- Controle da sessão em uma nova chave, separado por UID, data brasileira e seção. Há cópia em memória para navegadores que bloqueiam sessionStorage.
- Solicitações em andamento separadas pela mesma identidade. A conta atual é conferida antes de chamar a função para impedir que uma tarefa iniciada antes da troca de login registre a conta errada.
- Só confirma a sessão após resposta `ok: true`; falhas podem ser tentadas novamente. A tela tenta novamente ao voltar à conexão, receber foco, tornar-se visível e a cada minuto visível, permitindo também a virada de data.
- A exclusão de administradores foi preservada.
- “Hoje” e “Total” aparecem explicitamente. Carregamento e falhas de leitura não são apresentados como zero nem ocultados atrás de um valor anterior.
- O novo acesso principal ao Strong foi alinhado à chave aceita pelo servidor.
- A tabela de nove colunas da lista de usuários foi substituída por cartões. Nome, e-mail, apelido, provedor, datas e UID permanecem legíveis e podem quebrar linha. As ações mantêm confirmação e proteção de contas administrativas.
- A lista mostra quantas contas carregadas correspondem ao filtro e mantém a paginação. Contas repetidas em páginas sucessivas são reunidas por UID.

Não se inventou uma recontagem retroativa. Visitas que não chegaram ao servidor não podem ser reconstruídas a partir do simples número de contas cadastradas. Também não houve acesso ao banco de produção nesta análise.

## Validação

- `node scripts/test-admin-registros.cjs`: contas diferentes na mesma sessão, administrador seguido de usuário comum, repetição sem duplicar, nova seção, virada de data, falha e repetição, concorrência, troca de login e armazenamento indisponível. Exercita também a função do servidor com Firebase simulado.
- `node scripts/test-admin-interface.cjs`: tela real e contadores no Chrome, com Firebase simulado, larguras 320/430/1024 px e fontes normais/ampliadas, exibição de campos completos, proteção administrativa, filtro por data e indicação de erro.

## Aplicação

As mudanças de interface e registro por conta entram no próximo build e publicação do aplicativo/site. Não há alteração nas regras do banco. A função de registro precisa ser publicada para aceitar também a chave do menu Strong:

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = '120'
npx firebase-tools deploy --only functions:registrarVisualizacaoSecao --project biblia-dc
```

Nenhum deploy foi realizado nesta tarefa.
