import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Slider,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Switch,
} from '@mui/material'
import FormatAlignLeft from '@mui/icons-material/FormatAlignLeft'
import FormatAlignCenter from '@mui/icons-material/FormatAlignCenter'
import FormatAlignRight from '@mui/icons-material/FormatAlignRight'
import FormatAlignJustify from '@mui/icons-material/FormatAlignJustify'
import { useTheme } from '@mui/material/styles'
import { useLocation } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { FONT_OPTIONS, resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import { usePinchNumeric } from '../hooks/usePinchNumeric'
import { carregarFonteLeitura } from '../utils/fontLoader'

/** Ícone Aa para a barra e título do diálogo */
function IconeAaLeitura({ sx, variant = 'toolbar', ...rest }) {
  const isTitle = variant === 'title'
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: 'inline-flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        lineHeight: 0.9,
        fontFamily: '"Source Serif 4", Georgia, serif',
        color: 'inherit',
        ...sx,
      }}
      {...rest}
    >
      <Box
        component="span"
        sx={{
          fontSize: isTitle ? '1.9rem' : '1.6rem',
          fontWeight: 800,
          letterSpacing: '-0.04em',
        }}
      >
        A
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: isTitle ? '1.12rem' : '0.98rem',
          fontWeight: 800,
          ml: '-0.06em',
          opacity: 0.92,
        }}
      >
        a
      </Box>
    </Box>
  )
}

const LEITURA_SECCAO_LABEL = {
  biblia: 'Bíblia',
  plano: 'Plano de leitura',
  'plano-leitura-biblia': 'Plano (leitura na Bíblia)',
  discipulado: 'Discipulado',
  hinario: 'Hinário',
  'hinario-editor': 'Editor do hinário',
  confissao: 'Confissão de Fé',
  'catecismo-maior': 'Catecismo Maior',
  'catecismo-breve': 'Catecismo Breve',
  devocional: 'Devocional',
  'mais-de-deus': 'Mais de Deus',
  youtube: 'YouTube',
  'versiculos-marcados': 'Versículos marcados',
  'quiz-retiro': 'Quiz bíblico',
  chat: 'Mensagens',
  'estudos-biblicos': 'Estudos bíblicos',
  outros: 'Outras páginas',
}

function toRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return `rgba(30, 122, 53, ${alpha})`
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized
  const intVal = Number.parseInt(full, 16)
  if (Number.isNaN(intVal) || full.length !== 6) return `rgba(30, 122, 53, ${alpha})`
  const r = (intVal >> 16) & 255
  const g = (intVal >> 8) & 255
  const b = intVal & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Botão na AppBar principal: zoom, alinhamento, fonte e tema (AppContext).
 * Não altera o drawer de menu — só estado global de leitura.
 */
export default function LeituraConfigButton({ hidden = false }) {
  const theme = useTheme()
  const location = useLocation()
  const pathnameNorm =
    location.pathname !== '/' && location.pathname.endsWith('/')
      ? location.pathname.slice(0, -1)
      : location.pathname
  const isRotaEstudoIaLeitura = /^\/estudos-biblicos\/ia-(passagem|pericope)/.test(pathnameNorm)
  const accent = theme.palette.primary.main
  const [open, setOpen] = useState(false)
  const {
    isDarkMode,
    toggleDarkMode,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    textAlign,
    setTextAlign,
    lineHeight,
    setLineHeight,
    semEspacoEntreVersiculos,
    setSemEspacoEntreVersiculos,
    setBackButtonHandler,
    leituraPaginaKey,
  } = useApp()

  const isBibliaOuPlanoNaBiblia =
    (leituraPaginaKey === 'biblia' || leituraPaginaKey === 'plano-leitura-biblia') && !isRotaEstudoIaLeitura

  const fonteZoomPinchRef = useRef(null)
  const handlePinchFontSize = useCallback((v) => setFontSize(v), [setFontSize])
  usePinchNumeric(fonteZoomPinchRef, {
    enabled: open,
    value: fontSize || 100,
    onChange: handlePinchFontSize,
    min: 100,
    max: 200,
    step: 10,
  })

  useEffect(() => {
    if (!open) return
    setBackButtonHandler(() => setOpen(false))
    return () => setBackButtonHandler(null)
  }, [open, setBackButtonHandler])

  // Permite que outros componentes (p. ex. o menu "+" do AppBar) abram este
  // diálogo sem precisar duplicar a UI/estado. Disparado por
  // `window.dispatchEvent(new Event('salvation-abrir-leitura-config'))`.
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('salvation-abrir-leitura-config', handler)
    return () => window.removeEventListener('salvation-abrir-leitura-config', handler)
  }, [])

  // Ao abrir o seletor, pré-carrega o CSS de todas as famílias para que os
  // chips de pré-visualização mostrem o tipo de letra correto sem flash.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      for (const opt of FONT_OPTIONS) {
        carregarFonteLeitura(opt.value).catch(() => {})
      }
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const sxChipSelecionado = (ativo) =>
    ativo
      ? {
          bgcolor: accent,
          color: '#fff',
          borderColor: accent,
          '& .MuiChip-icon': { color: '#fff' },
          '&:hover': { bgcolor: accent, filter: 'brightness(1.06)' },
        }
      : {}

  return (
    <>
      {!hidden && (
        <Tooltip title="Editar fonte">
          <IconButton
            color="inherit"
            aria-label="Configurações de leitura"
            onClick={() => setOpen(true)}
            sx={{
              flexShrink: 0,
              px: 0.85,
              py: 0.65,
            }}
          >
            <IconeAaLeitura sx={{ color: 'inherit' }} />
          </IconButton>
        </Tooltip>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {leituraPaginaKey === 'biblia' || leituraPaginaKey === 'plano-leitura-biblia'
            ? 'Leitura da Bíblia'
            : 'Editar fonte'}
          <IconeAaLeitura variant="title" sx={{ color: accent }} />
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Zoom, entrelinhas, alinhamento e tipo de letra ficam salvos por seção (a Bíblia e a Confissão, por exemplo,
            podem ter configurações diferentes). Tema claro/escuro continua global. Seção atual:{' '}
            <strong>{LEITURA_SECCAO_LABEL[leituraPaginaKey] || leituraPaginaKey}</strong>
          </Typography>

          <Divider sx={{ my: 2, borderColor: 'divider' }} />

          <Box ref={fonteZoomPinchRef}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Zoom do texto
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: `${Math.min(Math.max((fontSize || 100) / 100, 1), 2)}rem`,
                  whiteSpace: 'nowrap',
                }}
              >
                Exemplo
              </Typography>
            </Box>
            <Box sx={{ px: 0.5, mb: 2 }}>
              <Slider
                value={fontSize || 100}
                min={100}
                max={200}
                step={10}
                onChange={(_, value) => {
                  if (typeof value === 'number') setFontSize(value)
                }}
                sx={{ color: accent }}
              />
              <Typography variant="caption" color="text.secondary">
                {fontSize || 100}%
              </Typography>
            </Box>

            <Divider sx={{ my: 2, borderColor: 'divider' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Espaçamento entre linhas
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  lineHeight: readingLineHeightToCss(lineHeight),
                  whiteSpace: 'nowrap',
                }}
              >
                {(lineHeight ?? 160) / 100}
              </Typography>
            </Box>
            <Box sx={{ px: 0.5, mb: 2 }}>
              <Slider
                value={lineHeight ?? 160}
                min={120}
                max={220}
                step={5}
                onChange={(_, value) => {
                  if (typeof value === 'number') setLineHeight(value)
                }}
                sx={{ color: accent }}
              />
              <Typography variant="caption" color="text.secondary">
                Linha mais compacta (1,20) a mais espaçada (2,20)
              </Typography>
            </Box>

            {isBibliaOuPlanoNaBiblia && (
              <>
                <Divider sx={{ my: 2, borderColor: 'divider' }} />
                <FormControl component="fieldset" variant="standard" sx={{ width: '100%', m: 0, mb: 0 }}>
                  <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
                    Espaço entre versículos
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {`Deseja margem entre versículos? Sim mantém o espaçamento habitual; Não compacta o texto (sem margem
                    extra). Aplica-se à Bíblia e ao plano "leitura na Bíblia".`}
                  </Typography>
                  <RadioGroup
                    row
                    name="sem-espaco-versiculos"
                    value={semEspacoEntreVersiculos ? 'nao' : 'sim'}
                    onChange={(e) => setSemEspacoEntreVersiculos(e.target.value === 'nao')}
                    sx={{ gap: 2, flexWrap: 'wrap' }}
                  >
                    <FormControlLabel
                      value="sim"
                      control={
                        <Radio
                          sx={{
                            color: 'text.secondary',
                            '&.Mui-checked': { color: accent },
                          }}
                        />
                      }
                      label="Sim"
                    />
                    <FormControlLabel
                      value="nao"
                      control={
                        <Radio
                          sx={{
                            color: 'text.secondary',
                            '&.Mui-checked': { color: accent },
                          }}
                        />
                      }
                      label="Não"
                    />
                  </RadioGroup>
                </FormControl>
              </>
            )}

            <Divider sx={{ my: 2, borderColor: 'divider' }} />

            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Alinhamento do texto
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<FormatAlignLeft />}
                label="Esquerda"
                clickable
                color="default"
                onClick={() => setTextAlign('left')}
                sx={sxChipSelecionado((textAlign || 'left') === 'left')}
              />
              <Chip
                icon={<FormatAlignCenter />}
                label="Centro"
                clickable
                color="default"
                onClick={() => setTextAlign('center')}
                sx={sxChipSelecionado(textAlign === 'center')}
              />
              <Chip
                icon={<FormatAlignRight />}
                label="Direita"
                clickable
                color="default"
                onClick={() => setTextAlign('right')}
                sx={sxChipSelecionado(textAlign === 'right')}
              />
              <Chip
                icon={<FormatAlignJustify />}
                label="Justificado"
                clickable
                color="default"
                onClick={() => setTextAlign('justify')}
                sx={sxChipSelecionado(textAlign === 'justify')}
              />
            </Box>

            <Divider sx={{ my: 2, borderColor: 'divider' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Tipo de fonte
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontFamily: resolveFontFamily(fontFamily),
                  whiteSpace: 'nowrap',
                }}
              >
                Exemplo
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {FONT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  clickable
                  color="default"
                  onClick={() => setFontFamily(opt.value)}
                  sx={{
                    borderRadius: 1,
                    fontFamily: resolveFontFamily(opt.value),
                    fontSize: '0.82rem',
                    ...sxChipSelecionado((fontFamily || 'system') === opt.value),
                  }}
                />
              ))}
            </Box>

            <Divider sx={{ my: 2, borderColor: 'divider' }} />

            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Leitura e tema
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={!!isDarkMode}
                  onChange={toggleDarkMode}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: accent,
                      '&:hover': {
                        bgcolor: toRgba(accent, 0.12),
                      },
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: accent,
                      opacity: 0.9,
                    },
                  }}
                />
              }
              label={isDarkMode ? 'Modo escuro ativo' : 'Modo claro ativo'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="primary" variant="text" sx={{ fontWeight: 600 }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
