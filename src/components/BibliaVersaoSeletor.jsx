import { useState } from 'react'
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItemButton, ListItemText } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import { VERSOES_BIBLICAS, versaoBiblicaPorId } from '../data/bibliaVersoes'
import { useVersaoBiblica } from '../hooks/useVersaoBiblica'
import { alterarVersaoBiblica } from '../services/bibliaService'
import { sxBotaoCabecalhoBiblia } from '../utils/bibliaHeaderButton'

export default function BibliaVersaoSeletor() {
  const versao = useVersaoBiblica()
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const alterar = async (id) => {
    if (carregando) return
    if (id === versao) { setAberto(false); return }
    setCarregando(true); setErro('')
    try { await alterarVersaoBiblica(id); setAberto(false) }
    catch { setErro('Não foi possível carregar essa versão. Verifique a conexão e tente novamente.') }
    finally { setCarregando(false) }
  }
  const fechar = () => { if (!carregando) setAberto(false) }
  return <>
    <Button size="small" onClick={() => setAberto(true)} aria-label={`Versão da Bíblia: ${versaoBiblicaPorId(versao)?.sigla}. Escolher versão`}
      sx={theme => ({ ...sxBotaoCabecalhoBiblia(theme), px: 1, py: 0.5, fontWeight: 700, color: 'text.secondary', fontSize: '0.9rem' })}>
      {versaoBiblicaPorId(versao)?.sigla}
    </Button>
    <Dialog open={aberto} onClose={fechar} fullWidth maxWidth="sm">
      <DialogTitle>Versão da Bíblia</DialogTitle>
      <DialogContent dividers>
        <List disablePadding>
          {VERSOES_BIBLICAS.map(item => <ListItemButton key={item.id} selected={item.id === versao} disabled={carregando} onClick={() => alterar(item.id)}>
            <ListItemText primary={item.sigla} secondary={item.nome} />
            {item.id === versao && <CheckIcon color="primary" />}
          </ListItemButton>)}
        </List>
        {carregando && <CircularProgress size={24} aria-label="Carregando versão" sx={{ display: 'block', mx: 'auto', mt: 2 }} />}
        {erro && <Alert severity="warning" sx={{ mt: 1 }}>{erro}</Alert>}
      </DialogContent>
      <DialogActions><Button onClick={fechar} disabled={carregando}>Fechar</Button></DialogActions>
    </Dialog>
  </>
}
