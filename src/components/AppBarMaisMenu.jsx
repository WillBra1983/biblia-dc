import { useState } from 'react'
import {
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import BookmarksOutlinedIcon from '@mui/icons-material/BookmarksOutlined'
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined'
import CheckIcon from '@mui/icons-material/Check'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLeituraApresentacao } from '../contexts/LeituraApresentacaoContext'
import { usePodeUsarModoApresentacao } from '../utils/modoApresentacaoDispositivo'

function IconeAaLeitura(props) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        lineHeight: 1
      }}
      {...props}
    >
      <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.04em' }}>A</span>
      <span style={{ fontSize: '0.78rem', fontWeight: 800, marginLeft: '-0.05em', opacity: 0.9 }}>a</span>
    </span>
  )
}

function obterLivroCapituloParaApresentacao(location) {
  const qs = new URLSearchParams(location.search || '')
  const livroQ = Number(qs.get('livro'))
  const capQ = Number(qs.get('capitulo') ?? qs.get('cap'))
  if (Number.isInteger(livroQ) && livroQ > 0 && Number.isInteger(capQ) && capQ > 0) {
    return { livroId: livroQ, capitulo: capQ }
  }
  try {
    const raw = localStorage.getItem('ultimaLeitura')
    if (raw) {
      const p = JSON.parse(raw)
      const livroId = Number(p?.livroId)
      const capitulo = Number(p?.capitulo)
      if (Number.isInteger(livroId) && livroId > 0 && Number.isInteger(capitulo) && capitulo > 0) {
        return { livroId, capitulo }
      }
    }
  } catch {
    /* ignore */
  }
  return { livroId: 1, capitulo: 1 }
}

/**
 * Botão "+" no AppBar que agrupa ações globais utilitárias:
 *  - Configurações de leitura (mesmo diálogo do antigo "Aa")
 *  - Compartilhar página (mesmo fluxo do antigo ícone de share)
 *  - Versículos marcados (atalho para a página dedicada)
 *
 * Substitui visualmente os botões soltos `LeituraConfigButton` +
 * `SharePageButton` no AppBar. Esses dois componentes continuam renderizados
 * **ocultos** (`hidden`) para que seus diálogos/handlers respondam aos
 * eventos globais (`salvation-abrir-leitura-config`,
 * `salvation-compartilhar-pagina`) — assim não duplicamos toda a UI deles.
 */
export default function AppBarMaisMenu() {
  const [anchorEl, setAnchorEl] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { naBiblia, naApresentacaoBiblia } = useLeituraApresentacao()
  const apresentacaoNoComputador = usePodeUsarModoApresentacao()
  const aberto = Boolean(anchorEl)
  const pathNorm =
    location.pathname !== '/' && location.pathname.endsWith('/')
      ? location.pathname.slice(0, -1)
      : location.pathname
  const podeModoApresentacao =
    apresentacaoNoComputador &&
    (pathNorm === '/' || pathNorm === '/biblia' || naApresentacaoBiblia)
  const modoApresentacaoAtivo = naApresentacaoBiblia

  const abrir = (e) => setAnchorEl(e.currentTarget)
  const fechar = () => setAnchorEl(null)

  const abrirLeituraConfig = () => {
    fechar()
    window.dispatchEvent(new Event('salvation-abrir-leitura-config'))
  }

  const compartilharPagina = () => {
    fechar()
    window.dispatchEvent(new Event('salvation-compartilhar-pagina'))
  }

  const irVersiculosMarcados = () => {
    fechar()
    navigate('/versiculos-marcados')
  }

  const alternarModoApresentacao = () => {
    fechar()
    const { livroId, capitulo } = obterLivroCapituloParaApresentacao(location)
    if (naApresentacaoBiblia) {
      navigate(`/?livro=${livroId}&capitulo=${capitulo}`, { replace: true })
      return
    }
    if (!naBiblia || !apresentacaoNoComputador) return
    navigate(`/biblia/apresentacao?livro=${livroId}&capitulo=${capitulo}`)
  }

  return (
    <>
      <Tooltip title="Mais opções">
        <IconButton
          color="inherit"
          aria-label="Mais opções"
          aria-haspopup="true"
          aria-expanded={aberto}
          onClick={abrir}
          sx={{ flexShrink: 0 }}
        >
          <AddIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={aberto}
        onClose={fechar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={abrirLeituraConfig}>
          <ListItemIcon>
            <IconeAaLeitura />
          </ListItemIcon>
          <ListItemText>Editar fonte</ListItemText>
        </MenuItem>
        <MenuItem onClick={alternarModoApresentacao} disabled={!podeModoApresentacao}>
          <ListItemIcon>
            {modoApresentacaoAtivo ? (
              <CheckIcon fontSize="small" color="primary" />
            ) : (
              <SlideshowOutlinedIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText
            primary="Modo apresentação"
            secondary={
              !apresentacaoNoComputador
                ? 'Somente no computador'
                : pathNorm === '/' || pathNorm === '/biblia' || naApresentacaoBiblia
                  ? modoApresentacaoAtivo
                    ? 'Sair da tela de slides'
                    : 'Abrir capítulo em tela cheia'
                  : 'Disponível na Bíblia'
            }
          />
        </MenuItem>
        <MenuItem onClick={compartilharPagina}>
          <ListItemIcon>
            <ShareOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Compartilhar página</ListItemText>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={irVersiculosMarcados}>
          <ListItemIcon>
            <BookmarksOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Versículos marcados</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
