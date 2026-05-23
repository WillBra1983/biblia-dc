import React, { useState } from 'react'
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  useTheme,
  useMediaQuery,
  Fab,
  TextField,
  InputAdornment,
  IconButton,
  Stack,
  Typography
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import SearchIcon from '@mui/icons-material/Search'
import { sxFullViewportHeight } from '../utils/viewportHeight'

export default function LayoutHinario({ 
  children, 
  hinos, 
  onSelectHino, 
  searchTerm, 
  onSearchChange,
  ordenacao,
  onOrdenacaoChange 
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [menuOpen, setMenuOpen] = useState(false)

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
  }

  return (
    <Box sx={{ display: 'flex', ...sxFullViewportHeight() }}>
      {/* Botão do menu (apenas mobile) */}
      {isMobile && (
        <Fab
          color="primary"
          size="medium"
          onClick={toggleMenu}
          sx={{
            position: 'fixed',
            left: '50%',
            top: 64,
            transform: 'translateX(-50%)',
            zIndex: 1200,
            boxShadow: 2,
          }}
        >
          <MenuIcon />
        </Fab>
      )}

      {/* Menu lateral */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? menuOpen : true}
        onClose={toggleMenu}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            top: isMobile ? 0 : 64,
            height: isMobile ? '100%' : 'calc(100% - 64px)',
          }
        }}
      >
        {/* Barra de busca */}
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar hino..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Botões de ordenação */}
        <Stack 
          direction="row"
          spacing={1} 
          sx={{ 
            px: 2, 
            pb: 1,
            justifyContent: 'flex-start'
          }}
        >
          <IconButton 
            size="small"
            onClick={() => onOrdenacaoChange('numero')}
            color={ordenacao === 'numero' ? 'primary' : 'default'}
            sx={{ 
              border: 1,
              borderColor: ordenacao === 'numero' ? 'primary.main' : 'divider',
              borderRadius: '50%',
              width: 36,
              height: 36,
              '&:hover': {
                backgroundColor: 'action.hover',
                borderColor: 'primary.main'
              }
            }}
          >
            <Stack spacing={0} alignItems="center">
              <Typography sx={{ fontSize: '0.7rem', lineHeight: 1, fontWeight: 'bold' }}>1</Typography>
              <Typography sx={{ fontSize: '0.7rem', lineHeight: 1, fontWeight: 'bold' }}>2</Typography>
              <Typography sx={{ fontSize: '0.7rem', lineHeight: 1, fontWeight: 'bold' }}>3</Typography>
            </Stack>
          </IconButton>
          <IconButton 
            size="small"
            onClick={() => onOrdenacaoChange('alfabetica')}
            color={ordenacao === 'alfabetica' ? 'primary' : 'default'}
            sx={{ 
              border: 1,
              borderColor: ordenacao === 'alfabetica' ? 'primary.main' : 'divider',
              borderRadius: '50%',
              width: 36,
              height: 36,
              '&:hover': {
                backgroundColor: 'action.hover',
                borderColor: 'primary.main'
              }
            }}
          >
            <Stack spacing={0} alignItems="center">
              <Typography sx={{ fontSize: '0.7rem', lineHeight: 1, fontWeight: 'bold' }}>A</Typography>
              <Typography sx={{ fontSize: '0.7rem', lineHeight: 1, fontWeight: 'bold' }}>B</Typography>
              <Typography sx={{ fontSize: '0.7rem', lineHeight: 1, fontWeight: 'bold' }}>C</Typography>
            </Stack>
          </IconButton>
        </Stack>
        
        {/* Lista de hinos */}
        <List sx={{ overflow: 'auto' }}>
          {hinos.map((hino) => (
            <ListItem 
              key={hino.numero} 
              button 
              onClick={() => {
                if (isMobile) toggleMenu()
                onSelectHino(hino)
              }}
            >
              <ListItemText 
                primary={`${hino.numero}. ${hino.titulo}`}
                primaryTypographyProps={{
                  noWrap: true
                }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Conteúdo principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: isMobile ? 0 : 3,
          mt: isMobile ? 7 : 0,
          height: '100%',
          overflow: 'auto',
          marginLeft: isMobile ? 0 : '240px'
        }}
      >
        {children}
      </Box>
    </Box>
  )
} 