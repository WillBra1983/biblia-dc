import { Box, Card, CardActionArea, Typography } from '@mui/material'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ChevronRight from '@mui/icons-material/ChevronRight'
import AdminSectionViewCounts from './AdminSectionViewCounts'
import { chavesMetricaParaPathMenu } from '../utils/sectionViewKeys'

/** Fotografias em toda a superfície; o degradê protege apenas a área de leitura. */
export default function MenuAcessoCard({ item, ativo, lista, escuro, aberto, onToggle, onNavigate, mostrarMetricas, filhos, painelId }) {
  const expansivel = Boolean(filhos)
  const metricas = item.metricas || chavesMetricaParaPathMenu(item.path)
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const fundo = item.fundo ? `${base}/${item.fundo}` : ''
  return <Card elevation={0} sx={{
    width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2.5,
    bgcolor: escuro ? '#102d26' : '#0b3b31', color: '#fff',
    border: ativo ? '2px solid #d8b866' : '1px solid rgba(230,218,181,.6)',
    boxShadow: '0 3px 12px rgba(0,25,20,.16)', scrollMarginTop: 12,
  }}>
    <CardActionArea component="button" type="button" onClick={expansivel ? onToggle : () => onNavigate(item)}
      aria-current={!expansivel && ativo ? 'page' : undefined}
      aria-expanded={expansivel ? aberto : undefined} aria-controls={expansivel ? painelId : undefined}
      sx={{
        flex: 1, minHeight: lista ? 76 : 168, position: 'relative', p: 1.25, gap: lista ? 1.25 : 1,
        display: 'flex', flexDirection: lista ? 'row' : 'column', alignItems: lista ? 'center' : 'flex-start',
        justifyContent: 'flex-start', textAlign: 'left', color: 'inherit',
        backgroundImage: !lista && fundo ? `url("${fundo}")` : 'none',
        backgroundSize: 'cover', backgroundPosition: 'center',
        '&::before': { content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
          background: lista ? 'none' : 'linear-gradient(180deg, rgba(0,18,14,.08) 0%, rgba(0,18,14,.18) 24%, rgba(0,18,14,.86) 64%, rgba(0,18,14,.96) 100%)' },
        '&.Mui-focusVisible': { outline: '3px solid #f0ce77', outlineOffset: -4 },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}>
      <Box aria-hidden="true" sx={{ position: 'relative', zIndex: 1, flexShrink: 0, width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fff9e9', color: '#163e35', border: '1px solid #e7d5a7', '& .MuiSvgIcon-root': { fontSize: 22 } }}>{item.icon}</Box>
      <Box sx={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, pr: 2.5, display: 'flex', flexDirection: 'column', justifyContent: lista ? 'center' : 'flex-end' }}>
        <Typography component="span" sx={{ display: 'block', fontSize: '.95rem', fontWeight: 750, lineHeight: 1.25, overflowWrap: 'anywhere', textShadow: lista ? 'none' : '0 1px 3px rgba(0,0,0,.45)' }}>{item.text}</Typography>
        <Typography component="span" sx={{ display: 'block', mt: .4, fontSize: '.78rem', lineHeight: 1.35, color: '#e0ebe4' }}>{item.description}</Typography>
      </Box>
      <Box aria-hidden="true" sx={{ position: 'absolute', zIndex: 1, right: 8, bottom: lista ? 'calc(50% - 12px)' : 10, display: 'flex', color: '#f4e1ad' }}>
        {expansivel ? <ExpandMore sx={{ transform: aberto ? 'rotate(180deg)' : 'none', '@media (prefers-reduced-motion: no-preference)': { transition: 'transform .2s' } }} /> : <ChevronRight />}
      </Box>
    </CardActionArea>
    {mostrarMetricas && metricas.length > 0 && <Box sx={{ px: 1.25, pb: .75, bgcolor: '#153e35', color: '#fff' }}><AdminSectionViewCounts ehAdmin keys={metricas} /></Box>}
    {expansivel && <Box id={painelId} hidden={!aberto} sx={{ p: 1, pt: .5, display: aberto ? 'grid' : 'none', gap: 1 }}>{aberto ? filhos : null}</Box>}
  </Card>
}
