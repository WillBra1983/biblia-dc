import { useCallback, useMemo, useState } from 'react'
import { Box, Container, Grid, Paper, Typography, Button, Stack, Collapse } from '@mui/material'
import BookIcon from '@mui/icons-material/Book'
import SchoolIcon from '@mui/icons-material/School'
import ArticleIcon from '@mui/icons-material/Article'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import DevotionalIcon from '@mui/icons-material/AutoStories'
import HinarioPaiIcon from '@mui/icons-material/MusicNote'
import WestminsterIcon from '@mui/icons-material/AccountBalance'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useNavigate } from 'react-router-dom'

const menuItems = [
  {
    title: 'Biblia DC',
    icon: <BookIcon sx={{ fontSize: 40 }} />,
    description: 'Leia e estude a Palavra de Deus',
    path: '/'
  },
  {
    title: 'Discipulado',
    icon: <SchoolIcon sx={{ fontSize: 40 }} />,
    description: 'Material de estudo e formação',
    path: '/discipulado'
  },
  {
    title: 'Hinário Novo Cântico',
    icon: <HinarioPaiIcon sx={{ fontSize: 40 }} />,
    description: 'Escolha letra ou cifras',
    path: null,
    hinarioGroup: true
  },
  {
    title: 'Westminster',
    icon: <WestminsterIcon sx={{ fontSize: 40 }} />,
    description: 'Confissão de Fé | Catecismo Maior | Catecismo Breve',
    path: null,
    westminsterGroup: true,
    subItems: [
      {
        title: 'Confissão de Fé',
        icon: <ArticleIcon sx={{ fontSize: 20 }} />,
        path: '/confissao-fe'
      },
      {
        title: 'Catecismo Maior',
        icon: <MenuBookIcon sx={{ fontSize: 20 }} />,
        path: '/catecismo-maior'
      },
      {
        title: 'Catecismo Breve',
        icon: <MenuBookIcon sx={{ fontSize: 20 }} />,
        path: '/catecismo-breve'
      }
    ]
  },
  {
    title: 'Devocional',
    icon: <DevotionalIcon sx={{ fontSize: 40 }} />,
    description: 'Meditações diárias',
    path: '/devocional'
  }
]

const MENU_USAGE_STORAGE_KEY = 'homeMenuFrequencyByPath'
const FIXED_MENU_PATHS = new Set(['/', '/chat'])

const getItemKey = (item) => {
  if (item.hinarioGroup) return 'hinario-group'
  if (item.westminsterGroup) return 'westminster-group'
  return item.path || item.title
}

const readMenuUsage = () => {
  try {
    const raw = localStorage.getItem(MENU_USAGE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export default function Home() {
  const navigate = useNavigate()
  const [menuUsage, setMenuUsage] = useState(() => readMenuUsage())
  const [westminsterAberto, setWestminsterAberto] = useState(false)

  const registrarAcesso = useCallback((item, overridePath = null) => {
    const effectivePath = overridePath || item.path
    if (effectivePath && FIXED_MENU_PATHS.has(effectivePath)) return

    const key = item.hinarioGroup
      ? 'hinario-group'
      : item.westminsterGroup
        ? 'westminster-group'
        : effectivePath || getItemKey(item)
    const atual = Number(menuUsage[key] || 0)
    const updated = { ...menuUsage, [key]: atual + 1 }
    setMenuUsage(updated)
    localStorage.setItem(MENU_USAGE_STORAGE_KEY, JSON.stringify(updated))
  }, [menuUsage])

  const menuItemsOrdenados = useMemo(() => {
    const fixed = menuItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.path && FIXED_MENU_PATHS.has(item.path))

    const moveis = menuItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !(item.path && FIXED_MENU_PATHS.has(item.path)))
      .sort((a, b) => {
        const usoA = Number(menuUsage[getItemKey(a.item)] || 0)
        const usoB = Number(menuUsage[getItemKey(b.item)] || 0)
        if (usoB !== usoA) return usoB - usoA
        return a.index - b.index
      })

    const fixedByIndex = new Map(fixed.map((entry) => [entry.index, entry.item]))
    const ordered = []
    let movableCursor = 0

    for (let i = 0; i < menuItems.length; i += 1) {
      if (fixedByIndex.has(i)) {
        ordered.push(fixedByIndex.get(i))
      } else {
        ordered.push(moveis[movableCursor].item)
        movableCursor += 1
      }
    }

    return ordered
  }, [menuUsage])

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" align="center" gutterBottom>
        Bem-vindo
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 3 }}>
        {menuItemsOrdenados.map((item) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={item.path || 'hinario-nc'}>
            {item.hinarioGroup ? (
              <Paper
                sx={{
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 6
                  }
                }}
              >
                <Box sx={{ 
                  mb: 2,
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: 'primary.light',
                  opacity: 0.8
                }}>
                  {item.icon}
                </Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {item.description}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: '100%', mt: 'auto' }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => {
                      registrarAcesso(item, '/hinario/letra')
                      navigate('/hinario/letra')
                    }}
                  >
                    Letra
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      registrarAcesso(item, '/hinario/cifras')
                      navigate('/hinario/cifras')
                    }}
                  >
                    Cifras
                  </Button>
                </Stack>
              </Paper>
            ) : item.westminsterGroup ? (
              <Paper
                sx={{
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 6
                  }
                }}
              >
                <Box sx={{
                  mb: 2,
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: 'primary.light',
                  opacity: 0.8
                }}>
                  {item.icon}
                </Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {item.description}
                </Typography>

                <Button
                  fullWidth
                  variant="outlined"
                  endIcon={
                    <ExpandMoreIcon
                      sx={{
                        transform: westminsterAberto ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                      }}
                    />
                  }
                  onClick={() => setWestminsterAberto((prev) => !prev)}
                  sx={{ mt: 'auto' }}
                >
                  {westminsterAberto ? 'Ocultar opções' : 'Abrir opções'}
                </Button>

                <Collapse in={westminsterAberto} sx={{ width: '100%', mt: 1 }}>
                  <Stack spacing={1}>
                    {item.subItems?.map((subItem) => (
                      <Button
                        key={subItem.path}
                        fullWidth
                        variant="contained"
                        startIcon={subItem.icon}
                        onClick={() => {
                          registrarAcesso(item, subItem.path)
                          navigate(subItem.path)
                        }}
                      >
                        {subItem.title}
                      </Button>
                    ))}
                  </Stack>
                </Collapse>
              </Paper>
            ) : (
              <Paper
                sx={{
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6
                  }
                }}
                onClick={() => {
                  registrarAcesso(item)
                  navigate(item.path)
                }}
              >
                <Box sx={{ 
                  mb: 2,
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: 'primary.light',
                  opacity: 0.8
                }}>
                  {item.icon}
                </Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </Paper>
            )}
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}

