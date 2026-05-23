import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography
} from '@mui/material'
import ProvaBiblicaIcon from '@mui/icons-material/AssignmentTurnedIn'
import DevocionalIcon from '@mui/icons-material/AutoStories'
import QuizIcon from '@mui/icons-material/EmojiEvents'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import ShareIcon from '@mui/icons-material/Share'
import SchoolIcon from '@mui/icons-material/School'
import MaisDeDeusIcon from '@mui/icons-material/VolunteerActivism'
import {
  EXPORT_KIND_LABELS,
  applyLabelForKind,
  parseAnyExport,
  summarizeExportForDialog
} from '../utils/appExportPayload'

/**
 * Resume um payload do chat. Async porque o caso 'discipulado' faz `import()`
 * dinâmico do dataset completo. Retorna `null` enquanto carrega ou em erro —
 * a UI mostra o `EXPORT_KIND_LABELS` como fallback até o resumo chegar.
 */
function useExportSummary(parsed) {
  const [summary, setSummary] = useState(null)
  useEffect(() => {
    let cancelled = false
    if (!parsed || parsed.error) {
      setSummary(null)
      return
    }
    summarizeExportForDialog(parsed)
      .then((s) => {
        if (!cancelled) setSummary(s)
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
    return () => {
      cancelled = true
    }
  }, [parsed])
  return summary
}

function bubbleGradient(kind, mine) {
  if (!mine) return { bgcolor: 'grey.200', color: '#1a1a1a' }
  switch (kind) {
    case 'versiculos_marcados':
    case 'biblia_versiculos':
      return {
        background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
        color: 'primary.contrastText',
        border: '1px solid rgba(255,255,255,0.2)'
      }
    case 'devocional':
      return {
        background: 'linear-gradient(135deg, #4a148c 0%, #6a1b9a 100%)',
        color: 'primary.contrastText',
        border: '1px solid rgba(255,255,255,0.2)'
      }
    case 'mais_de_deus':
      return {
        background: 'linear-gradient(135deg, #bf360c 0%, #e65100 100%)',
        color: 'primary.contrastText',
        border: '1px solid rgba(255,255,255,0.2)'
      }
    case 'quiz':
      return {
        background: 'linear-gradient(135deg, #33691e 0%, #558b2f 100%)',
        color: 'primary.contrastText',
        border: '1px solid rgba(255,255,255,0.2)'
      }
    case 'estudo_biblico':
      return {
        background: 'linear-gradient(135deg, #006064 0%, #00838f 100%)',
        color: 'primary.contrastText',
        border: '1px solid rgba(255,255,255,0.2)'
      }
    case 'prova_biblica':
      return {
        background: 'linear-gradient(135deg, #bf360c 0%, #e65100 100%)',
        color: 'primary.contrastText',
        border: '1px solid rgba(255,255,255,0.2)'
      }
    default:
      return {
        background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
        color: 'primary.contrastText',
        border: '1px solid rgba(255,255,255,0.2)'
      }
  }
}

function KindIcon({ kind }) {
  switch (kind) {
    case 'versiculos_marcados':
    case 'biblia_versiculos':
      return <MenuBookIcon sx={{ fontSize: 18, opacity: 0.95 }} />
    case 'devocional':
      return <DevocionalIcon sx={{ fontSize: 18, opacity: 0.95 }} />
    case 'mais_de_deus':
      return <MaisDeDeusIcon sx={{ fontSize: 18, opacity: 0.95 }} />
    case 'quiz':
      return <QuizIcon sx={{ fontSize: 18, opacity: 0.95 }} />
    case 'estudo_biblico':
      return <SchoolIcon sx={{ fontSize: 18, opacity: 0.95 }} />
    case 'prova_biblica':
      return <ProvaBiblicaIcon sx={{ fontSize: 18, opacity: 0.95 }} />
    default:
      return <ShareIcon sx={{ fontSize: 18, opacity: 0.95 }} />
  }
}

export function ChatAppExportBubble({ message, mine, onOpenDetails }) {
  const parsed = message.exportPayload
    ? parseAnyExport(message.exportPayload, { fallbackExportKind: message.exportKind })
    : null
  const kind = parsed?.kind || message.exportKind || ''
  const label = EXPORT_KIND_LABELS[kind] || 'Envio do app'
  const sum = useExportSummary(parsed)
  let title = sum?.titulo || label
  if (sum?.kind === 'discipulado' && sum.discipulado?.titulo) title = sum.discipulado.titulo

  const provaUrl =
    kind === 'prova_biblica' && parsed?.data && typeof parsed.data === 'object'
      ? String(parsed.data.resultUrl || '').trim()
      : ''

  const sx = bubbleGradient(kind, mine)

  return (
    <Paper elevation={1} sx={{ maxWidth: '85%', px: 1.5, py: 1.25, ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <KindIcon kind={kind} />
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {title}
      </Typography>
      {kind === 'prova_biblica' && parsed?.data?.notaTexto ? (
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75, letterSpacing: 0.2 }}>
          Nota: {String(parsed.data.notaTexto)}
        </Typography>
      ) : null}
      <Typography variant="body2" sx={{ opacity: 0.95, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {message.text}
      </Typography>
      {provaUrl ? (
        <TextField
          fullWidth
          multiline
          size="small"
          margin="dense"
          label="Link do resultado (somente leitura)"
          value={provaUrl}
          InputProps={{ readOnly: true }}
          sx={{
            mt: 1,
            '& .MuiInputBase-input': { cursor: 'default', userSelect: 'all' }
          }}
        />
      ) : null}
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        sx={{ mt: 1, borderColor: mine ? 'rgba(255,255,255,0.5)' : undefined, color: 'inherit' }}
        onClick={() => onOpenDetails(message)}
      >
        Ver envio
      </Button>
    </Paper>
  )
}

export function ChatAppExportDialog({ open, onClose, exportPayload, fallbackExportKind, onApply, busy }) {
  const parsed = exportPayload
    ? parseAnyExport(exportPayload, { fallbackExportKind })
    : null
  const err = parsed?.error
  const summary = useExportSummary(parsed)
  const canApply = Boolean(parsed && !parsed.error && parsed.canApply)
  const readOnlyReason = parsed?.readOnlyReason || null
  const kind = parsed?.kind
  const applyText = applyLabelForKind(kind)

  const disc =
    summary?.kind === 'discipulado' && summary.discipulado ? summary.discipulado : null

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {kind ? EXPORT_KIND_LABELS[kind] || 'Envio' : 'Envio'}
      </DialogTitle>
      <DialogContent dividers>
        {err ? (
          <Typography color="error">{err}</Typography>
        ) : disc ? (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {disc.titulo}
            </Typography>
            {disc.subtitulo ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {disc.subtitulo}
              </Typography>
            ) : null}
            <Typography variant="body2" sx={{ mb: 1 }}>
              Parou na pergunta {disc.questaoAtual} (referência de quem enviou).
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Respostas incluídas ({disc.linhas.length})
            </Typography>
            <List dense sx={{ bgcolor: 'action.hover', borderRadius: 1, py: 0 }}>
              {disc.linhas.map((row) => (
                <ListItem key={row.num} alignItems="flex-start" sx={{ px: 1.5 }}>
                  <ListItemText
                    primary={`Questão ${row.num}`}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary" display="block">
                          {row.pergunta}
                        </Typography>
                        <Typography component="span" variant="body2" color="primary">
                          {row.letra}) {row.textoResposta}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </>
        ) : summary?.linhas ? (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              {summary.titulo}
            </Typography>
            {summary.subtitulo ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                {summary.subtitulo}
              </Typography>
            ) : null}
            <List dense sx={{ bgcolor: 'action.hover', borderRadius: 1, py: 0, maxHeight: 360, overflow: 'auto' }}>
              {summary.linhas.map((row, i) => (
                <ListItem key={i} alignItems="flex-start" sx={{ px: 1.5 }}>
                  <ListItemText primary={row.primary} secondary={row.secondary} />
                </ListItem>
              ))}
            </List>
          </>
        ) : summary ? (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {summary.titulo}
            </Typography>
            {summary.subtitulo ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                {summary.subtitulo}
              </Typography>
            ) : null}
          </>
        ) : (
          <Typography>Nada para mostrar.</Typography>
        )}
        {readOnlyReason ? (
          <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
            {readOnlyReason}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, py: 1.5 }}>
        <Button onClick={onClose} disabled={busy}>
          Fechar
        </Button>
        {canApply && parsed?.data && kind ? (
          <Button
            variant="contained"
            color="primary"
            disabled={busy || !!err}
            onClick={() => onApply?.(kind, parsed.data)}
          >
            {applyText}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}
