import React from 'react'
import { Box, Link } from '@mui/material'
import { limparReferenciasParalelasARA } from '../utils/biblia'

/**
 * Parte visual das referências paralelas (texto semelhante noutros livros), sob o título da perícope.
 * `texto` — ex.: "Marcos 9.49-50; Lucas 14.34-35" (pode incluir coluna NVI entre parênteses).
 */
export default function ReferenciasPericope({ texto, onClickRef, sx }) {
  if (!texto || !String(texto).trim()) return null

  const segmentos = limparReferenciasParalelasARA(String(texto))
    .split(/;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\s{2,}/g, ' ').trim())

  if (!segmentos.length) return null

  return (
    <Box
      component="div"
      sx={{
        mt: 0.75,
        fontWeight: 400,
        fontStyle: 'normal',
        lineHeight: 1.35,
        opacity: 0.88,
        ...sx
      }}
    >
      {segmentos.map((seg, i) => (
        <span key={i}>
          {i > 0 ? ' · ' : ''}
          <Link
            component="button"
            type="button"
            variant="body2"
            title={seg}
            onClick={(e) => {
              e.preventDefault()
              onClickRef?.(seg)
            }}
            sx={{
              cursor: 'pointer',
              verticalAlign: 'baseline',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
              p: 0,
              border: 'none',
              background: 'none',
              font: 'inherit',
              color: 'primary.main'
            }}
          >
            {seg}
          </Link>
        </span>
      ))}
    </Box>
  )
}
