import React, { useState, useRef } from 'react'
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  useTheme,
  useMediaQuery,
  Fab,
  Typography,
  Button
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { discipuladoData } from '../data/discipulado'
import { useLocation } from 'react-router-dom'
import MenuDrawer from './MenuDrawer'

export default function LayoutEstudo({ children, onSelectTema }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const mainContentRef = useRef(null)
  const [temaSelecionado, setTemaSelecionado] = useState(null)
  const [estudoSelecionado, setEstudoSelecionado] = useState(null)

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
  }

  const handleSelectTema = (temaId, estudoId) => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0
    }
    
    if (isMobile) toggleMenu()
    onSelectTema(temaId, estudoId)
  }

  const renderSubtemas = (tema) => {
    if (tema.estudos) {
      return (
        <List sx={{ pl: 2 }}>
          {tema.estudos.map((estudo, index) => (
            <ListItem
              key={`tema-${tema.id}-estudo-${estudo.id}-${index}`}
              button
              dense
              onClick={() => {
                handleSelectTema(tema.id, estudo.id)
              }}
            >
              <ListItemText 
                primary={
                  <Typography
                    sx={{
                      fontSize: '0.9rem',
                      fontWeight: 'normal',
                      textAlign: 'center',
                      width: '100%',
                      color: theme.palette.text.primary,
                      opacity: 0.87
                    }}
                  >
                    {estudo.titulo}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )
    }
    return null
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        minHeight: 0,
        width: '100%',
        margin: 0,
        padding: 0,
        bgcolor: 'background.default'
      }}
    >
      <Box
        component="main"
        ref={mainContentRef}
        sx={{
          flex: '1 1 auto',
          height: '100%',
          minHeight: 0,
          width: '100%',
          overflow: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'auto',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          padding: 0,
          '& > *': {
            width: '100%',
            maxWidth: '100%',
            margin: 0,
          }
        }}
      >
        {temaSelecionado && !estudoSelecionado && (
          <Button
            startIcon={<ArrowBackIcon />}
            variant="text"
            onClick={() => {
              setTemaSelecionado(null)
              setEstudoSelecionado(null)
            }}
            sx={{ color: 'white', fontWeight: 'bold', fontSize: 16, ml: 1 }}
          >
            Voltar
          </Button>
        )}
        {children}
      </Box>
    </Box>
  )
} 
