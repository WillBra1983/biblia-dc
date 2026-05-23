import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ZoomResetContext = createContext(null)

export function ZoomResetProvider({ children }) {
  const [version, setVersion] = useState(0)
  const bumpZoomReset = useCallback(() => setVersion((v) => v + 1), [])
  const value = useMemo(
    () => ({ bumpZoomReset, version }),
    [bumpZoomReset, version]
  )
  return (
    <ZoomResetContext.Provider value={value}>{children}</ZoomResetContext.Provider>
  )
}

export function useZoomReset() {
  const ctx = useContext(ZoomResetContext)
  return ctx ?? { bumpZoomReset: () => {}, version: 0 }
}
