import { useState } from 'react'
import { Box, Paper, Typography, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import BookIcon from '@mui/icons-material/Book'
import SchoolIcon from '@mui/icons-material/School'
import HinarioLetraIcon from '@mui/icons-material/Lyrics'
import HinarioCifrasIcon from '@mui/icons-material/Piano'
import ArticleIcon from '@mui/icons-material/Article'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import DevotionalIcon from '@mui/icons-material/AutoStories'
import CalendarIcon from '@mui/icons-material/CalendarMonth'
import HinarioPaiIcon from '@mui/icons-material/MusicNote'
import ChatIcon from '@mui/icons-material/Chat'
import { useNavigate, useLocation } from 'react-router-dom'
import { caminhoEntradaBibliaPreferido } from '../utils/planoLeituraUsuario'

const menuItems = [
  {
    title: 'Biblia DC',
    icon: <BookIcon />,
    description: 'Leia e estude a Palavra de Deus',
    path: '/'
  },
  {
    title: 'Plano de Leitura',
    icon: <CalendarIcon />,
    description: 'Acompanhe sua leitura bíblica',
    path: '/plano'
  },
  {
    title: 'Discipulado',
    icon: <SchoolIcon />,
    description: 'Material de estudo e formação',
    path: '/discipulado'
  },
  {
    title: 'Hinário Novo Cântico',
    icon: <HinarioPaiIcon />,
    description: 'Letra ou cifras',
    path: null,
    hinarioMenu: true
  },
  {
    title: 'Confissão de Fé',
    icon: <ArticleIcon />,
    description: 'Confissão de Fé de Westminster',
    path: '/confissao-fe'
  },
  {
    title: 'Catecismo Maior',
    icon: <MenuBookIcon />,
    description: 'Catecismo Maior de Westminster',
    path: '/catecismo-maior'
  },
  {
    title: 'Catecismo Breve',
    icon: <MenuBookIcon />,
    description: 'Breve Catecismo de Westminster',
    path: '/catecismo-breve'
  },
  {
    title: 'Devocional',
    icon: <DevotionalIcon />,
    description: 'Meditações diárias',
    path: '/devocional'
  },
  {
    title: 'Mensagens',
    icon: <ChatIcon />,
    description: 'Conversas entre usuários',
    path: '/chat'
  }
]

export default function NavigationBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = location.pathname
  const [hinarioAnchor, setHinarioAnchor] = useState(null)

  const hinarioOpen = Boolean(hinarioAnchor)
  const hinarioActive = currentPath.startsWith('/hinario')

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 1,
      p: 1,
      bgcolor: 'background.paper',
      borderBottom: 1,
      borderColor: 'divider',
      overflowX: 'auto'
    }}>
      {menuItems.map((item) => {
        if (item.hinarioMenu) {
          return (
            <Paper
              key="hinario-nc"
              elevation={hinarioActive ? 3 : 1}
              sx={{
                p: 1,
                minWidth: 'auto',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
              onClick={(e) => setHinarioAnchor(e.currentTarget)}
            >
              {item.icon}
              <Typography 
                variant="body2"
                noWrap
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                {item.title}
              </Typography>
              <Menu
                anchorEl={hinarioAnchor}
                open={hinarioOpen}
                onClose={() => setHinarioAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <MenuItem
                  onClick={() => {
                    navigate('/hinario/letra')
                    setHinarioAnchor(null)
                  }}
                  selected={currentPath === '/hinario/letra'}
                >
                  <ListItemIcon><HinarioLetraIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Letra" />
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    navigate('/hinario/cifras')
                    setHinarioAnchor(null)
                  }}
                  selected={currentPath === '/hinario/cifras'}
                >
                  <ListItemIcon><HinarioCifrasIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Cifras" />
                </MenuItem>
              </Menu>
            </Paper>
          )
        }

        const isActive =
          item.path === '/'
            ? currentPath === '/' || currentPath.startsWith('/plano-leitura-biblia')
            : currentPath === item.path
        return (
          <Paper
            key={item.path}
            elevation={isActive ? 3 : 1}
            sx={{
              p: 1,
              minWidth: 'auto',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              transition: 'all 0.3s ease',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
            onClick={() =>
              navigate(item.path === '/plano' ? caminhoEntradaBibliaPreferido() : item.path)
            }
          >
            {item.icon}
            <Typography 
              variant="body2"
              noWrap
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              {item.title}
            </Typography>
          </Paper>
        )
      })}
    </Box>
  )
}
