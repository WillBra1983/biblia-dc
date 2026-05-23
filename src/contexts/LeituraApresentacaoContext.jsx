import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  COR_APRESENTACAO_PADRAO,
  corApresentacaoValida,
} from '../constants/apresentacaoCores'

const STORAGE_KEY = 'salvation-leitura-apresentacao-v1'

function carregarPersistido() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { habilitado: false, cor: COR_APRESENTACAO_PADRAO, negrito: false }
    }
    const p = JSON.parse(raw)
    return {
      habilitado: !!p.habilitado,
      cor: corApresentacaoValida(p.cor) ? p.cor : COR_APRESENTACAO_PADRAO,
      negrito: !!p.negrito,
    }
  } catch {
    return { habilitado: false, cor: COR_APRESENTACAO_PADRAO, negrito: false }
  }
}

function gravarPersistido(estado) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado))
  } catch {
    /* ignore */
  }
}

const LeituraApresentacaoContext = createContext(null)

export function LeituraApresentacaoProvider({ children }) {
  const location = useLocation()
  const pathname =
    location.pathname !== '/' && location.pathname.endsWith('/')
      ? location.pathname.slice(0, -1)
      : location.pathname

  const naBiblia = pathname === '/' || pathname === '/biblia'
  const naApresentacaoBiblia = pathname.startsWith('/biblia/apresentacao')
  const naApresentacaoHinario = pathname.startsWith('/hinario/apresentacao')

  const [persistido, setPersistido] = useState(carregarPersistido)
  const [corLetra, setCorLetraState] = useState(persistido.cor)
  const [negrito, setNegritoState] = useState(persistido.negrito)

  const habilitado = persistido.habilitado
  const ativoNaBiblia = naApresentacaoBiblia
  const ativoNoHinario = naApresentacaoHinario

  const sincronizarStorage = useCallback((patch) => {
    setPersistido((prev) => {
      const next = { ...prev, ...patch }
      gravarPersistido(next)
      return next
    })
  }, [])

  const setCorLetra = useCallback(
    (cor) => {
      const c = corApresentacaoValida(cor) ? cor : COR_APRESENTACAO_PADRAO
      setCorLetraState(c)
      sincronizarStorage({ cor: c })
    },
    [sincronizarStorage]
  )

  const setNegrito = useCallback(
    (valor) => {
      const n = Boolean(valor)
      setNegritoState(n)
      sincronizarStorage({ negrito: n })
    },
    [sincronizarStorage]
  )

  const toggleNegrito = useCallback(() => {
    setNegritoState((prev) => {
      const next = !prev
      setPersistido((p) => {
        const merged = { ...p, negrito: next }
        gravarPersistido(merged)
        return merged
      })
      return next
    })
  }, [])

  const toggleHabilitado = useCallback(() => {
    sincronizarStorage({ habilitado: !habilitado })
  }, [habilitado, sincronizarStorage])

  const valor = useMemo(
    () => ({
      habilitado,
      ativoNaBiblia,
      ativoNoHinario,
      naBiblia,
      naApresentacaoBiblia,
      corLetra,
      negrito,
      setCorLetra,
      setNegrito,
      toggleNegrito,
      toggleHabilitado,
      /** Compatível com menu "+" já referenciado no código. */
      ativo: naApresentacaoBiblia,
      ativoPersistido: naApresentacaoBiblia || habilitado,
      toggleAtivo: toggleHabilitado,
    }),
    [
      habilitado,
      ativoNaBiblia,
      ativoNoHinario,
      naBiblia,
      naApresentacaoBiblia,
      corLetra,
      negrito,
      setCorLetra,
      setNegrito,
      toggleNegrito,
      toggleHabilitado,
    ]
  )

  return (
    <LeituraApresentacaoContext.Provider value={valor}>
      {children}
    </LeituraApresentacaoContext.Provider>
  )
}

export function useLeituraApresentacao() {
  const ctx = useContext(LeituraApresentacaoContext)
  if (!ctx) {
    throw new Error('useLeituraApresentacao deve ser usado dentro de LeituraApresentacaoProvider')
  }
  return ctx
}
