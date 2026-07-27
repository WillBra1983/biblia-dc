import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import {
  FUNDOS_VERSICULO,
  baixarImagemVersiculo,
  compartilharArquivoImagem,
  formatarCitacaoTextoVersiculo,
  gerarImagemVersiculo,
  urlFundoVersiculo,
  urlLogoApp,
} from '../utils/versiculoImagem'
import { mostrarSnackbar } from '../utils/uiDialogs'

const STORAGE_FUNDO = 'salvation_fundo_versiculo_imagem'

export default function CompartilharVersiculoImagemDialog({ open, onClose, referencia, texto, url, onActionComplete }) {
  const [fundoId, setFundoId] = useState(() => localStorage.getItem(STORAGE_FUNDO) || 'amanhecer')
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    if (FUNDOS_VERSICULO.some((item) => item.id === fundoId)) {
      localStorage.setItem(STORAGE_FUNDO, fundoId)
    }
  }, [fundoId])

  const fundo = FUNDOS_VERSICULO.find((item) => item.id === fundoId) || FUNDOS_VERSICULO[0]
  const textoCitacao = formatarCitacaoTextoVersiculo(texto)

  const criar = async (modo) => {
    setGerando(true)
    try {
      const blob = await gerarImagemVersiculo({ referencia, texto, fundoId })
      if (modo === 'compartilhar') {
        onActionComplete?.()
        try {
          const abriu = await compartilharArquivoImagem(blob, referencia, url)
          if (abriu) return
        } catch (error) {
          if (error?.name === 'AbortError') return
        }
      }
      baixarImagemVersiculo(blob, referencia)
      if (modo !== 'compartilhar') onActionComplete?.()
      mostrarSnackbar({
        mensagem: modo === 'compartilhar'
          ? 'O aparelho não compartilha arquivos diretamente. A imagem foi baixada.'
          : 'Imagem baixada.',
        severidade: 'success',
      })
    } catch (error) {
      mostrarSnackbar({ mensagem: error?.message || 'Não foi possível gerar a imagem.', severidade: 'error' })
    } finally {
      setGerando(false)
    }
  }

  return (
    <Dialog open={open} onClose={gerando ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        Compartilhar como imagem
        <IconButton onClick={onClose} disabled={gerando} aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 340,
            aspectRatio: '4 / 5',
            mx: 'auto',
            mb: 2.5,
            overflow: 'hidden',
            borderRadius: 1,
            bgcolor: fundo.cor || '#183b35',
            backgroundImage: fundo.arquivo
              ? `linear-gradient(rgba(4,15,20,${fundo.overlay}), rgba(4,15,20,${fundo.overlay})), url("${urlFundoVersiculo(fundo)}")`
              : 'radial-gradient(circle at 75% 12%, rgba(214,180,93,.28), transparent 55%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 2.5,
            boxSizing: 'border-box',
            boxShadow: 2,
          }}
        >
          <Typography sx={{ fontSize: '0.67rem', fontWeight: 800, opacity: 0.88, textAlign: 'center' }}>
            BÍBLIA DO DISCÍPULO CRISTÃO
          </Typography>
          <Typography
            sx={{
              maxHeight: '70%',
              overflow: 'hidden',
              fontFamily: 'Georgia, serif',
              fontSize: textoCitacao.length > 420 ? '0.9rem' : textoCitacao.length > 220 ? '1.05rem' : '1.25rem',
              fontWeight: 600,
              lineHeight: 1.38,
              textAlign: 'center',
              textShadow: '0 2px 8px rgba(0,0,0,.5)',
              whiteSpace: 'pre-line',
            }}
          >
            {textoCitacao}
          </Typography>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', textShadow: '0 2px 6px rgba(0,0,0,.5)' }}>
              {referencia}
            </Typography>
            <Box
              component="img"
              src={urlLogoApp()}
              alt="Bíblia do Discípulo Cristão"
              sx={{ display: 'block', width: 28, height: 28, mt: 0.8, mx: 'auto', borderRadius: 0.5 }}
            />
          </Box>
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>Escolha o fundo</Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(5, minmax(0, 1fr))' },
            gap: 1,
          }}
        >
          {FUNDOS_VERSICULO.map((item) => {
            const ativo = item.id === fundoId
            return (
              <Box
                component="button"
                type="button"
                key={item.id}
                onClick={() => setFundoId(item.id)}
                aria-label={`Usar fundo ${item.nome}`}
                sx={{
                  position: 'relative',
                  aspectRatio: '4 / 5',
                  minWidth: 0,
                  p: 0,
                  overflow: 'hidden',
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: ativo ? '3px solid' : '1px solid',
                  borderColor: ativo ? 'primary.main' : 'divider',
                  bgcolor: item.cor || '#183b35',
                  backgroundImage: item.arquivo ? `url("${urlFundoVersiculo(item)}")` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {ativo && <CheckCircleIcon sx={{ position: 'absolute', top: 3, right: 3, color: '#fff', filter: 'drop-shadow(0 1px 2px #000)' }} />}
                <Typography
                  component="span"
                  sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    py: 0.4,
                    bgcolor: 'rgba(0,0,0,.62)',
                    color: '#fff',
                    fontSize: { xs: '0.6rem', sm: '0.72rem' },
                    fontWeight: 700,
                  }}
                >
                  {item.nome}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button startIcon={<DownloadOutlinedIcon />} onClick={() => void criar('baixar')} disabled={gerando}>
          Baixar
        </Button>
        <Button variant="contained" startIcon={gerando ? <CircularProgress size={18} color="inherit" /> : <IosShareOutlinedIcon />} onClick={() => void criar('compartilhar')} disabled={gerando}>
          Compartilhar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
