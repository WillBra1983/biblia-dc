import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Stack
} from '@mui/material'
import {
  subscribeUiDialogs,
  getUiDialogsState,
  fecharSnackbar
} from '../utils/uiDialogs'

/**
 * Host único para os diálogos e snackbars globais.
 *
 * Monta uma vez (em `App.jsx`) e ouve `subscribeUiDialogs`. As funções
 * imperativas (`avisarAsync`, `confirmarAsync`, `mostrarSnackbar`) ficam num
 * módulo separado e podem ser usadas em services/utils sem React.
 */
export default function AppDialogsHost() {
  const [snapshot, setSnapshot] = useState(getUiDialogsState())

  useEffect(() => {
    return subscribeUiDialogs((s) => {
      // Cria um shallow clone para forçar re-render — o store muta `dialogs`
      // e `snackbars` no lugar para manter a API imperativa simples.
      setSnapshot({ dialogs: [...s.dialogs], snackbars: [...s.snackbars] })
    })
  }, [])

  const dialog = snapshot.dialogs[0] || null

  return (
    <>
      <Dialog
        open={Boolean(dialog)}
        onClose={() => {
          if (!dialog) return
          if (dialog.tipo === 'confirmacao') dialog.resolver(false)
          else dialog.resolver()
        }}
        maxWidth="xs"
        fullWidth
      >
        {dialog?.titulo ? (
          <DialogTitle sx={{ pr: 6 }}>{dialog.titulo}</DialogTitle>
        ) : null}
        <DialogContent>
          {dialog?.severidade && dialog?.tipo === 'aviso' && dialog.severidade !== 'info' ? (
            <Alert severity={dialog.severidade} sx={{ mb: 2 }}>
              {dialog.mensagem}
            </Alert>
          ) : (
            <DialogContentText
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {dialog?.mensagem}
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {dialog?.tipo === 'confirmacao' ? (
            <>
              <Button
                onClick={() => dialog.resolver(false)}
                color="inherit"
                variant="text"
              >
                {dialog.labelCancelar}
              </Button>
              <Button
                onClick={() => dialog.resolver(true)}
                color={dialog.destrutivo ? 'error' : 'primary'}
                variant="contained"
                autoFocus
              >
                {dialog.labelOk}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => dialog?.resolver()}
              color="primary"
              variant="contained"
              autoFocus
            >
              {dialog?.labelOk || 'OK'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Stack vertical para snackbars empilhadas (geralmente só 1 ativa por vez). */}
      <Stack
        spacing={1}
        sx={{
          position: 'fixed',
          bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: (t) => t.zIndex.snackbar
        }}
      >
        {snapshot.snackbars.map((s) => (
          <Snackbar
            key={s.id}
            open
            autoHideDuration={s.duracaoMs}
            onClose={() => fecharSnackbar(s.id)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            sx={{ position: 'static', pointerEvents: 'auto' }}
          >
            <Alert
              onClose={() => fecharSnackbar(s.id)}
              severity={s.severidade}
              variant="filled"
              sx={{ width: '100%', maxWidth: 440 }}
            >
              {s.mensagem}
            </Alert>
          </Snackbar>
        ))}
      </Stack>
    </>
  )
}
