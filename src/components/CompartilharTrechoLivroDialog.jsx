import { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography, TextField, FormControlLabel, Switch, Stack, MenuItem } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import IosShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import {
  baixarImagemTrechoLivro,
  compartilharImagemTrechoLivro,
  gerarImagensTrechoLivro,
} from '../utils/livroTrechoImagem'

export default function CompartilharTrechoLivroDialog({ open, onClose, trecho, livro, urlLivro }) {
  const [blob, setBlob] = useState(null)
  const [preview, setPreview] = useState('')
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)
  const [texto, setTexto] = useState('')
  const [dividir, setDividir] = useState(true)
  const [reduzirFonte, setReduzirFonte] = useState(false)
  const [imagens, setImagens] = useState([])
  const [pagina, setPagina] = useState(0)
  const [quantidadeQuadros, setQuantidadeQuadros] = useState(0)
  useEffect(() => { if (open) { setTexto(trecho || ''); setPagina(0); setDividir(true); setQuantidadeQuadros(0); setReduzirFonte(false) } }, [open, trecho])

  useEffect(() => {
    if (!open) return undefined
    let ativo = true
    let urls = []
    setBlob(null); setPreview(''); setErro(''); setProcessando(true)
    setImagens([])
    const timer = setTimeout(() => void gerarImagensTrechoLivro({
      trecho: texto, dividir, reduzirFonte, quantidadeQuadros,
      titulo: livro?.titulo,
      autor: livro?.autor,
      capaUrl: livro?.capaUrl,
      urlLivro,
    }).then((novas) => {
      if (!ativo) return
      urls = novas.map((imagem) => URL.createObjectURL(imagem))
      setImagens(novas.map((imagem, indice) => ({ blob: imagem, url: urls[indice] })))
      setBlob(novas[0]); setPreview(urls[0]); setPagina(0)
    }).catch((falha) => { if (ativo) setErro(falha?.message || 'Não foi possível preparar a imagem.') })
      .finally(() => { if (ativo) setProcessando(false) }), 350)
    return () => { ativo = false; clearTimeout(timer); urls.forEach((url) => URL.revokeObjectURL(url)) }
  }, [open, texto, dividir, reduzirFonte, quantidadeQuadros, livro?.titulo, livro?.autor, livro?.capaUrl, urlLivro])

  const compartilhar = async (somenteAtual = false) => {
    if (!blob) return
    setProcessando(true); setErro('')
    try {
      const abriu = await compartilharImagemTrechoLivro(somenteAtual ? blob : imagens.map((imagem) => imagem.blob), { titulo: livro?.titulo })
      if (!abriu) setErro('Este dispositivo não permite compartilhar estas imagens juntas. Use Baixar imagem para salvar cada uma e compartilhar pelo seu aplicativo.')
    } catch (falha) {
      if (falha?.name !== 'AbortError') setErro(falha?.message || 'Não foi possível compartilhar a imagem.')
    } finally { setProcessando(false) }
  }

  return (
    <Dialog open={open} onClose={processando ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
        Compartilhar trecho
        <IconButton onClick={onClose} disabled={processando} aria-label="Fechar"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>A imagem mantém o texto em tamanho legível e divulga o livro sem disponibilizar seu arquivo.</Typography>
        <TextField fullWidth multiline minRows={3} maxRows={7} label="Ajustar trecho" value={texto} inputProps={{ maxLength: 12000 }} onChange={(event) => setTexto(event.target.value)} helperText="Mantenha as palavras do autor. Você pode retirar partes do trecho." />
        <TextField select fullWidth label="Quantidade de quadros" value={quantidadeQuadros} sx={{ mt: 2 }} onChange={(event) => setQuantidadeQuadros(Number(event.target.value))} helperText="Escolha a quantidade. Se o texto não couber com boa leitura, avisaremos sem cortar palavras.">
          <MenuItem value={0}>Automático — conforme o tamanho do trecho</MenuItem>
          {Array.from({ length: 12 }, (_, indice) => <MenuItem key={indice + 1} value={indice + 1}>{indice + 1} {indice === 0 ? 'quadro' : 'quadros'}</MenuItem>)}
        </TextField>
        <FormControlLabel control={<Switch checked={reduzirFonte} onChange={(event) => setReduzirFonte(event.target.checked)} />} label="Reduzir a fonte (mais texto por imagem)" />
        {erro && <Alert severity="warning" sx={{ mb: 2 }}>{erro}</Alert>}
        {processando && !preview ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : preview && <Box component="img" src={preview} alt="Prévia do trecho compartilhado" sx={{ display: 'block', width: '100%', maxWidth: 360, aspectRatio: '4 / 5', objectFit: 'contain', mx: 'auto', borderRadius: 1, boxShadow: 3 }} />}
      </DialogContent>
      {imagens.length > 1 && <Stack direction="row" justifyContent="center" alignItems="center"><Button disabled={pagina === 0 || processando} onClick={() => { const valor = pagina - 1; setPagina(valor); setBlob(imagens[valor].blob); setPreview(imagens[valor].url) }}>Anterior</Button><Typography>{pagina + 1} / {imagens.length}</Typography><Button disabled={pagina === imagens.length - 1 || processando} onClick={() => { const valor = pagina + 1; setPagina(valor); setBlob(imagens[valor].blob); setPreview(imagens[valor].url) }}>Próxima</Button></Stack>}
      <DialogActions>
        <Button startIcon={<DownloadOutlinedIcon />} disabled={!blob || processando} onClick={() => baixarImagemTrechoLivro(blob, livro?.titulo, pagina + 1, imagens.length)}>Baixar imagem</Button>
        {imagens.length > 1 && <Button disabled={!blob || processando} onClick={() => void compartilhar(true)}>Enviar este quadro</Button>}
        <Button variant="contained" startIcon={processando ? <CircularProgress size={18} color="inherit" /> : <IosShareOutlinedIcon />} disabled={!blob || processando} onClick={() => void compartilhar()}>{imagens.length > 1 ? 'Enviar todas' : 'Compartilhar imagem'}</Button>
      </DialogActions>
    </Dialog>
  )
}
