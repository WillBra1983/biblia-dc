import { Button, IconButton, Tooltip } from '@mui/material'
import IosShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import { compartilharLivro } from '../utils/livroShare'
import { mostrarSnackbar } from '../utils/uiDialogs'

export default function CompartilharLivroButton({ livro, somenteIcone = false, fullWidth = false }) {
  const executar = async () => {
    try {
      const resultado = await compartilharLivro(livro)
      if (resultado.copiado) mostrarSnackbar({ mensagem: 'Link do livro copiado.', severidade: 'success' })
      else if (!resultado.abriu) mostrarSnackbar({ mensagem: resultado.url, severidade: 'info' })
    } catch (erro) {
      if (erro?.name !== 'AbortError') mostrarSnackbar({ mensagem: 'Não foi possível compartilhar o livro.', severidade: 'error' })
    }
  }

  if (somenteIcone) {
    return <Tooltip title="Compartilhar livro"><IconButton aria-label="Compartilhar livro" onClick={() => void executar()}><IosShareOutlinedIcon /></IconButton></Tooltip>
  }
  return <Button variant="outlined" size="large" startIcon={<IosShareOutlinedIcon />} onClick={() => void executar()} fullWidth={fullWidth}>Compartilhar livro</Button>
}
