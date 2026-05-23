import { useState } from 'react'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import MenuOpcoesCompartilhar from './MenuOpcoesCompartilhar'

/**
 * Botão único de "Compartilhar" com menu: copiar, WhatsApp, Telegram, e-mail,
 * chat interno (opcional) e folha nativa do SO quando disponível.
 */
export default function CompartilharMenu({
  linkUrl,
  linkTitle,
  linkText,
  onEnviarChat,
  chatLabel = 'Enviar no chat interno',
  label = 'Compartilhar',
  variant = 'outlined',
  color = 'primary',
  size = 'small',
  iconOnly = false,
  disabled = false,
  tooltip,
  sx,
}) {
  const [anchorEl, setAnchorEl] = useState(null)

  const podeCopiarLink = Boolean(linkUrl)
  const podeEnviarChat = typeof onEnviarChat === 'function'
  const temConteudo = podeCopiarLink || podeEnviarChat || Boolean(linkText)

  if (!temConteudo) return null

  const aberto = Boolean(anchorEl)
  const abrir = (e) => setAnchorEl(e.currentTarget)
  const fechar = () => setAnchorEl(null)

  const botao = iconOnly ? (
    <IconButton
      onClick={abrir}
      disabled={disabled}
      aria-label={label}
      size={size}
      color={color === 'inherit' ? 'inherit' : 'primary'}
      sx={sx}
    >
      <ShareOutlinedIcon />
    </IconButton>
  ) : (
    <Button
      onClick={abrir}
      disabled={disabled}
      variant={variant}
      color={color}
      size={size}
      startIcon={<ShareOutlinedIcon />}
      sx={sx}
    >
      {label}
    </Button>
  )

  return (
    <>
      {tooltip ? <Tooltip title={tooltip} arrow>{botao}</Tooltip> : botao}
      <MenuOpcoesCompartilhar
        anchorEl={anchorEl}
        open={aberto}
        onClose={fechar}
        title={linkTitle}
        text={linkText}
        url={linkUrl}
        onEnviarChat={onEnviarChat}
        chatLabel={chatLabel}
        disabled={disabled}
      />
    </>
  )
}
