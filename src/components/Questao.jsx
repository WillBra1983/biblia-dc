import React from 'react'
import { Typography, Box } from '@mui/material'
import TextoComReferencias from './TextoComReferencias'

export default function Questao({ pergunta, referencias }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 2 }}>
        <TextoComReferencias
          texto={pergunta}
          variant="block"
          style={{ fontSize: '1.125rem' }}
        />
      </Box>

      {referencias && referencias.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Referências:
          </Typography>
          {referencias.map((ref, i) => (
            <Box key={`ref-${ref}-${i}`} sx={{ mb: 2 }}>
              <TextoComReferencias texto={ref} variant="block" inline={true} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
} 