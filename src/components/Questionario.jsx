import React from 'react'
import { RadioGroup, FormControl, FormControlLabel, Radio, Box } from '@mui/material'
import TextoComReferencias from './TextoComReferencias'

export default function Questionario({ opcoes, value, onChange }) {
  return (
    <FormControl component="fieldset">
      <RadioGroup value={value} onChange={onChange}>
        {opcoes.map((opcao, index) => (
          <FormControlLabel
            key={`opcao-${opcao}-${index}`}
            value={opcao}
            control={<Radio />}
            label={
              <Box component="span">
                <TextoComReferencias 
                  texto={opcao}
                  variant="default"
                  inline={true}
                  component="span"
                />
              </Box>
            }
          />
        ))}
      </RadioGroup>
    </FormControl>
  )
} 