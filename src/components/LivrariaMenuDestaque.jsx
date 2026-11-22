import { Box, Card, CardActionArea, Typography } from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import AdminSectionViewCounts from './AdminSectionViewCounts'
import { chavesMetricaParaPathMenu } from '../utils/sectionViewKeys'

/** Painel da Livraria Cristã no carrossel do menu, também disponível a visitantes. */
export default function LivrariaMenuDestaque({ item, onNavigate, mostrarMetricas }) {
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return <Card component="section" aria-label="Livraria Cristã" elevation={0} sx={{
    my: 0, borderRadius: 2.5, overflow: 'hidden', color: '#fff', bgcolor: '#123b2e',
    border: '1px solid #d9bc76', boxShadow: '0 4px 18px rgba(0,25,20,.2)',
  }}>
    <CardActionArea component="button" type="button" aria-label="Compre seu livro na Livraria Cristã"
      onClick={() => onNavigate(item)} sx={{
        p: { xs: 1.75, sm: 2 }, display: 'flex', gap: 1.5, alignItems: 'center', justifyContent: 'space-between',
        color: 'inherit', textAlign: 'left', minHeight: 168,
        backgroundImage: `linear-gradient(100deg, rgba(5,35,26,.98) 12%, rgba(5,35,26,.88) 55%, rgba(5,35,26,.42)), url("${base}/${item.fundo}")`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        '&.Mui-focusVisible': { outline: '3px solid #f5d17d', outlineOffset: -4 },
      }}>
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: .65, pr: 10 }}>
          <Box aria-hidden="true" sx={{ display: 'flex', color: '#f0d58d', '& .MuiSvgIcon-root': { fontSize: 25 } }}>{item.icon}</Box>
          <Typography component="h2" sx={{ fontFamily: 'Georgia, serif', color: '#ffe3a0', fontWeight: 700, fontSize: { xs: '1.45rem', sm: '1.65rem' }, lineHeight: 1.2 }}>{item.text}</Typography>
        </Box>
        <Typography component="p" sx={{ m: 0, fontSize: '.9rem', lineHeight: 1.35, color: '#fff8e8' }}>{item.description}</Typography>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: .75, mt: 1.15, px: 1.4, py: .65, borderRadius: 1.25, bgcolor: '#f0d58d', color: '#173c2e', fontSize: '.85rem', fontWeight: 800,
          position: 'relative', overflow: 'hidden', isolation: 'isolate', boxShadow: '0 2px 12px rgba(240,213,141,.25)',
          '&::after': { content: '""', position: 'absolute', inset: 0, width: '55%', pointerEvents: 'none',
            background: 'linear-gradient(110deg, transparent 15%, rgba(255,255,255,.85) 50%, transparent 85%)',
            transform: 'translateX(-180%)', animation: 'espelhoLivraria 5s ease-in-out infinite' },
          '@keyframes espelhoLivraria': { '0%, 65%': { transform: 'translateX(-180%)' }, '100%': { transform: 'translateX(300%)' } },
          '@media (prefers-reduced-motion: reduce)': { '&::after': { animation: 'none', opacity: 0 } },
        }}>
          Compre seu livro <ArrowForwardRoundedIcon aria-hidden="true" sx={{ fontSize: 17 }} />
        </Box>
      </Box>
    </CardActionArea>
    {mostrarMetricas && <Box sx={{ px: 1.75, pb: .75 }}><AdminSectionViewCounts ehAdmin keys={chavesMetricaParaPathMenu(item.path)} /></Box>}
  </Card>
}
