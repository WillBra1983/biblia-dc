import { createTheme } from '@mui/material/styles'

const lightPalette = {
  primary: {
    main: '#14532d', // Verde escuro
    light: '#22c55e', // Verde claro
    dark: '#0f3a1d',
    contrastText: '#fff',
  },
  secondary: {
    main: '#2563eb', // Azul profissional
    light: '#60a5fa',
    dark: '#1e40af',
    contrastText: '#fff',
  },
  background: {
    default: '#f5f5f5', // Cinza muito claro
    paper: '#fff',      // Cards
  },
  text: {
    primary: '#22223b', // Texto principal
    secondary: '#6c757d', // Texto secundário
  },
  warning: {
    main: '#eab308', // Dourado para destaque
  },
  divider: '#e0e0e0', // Bordas suaves
}

const darkPalette = {
  primary: {
    main: '#22c55e', // Verde claro para dark
    light: '#4ade80',
    dark: '#166534',
    contrastText: '#000',
  },
  secondary: {
    main: '#60a5fa', // Azul claro para dark
    light: '#93c5fd',
    dark: '#2563eb',
    contrastText: '#000',
  },
  background: {
    default: '#121216', // Fundo escuro (ligeiramente mais azulado; melhor contraste com texto)
    paper: '#1e1e24',   // Cards: mais claro que o fundo para separar sem baixar contraste do texto
  },
  text: {
    primary: '#f4f4f8',   // Corpo principal — contraste alto no escuro (WCAG)
    secondary: '#d1d1db', // Secundário — um pouco mais claro para leitura confortável
  },
  warning: {
    main: '#eab308',
  },
  divider: '#27272a',
}

const getTheme = (mode) => {
  const palette = mode === 'light' ? lightPalette : darkPalette
  return createTheme({
  palette: {
    mode,
    ...palette,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: mode === 'light'
            ? '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)'
            : '0 2px 12px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2)',
          borderRadius: 12,
          border: '1px solid',
          borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
          // Antes: `#fff` / `#232323` (cor fixa diferente do `paper`), o que
          // deixava o dark mode com cards de tom levemente diferente do
          // resto da superfície. Agora alinhamos com `palette.background.paper`.
          backgroundColor: palette.background.paper,
          backgroundImage: 'none', // evita overlay extra em surfaces no MUI v5+
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        primary: {
          backgroundColor: mode === 'light' ? '#14532d' : '#22c55e',
          '&:hover': {
            backgroundColor: mode === 'light' ? '#0f3a1d' : '#166534',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: mode === 'light' 
            ? '0 24px 48px rgba(0, 0, 0, 0.12)' 
            : '0 24px 48px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: mode === 'light' ? '#fafafa' : '#121216',
          borderRight: '1px solid',
          borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
          '& .MuiListItemButton-root:hover': {
            backgroundColor: mode === 'light'
              ? 'rgba(20, 83, 45, 0.06)'
              : 'rgba(34, 197, 94, 0.08)',
          },
        },
      },
    },
    // Alinha as superfícies elevadas com `paper` no dark — sem isso o MUI
    // aplica um overlay branco que faz Paper/Dialog/Menu parecerem mais
    // claros do que os Cards.
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
  typography: {
    fontFamily: '"Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 700 },
    h2: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 700 },
    h3: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 600 },
    h4: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 600 },
    h5: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 600 },
    h6: { fontFamily: '"Source Serif 4", Georgia, serif', fontWeight: 600 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
  },
  })
}

export default getTheme
