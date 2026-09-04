import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Collapse
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import BookIcon from '@mui/icons-material/Book'
import SchoolIcon from '@mui/icons-material/School'
import LyricsIcon from '@mui/icons-material/Lyrics'
import PianoIcon from '@mui/icons-material/Piano'
import QueueMusicIcon from '@mui/icons-material/QueueMusic'
import ArticleIcon from '@mui/icons-material/Article'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ChatIcon from '@mui/icons-material/Chat'
import { caminhoEntradaBibliaPreferido } from '../utils/planoLeituraUsuario'

const menuItems = [
  { text: 'Biblia DC', path: '/', icon: <BookIcon /> },
  { text: 'Discipulado', path: '/discipulado', icon: <SchoolIcon /> },
  { text: 'Confissão de Fé', path: '/confissao-fe', icon: <ArticleIcon /> },
  { text: 'Catecismo Maior', path: '/catecismo-maior', icon: <MenuBookIcon /> },
  { text: 'Catecismo Breve', path: '/catecismo-breve', icon: <MenuBookIcon /> },
  { text: 'Plano de Leitura', path: '/plano', icon: <AutoStoriesIcon /> },
  { text: 'Devocional', path: '/devocional', icon: <ArticleIcon /> },
  { text: 'Mensagens', path: '/chat', icon: <ChatIcon /> }
]

function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [hinarioOpen, setHinarioOpen] = useState(false)
  const navigate = useNavigate()
  const hinarioItemRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/hinario')) {
      setHinarioOpen(true)
    }
  }, [])

  const handleNavigation = (path) => {
    navigate(path === '/plano' ? caminhoEntradaBibliaPreferido() : path)
    setDrawerOpen(false)
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Bíblia DC
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <List sx={{ width: 280 }}>
          {menuItems.map((item) => (
            <ListItem 
              button 
              key={item.text}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
          <ListItem ref={hinarioItemRef} button onClick={() => setHinarioOpen(!hinarioOpen)} sx={{ scrollMarginTop: 8 }}>
            <ListItemIcon><MusicNoteIcon /></ListItemIcon>
            <ListItemText primary="Cânticos" />
            <ExpandMore
              sx={{
                transform: hinarioOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s'
              }}
            />
          </ListItem>
          <Collapse
            in={hinarioOpen}
            timeout="auto"
            unmountOnExit
            onEntered={() => hinarioItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <List component="div" disablePadding>
              <ListItem button sx={{ pl: 4 }} onClick={() => handleNavigation('/hinario/letra')}>
                <ListItemIcon><LyricsIcon /></ListItemIcon>
                <ListItemText primary="Hinos" secondary="Letra e cifras" />
              </ListItem>
              <ListItem button sx={{ pl: 4 }} onClick={() => handleNavigation('/hinario/salmos')}>
                <ListItemIcon><QueueMusicIcon /></ListItemIcon>
                <ListItemText primary="Salmos" secondary="Comissão Brasileira de Salmodia" />
              </ListItem>
              <ListItem button sx={{ pl: 4 }} onClick={() => handleNavigation('/hinario/outras-cancoes')}>
                <ListItemIcon><PianoIcon /></ListItemIcon>
                <ListItemText primary="Outras canções" secondary="Cifras coladas" />
              </ListItem>
            </List>
          </Collapse>
        </List>
      </Drawer>
    </Box>
  )
}

export default Navbar
