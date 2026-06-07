/**
 * Verifica versão instalada vs. versão na loja (RTDB) e mostra diálogo
 * para abrir Play Store / App Store. Roda após o splash no app nativo.
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
      if (r) setAviso(r)
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

  const titulo = aviso.obrigatoria ? 'Atualização necessária' : 'Nova versão disponível'
  const corpoPadrao = aviso.obrigatoria
    ? `A versão ${aviso.versaoAtual} corrige problemas importantes. Atualize na loja para continuar usando o app com segurança.`
    : `Há uma versão mais recente (${aviso.versaoAtual}) na loja. Você está na ${aviso.versaoInstalada}.`

  async function irParaLoja() {
    await abrirLojaAtualizacao(aviso.urlLoja, aviso.plataforma)
  }

  function dispensar() {
    if (!aviso.obrigatoria) {
      marcarAvisoVersaoDispensado(aviso.versaoAtual)
    }
    setAviso(null)
  }

  return (
    <Dialog
      open
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown={aviso.obrigatoria}
      onClose={() => {
        if (!aviso.obrigatoria) dispensar()
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
        <SystemUpdateAltIcon color="primary" />
        {titulo}
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
      <DialogActions sx={{ px: 3, pb: 2, flexDirection: aviso.obrigatoria ? 'column' : 'row', gap: 1 }}>
        <Button variant="contained" fullWidth onClick={() => void irParaLoja()}>
          Atualizar na loja
        </Button>
        {!aviso.obrigatoria ? (
          <Button color="inherit" fullWidth onClick={dispensar}>
            Depois
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}
