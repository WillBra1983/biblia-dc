import { useEffect, useRef, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { partesApresentacao } from '../utils/apresentacaoFormatada'

export default function TextoDestaque({ texto, linhas = 4, sx, formatado = false, alinhamento = 'left', onExpandidoChange, reiniciarExpansao, acoes }) {
  const ref = useRef(null)
  const [expandido, setExpandido] = useState(false)
  const [cortado, setCortado] = useState(false)
  useEffect(() => { setExpandido(false); onExpandidoChange?.(false) }, [texto, reiniciarExpansao, onExpandidoChange])
  useEffect(() => {
    const elemento = ref.current
    if (!elemento || expandido || !linhas) return undefined
    let ativo = true
    const medir = () => {
      if (!ativo) return
      const largura = elemento.getBoundingClientRect().width
      if (!largura) return
      // Alguns navegadores limitam também scrollHeight ao aplicar line-clamp.
      // Medimos uma cópia sem o corte, na mesma largura e com os mesmos estilos.
      const completo = elemento.cloneNode(true)
      completo.removeAttribute('id')
      completo.setAttribute('aria-hidden', 'true')
      Object.assign(completo.style, {
        position: 'absolute', visibility: 'hidden', pointerEvents: 'none',
        display: 'block', width: `${largura}px`, height: 'auto', maxHeight: 'none',
        webkitLineClamp: 'unset', overflow: 'visible',
      })
      elemento.parentElement.appendChild(completo)
      const alturaCompleta = completo.getBoundingClientRect().height
      completo.remove()
      setCortado(alturaCompleta > elemento.getBoundingClientRect().height + 1)
    }
    medir()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    observer?.observe(elemento)
    document.fonts?.ready.then(medir)
    return () => { ativo = false; observer?.disconnect() }
  }, [texto, expandido, linhas, formatado, alinhamento])
  return <Box sx={sx}>
    <Typography ref={ref} sx={{ fontFamily: 'Georgia, serif', fontWeight: formatado ? 400 : 700, textAlign: alinhamento === 'justify' ? 'justify' : 'left', lineHeight: 1.3, whiteSpace: 'pre-wrap', ...(!expandido && linhas > 0 && { display: '-webkit-box', WebkitLineClamp: linhas, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>{formatado ? partesApresentacao(texto).map((parte, indice) => <Box component="span" sx={{ fontWeight: parte.tipo.includes('negrito') ? 700 : 'inherit', fontStyle: parte.tipo.includes('italico') ? 'italic' : 'normal' }} key={indice}>{parte.texto}</Box>) : texto}</Typography>
    {linhas > 0 && (cortado || expandido) && <Button size="small" sx={{ color: '#000', p: 0, minWidth: 0, textShadow: 'inherit' }} onKeyDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setExpandido(!expandido); onExpandidoChange?.(!expandido) }}>{expandido ? 'Ler menos' : 'Ler mais'}</Button>}
    {acoes && <Box onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mt: 0.5, color: '#000', textShadow: '-1px -1px white, 1px 1px white, -1px 1px white, 1px -1px white', '& .MuiButton-root': { minHeight: 40, px: 0.5, color: '#000', fontWeight: 800, textShadow: 'inherit', backgroundColor: 'transparent', '&:hover': { backgroundColor: 'transparent' } }, '& .MuiSvgIcon-root': { filter: 'drop-shadow(1px 0 0 white) drop-shadow(-1px 0 0 white)' } }}>
      {acoes}
    </Box>}
  </Box>
}
