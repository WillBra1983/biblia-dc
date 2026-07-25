import { useState } from 'react'
import {
  Box,
  IconButton,
  Tooltip,
  Typography
} from '@mui/material'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import BookmarksOutlinedIcon from '@mui/icons-material/BookmarksOutlined'
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import CloseIcon from '@mui/icons-material/Close'
import MenuOpcoesCompartilhar from './MenuOpcoesCompartilhar'

/**
 * Barra de ações quando há versículos selecionados: faixa fixa em toda a largura,
 * contador e ícones na mesma linha com espaçamento uniforme (space-evenly), sem aumentar a altura da faixa.
 */
const TAM_ICONE_GLYPH_PX = { xs: 32, sm: 30 }

const sxIconeAcao = (theme) => ({
  boxSizing: 'border-box',
  flexShrink: 0,
  width: 40,
  height: 40,
  minWidth: 40,
  minHeight: 40,
  padding: 0,
  '& .MuiSvgIcon-root': {
    fontSize: TAM_ICONE_GLYPH_PX,
    width: TAM_ICONE_GLYPH_PX,
    height: TAM_ICONE_GLYPH_PX,
    display: 'block',
    filter:
      theme.palette.mode === 'light'
        ? 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.28))'
        : 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))'
  }
})

function AcaoSelecao({ label, tooltip, color, onClick, disabled = false, children }) {
  return (
    <Tooltip title={tooltip}>
      <Box
        component="span"
        sx={{
          width: { xs: 46, sm: 56 },
          flexShrink: 0,
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.125,
        }}
      >
        <IconButton
          aria-label={tooltip}
          onClick={onClick}
          size="small"
          disabled={disabled}
          sx={(theme) => ({ color, ...sxIconeAcao(theme) })}
        >
          {children}
        </IconButton>
        <Typography
          component="span"
          variant="caption"
          sx={{
            maxWidth: '100%',
            color: disabled ? 'text.disabled' : 'text.primary',
            fontSize: { xs: '0.65rem', sm: '0.7rem' },
            fontWeight: 700,
            lineHeight: 1.1,
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  )
}

export default function BibliaSelecaoActionBar({
  visivel,
  totalSelecionados = 0,
  onAbrirMarcador,
  onAbrirEstudo,
  onCopiarLink,
  onEnviarChat,
  onAbrirMarcados,
  onLimparSelecao,
  shareTitle,
  shareText,
  shareUrl,
  imageQuote,
  shareDisabled = false,
}) {
  const [menuShareAnchor, setMenuShareAnchor] = useState(null)

  const abrirMenuShare = (e) => setMenuShareAnchor(e.currentTarget)
  const fecharMenuShare = () => setMenuShareAnchor(null)

  return (
    <Box
      role="toolbar"
      aria-label="Ações para versículos selecionados"
      data-no-immersive-toggle="true"
      sx={(theme) => ({
        position: 'fixed',
        left: 0,
        right: 0,
        top: '50%',
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 8px)',
        paddingRight: 'calc(env(safe-area-inset-right, 0px) + 8px)',
        transform: visivel
          ? 'translateY(-50%)'
          : 'translateY(calc(-50% + min(70vh, 520px)))',
        opacity: visivel ? 1 : 0,
        pointerEvents: visivel ? 'auto' : 'none',
        transition: 'transform 240ms cubic-bezier(.22,.61,.36,1), opacity 200ms ease',
        zIndex: theme.zIndex.modal - 1,
        bgcolor: theme.palette.mode === 'dark'
          ? 'rgba(28, 32, 36, 0.96)'
          : 'rgba(255, 255, 255, 0.98)',
        color: theme.palette.text.primary,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: `1px solid ${theme.palette.divider}`,
        borderBottom: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)'
          : '0 12px 40px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)',
        py: { xs: 0.625, sm: 0.5 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        overflowX: 'hidden',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        minHeight: { xs: 64, sm: 62 }
      })}
    >
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          flexWrap: 'nowrap',
          gap: 0,
          minWidth: 0,
          minHeight: 54,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' }
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.125,
            flexShrink: 0,
            width: { xs: 42, sm: 48 },
            minWidth: { xs: 42, sm: 48 },
            height: 54,
            px: 0
          }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{
              fontWeight: 700,
              whiteSpace: 'nowrap',
              color: 'text.primary',
              fontVariantNumeric: 'tabular-nums',
              fontSize: { xs: '1.125rem', sm: '1rem' },
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-live="polite"
          >
            {totalSelecionados}
          </Typography>
          <Typography
            component="span"
            variant="caption"
            sx={{
              color: 'text.primary',
              whiteSpace: 'nowrap',
              fontWeight: 700,
              fontSize: { xs: '0.8125rem', sm: '0.75rem' },
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {totalSelecionados === 1 ? 'verso' : 'versos'}
          </Typography>
        </Box>

        <AcaoSelecao label="Marcados" tooltip="Ver versículos marcados" color="primary.main" onClick={onAbrirMarcados}>
          <BookmarksOutlinedIcon />
        </AcaoSelecao>

        <AcaoSelecao label="Marcar" tooltip="Marcar com cor" color="#F9A825" onClick={onAbrirMarcador}>
          <BookmarkBorderIcon />
        </AcaoSelecao>

        <AcaoSelecao label="Estudar" tooltip="Preparar estudo compartilhado" color="primary.main" onClick={onAbrirEstudo}>
          <MenuBookOutlinedIcon />
        </AcaoSelecao>

        <AcaoSelecao
          label="Enviar"
          tooltip="Compartilhar versículos selecionados"
          color="text.primary"
          onClick={abrirMenuShare}
          disabled={shareDisabled && !shareText && !shareUrl}
        >
          <ShareOutlinedIcon />
        </AcaoSelecao>

        <AcaoSelecao label="Fechar" tooltip="Sair da seleção" color="#D32F2F" onClick={onLimparSelecao}>
          <CloseIcon />
        </AcaoSelecao>
      </Box>

      <MenuOpcoesCompartilhar
        anchorEl={menuShareAnchor}
        open={Boolean(menuShareAnchor)}
        onClose={fecharMenuShare}
        title={shareTitle}
        text={shareText}
        url={shareUrl}
        onCopiarLink={onCopiarLink}
        onEnviarChat={onEnviarChat}
        imageQuote={imageQuote}
        disabled={shareDisabled}
      />
    </Box>
  )
}
