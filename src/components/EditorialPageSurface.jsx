import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'

export default function EditorialPageSurface({ children, component = 'section', sx }) {
  const theme = useTheme()
  const darkMode = theme.palette.mode === 'dark'
  const text = darkMode ? '#f3ead8' : '#17271f'
  const heading = darkMode ? '#f2d48d' : '#173d31'
  const link = darkMode ? '#8bd8ad' : '#075c3b'

  return (
    <Box
      component={component}
      sx={{
        width: '100%',
        boxSizing: 'border-box',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2.25, sm: 3 },
        border: `1px solid ${darkMode ? 'rgba(214,173,82,.3)' : 'rgba(166,128,47,.28)'}`,
        borderRadius: 2,
        color: text,
        bgcolor: darkMode ? '#18211d' : '#fffaf0',
        backgroundImage: 'radial-gradient(circle at 18% 12%, rgba(173,132,48,.045) 0 1px, transparent 1.4px)',
        backgroundSize: '22px 22px',
        boxShadow: darkMode ? '0 5px 18px rgba(0,0,0,.26)' : '0 5px 16px rgba(52,41,20,.07)',
        fontFamily: 'Georgia, "Times New Roman", serif',
        '& .MuiTypography-root': { color: 'inherit' },
        '& h1, & h2, & h3, & h4, & h5, & h6': { color: heading },
        '& a, & .MuiLink-root': { color: link },
        '& .MuiDivider-root': { borderColor: darkMode ? 'rgba(214,173,82,.24)' : 'rgba(92,75,42,.2)' },
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}
