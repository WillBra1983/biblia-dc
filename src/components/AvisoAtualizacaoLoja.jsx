/**
 * Verifica versão instalada vs. versão na loja (RTDB) e mostra diálogo
 * opcional para abrir Play Store / App Store. Nunca bloqueia o uso do app.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import { Capacitor } from '@capacitor/core'
import { aguardarPosSplash } from '../utils/posSplash'
import {
  abrirLojaAtualizacao,
  avaliarAtualizacaoLoja,
  marcarAvisoVersaoDispensado,
} from '../services/appLojaVersaoService'

export default function AvisoAtualizacaoLoja() {
  const [aviso, setAviso] = useState(null)
  const checandoRef = useRef(false)

  const verificar = useCallback(async () => {
    if (!Capacitor.isNativePlatform?.()) return
    if (checandoRef.current) return
    checandoRef.current = true
    try {
      const r = await avaliarAtualizacaoLoja()
      setAviso(r ?? null)
    } finally {
      checandoRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform?.()) return undefined

    let cancelado = false
    let removeListener = () => {}

    const cancelarEspera = aguardarPosSplash(() => {
      void verificar()

      void import('@capacitor/app').then(({ App: CapApp }) => {
        if (cancelado) return
        CapApp.addListener('appStateChange', ({ isActive }) => {
          if (isActive) void verificar()
        }).then((h) => {
          if (cancelado) {
            void h.remove()
            return
          }
          removeListener = () => {
            void h.remove()
          }
        }).catch(() => {})
      })
    })

    return () => {
      cancelado = true
      cancelarEspera()
      removeListener()
    }
  }, [verificar])

  if (!aviso) return null

  const versaoLocal = aviso.buildInstalado
    ? `${aviso.versaoInstalada} (${aviso.buildInstalado})`
    : aviso.versaoInstalada
  const corpoPadrao = `Há uma versão mais recente (${aviso.versaoAtual}) na loja. Você está na ${versaoLocal}.`

  function dispensar() {
    marcarAvisoVersaoDispensado(aviso.chaveAviso)
    setAviso(null)
  }

  async function irParaLoja() {
    marcarAvisoVersaoDispensado(aviso.chaveAviso)
    setAviso(null)
    await abrirLojaAtualizacao(aviso.urlLoja, aviso.plataforma)
  }

  return (
    <Dialog open maxWidth="xs" fullWidth onClose={dispensar}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
        <SystemUpdateAltIcon color="primary" />
        Nova versão disponível
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: aviso.mensagem ? 1.5 : 0 }}>
          {aviso.mensagem || corpoPadrao}
        </Typography>
        {aviso.mensagem ? (
          <Typography variant="body2" color="text.secondary">
            {corpoPadrao}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'row', gap: 1 }}>
        <Button variant="contained" fullWidth onClick={() => void irParaLoja()}>
          Atualizar na loja
        </Button>
        <Button color="inherit" fullWidth onClick={dispensar}>
          Depois
        </Button>
      </DialogActions>
    </Dialog>
  )
}
