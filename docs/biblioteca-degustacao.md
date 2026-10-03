# Degustação dos livros

Na edição de um livro, “Leitura gratuita e proteção” permite escolher:

- **Amostra tradicional**: mantém o comportamento dos livros já cadastrados.
- **Por percentual**: informe o percentual e envie em “Amostra gratuita” um PDF/EPUB preparado contendo somente esse trecho. O sistema não corta arquivos automaticamente nem verifica a proporção do arquivo enviado. Somente esse arquivo separado é entregue ao visitante autenticado.
- **Por tempo**: defina início e fim da promoção no horário local do aparelho do administrador. As datas são salvas como instantes absolutos. A mesma janela vale para todas as contas, independentemente da primeira abertura. O arquivo completo é entregue ao leitor durante essa janela.

Não há botão de download. O servidor recusa pedidos de download de leitores, inclusive de compradores. O acesso pago continua sendo conferido no servidor, sem depender de um botão “Comprei”. A liberação de compra direciona o leitor da amostra ao livro completo. A posição é compartilhada entre degustação e leitura paga; PDFs preparados com páginas iniciais e EPUBs que preservem a estrutura original oferecem a melhor continuidade.

No encerramento, o leitor aberto desmonta o conteúdo e oferece as opções de compra. Novas solicitações de leitura gratuita são recusadas pelo servidor. Um link temporário não pode durar além do fim da promoção.

## Limitações importantes

“Somente leitura” não é DRM: arquivos recebidos para renderização podem ser capturados tecnicamente, e imagens da tela também podem ser copiadas. A promoção por tempo não revoga uma cópia já recebida. Para não entregar o livro completo antes da compra, use a modalidade por percentual com uma amostra realmente separada.

Se mudar de uma amostra para outro arquivo com estrutura diferente, a posição de EPUB pode não existir no arquivo novo; nesse caso o leitor volta ao início. Não se pode garantir continuidade entre arquivos arbitrariamente diferentes.

## Publicação

As alterações locais precisam de publicação do site/app e da função `obterArquivoLivroBiblioteca`. Não exigem novas regras de banco nem dependências. Não são publicadas automaticamente pela implementação.

Teste com uma conta de leitor: antes do início, dentro da janela, depois do fim, encerramento com leitor aberto e compra aprovada. Confira PDF e EPUB no celular e no computador. Não use uma conta administradora para validar restrições: ela tem acesso editorial.
