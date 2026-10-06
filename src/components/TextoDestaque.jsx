import { useEffect, useRef, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { partesApresentacao } from '../utils/apresentacaoFormatada'

export default function TextoDestaque({ texto, linhas = 4, sx, formatado = false, alinhamento = 'left', onExpandidoChange, reiniciarExpansao }) {
  const ref = useRef(null)
  const [expandido, setExpandido] = useState(false)
  const [cortado, setCortado] = useState(false)
  useEffect(() => { setExpandido(false); onExpandidoChange?.(false) }, [texto, reiniciarExpansao, onExpandidoChange])
  useEffect(() => {
    const elemento = ref.current
    if (!elemento || expandido) return undefined
    const medir = () => setCortado(elemento.scrollHeight > elemento.clientHeight + 1)
    medir()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    observer?.observe(elemento)
    document.fonts?.ready.then(medir)
    return () => observer?.disconnect()
  }, [texto, expandido, linhas])
  return <Box sx={sx}>
    <Typography ref={ref} sx={{ fontFamily: 'Georgia, serif', fontWeight: formatado ? 400 : 700, textAlign: alinhamento === 'justify' ? 'justify' : 'left', lineHeight: 1.3, whiteSpace: 'pre-wrap', ...(!expandido && { display: '-webkit-box', WebkitLineClamp: linhas, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>{formatado ? partesApresentacao(texto).map((parte, indice) => <Box component="span" sx={{ fontWeight: parte.tipo.includes('negrito') ? 700 : 'inherit', fontStyle: parte.tipo.includes('italico') ? 'italic' : 'normal' }} key={indice}>{parte.texto}</Box>) : texto}</Typography>
    {(cortado || expandido) && <Button size="small" sx={{ color: '#000', p: 0, minWidth: 0, textShadow: 'inherit' }} onKeyDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setExpandido(!expandido); onExpandidoChange?.(!expandido) }}>{expandido ? 'Ler menos' : 'Ler mais'}</Button>}
  </Box>
}
