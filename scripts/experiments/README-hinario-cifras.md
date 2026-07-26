# Experimento de extração do hinário cifrado

Este experimento avalia se as cifras e letras do PDF podem ser convertidas para
um formato estruturado e transponível sem alterar o hinário atual.

## Garantias deste teste

- não modifica `public/hinario-com-cifras.pdf`;
- não modifica `public/hinario.db` ou `public/hinario_cifrado.db`;
- não modifica páginas, componentes ou serviços do aplicativo;
- escreve somente em `output/hinario-cifras-experimento/`;
- os resultados são rascunhos e exigem comparação com o PDF antes de qualquer
  integração futura.

## Execução

```powershell
& "C:\Users\Pr Wilson Lucas\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" `
  scripts\experiments\extrair-cifras-coordenadas.py
```

O primeiro lote usa as páginas 3 a 7, correspondentes aos hinos 1 a 10. A
página `output/hinario-cifras-experimento/comparacao.html` apresenta o recorte
original ao lado do rascunho estruturado.

## Resultado do primeiro lote

- os hinos 1 a 10 foram separados corretamente entre as duas colunas;
- títulos, tons e compassos foram identificados;
- cifras encostadas pelo PDF, como `DAD` e `D4D`, foram separadas;
- a notação antiga de menor, como `A-`, foi normalizada para `Am`;
- uma cópia de teste com todas as cifras elevadas em dois semitons foi gerada;
- nenhuma tela ou fonte de dados do aplicativo consome estes resultados.

O PDF possui 238 páginas, mas isso não representa 238 hinos. Há duas músicas
por página em grande parte do arquivo, numeração principal até 400 e materiais
suplementares no final.

## Limites antes de uma integração

A associação entre a cifra e a sílaba é calculada a partir das coordenadas do
PDF. Ela ficou coerente na amostra, mas ainda pode deslocar alguns caracteres
em fontes ou diagramações diferentes. Cada lote precisa de revisão visual e de
uma validação musical antes de ser considerado definitivo. O PDF atual deve
permanecer disponível até que todo o acervo estruturado seja aprovado.
