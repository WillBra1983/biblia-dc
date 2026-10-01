import { Children, cloneElement } from 'react'
import { Box, Button, Typography } from '@mui/material'

export default function BibliotecaReaderToolbar({ children, onFullscreen, pageLabel }) {
  const controls = Children.toArray(children).map((control) => cloneElement(control, { variant: 'outlined', fullWidth: true }))
  return <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1, mb: 1.5, '& .MuiButton-root': { minHeight: 44, borderRadius: 1.5, borderColor: 'primary.main', bgcolor: 'action.hover', boxShadow: '0 2px 3px rgba(0,0,0,.08)', '&:hover': { bgcolor: 'action.selected', boxShadow: '0 3px 5px rgba(0,0,0,.12)' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground', borderColor: 'action.disabled', boxShadow: 'none' } } }}>
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: .75, alignItems: 'center', '& .MuiButton-root': { minWidth: 0, px: .5, fontSize: '.85rem', whiteSpace: 'nowrap' } }}>
      <Box>{controls[0]}</Box>
      {controls[1]}{controls[2]}<Box />
      <Box />{controls[3]}{controls[4]}<Box />
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'end', gap: .5, mt: 1 }}>
      <Box /><Button variant="outlined" onClick={onFullscreen}>Tela completa</Button>
      <Typography variant="caption" sx={{ justifySelf: 'end', whiteSpace: 'nowrap', pb: .5 }}>{pageLabel}</Typography>
    </Box>
  </Box>
}
