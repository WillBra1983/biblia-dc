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
  const ehIos = aviso.plataforma === 'ios'
  const nomeLoja = ehIos ? 'App Store' : 'Google Play'
  const plataformaIncompativel = ehIos
    ? /\b(?:Google\s*Play|Play\s*Store|Android)\b/i
    : /\b(?:App\s*Store|Apple|iPhone|iPad|iOS)\b/i
  const mensagemPersonalizada = plataformaIncompativel.test(aviso.mensagem || '')
    ? ''
    : aviso.mensagem
  const corpoPadrao = `Há uma versão mais recente (${aviso.versaoAtual}) disponível no ${nomeLoja}. Você está na ${versaoLocal}.`

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
        <Typography variant="body2" color="text.secondary" sx={{ mb: mensagemPersonalizada ? 1.5 : 0 }}>
          {mensagemPersonalizada || corpoPadrao}
        </Typography>
        {mensagemPersonalizada ? (
          <Typography variant="body2" color="text.secondary">
            {corpoPadrao}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'row', gap: 1 }}>
        <Button variant="contained" fullWidth onClick={() => void irParaLoja()}>
          Atualizar no {nomeLoja}
        </Button>
        <Button color="inherit" fullWidth onClick={dispensar}>
          Depois
        </Button>
      </DialogActions>
    </Dialog>
  )
}
