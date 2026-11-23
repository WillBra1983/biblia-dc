# Retorno e área segura no iOS

## Correções

- A leitura ampliada do hinário e dos cânticos reservava zero pixels no topo quando a barra principal era ocultada. O `Layout` agora mantém o espaço de `safe-area-inset-top` nessa situação e no versículo do dia.
- Cabeçalho, conteúdo e menu principal respeitam também os recortes laterais em paisagem.
- O cabeçalho do hino tem uma coluna reservada ao botão de reduzir, mesmo com título longo e letras ampliadas. Os botões de tela cheia do hinário e dos cânticos têm área mínima de 44 × 44 pixels.
- A leitura ampliada de hinos, cânticos e livros tem uma saída adicional `Reduzir`, fixada fora do conteúdo rolável e da transformação de zoom. Permanece disponível durante o carregamento, falhas do conteúdo ou ocultação das barras do leitor.
- O leitor imersivo de livros fica abaixo dos diálogos e acima do cabeçalho normal. A saída de segurança fica acima do leitor e abaixo de modais.
- O zoom global não transforma superfícies ampliadas nem o leitor de livros, que tem seu próprio zoom. Isso evita transformar o sistema de coordenadas dos controles fixos.
- Os títulos e ações dos diálogos permanecem acessíveis durante a rolagem. A proteção comum do tema para diálogos e gavetas foi preservada; as gavetas também respeitam os recortes laterais.
- As janelas obrigatórias do chat para sessão anônima e escolha de apelido oferecem `Voltar à Bíblia`, mesmo quando a ação principal está ocupada. As exigências de autenticação e apelido para usar o chat continuam em vigor.

## Retornos

`src/utils/navegacaoVoltar.js` define destinos internos explícitos. O botão não depende de haver uma página anterior no navegador, nem de uma seta injetada por um portal da página.

| Origem | Retorno |
| --- | --- |
| Discipulado: introdução ou lição | Lições do módulo |
| Lições de um módulo (`?modulo=`) | Lista de módulos |
| Resumo/ocorrências Strong | Estudo Strong |
| Estudo Strong e plano bíblico | Bíblia |
| Devocional individual | Devocionais |
| Leitura/amostra de livro | Detalhes do livro |
| Livro pessoal ou detalhes de livro | Livraria |
| Editor de estudo existente | Estudo |
| Estudo e demais páginas de estudos | Estudos compartilhados |
| Geração de comentário bíblico | Comentários bíblicos |
| Editor do hinário | Outras canções |
| Notificações | Configurações |
| Seções principais | Abre o menu principal |

O menu principal ganhou um botão de fechar fixo na sua própria barra. O botão de reduzir remove somente `telaCheia` da URL e preserva os demais parâmetros e a âncora. O discipulado mantém somente o portal das lições; o botão de voltar pertence ao `Layout`.

## Zoom de leitura

Configuração, pinça e Ctrl+roda usam a preferência `fontSize` da seção, na escala de 100% a 200%, em passos de 10. O gesto não multiplica um zoom já configurado e não aplica `transform: scale()` ao contêiner. Preferências antigas fora do intervalo são normalizadas na leitura e novas alterações são limitadas antes de serem gravadas.

Na Bíblia, foi removido o multiplicador temporário `zoomLeitura`. O nome do livro ocupa uma linha própria no grid do cabeçalho, abaixo dos controles de versão e comparação, com quebra de palavras dentro da largura disponível. Textos bíblicos embutidos usam a mesma preferência e os mesmos limites. Gestos tratados pelo contêiner local não são reaplicados pelo pai.

`node scripts/test-zoom-leitura.cjs` cobre 35 verificações de limites, valores antigos, pinça aninhada, equivalência com o controle real de configuração e títulos longos em larguras de 280 a 844 pixels. Os testes usam Chrome com gestos e dados simulados.

## Validação da navegação

- `node scripts/test-navegacao-ios.cjs`: inventário de 55 rotas e testes de retorno, clique real por hit testing, áreas seguras simuladas, letra em 300%, retrato/paisagem, hinário real com dados simulados, diálogos e saída de livros.
- `node scripts/test-mobile-layout.mjs`: 8 grupos de regressão; sintaxe de 42 páginas e 118 componentes e inventário de 85 usos de `Dialog`.
- `node scripts/test-biblia-safe-area.mjs`: 25 verificações de geometria da leitura bíblica.

Os testes usam Chrome com insets e dados simulados. Não executam WebKit e não substituem a conferência em iPhone físico, principalmente com a área de atividades/áudio expandida pelo sistema. Não há mudança de regras Firebase ou Cloud Functions nesta correção. O aplicativo instalado precisa receber um novo build para incorporar os arquivos.
