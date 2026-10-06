import { Box, TextField, Typography } from '@mui/material'
import EditorApresentacao from './EditorApresentacao'
import { lerFormatoEstudo, escreverFormatoEstudo } from '../utils/formatoEstudo'

/** Mantém os campos curtos e numéricos; formata somente conteúdo multilinha. */
export default function CampoTextoEstudo({ multiline, value, onChange, label, helperText, disabled, sx, minRows, maxRows, ...props }) {
  if (!multiline) return <TextField {...props} value={value} onChange={onChange} label={label} helperText={helperText} disabled={disabled} sx={sx} />
  const formato = lerFormatoEstudo(value)
  const publicar = (texto, alinhamento) => onChange?.({ target: { value: escreverFormatoEstudo(texto, alinhamento) } })
  // As regras atuais limitam o valor armazenado (incluindo formatação) a 12 mil.
  const teto = label === 'Pergunta' ? 2000 : ['Explicação', 'Reflexão'].includes(label) ? 8000 : ['Oração', 'Conselho pastoral (opcional)', 'Desafio (opcional)'].includes(label) ? 4000 : 12000
  const limiteBruto = teto - (formato.alinhamento ? escreverFormatoEstudo('', formato.alinhamento).length : 0)
  return <Box sx={{ my: 1.5, ...sx }}>
    <EditorApresentacao label={label || 'Texto do estudo'} texto={formato.texto} alinhamento={formato.alinhamento} limite={limiteBruto} limiteBruto={limiteBruto} disabled={disabled} minHeight={Math.min(480, Math.max(110, (minRows || 4) * 24))} onTexto={(texto) => publicar(texto, formato.alinhamento)} onAlinhamento={(alinhamento) => { if (escreverFormatoEstudo(formato.texto, alinhamento).length <= teto) publicar(formato.texto, alinhamento) }} />
    {helperText && <Typography variant="caption" color="text.secondary">{helperText}</Typography>}
  </Box>
}
