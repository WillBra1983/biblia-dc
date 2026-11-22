import { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import { obterPixContribuicao } from '../services/bibliotecaLivrosService'

export default function ContribuicaoProjetoDialog({ aberto, onClose, carregarPix = obterPixContribuicao }) {
  const [pix, setPix] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const [opcao, setOpcao] = useState(1000)
  const [valorCentavos, setValorCentavos] = useState(1000)
  const [outroValor, setOutroValor] = useState('')
  const [erroValor, setErroValor] = useState('')
  useEffect(() => {
    if (!aberto || valorCentavos == null) return undefined
    let ativo = true
    setPix(null); setErro(''); setCopiado(false); setCarregando(true)
    Promise.resolve().then(() => carregarPix({ valorCentavos })).then(dados => {
      if (!dados?.pixCopiaCola || !dados?.qrCodeDataUrl) throw Error('Pix indisponível')
      if (dados.valorCentavos !== valorCentavos) throw Error('Valor do Pix não confirmado')
      if (ativo) setPix(dados)
    }).catch(() => {
      if (ativo) setErro('Não foi possível preparar o Pix agora. Tente novamente em instantes.')
    }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [aberto, tentativa, carregarPix, valorCentavos])

  function escolher(_, valor) {
    if (valor == null) return
    setOpcao(valor); setErroValor(''); setPix(null); setCopiado(false); setErro('')
    setValorCentavos(valor === 'outro' ? null : valor)
    setCarregando(valor !== 'outro')
  }
  function gerarOutroValor() {
    const texto = outroValor.trim().replace(/\s/g, '')
    if (!/^\d{1,6}(?:[,.]\d{1,2})?$/.test(texto)) { setErroValor('Informe um valor como 15,00.'); return }
    const centavos = Math.round(Number(texto.replace(',', '.')) * 100)
    if (centavos < 1 || centavos > 10000000) { setErroValor('Informe um valor entre R$ 0,01 e R$ 100.000,00.'); return }
    setErroValor(''); setValorCentavos(centavos); setTentativa(v => v + 1)
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(pix.pixCopiaCola)
      setCopiado(true); setErro('')
    } catch {
      setErro('Não foi possível copiar automaticamente. Selecione o código abaixo para copiá-lo ou use o QR Code.')
    }
  }
  return <Dialog open={aberto} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="contribuicao-titulo">
    <DialogTitle id="contribuicao-titulo" sx={{ pr: 7, color: 'primary.main', fontWeight: 800 }}>
      Abrace este projeto
      <IconButton aria-label="Fechar contribuição" onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, width: 44, height: 44 }}><CloseIcon /></IconButton>
    </DialogTitle>
    <DialogContent dividers>
      <Stack spacing={1.75}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box aria-hidden="true" sx={{ position: 'relative', display: 'grid', placeItems: 'center', flexShrink: 0, width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(145deg, #fff7dd, #efe0b3)', border: '1px solid #e5d3a1', color: '#35594b' }}><AutoStoriesOutlinedIcon sx={{ fontSize: 35, mt: 1 }} /><FavoriteRoundedIcon sx={{ position: 'absolute', top: 7, right: 9, fontSize: 20, color: '#a57e30', stroke: '#fff4d5', strokeWidth: 1.5 }} /></Box>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.4 }}>Ajude a manter este projeto gratuito e sem propagandas.</Typography>
        </Box>
        <Typography variant="body2">A Bíblia do Discípulo Cristão existe para tornar o estudo da Palavra acessível a todos. Sua contribuição apoia a manutenção e o aprimoramento do aplicativo, para que mais pessoas possam estudar com tranquilidade.</Typography>
        <Typography variant="body2" color="text.secondary">Se desejar participar, contribua pelo Pix. É um gesto voluntário de apoio a este projeto.</Typography>
        <Typography variant="body2" fontWeight={700}>Escolha o valor da sua contribuição</Typography>
        <ToggleButtonGroup exclusive value={opcao} onChange={escolher} aria-label="Valor da contribuição" sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: .75, '& .MuiToggleButtonGroup-grouped': { m: '0 !important', border: '1px solid !important', borderColor: 'divider !important', borderRadius: '8px !important', minHeight: 44, p: .5, textTransform: 'none', fontSize: '.8rem', fontWeight: 700 }, '& .Mui-selected': { bgcolor: '#e7f0e8 !important', color: '#175342 !important', borderColor: '#175342 !important' } }}>
          {[200, 500, 1000, 2000, 5000, 10000, 50000, 100000].map(valor => <ToggleButton key={valor} value={valor} aria-label={`Contribuir com ${(valor / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}>{(valor / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</ToggleButton>)}
          <ToggleButton value="outro" sx={{ gridColumn: '1 / -1' }}>Escolher outro valor</ToggleButton>
        </ToggleButtonGroup>
        {opcao === 'outro' && <Stack direction="row" spacing={1} alignItems="flex-start"><TextField label="Outro valor (R$)" value={outroValor} onChange={e => { setOutroValor(e.target.value); setValorCentavos(null); setPix(null); setCarregando(false); setCopiado(false) }} inputProps={{ inputMode: 'decimal', maxLength: 10 }} error={Boolean(erroValor)} helperText={erroValor} size="small" fullWidth /><Button variant="outlined" onClick={gerarOutroValor} sx={{ minHeight: 44, flexShrink: 0 }}>Gerar Pix</Button></Stack>}
        {carregando && <Box role="status" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 2 }}><CircularProgress size={22} /><Typography variant="body2">Preparando Pix…</Typography></Box>}
        {erro && <Alert severity="warning" action={!pix && !carregando ? <Button color="inherit" size="small" onClick={() => setTentativa(v => v + 1)}>Tentar novamente</Button> : undefined}>{erro}</Alert>}
        {pix && <>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#fff', alignSelf: 'center', maxWidth: '100%' }}>
            <Box component="img" src={pix.qrCodeDataUrl} alt="QR Code Pix para contribuir com o projeto" sx={{ display: 'block', width: 210, maxWidth: '100%', height: 'auto' }} />
          </Box>
          <Typography variant="body2" align="center">{pix.valorCentavos == null ? 'Escolha o valor no aplicativo do seu banco.' : `Valor do Pix: ${(pix.valorCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}<br />Recebedor: <strong>{pix.nome}</strong></Typography>
          <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={copiar} sx={{ minHeight: 44, textTransform: 'none', fontWeight: 700 }}>{copiado ? 'Pix copiado' : 'Copiar Pix para contribuir'}</Button>
          {copiado && <Typography role="status" variant="body2" color="success.main">Abra seu banco e escolha Pix Copia e Cola para concluir.</Typography>}
          <TextField label="Pix Copia e Cola" value={pix.pixCopiaCola} multiline minRows={2} maxRows={4} fullWidth InputProps={{ readOnly: true }} inputProps={{ style: { fontSize: 12, overflowWrap: 'anywhere' } }} onFocus={evento => evento.target.select()} />
        </>}
        <Typography variant="body2" fontWeight={700} align="center">Obrigado por tua generosidade.</Typography>
        <Box component="blockquote" sx={{ m: 0, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}><Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', lineHeight: 1.65 }}>Cada um contribua segundo tiver proposto no coração, não com tristeza ou por necessidade; porque Deus ama a quem dá com alegria.</Typography><Typography variant="caption" color="text.secondary">2 Coríntios 9:7 · ARA</Typography></Box>
      </Stack>
    </DialogContent>
    <DialogActions><Button onClick={onClose} sx={{ textTransform: 'none', minHeight: 44 }}>Fechar</Button></DialogActions>
  </Dialog>
}
