import { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined'
import {
  baixarImagemTrechoLivro,
  compartilharImagemTrechoLivro,
  gerarImagemTrechoLivro,
} from '../utils/livroTrechoImagem'

export default function CompartilharTrechoLivroDialog({ open, onClose, trecho, livro, urlLivro }) {
  const [blob, setBlob] = useState(null)
  const [preview, setPreview] = useState('')
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    let ativo = true
    let urlTemporaria = ''
    setBlob(null); setPreview(''); setErro(''); setProcessando(true)
    void gerarImagemTrechoLivro({
      trecho,
      titulo: livro?.titulo,
      autor: livro?.autor,
      capaUrl: livro?.capaUrl,
      urlLivro,
    }).then((imagem) => {
      if (!ativo) return
      urlTemporaria = URL.createObjectURL(imagem)
      setBlob(imagem)
      setPreview(urlTemporaria)
    }).catch((falha) => { if (ativo) setErro(falha?.message || 'Não foi possível preparar a imagem.') })
      .finally(() => { if (ativo) setProcessando(false) })
    return () => { ativo = false; if (urlTemporaria) URL.revokeObjectURL(urlTemporaria) }
  }, [open, trecho, livro?.titulo, livro?.autor, livro?.capaUrl, urlLivro])

  const compartilhar = async () => {
    if (!blob) return
    setProcessando(true); setErro('')
    try {
      const abriu = await compartilharImagemTrechoLivro(blob, { titulo: livro?.titulo, autor: livro?.autor, urlLivro })
      if (!abriu) baixarImagemTrechoLivro(blob, livro?.titulo)
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
        {erro && <Alert severity="warning" sx={{ mb: 2 }}>{erro}</Alert>}
        {processando && !preview ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : preview && <Box component="img" src={preview} alt="Prévia do trecho compartilhado" sx={{ display: 'block', width: '100%', maxWidth: 360, aspectRatio: '4 / 5', objectFit: 'contain', mx: 'auto', borderRadius: 1, boxShadow: 3 }} />}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<DownloadOutlinedIcon />} disabled={!blob || processando} onClick={() => baixarImagemTrechoLivro(blob, livro?.titulo)}>Baixar</Button>
        <Button variant="contained" startIcon={processando ? <CircularProgress size={18} color="inherit" /> : <IosShareOutlinedIcon />} disabled={!blob || processando} onClick={() => void compartilhar()}>Compartilhar</Button>
      </DialogActions>
    </Dialog>
  )
}
