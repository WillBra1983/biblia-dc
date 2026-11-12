// Mesma moldura elevada para os controles de versão e comparação.
export const sxBotaoCabecalhoBiblia = theme => ({
  minWidth: 40,
  minHeight: 40,
  border: '1px solid',
  borderColor: theme.palette.mode === 'dark' ? 'grey.600' : 'grey.400',
  borderRadius: 1.5,
  bgcolor: 'background.paper',
  boxShadow: theme.palette.mode === 'dark'
    ? 'inset 0 1px 0 rgba(255,255,255,0.16), 0 2px 3px rgba(0,0,0,0.5)'
    : 'inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 3px rgba(0,0,0,0.22)',
  transition: 'box-shadow 120ms ease, transform 120ms ease, background-color 120ms ease',
  '&:hover': { bgcolor: 'action.hover', boxShadow: theme.shadows[3] },
  '&:active': { transform: 'translateY(1px)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.22)' },
  '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
})
