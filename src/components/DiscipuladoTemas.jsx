import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Paper,
  Typography 
} from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import { discipuladoData } from '../data/discipulado'

export default function DiscipuladoTemas({ onSelectTema, temaAtual }) {
  return (
    <Paper sx={{ width: 280, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Temas do Discipulado
      </Typography>
      <List>
        {discipuladoData.map((tema) => (
          <ListItem
            key={tema.id}
            button
            selected={temaAtual === tema.id}
            onClick={() => onSelectTema(tema.id)}
          >
            <ListItemIcon>
              <AssignmentIcon />
            </ListItemIcon>
            <ListItemText 
              primary={tema.titulo}
              secondary={`Tema ${tema.id}`}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  )
} 