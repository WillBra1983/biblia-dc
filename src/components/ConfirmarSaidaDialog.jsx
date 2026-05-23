import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import { useEffect } from 'react'

export function ConfirmarSaidaDialog({ open, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return;
    const handlePopState = (event) => {
      if (open) {
        onCancel();
        window.history.pushState(null, '');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [open, onCancel]);

  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Deseja realmente sair?</DialogTitle>
      <DialogActions>
        <Button onClick={onCancel}>Permanecer</Button>
        <Button onClick={onConfirm} color="error">Sair</Button>
      </DialogActions>
    </Dialog>
  )
} 