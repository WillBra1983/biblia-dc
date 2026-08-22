import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined'
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import TelegramIcon from '@mui/icons-material/Telegram'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import {
  abrirEmail,
  abrirSms,
  abrirTelegram,
  abrirWhatsApp,
  compartilharNativo,
  montarCorpoCompartilhamento,
  suporteShareNativo,
} from '../utils/compartilharOpcoes'
import { avisarAsync, mostrarSnackbar } from '../utils/uiDialogs'
import { isPublicAppUrlUnreachableForOthers } from '../services/bibliaEstudosService'
import CompartilharVersiculoImagemDialog from './CompartilharVersiculoImagemDialog'

/**
 * Menu consolidado: copiar, apps externos (WhatsApp, Telegram, e-mail…), chat interno e share nativo.
 */
export default function MenuOpcoesCompartilhar({
  anchorEl,
  open,
  onClose,
  title,
  text,
  url,
  onCopiarLink,
  onEnviarChat,
  chatLabel = 'Enviar no chat interno',
  imageQuote = null,
  disabled = false,
  onActionComplete,
}) {
  const [imagemOpen, setImagemOpen] = useState(false)
  const corpo = montarCorpoCompartilhamento({ text, url })
  const temCorpo = Boolean(corpo)
  const temUrl = Boolean(url)
  const temNativo = suporteShareNativo()
  const podeSms =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')

  const fechar = () => onClose?.()
  const concluirAcao = () => {
    setImagemOpen(false)
    fechar()
    onActionComplete?.()
  }
  const concluirAcaoSincrona = () => flushSync(() => concluirAcao())

  useEffect(() => {
    const fecharAoAbrirLink = () => {
      setImagemOpen(false)
      onClose?.()
      onActionComplete?.()
    }
    window.addEventListener('salvation-native-deep-link-opening', fecharAoAbrirLink)
    return () => window.removeEventListener('salvation-native-deep-link-opening', fecharAoAbrirLink)
  }, [onClose, onActionComplete])

  const copiarTexto = async () => {
    fechar()
    if (!corpo) return
    try {
      await navigator.clipboard.writeText(corpo)
      mostrarSnackbar({
        mensagem: 'Texto copiado! É só colar onde quiser.',
        severidade: 'success',
      })
    } catch {
      await avisarAsync({
        titulo: 'Copie o conteúdo para compartilhar',
        mensagem: corpo,
        severidade: 'info',
      })
    } finally {
      onActionComplete?.()
    }
  }

  const copiarLink = async () => {
    fechar()
    if (typeof onCopiarLink === 'function') {
      await onCopiarLink()
      onActionComplete?.()
      return
    }
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      if (isPublicAppUrlUnreachableForOthers()) {
        await avisarAsync({
          titulo: 'Link copiado',
          mensagem:
            'Link copiado! Este ambiente usa localhost — no celular de outra pessoa pode não abrir. ' +
            'Defina VITE_PUBLIC_APP_URL no .env e refaça o build.',
          severidade: 'warning',
        })
      } else {
        mostrarSnackbar({
          mensagem: 'Link copiado! É só colar onde quiser.',
          severidade: 'success',
        })
      }
    } catch {
      await avisarAsync({
        titulo: 'Copie este link para compartilhar',
        mensagem: url,
        severidade: 'info',
      })
    } finally {
      onActionComplete?.()
    }
  }

  const enviarChat = () => {
    concluirAcaoSincrona()
    onEnviarChat?.()
  }

  const shareNativo = async () => {
    concluirAcaoSincrona()
    // A folha nativa recebe texto e URL separadamente. `corpo` já contém a URL
    // e faria alguns aplicativos mostrarem o mesmo link duas vezes.
    const opened = await compartilharNativo({ title, text, url })
    if (opened) return
    if (corpo) {
      try {
        await navigator.clipboard.writeText(corpo)
        mostrarSnackbar({
          mensagem: 'Conteúdo copiado! Cole no app desejado.',
          severidade: 'success',
        })
      } catch {
        await avisarAsync({
          titulo: 'Copie o conteúdo para compartilhar',
          mensagem: corpo,
          severidade: 'info',
        })
      }
    }
  }

  const whatsapp = () => {
    concluirAcaoSincrona()
    abrirWhatsApp(corpo)
  }

  const telegram = () => {
    concluirAcaoSincrona()
    abrirTelegram({ text, url })
  }

  const email = () => {
    concluirAcaoSincrona()
    abrirEmail({ subject: title, body: corpo })
  }

  const sms = () => {
    concluirAcaoSincrona()
    abrirSms(corpo)
  }

  const abrirImagem = () => {
    fechar()
    setImagemOpen(true)
  }

  if (!temCorpo && !temUrl && typeof onEnviarChat !== 'function') return null

  return (
    <>
      <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={fechar}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      {temCorpo && (
        <MenuItem onClick={copiarTexto} disabled={disabled}>
          <ListItemIcon>
            <ContentCopyOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copiar texto</ListItemText>
        </MenuItem>
      )}
      {temUrl && (
        <MenuItem onClick={copiarLink} disabled={disabled}>
          <ListItemIcon>
            <ContentCopyOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copiar link</ListItemText>
        </MenuItem>
      )}
      {temCorpo && (
        <MenuItem onClick={whatsapp} disabled={disabled}>
          <ListItemIcon>
            <WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />
          </ListItemIcon>
          <ListItemText>WhatsApp</ListItemText>
        </MenuItem>
      )}
      {temCorpo && (
        <MenuItem onClick={telegram} disabled={disabled}>
          <ListItemIcon>
            <TelegramIcon fontSize="small" sx={{ color: '#229ED9' }} />
          </ListItemIcon>
          <ListItemText>Telegram</ListItemText>
        </MenuItem>
      )}
      {temCorpo && (
        <MenuItem onClick={email} disabled={disabled}>
          <ListItemIcon>
            <EmailOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>E-mail</ListItemText>
        </MenuItem>
      )}
      {temCorpo && podeSms && (
        <MenuItem onClick={sms} disabled={disabled}>
          <ListItemIcon>
            <SmsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>SMS</ListItemText>
        </MenuItem>
      )}
      {typeof onEnviarChat === 'function' && (
        <MenuItem onClick={enviarChat} disabled={disabled}>
          <ListItemIcon>
            <ForumOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{chatLabel}</ListItemText>
        </MenuItem>
      )}
      {imageQuote?.referencia && imageQuote?.texto && (
        <MenuItem onClick={abrirImagem} disabled={disabled}>
          <ListItemIcon>
            <ImageOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Compartilhar como imagem</ListItemText>
        </MenuItem>
      )}
      {(temCorpo || temUrl) && (
        <MenuItem onClick={shareNativo} disabled={disabled}>
          <ListItemIcon>
            <IosShareOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {temNativo ? 'Compartilhar com…' : 'Copiar e compartilhar'}
          </ListItemText>
        </MenuItem>
      )}
      </Menu>
      <CompartilharVersiculoImagemDialog
        open={imagemOpen}
        onClose={() => setImagemOpen(false)}
        referencia={imageQuote?.referencia || ''}
        texto={imageQuote?.texto || ''}
        url={url || ''}
        onActionComplete={concluirAcaoSincrona}
      />
    </>
  )
}
