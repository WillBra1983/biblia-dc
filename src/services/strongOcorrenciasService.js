import {
  buscarOcorrenciasStrongHebraico,
  contarOcorrenciasStrongHebraico,
} from './otStrongService'
import {
  buscarOcorrenciasStrongGrego,
  contarOcorrenciasStrongGrego,
} from './ntStrongProvaService'

export function normalizarCodigoStrong(code) {
  return String(code || '').trim().toUpperCase()
}

export async function contarOcorrenciasStrong(code) {
  const c = normalizarCodigoStrong(code)
  if (c.startsWith('H')) return contarOcorrenciasStrongHebraico(c)
  if (c.startsWith('G')) return contarOcorrenciasStrongGrego(c)
  return 0
}

export async function buscarOcorrenciasStrong(code, limit = 20, offset = 0) {
  const c = normalizarCodigoStrong(code)
  if (c.startsWith('H')) return buscarOcorrenciasStrongHebraico(c, limit, offset)
  if (c.startsWith('G')) return buscarOcorrenciasStrongGrego(c, limit, offset)
  return []
}

/** Amostra rápida na ficha do verbete. */
export const STRONG_OCORRENCIAS_PREVIEW = 5

/** Lote por página na lista completa. */
export const STRONG_OCORRENCIAS_PAGINA = 50
