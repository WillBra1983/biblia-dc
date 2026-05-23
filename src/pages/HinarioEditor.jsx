import { useState } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  Alert
} from '@mui/material'
import SaveAlt from '@mui/icons-material/SaveAlt'

export default function HinarioEditor() {
  const [rawText, setRawText] = useState('')
  const [processedHinos, setProcessedHinos] = useState([])
  const [error, setError] = useState(null)

  const processarTexto = () => {
    try {
      const hinos = []
      let hinoAtual = null
      
      const linhas = rawText.split('\n')
      
      for (let linha of linhas) {
        linha = linha.trim()
        
        // Identifica início de novo hino pelo número
        const matchHino = linha.match(/^(\d+)\s+(.+)$/)
        
        if (matchHino) {
          if (hinoAtual) {
            hinos.push(hinoAtual)
          }
          
          hinoAtual = {
            numero: parseInt(matchHino[1]),
            titulo: matchHino[2],
            estrofes: []
          }
          
          continue
        }

        // Adiciona linha à estrofe atual
        if (hinoAtual && linha) {
          hinoAtual.estrofes.push(linha)
        }
      }
      
      // Adiciona o último hino
      if (hinoAtual) {
        hinos.push(hinoAtual)
      }

      setProcessedHinos(hinos)
      setError(null)
      
    } catch (err) {
      setError('Erro ao processar o texto. Verifique o formato.')
      console.error(err)
    }
  }

  const exportarJSON = () => {
    const json = JSON.stringify(processedHinos, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hinario.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Editor do Hinário</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            multiline
            rows={10}
            fullWidth
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Cole aqui o texto do hinário..."
            sx={{ mb: 2 }}
          />
          
          <Button
            variant="contained"
            onClick={processarTexto}
            sx={{ mr: 2 }}
          >
            Processar Texto
          </Button>

          {processedHinos.length > 0 && (
            <Button
              variant="contained"
              onClick={exportarJSON}
              startIcon={<SaveAlt />}
            >
              Exportar JSON
            </Button>
          )}
        </Grid>

        {processedHinos.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Hinos Processados: {processedHinos.length}
              </Typography>
              
              {processedHinos.map((hino, i) => (
                <Box key={i} sx={{ mb: 4 }}>
                  <Typography variant="h6">
                    {hino.numero}. {hino.titulo}
                  </Typography>
                  
                  {hino.estrofes.map((parte, j) => (
                    <Box key={j} sx={{ mb: 2 }}>
                      <Typography
                        sx={{
                          fontFamily: 'monospace',
                          whiteSpace: 'pre'
                        }}
                      >
                        {parte}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ))}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  )
} 