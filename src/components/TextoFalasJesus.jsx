import { Fragment } from 'react'
import { Box } from '@mui/material'
import { corFalasJesus, segmentosFalasJesus } from '../utils/falasJesus'

export default function TextoFalasJesus({ texto, semNumero = false }) {
  const original = semNumero ? String(texto ?? '').replace(/^\s*(?:\d+|[⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s+/u, '') : texto
  return segmentosFalasJesus(original).map((parte, i) => parte.jesus
    ? <Box key={i} component="span" data-fala-jesus sx={theme => ({ color: corFalasJesus(theme.palette.mode) })}>{parte.texto}</Box>
    : <Fragment key={i}>{parte.texto}</Fragment>)
}
