import React from 'react'
import { FormControlLabel, Radio } from '@mui/material'
import TextoComReferencias from './TextoComReferencias'

export default function OpcaoQuestionario({ value, label, ...props }) {
  return (
    <FormControlLabel
      value={value}
      control={<Radio />}
      label={<TextoComReferencias texto={label} />}
      {...props}
    />
  )
} 