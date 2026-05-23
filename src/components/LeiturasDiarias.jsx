import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider
} from '@mui/material'
import VersiculoLink from './VersiculoLink'

export default function LeiturasDiarias({ leituras }) {
  if (!leituras || leituras.length === 0) {
    return null
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {leituras.map((meditacao, index) => (
        <Card key={index} elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Dia {meditacao.dia} - {meditacao.titulo}
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Leitura Bíblica:
              </Typography>
              <Typography>
                {meditacao.leitura.split(';').map((ref, i, arr) => (
                  <span key={i}>
                    <VersiculoLink referencia={ref.trim()} />
                    {i < arr.length - 1 ? '; ' : ''}
                  </span>
                ))}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body1" paragraph sx={{ textAlign: 'justify' }}>
              {meditacao.texto}
            </Typography>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Para Reflexão:
              </Typography>
              <Typography variant="body1" paragraph sx={{ fontStyle: 'italic' }}>
                {meditacao.reflexao}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Oração:
              </Typography>
              <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                {meditacao.oracao}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
} 