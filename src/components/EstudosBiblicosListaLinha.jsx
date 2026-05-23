import { Box, List, ListItem, ListItemButton, ListItemText, IconButton, Divider } from '@mui/material'
import EditOutlined from '@mui/icons-material/EditOutlined'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { Link as RouterLink } from 'react-router-dom'

/**
 * Linha de listagem de estudos bíblicos usada em "Gerir" e "Hub".
 *
 * Layout:
 *  - ListItemButton ocupa toda a largura útil para receber o clique de abrir.
 *  - As ações do autor (lápis / apagar) ficam num bloco fixo à direita,
 *    centralizado verticalmente em relação ao texto — mesmo quando o título
 *    quebra em duas linhas.
 *  - Título sem sublinhado fixo (vira sublinhado só no hover) para evitar a
 *    poluição visual de “linha embolada” com os ícones.
 *
 * @param {object[]} rows — itens com `_tipo`: `'meu'` | `'salvo'` quando aplicável
 * @param {boolean} mostrarAcoesAutor — lápis / apagar (só estudos próprios)
 */
export default function EstudosBiblicosListaLinha({
  rows,
  navigate,
  setApagarId,
  mostrarAcoesAutor = false
}) {
  if (!rows?.length) return null
  return (
    <List dense disablePadding>
      {rows.map((row, idx) => {
        const podeEditar = mostrarAcoesAutor && row._tipo === 'meu'
        return (
          <Box key={`${row._tipo || 'x'}-${row.id}`}>
            <ListItem
              disablePadding
              sx={{ alignItems: 'stretch', borderRadius: 1, mb: 0.25 }}
              secondaryAction={
                podeEditar ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      pr: 0.5
                    }}
                  >
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="Editar estudo"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        navigate(`/estudos-biblicos/${encodeURIComponent(row.id)}/edit`)
                      }}
                    >
                      <EditOutlined fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="Apagar estudo"
                      color="error"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setApagarId(row.id)
                      }}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </Box>
                ) : undefined
              }
            >
              <ListItemButton
                component={RouterLink}
                to={`/estudos-biblicos/abrir?estudo=${encodeURIComponent(row.id)}`}
                sx={(theme) => ({
                  borderRadius: 1,
                  alignItems: 'center',
                  py: 1,
                  pl: 1,
                  pr: podeEditar ? '96px' : 1.5,
                  minHeight: 48,
                  color: theme.palette.text.primary,
                  textDecoration: 'none',
                  '& .MuiListItemText-primary': {
                    color: theme.palette.text.primary,
                    fontWeight: 600,
                    lineHeight: 1.35
                  },
                  '& .MuiListItemText-secondary': {
                    color: theme.palette.text.secondary,
                    mt: 0.25
                  },
                  '&:hover': {
                    bgcolor:
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.06)'
                        : 'rgba(0, 0, 0, 0.04)',
                    '& .MuiListItemText-primary': {
                      textDecoration: 'underline',
                      textDecorationColor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(74, 222, 128, 0.55)'
                          : 'rgba(20, 83, 45, 0.45)',
                      textUnderlineOffset: 3
                    }
                  },
                  '&:focus-visible .MuiListItemText-primary': {
                    textDecoration: 'underline',
                    textUnderlineOffset: 3
                  }
                })}
              >
                <ListItemText
                  primary={row.tema || '(sem título)'}
                  secondary={
                    row.referenciaCompacta ||
                    (row._tipo === 'salvo' ? row.authorName : '') ||
                    undefined
                  }
                  primaryTypographyProps={{ variant: 'body1' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            </ListItem>
            {idx < rows.length - 1 && (
              <Divider component="li" sx={{ opacity: 0.4, listStyle: 'none' }} />
            )}
          </Box>
        )
      })}
    </List>
  )
}
