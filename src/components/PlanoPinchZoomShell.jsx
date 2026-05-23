import { Box } from '@mui/material'

/** Plano de leitura: evita overflow horizontal. */
export default function PlanoPinchZoomShell({ children, sx = {} }) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflowX: 'hidden',
        boxSizing: 'border-box',
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}
