import { Fab } from '@mui/material'
import FullscreenExit from '@mui/icons-material/FullscreenExit'
import { useLocation, useNavigate } from 'react-router-dom'
import { caminhoSemTelaCheia } from '../utils/navegacaoVoltar'

/** Saída independente da rolagem, do zoom e das barras que o leitor pode ocultar. */
export default function SaidaLeituraTelaCheia() {
  const location = useLocation()
  const navigate = useNavigate()
  const reduzir = () => {
    navigate(caminhoSemTelaCheia(location), { replace: true })
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {})
  }
  return <Fab variant="extended" size="small" color="primary" onClick={reduzir}
    aria-label="Reduzir leitura e voltar aos controles" data-saida-leitura
    sx={{ position: 'fixed', right: 'calc(12px + env(safe-area-inset-right, 0px))',
      bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', minHeight: 44,
      zIndex: theme => theme.zIndex.modal - 1, gap: .75, px: 1.5 }}>
    <FullscreenExit />Reduzir
  </Fab>
}
