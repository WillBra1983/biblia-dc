import { useEffect } from 'react'
import { registrarCompartilhamentoPagina } from '../utils/compartilhamentoPagina'

export function useCompartilhamentoPagina({ pathname, title, text, url }) {
  useEffect(() => registrarCompartilhamentoPagina({ pathname, title, text, url }), [pathname, title, text, url])
}
