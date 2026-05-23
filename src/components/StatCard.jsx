import { Card, CardContent, Typography } from '@mui/material'
import { getGlassCardStyles } from '../utils/glassCardStyles'

export default function StatCard({ titulo, valor, total, subtitulo }) {
  // Cores variadas para diferentes cards de estatística
  const gradients = [
    'linear-gradient(135deg, rgba(25, 118, 210, 0.85) 0%, rgba(21, 101, 192, 0.85) 100%)',
    'linear-gradient(135deg, rgba(46, 125, 50, 0.85) 0%, rgba(27, 94, 32, 0.85) 100%)',
    'linear-gradient(135deg, rgba(245, 124, 0, 0.85) 0%, rgba(230, 81, 0, 0.85) 100%)',
    'linear-gradient(135deg, rgba(123, 31, 162, 0.85) 0%, rgba(106, 27, 154, 0.85) 100%)',
  ]

  // Seleciona gradiente baseado no título para consistência visual
  const getGradient = () => {
    if (titulo.includes('Capítulos')) return gradients[0]
    if (titulo.includes('Dias')) return gradients[1]
    if (titulo.includes('Média')) return gradients[2]
    if (titulo.includes('Sequência')) return gradients[3]
    return gradients[0]
  }

  return (
    <Card
      sx={{
        ...getGlassCardStyles(getGradient(), {
          hover: true,
          shimmer: true,
          borderRadius: 2,
          cursor: 'default',
        }),
        height: '100%',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      }}
    >
      <CardContent sx={{ textAlign: 'center', p: 2 }}>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 1, fontSize: '0.875rem' }}>
          {titulo}
        </Typography>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
          {valor}
          {total && (
            <Typography component="span" variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', ml: 1 }}>
              / {total}
            </Typography>
          )}
        </Typography>
        {subtitulo && (
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
            {subtitulo}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
 