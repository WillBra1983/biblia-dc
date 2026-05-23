import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert
} from '@mui/material'
import {
  detectStorageIssues,
  fixStorageIssues,
  backupImportantData,
  restoreFromBackup,
  clearDiscipuladoData,
  isDevelopment,
  isPWA
} from '../utils/storageUtils'

export default function StorageDiagnostic({ open, onClose }) {
  const [issues, setIssues] = useState([])
  const [fixes, setFixes] = useState([])
  const [backup, setBackup] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (open) {
      analyzeStorage()
    }
  }, [open])

  const analyzeStorage = () => {
    setIsAnalyzing(true)
    
    // Fazer backup antes de qualquer operação
    const currentBackup = backupImportantData()
    setBackup(currentBackup)
    
    // Detectar problemas
    const detectedIssues = detectStorageIssues()
    setIssues(detectedIssues)
    
    setIsAnalyzing(false)
  }

  const handleFixIssues = () => {
    const { issues: newIssues, fixes: newFixes } = fixStorageIssues()
    setIssues(newIssues)
    setFixes(newFixes)
    
    // Restaurar dados importantes se necessário
    if (newFixes.length > 0 && backup) {
      const restored = restoreFromBackup(backup)
      console.log(`📦 Restaurados ${restored} itens do backup`)
    }
  }

  const handleClearDiscipulado = () => {
    const cleared = clearDiscipuladoData()
    console.log(`🗑️ Limpos ${cleared} itens do discipulado`)
    analyzeStorage()
  }

  const handleRestoreBackup = () => {
    if (backup) {
      const restored = restoreFromBackup(backup)
      console.log(`📦 Restaurados ${restored} itens do backup`)
      analyzeStorage()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        🔧 Diagnóstico do Storage
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Ambiente: {isDevelopment() ? 'Desenvolvimento' : 'Produção'} | 
            PWA: {isPWA() ? 'Sim' : 'Não'}
          </Typography>
        </Box>

        {isAnalyzing && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Analisando storage...
          </Alert>
        )}

        {issues.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Problemas Detectados ({issues.length})
            </Typography>
            <List dense>
              {issues.map((issue, index) => (
                <ListItem key={index} sx={{ py: 0 }}>
                  <ListItemText primary={issue} />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}

        {fixes.length > 0 && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Problemas Corrigidos ({fixes.length})
            </Typography>
            <List dense>
              {fixes.map((fix, index) => (
                <ListItem key={index} sx={{ py: 0 }}>
                  <ListItemText primary={fix} />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}

        {issues.length === 0 && fixes.length === 0 && !isAnalyzing && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Nenhum problema detectado no storage
          </Alert>
        )}

        {backup && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Backup Disponível
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.keys(backup).map(key => (
                <Chip 
                  key={key} 
                  label={key} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Ações Disponíveis
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button 
              variant="outlined" 
              size="small"
              onClick={analyzeStorage}
              disabled={isAnalyzing}
            >
              🔍 Reanalisar
            </Button>
            
            {issues.length > 0 && (
              <Button 
                variant="contained" 
                size="small"
                color="warning"
                onClick={handleFixIssues}
              >
              🔧 Corrigir Problemas
              </Button>
            )}
            
            {backup && (
              <Button 
                variant="outlined" 
                size="small"
                onClick={handleRestoreBackup}
              >
                📦 Restaurar Backup
              </Button>
            )}
            
            {isDevelopment() && (
              <Button 
                variant="outlined" 
                size="small"
                color="error"
                onClick={handleClearDiscipulado}
              >
                🗑️ Limpar Discipulado
              </Button>
            )}
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
} 