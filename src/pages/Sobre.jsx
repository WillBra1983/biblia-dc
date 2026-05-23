import { Box, Container, Paper, Typography } from '@mui/material'
import StrongLexiconAttributions from '../components/StrongLexiconAttributions'

export default function Sobre() {
  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.25 }}>
          Bíblia do Discípulo Cristão
        </Typography>
        <Typography variant="body1" sx={{ mb: 1.25 }}>
          A Palavra de Deus ao seu alcance. Bíblia, Confissão de Fé de Westminster, catecismos,
          discipulado, devocionais, hinário e mais conteúdos de apoio cristão.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
          Versão 0.0.1
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.75 }}>
          Desenvolvido por Pastor Wilson Lucas Ferreira.
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.25 }}>
          Alguns conteúdos foram gentilmente cedidos por outros pastores.
        </Typography>
        <Typography variant="body2">
          Contato:{' '}
          <Box
            component="a"
            href="https://wa.me/5569999104826"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: '#25D366', textDecoration: 'underline', fontWeight: 500 }}
          >
            (69) 9 9910-4826
          </Box>
        </Typography>
      </Paper>

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2.5, mb: 1 }}>
        Materiais lexicais (Strong)
      </Typography>
      <StrongLexiconAttributions />
    </Container>
  )
}
