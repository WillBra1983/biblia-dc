import { useLayoutEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'
import { FixedSizeList } from 'react-window'

/**
 * Lista virtualizada simples usando `react-window` + medição de altura via
 * `ResizeObserver`. Renderiza só os itens visíveis (+ overscan) — útil em
 * listas com centenas/milhares de linhas (ex.: Hinário com ~600 hinos).
 *
 * Por que existir como componente:
 * - `react-window` exige `height` e `itemSize` numéricos. Sem `AutoSizer`
 *   (lib extra de ~6 kB), medimos com `ResizeObserver` aqui mesmo.
 * - Mantém a API mínima: passe os itens, a altura de cada linha, e um
 *   `renderItem`. O fallback (`emptyMessage`) renderiza quando não há itens.
 *
 * Limitações:
 * - `itemSize` fixo (em px). Para alturas variáveis, troque por
 *   `VariableSizeList` — não vale a pena aqui porque toda linha tem o mesmo
 *   layout (número + título com `WebkitLineClamp: 2`).
 *
 * @template T
 * @param {{
 *  items: T[],
 *  itemSize?: number,
 *  overscanCount?: number,
 *  renderItem: (item: T, index: number) => React.ReactNode,
 *  itemKey?: (index: number, item: T) => string | number,
 *  emptyMessage?: React.ReactNode,
 *  sx?: object
 * }} props
 */
export default function ListaVirtualizada({
  items,
  itemSize = 56,
  overscanCount = 8,
  renderItem,
  itemKey,
  emptyMessage = null,
  sx
}) {
  const containerRef = useRef(null)
  const [altura, setAltura] = useState(0)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') {
      if (el) setAltura(el.clientHeight)
      return
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = Math.floor(entry.contentRect.height)
        setAltura((prev) => (prev === h ? prev : h))
      }
    })
    observer.observe(el)
    setAltura(el.clientHeight)
    return () => observer.disconnect()
  }, [])

  // Render row injeta `style` (posição absoluta calculada pelo react-window).
  const Row = ({ index, style }) => {
    const item = items[index]
    return (
      <div style={style}>
        {renderItem(item, index)}
      </div>
    )
  }

  if (!items?.length) {
    return (
      <Box ref={containerRef} sx={{ flex: 1, minHeight: 0, ...sx }}>
        {emptyMessage}
      </Box>
    )
  }

  return (
    <Box ref={containerRef} sx={{ flex: 1, minHeight: 0, ...sx }}>
      {altura > 0 && (
        <FixedSizeList
          height={altura}
          width="100%"
          itemCount={items.length}
          itemSize={itemSize}
          overscanCount={overscanCount}
          itemKey={
            itemKey
              ? (index) => itemKey(index, items[index])
              : undefined
          }
        >
          {Row}
        </FixedSizeList>
      )}
    </Box>
  )
}
