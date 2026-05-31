import { useCallback, useState } from 'react'
import { buscarIntervaloVersiculos } from '../services/bibliaService'
import { buscarTokensOt } from '../services/otStrongService'
import { buscarTokensNt } from '../services/ntStrongProvaService'

const estadoFechado = {
  open: false,
  loading: false,
  idx: -1,
  item: null,
  original: '',
  traducao: '',
}

export function useStrongOcorrenciaDialog(code) {
  const [dialog, setDialog] = useState(estadoFechado)

  const fechar = useCallback(() => setDialog(estadoFechado), [])

  const abrir = useCallback(
    async (item, idx = -1) => {
      if (!item) return
      setDialog({ open: true, loading: true, idx, item, original: '', traducao: '' })
      try {
        const [versosPt, tokensOrig] = await Promise.all([
          buscarIntervaloVersiculos(item.livroId, item.capitulo, item.versiculo, item.versiculo),
          String(code || '').startsWith('H')
            ? buscarTokensOt(item.livroId, item.capitulo, item.versiculo)
            : buscarTokensNt(item.bookNum, item.capitulo, item.versiculo),
        ])
        const traducao = String(versosPt?.versiculos?.[0]?.texto || versosPt?.[0]?.texto || '')
        const original = (tokensOrig || []).map((t) => String(t.text || '').trim()).filter(Boolean).join(' ')
        setDialog({ open: true, loading: false, idx, item, original, traducao })
      } catch {
        setDialog((prev) => ({ ...prev, loading: false }))
      }
    },
    [code]
  )

  const navegar = useCallback(
    (lista, delta) => {
      const nextIdx = Number(dialog.idx) + Number(delta)
      if (nextIdx < 0 || nextIdx >= lista.length) return
      void abrir(lista[nextIdx], nextIdx)
    },
    [dialog.idx, abrir]
  )

  return { dialog, abrir, fechar, navegar }
}
