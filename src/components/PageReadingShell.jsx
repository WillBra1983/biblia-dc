import Box from '@mui/material/Box'
import Container from '@mui/material/Container'

/**
 * Wrapper visual para páginas longas de **leitura** (Confissão, Catecismos,
 * Devocional, “Assim diz o Senhor”, etc.).
 *
 * Padroniza:
 *  - largura máxima de coluna confortável para leitura (~820 px) com `mx: auto`;
 *  - padding lateral progressivo (mais ar no desktop, mais aproveitamento no
 *    celular);
 *  - fundo alinhado ao tema (`background.default`).
 *
 * Mantém-se intencionalmente sem `Paper`/`elevation` para que cada página
 * decida onde quer caixinha branca; este shell só uniformiza ritmo da coluna
 * de texto. Não toca em botões flutuantes/fixed que as páginas já gerenciam.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {number|string} [props.maxWidth=820] — largura máxima do bloco de texto.
 * @param {object} [props.sx] — overrides finais (vence o resto).
 * @param {boolean} [props.fullHeight=true] — preenche o main disponível (útil em rotas
 *   onde o conteúdo é curto e queremos cor de fundo consistente).
 */
export default function PageReadingShell({
  children,
  maxWidth = 820,
  sx,
  fullHeight = true
}) {
  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary',
        minHeight: fullHeight ? '100%' : undefined,
        width: '100%',
      }}
    >
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          px: { xs: 1, sm: 3 },
          py: { xs: 2, sm: 3 },
          width: '100%'
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth,
            mx: 'auto',
            ...sx
          }}
        >
          {children}
        </Box>
      </Container>
    </Box>
  )
}
