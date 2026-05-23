import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  IconButton,
  Box,
  ListItemButton,
  Collapse,
  Tooltip,
  Button
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import HomeIcon from '@mui/icons-material/Home'
import BookIcon from '@mui/icons-material/Book'
import SchoolIcon from '@mui/icons-material/School'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { discipuladoData } from '../data/discipulado'

export default function MenuDrawer({ onSelectTema, contexto }) {
  const [open, setOpen] = useState(false)
  const [expandedTema, setExpandedTema] = useState(null)
  const [temaAtivo, setTemaAtivo] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { 
    discipuladoMeditacao, 
    discipuladoRespostas 
  } = useApp()
  const { temaId, subtemaId } = useParams()

  useEffect(() => {
    // Carregue os dados do subtema aqui sempre que subtemaId mudar
  }, [subtemaId])

  // Função para verificar se um tema/estudo está concluído
  const isTemaConcluido = (temaId, estudoId = null) => {
    const tema = discipuladoData.find(t => t.id === temaId)
    const estudo = estudoId && tema?.estudos?.find(e => e.id === estudoId)
    const questoes = estudo ? estudo.questoes : tema.questoes
    
    // Verificar se todas as questões foram respondidas
    if (questoes?.length) {
      for (let i = 1; i <= questoes.length; i++) {
        const chaveQuestao = estudoId 
          ? `${temaId}_${estudoId}_${i}`
          : `${temaId}_${i}`
        
        if (!discipuladoRespostas[chaveQuestao]) {
          return false
        }
      }
    }

    // Verificar se todas as meditações foram concluídas
    const chaveBase = estudoId ? `${temaId}_${estudoId}` : `${temaId}`
    for (let dia = 1; dia <= 7; dia++) {
      if (!discipuladoMeditacao[`${chaveBase}_${dia}`]) {
        return false
      }
    }

    return true
  }

  const handleTemaClick = (tema) => {
    if (tema.estudos) {
      setTemaAtivo(tema)
    } else {
      onSelectTema(tema.id)
      setOpen(false)
    }
  }

  const handleEstudoClick = (estudo) => {
    onSelectTema(temaAtivo.id, estudo.id)
    setOpen(false)
  }

  const handleVoltar = () => {
    setTemaAtivo(null)
  }

  // Defina as rotas onde os botões devem aparecer
  const mostrarBotoesBiblia = location.pathname === '/biblia' || location.pathname === '/';

  // Se contexto for null, mostrar temas principais
  if (!contexto) {
    return (
      <>
        {/* Botão do menu fixo no topo */}
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            right: 0,
            zIndex: 1100,
            p: 1
          }}
        >
          <IconButton
            color="inherit"
            onClick={() => setOpen(!open)}
            sx={{ color: 'white' }}
        >
          <MenuIcon />
        </IconButton>
        </Box>

        <Drawer
          anchor="left"
          open={open}
          onClose={() => setOpen(false)}
        >
          <Box sx={{ width: 250 }}>
            <List>
              {discipuladoData.map((tema) => (
                <Box key={tema.id}>
                  <ListItem disablePadding>
                    <ListItemButton 
                      onClick={() => {
                        if (tema.estudos) {
                          onSelectTema(tema.id)
                        } else {
                          onSelectTema(tema.id)
                          setOpen(false)
                        }
                      }}
                    >
                      <ListItemText primary={tema.titulo} />
                    </ListItemButton>
                  </ListItem>
                </Box>
              ))}
            </List>
          </Box>
        </Drawer>
      </>
    )
  }
  // Se contexto for um tema com estudos, mostrar apenas os estudos desse tema
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={() => setOpen(false)}
    >
      <Box sx={{ width: 250 }}>
        <Button onClick={() => onSelectTema(null)}>Voltar</Button>
        <List>
          {contexto.estudos.map(estudo => (
            <ListItemButton key={estudo.id} onClick={() => {
              navigate('/discipulado/temaId/subtemaId');
              setOpen(false);
            }}>
              <ListItemText primary={estudo.titulo} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Drawer>
  )
} 